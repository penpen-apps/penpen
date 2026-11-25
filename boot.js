/* penpen boot: makes the original penpen screens run on penpen-apps.github.io.
   - Google sign-in (only people on the trip's Members list get data)
   - google.script.run → penpen server, with the signed-in person's token
   - offline: last answers are kept on the phone and shown when there's no signal
   - install to home screen + offline app shell */
(function () {
  var SERVER = 'https://script.google.com/macros/s/AKfycbzbMyXFd-IQvtAKfcKuYJce9mQxrMe8CfVmqvcokoVl6U2pCzJMQr8hJDt8YzRA65LSdg/exec';
  var CLIENT_ID = '349845707853-pj91mvme1mskhn9dbbgn9gitc6tn06dl.apps.googleusercontent.com';
  var BASE = location.origin + location.pathname.replace(/index\.html$/, '');
  var READS = ['penpenToday', 'penpenDayExtras', 'penpenSafety', 'penpenProfiles', 'penpenDiaryInfo', 'penpenDiaryVideos',
    'penpenFormData', 'penpenMoneyCats', 'settleWeb', 'penpenPlan'];

  var FAST = ['penpenToday', 'penpenMoneyCats', 'settleWeb', 'penpenProfiles', 'penpenSafety', 'penpenPlan', 'penpenDayExtras'];
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  // remember which day each saved answer came from, so yesterday's "46 days to go" isn't shown as today's
  function day() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function stamp(k) { var m = get('pp_c__day', {}); m[k] = day(); set('pp_c__day', m); }
  function fromToday(k) { return get('pp_c__day', {})[k] === day(); }
  window.ppFromToday = function (fn) { return fromToday('pp_c_' + fn + ':[]'); };

  var TOKEN = get('pp_tok', null), ROLE = get('pp_role', ''), waiting = [], joinCode = new URLSearchParams(location.search).get('join');
  var SESS = localStorage.getItem('pp_sess') || '';   // 30-day penpen session after one Google sign-in
  var TRIP = localStorage.getItem('pp_trip_id') || '';   // which trip this phone is looking at ('' = the first trip)
  function valid() { return !!SESS || !!(TOKEN && TOKEN.exp * 1000 > Date.now() + 60000); }

  /* ---------- talking to the server ---------- */
  // weak signal: stop waiting after 15 seconds instead of sitting on "Loading…" forever.
  // AI answers, uploads and new trips can honestly take longer, so they get 60.
  var SLOW = ['penpenAsk', 'penpenVoice', 'penpenReadBooking', 'penpenReceipt', 'penpenReceiptPdf', 'penpenSelfie',
    'penpenDiaryAdd', 'penpenDiaryVideos', 'penpenLiveStart', 'penpenLiveAction', 'penpenAudit'];
  function post(action, args) {
    var secs = (action === 'newTrip' || (action === 'call' && SLOW.indexOf(args && args.fn) >= 0)) ? 60 : 15;
    return fetch(SERVER, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: AbortSignal.timeout ? AbortSignal.timeout(secs * 1000) : undefined,
      body: JSON.stringify(SESS ? { session: SESS, action: action, args: args || {}, trip: TRIP } : { token: TOKEN && TOKEN.cred, action: action, args: args || {}, trip: TRIP }) })
      .then(function (r) { return r.json(); })
      .catch(function (e) {   // no answer, or the connection dropped: say so plainly (the server may still have got it)
        var late = e && e.name === 'TimeoutError';
        if (!late && !(e instanceof TypeError)) throw e;   // anything else (e.g. a garbled reply) keeps its own message
        var t = new Error(late ? 'No answer after ' + secs + ' seconds. The signal may be weak.' : 'Couldn\u2019t reach penpen. The signal may be weak.');
        t.weak = true; throw t;
      })
      .then(function (j) { if (!j.ok) throw new Error(j.error); return j.data; });
  }
  function ready() { return new Promise(function (res) { if (valid() && ROLE) res(); else waiting.push(res); }); }

  function call(fn, args) {
    var hk = window.ppChatHook && window.ppChatHook(fn, args);
    if (hk) return call(hk.fn, hk.args).then(function (r) { try { hk.after(r); } catch (e) {} return r; });
    var key = 'pp_c_' + fn + ':' + JSON.stringify(args).slice(0, 200);
    var isRead = READS.indexOf(fn) >= 0;
    if (!navigator.onLine) {
      var c = get(key, undefined);
      if (isRead && c !== undefined) return Promise.resolve(c);
      return Promise.reject(new Error("You're offline — this needs a connection."));
    }
    return ready().then(function () { return post('call', { fn: fn, args: args }); })
      .then(function (r) {
        if (r && r.place && window.ppPlace) window.ppPlace.save(r.place);   // the trip's country, currency and time zone
        if (fn === 'penpenProfiles' && r) return fixInvite(r).then(function (x) { set(key, x); stamp(key); return x; });
        if (isRead) { set(key, r); stamp(key); }
        return r;
      })
      .catch(function (e) {
        if (e.message === 'signin') { TOKEN = null; SESS = ''; set('pp_tok', null); localStorage.removeItem('pp_sess'); showSignin('Please sign in again.'); return call(fn, args); }
        var c = get(key, undefined);
        if (isRead && c !== undefined) return c;
        if (e.message === 'personaldiary') throw new Error('Your private diary is moving to your own Google Drive — use the group diary for now.');
        if (e.message === 'notallowed') throw new Error("You can view this trip but can't change it.");
        if (e.weak && !isRead) e.message += ' It may still have gone through, so check before trying again.';
        throw e;
      });
  }
  // invite QR should open this app with a join code, not the server address
  function fixInvite(r) {
    if (ROLE !== 'creator') { r.url = BASE; return Promise.resolve(r); }
    return post('invite', {}).then(function (i) { r.url = BASE + '?join=' + i.code; return r; }, function () { r.url = BASE; return r; });
  }

  function runner(o) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return runner(Object.assign({}, o, { ok: f })); };
      if (k === 'withFailureHandler') return function (f) { return runner(Object.assign({}, o, { fail: f })); };
      if (k === 'withUserObject') return function (u) { return runner(Object.assign({}, o, { u: u })); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        // instant screens: show today's saved answer right away, then refresh quietly
        // (an answer saved on an earlier day waits for the fresh one, so the screen shows "Loading…" instead of old numbers)
        if (FAST.indexOf(String(k)) >= 0 && navigator.onLine && o.ok) {
          var ck = 'pp_c_' + k + ':' + JSON.stringify(args).slice(0, 200), c = get(ck, undefined);
          if (c !== undefined && fromToday(ck)) {
            try { o.ok(c, o.u); } catch (e) {}
            call(String(k), args).then(function (r) { o.ok(r, o.u); }, function () {});   // always redraw with fresh data (the scene etc. need it)
            return;
          }
        }
        call(String(k), args).then(function (r) { if (o.ok) o.ok(r, o.u); },
          function (e) { if (o.fail) o.fail(e, o.u); else console.warn(e); });
      };
    } });
  }
  window.ppCall = call;
  window.google = window.google || {};
  window.google.script = { run: runner({}) };


  /* ---------- trip theme: the creator picks it for everyone; anyone can override on their own phone ---------- */
  (function () {
    function prefs() { try { return JSON.parse(localStorage.getItem('pp_prefs') || '{}'); } catch (e) { return {}; } }
    // penpen is the guide by default (your own penguin is for your profile and the crew)
    if (localStorage.getItem('pp_guide_v2') !== '1') { var pg = prefs(); if (!pg.guide) { pg.guide = 'penpen'; localStorage.setItem('pp_prefs', JSON.stringify(pg)); } localStorage.setItem('pp_guide_v2', '1'); }
    var own = localStorage.getItem('pp_scene_own') === '1', trip = localStorage.getItem('pp_trip_theme') || '';
    // before the app reads its settings, apply the trip's theme (unless this person chose their own)
    if (!own && trip) { var p0 = prefs(); if (p0.scene !== trip) { p0.scene = trip; localStorage.setItem('pp_prefs', JSON.stringify(p0)); } }
    var origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (this === localStorage && k === 'pp_prefs') {
        var before = prefs().scene, after; try { after = JSON.parse(v).scene; } catch (e) {}
        if (after && after !== before) {
          if (ROLE === 'creator') { origSet.call(localStorage, 'pp_trip_theme', after); post('setTheme', { theme: after }).catch(function () {}); }
          else origSet.call(localStorage, 'pp_scene_own', '1');
        }
      }
      return origSet.call(this, k, v);
    };
    window.ppUseTripTheme = function () { localStorage.removeItem('pp_scene_own'); location.reload(); };
    window.ppRefreshTheme = function () {
      post('theme', {}).then(function (r) {
        var t = r && r.theme; if (!t || t === localStorage.getItem('pp_trip_theme')) return;
        origSet.call(localStorage, 'pp_trip_theme', t);
        if (ROLE !== 'creator' && localStorage.getItem('pp_scene_own') !== '1' && prefs().scene !== t) {
          var p1 = prefs(); p1.scene = t; origSet.call(localStorage, 'pp_prefs', JSON.stringify(p1)); location.reload();
        }
      }).catch(function () {});
    };
  })();


  /* ---------- sign in ---------- */
  var css = '#pp-gate{position:fixed;inset:0;z-index:99999;background:#F6EEDF;display:none;flex-direction:column;align-items:center;justify-content:center;justify-content:safe center;overflow-y:auto;text-align:center;padding:24px;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2B2A28}' +
    '#pp-gate h1{font-size:28px;margin:10px 0 4px}#pp-gate p{color:#5C574C;max-width:320px;margin:6px auto}#pp-gate .b{margin:20px 0}' +
    '#pp-gate ul{list-style:none;margin:14px auto 0;padding:0;max-width:300px;text-align:left}#pp-gate li{display:flex;gap:12px;align-items:center;padding:7px 0;color:#2B2A28;font-weight:600;font-size:15px}#pp-gate li span{font-size:22px;width:28px;text-align:center;flex:none}' +
    '#pp-ask{max-width:320px;margin:6px auto 0;padding-top:14px;border-top:1.5px dashed #E3D6BE}#pp-ask p{margin:0}#pp-ask b{color:#2B2A28}#pp-ask-ok{font-size:14px;margin-top:8px!important;color:#1D5E52!important}#pp-ask-ok:empty{display:none}' +
    '#pp-gate button:focus-visible{outline:3px solid #F4A62A;outline-offset:2px}' +
    '#pp-gate button{font:inherit;border:1.5px solid #237566;color:#237566;background:none;border-radius:14px;padding:10px 16px;margin-top:14px}' +
    '#pp-off{position:fixed;top:0;left:0;right:0;z-index:99998;background:#F4A62A;color:#3a2a00;text-align:center;font:13px -apple-system,sans-serif;padding:5px;display:none}';
  var PEN = '<svg width="120" height="120" viewBox="0 0 120 120"><ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/><path d="M60 14c-26 0-40 22-40 50 0 26 16 44 40 44s40-18 40-44c0-28-14-50-40-50z" fill="#2E3A4A"/><ellipse cx="60" cy="76" rx="25" ry="28" fill="#FFF8EE"/><circle cx="48.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="71.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="48.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="71.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="50.3" cy="49" r="1.8" fill="#fff"/><circle cx="73.3" cy="49" r="1.8" fill="#fff"/><path d="M54 60q6 7 12 0q-6 4-12 0z" fill="#F4A62A"/><ellipse cx="48" cy="106" rx="9" ry="4" fill="#F4A62A"/><ellipse cx="72" cy="106" rx="9" ry="4" fill="#F4A62A"/></svg>';

  function gate() {
    var g = document.getElementById('pp-gate');
    if (g) return g;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    g = document.createElement('div'); g.id = 'pp-gate';
    g.innerHTML = PEN + '<h1>penpen</h1><p id="pp-gate-msg">Your trip, your travel buddies, your money — in one place.</p>' +
      '<ul id="pp-what"><li><span aria-hidden="true">🗺️</span>Your trip\u2019s plan and map, day by day</li><li><span aria-hidden="true">💸</span>Who paid what, and who owes who</li><li><span aria-hidden="true">📔</span>A shared diary. Just tell penpen.</li></ul>' +
      '<div class="b" id="pp-gbtn"></div><p id="pp-gate-sub">Sign in with the Google account you were invited with.</p>' +
      '<div id="pp-ask"><p id="pp-ask-how"><b>How do I get in?</b> penpen is invite-only. The trip creator adds your Google email, or sends you an invite link.</p>' +
      '<button type="button" id="pp-askbtn">Ask for an invite</button><p id="pp-ask-ok" role="status"></p></div>';
    g.querySelector('#pp-askbtn').onclick = askInvite;
    document.body.appendChild(g);
    var off = document.createElement('div'); off.id = 'pp-off'; off.textContent = "You're offline — showing your last saved copy."; document.body.appendChild(off);
    return g;
  }
  function onBody(f) { if (document.body) f(); else document.addEventListener('DOMContentLoaded', f); }

  // first visit: say what penpen is and how to get in; people coming back, or holding an invite link, just sign in
  function newcomer(on) { document.getElementById('pp-what').hidden = !on; document.getElementById('pp-ask').hidden = !on; document.getElementById('pp-ask-how').hidden = false; }
  // "Ask for an invite": a ready message they send to whoever's planning the trip (no form, nothing stored)
  function askInvite() {
    var email = TOKEN && TOKEN.email, ok = document.getElementById('pp-ask-ok');
    var text = 'Hi! Can you add me to our trip on penpen? ' + (email ? 'My Google email is ' + email + '.' : 'I\u2019ll sign in with my Google account.');
    var copy = function () {
      var done = function () { ok.textContent = 'Message copied. Paste it to whoever\u2019s planning the trip.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + BASE).then(done, function () { ok.textContent = text + ' ' + BASE; });
      else ok.textContent = text + ' ' + BASE;
    };
    if (navigator.share) navigator.share({ title: 'penpen', text: text + ' ' + BASE }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
    else copy();
  }
  function showSignin(msg) {
    onBody(function () {
      var g = gate(); g.style.display = 'flex';
      if (msg) document.getElementById('pp-gate-msg').textContent = msg;
      newcomer(!ROLE && !joinCode);
      document.getElementById('pp-gate-sub').style.display = '';
      gis(function () {
        google.accounts.id.renderButton(document.getElementById('pp-gbtn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with' });
        try { google.accounts.id.prompt(); } catch (e) {}
      });
    });
  }
  function showNotMember() {
    onBody(function () {
      var g = gate(); g.style.display = 'flex';
      var m = document.getElementById('pp-gate-msg'), b = document.createElement('b');
      b.textContent = (TOKEN && TOKEN.email) || 'this Google account';   // text, not HTML
      m.textContent = 'You\u2019re signed in as '; m.appendChild(b); m.appendChild(document.createTextNode(', but you\u2019re not on a penpen trip yet.'));
      document.getElementById('pp-gate-sub').textContent = 'Ask the trip creator to add this email in Travel buddies, or to send you an invite link.';
      newcomer(true); document.getElementById('pp-what').hidden = true; document.getElementById('pp-ask-how').hidden = true;   // they know what penpen is; the line above says how
      document.getElementById('pp-gbtn').innerHTML = '<button id="pp-switch">Use a different Google account</button>';
      document.getElementById('pp-switch').onclick = window.ppSignOut;
    });
  }
  var gisReady = false;
  function gis(then) {
    if (!(window.google && google.accounts && google.accounts.id)) return setTimeout(function () { gis(then); }, 150);
    if (!gisReady) { google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCred, auto_select: true, itp_support: true }); gisReady = true; }
    if (then) then();
  }
  function onCred(resp) {
    var p = JSON.parse(decodeURIComponent(escape(atob(resp.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    TOKEN = { cred: resp.credential, exp: p.exp, email: p.email, name: p.given_name || p.name };
    set('pp_tok', TOKEN);
    SESS = ''; localStorage.removeItem('pp_sess');   // a fresh Google sign-in gets a fresh session
    enter();
  }
  function enter() {
    var step = joinCode ? post('join', { code: joinCode }).then(function (j) {
      joinCode = null; history.replaceState(null, '', location.pathname);
      if (j && j.trip !== undefined && j.trip !== TRIP) { setTrip(j.trip); }
    }) : Promise.resolve();
    step.then(function () { return post('whoami', {}); }).then(function (w) {
      if (!w.member) {
        ROLE = ''; set('pp_role', '');
        // not on this trip: jump to one of your own trips if you have any
        return post('trips', {}).then(function (t) {
          var l = (t && t.trips) || [];
          if (l.length && l[0].id !== TRIP) { setTrip(l[0].id, l[0].name); return enter(); }
          showNotMember();
        }, showNotMember);
      }
      ROLE = w.member.role; set('pp_role', ROLE);
      if (w.session && w.session !== SESS) { SESS = w.session; localStorage.setItem('pp_sess', SESS); }
      var g = document.getElementById('pp-gate'); if (g) g.style.display = 'none';
      var q = waiting; waiting = []; q.forEach(function (f) { f(); });
      if (window.ppRefreshTheme) setTimeout(window.ppRefreshTheme, 1500);
    }).catch(function (e) {
      if (e.message === 'badinvite') { joinCode = null; history.replaceState(null, '', location.pathname); return showSignin('That invite link has expired — ask for a new one.'); }
      if (e.message === 'signin') { SESS = ''; localStorage.removeItem('pp_sess'); return showSignin('Please sign in again.'); }
      if (!navigator.onLine) return;
      if (e.weak && ROLE) return;   // weak signal on a phone that's already signed in: keep showing the saved copy, don't lock the app
      showSignin("Couldn't reach penpen — check your connection and try again.");
    });
  }
  /* ---------- many trips ---------- */
  function clearCache() { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('pp_c_') === 0) localStorage.removeItem(k); }); }
  function setTrip(id, name) {
    TRIP = id || ''; localStorage.setItem('pp_trip_id', TRIP);
    if (name) localStorage.setItem('pp_trip_name', name);
    clearCache(); localStorage.removeItem('pp_trip_theme'); localStorage.removeItem('pp_scene_own');
  }
  window.ppTrips = {
    current: function () { return TRIP; },
    list: function () { return post('trips', {}).then(function (r) { return (r && r.trips) || []; }); },
    open: function (id, name) { setTrip(id, name); location.reload(); },
    create: function (o) { return post('newTrip', o).then(function (r) { return r.trip; }); },
    setPlace: function (o) { return post('setPlace', o).then(function (r) { if (window.ppPlace) window.ppPlace.save(r.place); clearCache(); return r.place; }); },
    remove: function (id) { return post('removeTrip', { id: id }).then(function (r) { return (r && r.trips) || []; }); },
    role: function () { return ROLE; },
    // creator only: add a friend by their Google email; the crew list and Today reload with them on it
    addMember: function (o) {
      return ready().then(function () { return post('addMember', o); }).then(function (r) {
        Object.keys(localStorage).forEach(function (k) { if (/^pp_c_penpen(Profiles|Today):/.test(k)) localStorage.removeItem(k); });
        return r;
      });
    },
    appLink: function () { return BASE; }   // the plain app address: an added friend needs no invite code
  };

  window.ppSignOut = function () {
    ['pp_tok', 'pp_role', 'pp_sess', 'pp_trip_id', 'pp_trip_name'].forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('pp_c_') === 0 || k.indexOf('pp_diary_draft') === 0) localStorage.removeItem(k); });   // incl. unsaved diary words
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    location.reload();
  };


  /* ---------- keep SVG gradients drawable when the screen that defined them is hidden ---------- */
  // Penguins share gradient ids (e.g. the body colour). Chrome won't paint a gradient whose first
  // definition sits inside a hidden screen, so copy every definition into one always-visible <defs>.
  onBody(function () {
    var NS = 'http://www.w3.org/2000/svg', seen = {};
    var holder = document.createElementNS(NS, 'svg');
    holder.setAttribute('width', '0'); holder.setAttribute('height', '0'); holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    var defs = document.createElementNS(NS, 'defs'); holder.appendChild(defs);
    document.body.insertBefore(holder, document.body.firstChild);
    function lift(root) {
      if (!root.querySelectorAll) return;
      root.querySelectorAll('linearGradient[id],radialGradient[id],clipPath[id],pattern[id],filter[id]').forEach(function (g) {
        if (seen[g.id] || holder.contains(g)) return;
        seen[g.id] = 1; defs.appendChild(g.cloneNode(true));
      });
    }
    lift(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) lift(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  });

  /* ---------- start ---------- */
  if (!navigator.onLine && ROLE) { /* offline: use saved answers */ }
  else if (valid() && ROLE && !joinCode) { enter(); /* refresh role quietly */ }
  else if (valid()) enter();
  else if (ROLE && TOKEN) { gis(function () { try { google.accounts.id.prompt(); } catch (e) {} }); showSignin('Welcome back — tap to continue.'); }
  else showSignin();

  function offline(on) { onBody(function () { gate(); document.getElementById('pp-off').style.display = on ? 'block' : 'none'; }); }
  window.addEventListener('offline', function () { offline(true); });
  window.addEventListener('online', function () { offline(false); });
  if (!navigator.onLine) offline(true);

  /* ---------- install ---------- */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.ppInstall = function () {
    if (deferred) { deferred.prompt(); deferred = null; return; }
    alert(/iphone|ipad/i.test(navigator.userAgent) ? 'In Safari: tap Share, then "Add to Home Screen".' : 'Open your browser menu and choose "Install app" or "Add to Home screen".');
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
