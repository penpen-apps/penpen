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

  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var TOKEN = get('pp_tok', null), ROLE = get('pp_role', ''), waiting = [], joinCode = new URLSearchParams(location.search).get('join');
  function valid() { return TOKEN && TOKEN.exp * 1000 > Date.now() + 60000; }

  /* ---------- talking to the server ---------- */
  function post(action, args) {
    return fetch(SERVER, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: TOKEN && TOKEN.cred, action: action, args: args || {} }) })
      .then(function (r) { return r.json(); })
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
        if (fn === 'penpenProfiles' && r) return fixInvite(r).then(function (x) { set(key, x); return x; });
        if (isRead) set(key, r);
        return r;
      })
      .catch(function (e) {
        if (e.message === 'signin') { TOKEN = null; set('pp_tok', null); showSignin('Please sign in again.'); return call(fn, args); }
        var c = get(key, undefined);
        if (isRead && c !== undefined) return c;
        if (e.message === 'personaldiary') throw new Error('Your private diary is moving to your own Google Drive — use the group diary for now.');
        if (e.message === 'notallowed') throw new Error("You can view this trip but can't change it.");
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
        call(String(k), args).then(function (r) { if (o.ok) o.ok(r, o.u); },
          function (e) { if (o.fail) o.fail(e, o.u); else console.warn(e); });
      };
    } });
  }
  window.ppCall = call;
  window.google = window.google || {};
  window.google.script = { run: runner({}) };

  /* ---------- sign in ---------- */
  var css = '#pp-gate{position:fixed;inset:0;z-index:99999;background:#F6EEDF;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2B2A28}' +
    '#pp-gate h1{font-size:28px;margin:10px 0 4px}#pp-gate p{color:#7A7468;max-width:320px;margin:6px auto}#pp-gate .b{margin:20px 0}' +
    '#pp-gate button{font:inherit;border:1.5px solid #237566;color:#237566;background:none;border-radius:14px;padding:10px 16px;margin-top:14px}' +
    '#pp-off{position:fixed;top:0;left:0;right:0;z-index:99998;background:#F4A62A;color:#3a2a00;text-align:center;font:13px -apple-system,sans-serif;padding:5px;display:none}';
  var PEN = '<svg width="120" height="120" viewBox="0 0 120 120"><ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/><path d="M60 14c-26 0-40 22-40 50 0 26 16 44 40 44s40-18 40-44c0-28-14-50-40-50z" fill="#2E3A4A"/><ellipse cx="60" cy="76" rx="25" ry="28" fill="#FFF8EE"/><circle cx="48.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="71.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="48.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="71.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="50.3" cy="49" r="1.8" fill="#fff"/><circle cx="73.3" cy="49" r="1.8" fill="#fff"/><path d="M54 60q6 7 12 0q-6 4-12 0z" fill="#F4A62A"/><ellipse cx="48" cy="106" rx="9" ry="4" fill="#F4A62A"/><ellipse cx="72" cy="106" rx="9" ry="4" fill="#F4A62A"/></svg>';

  function gate() {
    var g = document.getElementById('pp-gate');
    if (g) return g;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    g = document.createElement('div'); g.id = 'pp-gate';
    g.innerHTML = PEN + '<h1>penpen</h1><p id="pp-gate-msg">Your trip, your crew, your money — in one place.</p><div class="b" id="pp-gbtn"></div><p id="pp-gate-sub">Sign in with the Google account you were invited with.</p>';
    document.body.appendChild(g);
    var off = document.createElement('div'); off.id = 'pp-off'; off.textContent = "You're offline — showing your last saved copy."; document.body.appendChild(off);
    return g;
  }
  function onBody(f) { if (document.body) f(); else document.addEventListener('DOMContentLoaded', f); }

  function showSignin(msg) {
    onBody(function () {
      var g = gate(); g.style.display = 'flex';
      if (msg) document.getElementById('pp-gate-msg').textContent = msg;
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
      document.getElementById('pp-gate-msg').innerHTML = "You're signed in as <b>" + (TOKEN.email || '') + "</b>, but you're not on this trip yet.";
      document.getElementById('pp-gate-sub').textContent = 'Ask the trip creator for the invite QR code or link, then open it on this phone.';
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
    enter();
  }
  function enter() {
    var step = joinCode ? post('join', { code: joinCode }).then(function () { joinCode = null; history.replaceState(null, '', location.pathname); }) : Promise.resolve();
    step.then(function () { return post('whoami', {}); }).then(function (w) {
      if (!w.member) { ROLE = ''; set('pp_role', ''); return showNotMember(); }
      ROLE = w.member.role; set('pp_role', ROLE);
      var g = document.getElementById('pp-gate'); if (g) g.style.display = 'none';
      var q = waiting; waiting = []; q.forEach(function (f) { f(); });
    }).catch(function (e) {
      if (e.message === 'badinvite') return showSignin('That invite link has expired — ask for a new one.');
      if (e.message === 'signin') return showSignin('Please sign in again.');
      if (!navigator.onLine) return;
      showSignin("Couldn't reach penpen — check your connection and try again.");
    });
  }
  window.ppSignOut = function () {
    ['pp_tok', 'pp_role'].forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('pp_c_') === 0) localStorage.removeItem(k); });
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    location.reload();
  };

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
