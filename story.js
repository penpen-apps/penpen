/* penpen Today as a story + the 🔔 bell + My trips.
   Today:  countdown hero → penpen's speech bubble → "You & Brad" label → scene → tiles → the story (one chapter per day).
   Bell:   reminders worked out on the phone (no setup): your trips the day before and on the day, money to settle, entries to check.
           Flights/boats that name someone else ("Brad flies…") are theirs, so they stay out of your bell.
   Trips:  "My trips" (switch trip) and "New trip", from My profile or the trip name on Today. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function cached(fn) { return get('pp_c_' + fn + ':[]'); }
  function nav(label) { var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === label && x.className !== 'back'; })[0]; if (b) b.click(); }
  var fresh = {};
  function load(fn) {   // cached answer now; ask the server again at most every 5 minutes
    var now = Date.now();
    if (window.ppCall && navigator.onLine && (!fresh[fn] || now - fresh[fn] > 300000)) {
      fresh[fn] = now;
      window.ppCall(fn, []).then(function () { paint(); }, function () { fresh[fn] = 0; });
    }
    return cached(fn);
  }

  var css =
    '#pp-story-hero{position:relative;margin:4px 0 0;border-radius:24px;padding:18px 18px 16px;background:linear-gradient(135deg,#237566,#2F8F7C 55%,#F4A62A 140%);color:#fff;overflow:hidden}' +
    '#pp-story-hero .n{font:900 64px/0.9 Nunito,-apple-system,sans-serif;letter-spacing:-2px}' +
    '#pp-story-hero .l{font:800 19px/1.2 Nunito,-apple-system,sans-serif;margin-top:4px}' +
    '#pp-story-hero .trip{display:inline-flex;align-items:center;gap:6px;margin-top:12px;border:0;border-radius:99px;background:rgba(255,255,255,.2);color:#fff;font:800 13px Nunito,-apple-system,sans-serif;padding:7px 12px;cursor:pointer}' +
    '#pp-story-hero .dots{display:flex;gap:4px;margin-top:12px}#pp-story-hero .dots i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.28)}#pp-story-hero .dots i.on{background:#FFE7A8}' +
    '#pp-story-hero .sun{position:absolute;right:-16px;top:-16px;font-size:86px;opacity:.9;animation:ppWig 3s ease-in-out infinite}' +
    '@keyframes ppWig{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}' +
    '#pp-story-say{position:relative;margin:14px 0 6px;background:#FFFDF8;border-radius:18px;padding:12px 14px;font:700 15.5px/1.35 Nunito,-apple-system,sans-serif;color:#13324A;box-shadow:0 1px 0 #E8DCC6}' +
    '#pp-story-say:after{content:"";position:absolute;right:29%;bottom:-9px;border:10px solid transparent;border-bottom:0;border-top-color:#FFFDF8}' +
    '#pp-story-say b{color:#237566}' +
    '#pp-story-crew{font:800 13px Nunito,-apple-system,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#4F6475;margin:14px 2px 6px}' +
    '#pp-story{margin:18px 0 6px}#pp-story h3{font:900 20px Nunito,-apple-system,sans-serif;margin:0 2px 10px;color:#13324A}' +
    '#pp-story .ch{display:flex;gap:12px;width:100%;text-align:left;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}' +
    '#pp-story .rail{display:flex;flex-direction:column;align-items:center;width:34px}#pp-story .rail b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#FFFDF8;box-shadow:0 1px 0 #E8DCC6;font-size:17px}' +
    '#pp-story .rail i{flex:1;width:3px;background:#E3D6BE;margin:3px 0;min-height:14px}#pp-story .ch:last-of-type .rail i{display:none}' +
    '#pp-story .bd{flex:1;padding:4px 0 16px}#pp-story .k{font:800 12px Nunito,-apple-system,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#4F6475}' +
    '#pp-story .t{font:800 16px/1.3 Nunito,-apple-system,sans-serif;color:#13324A;margin-top:2px}#pp-story .s{font-size:13.5px;color:#5C6E7C;margin-top:2px}' +
    '#pp-story .done{opacity:.55}#pp-story .now .rail b{background:#237566;color:#fff}#pp-story .now .k{color:#237566}' +
    '#pp-story .all{display:block;width:100%;margin-top:2px;min-height:52px;border:0;border-radius:16px;background:#EDE2CC;color:#13324A;font:800 15px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    /* bell */
    '#pp-bell{position:relative;width:44px;height:44px;border-radius:50%;border:0;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:21px;margin-left:6px;cursor:pointer;padding:0}' +
    '#pp-bell em{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;border-radius:10px;background:#C8553D;color:#fff;font:800 11.5px/19px -apple-system,sans-serif;font-style:normal;padding:0 5px}' +
    '.pp-sheet{position:fixed;inset:0;z-index:99970;background:rgba(19,50,74,.35);display:flex;align-items:flex-end;justify-content:center}' +
    '.pp-sheet .in{width:100%;max-width:560px;max-height:86vh;overflow:auto;background:#F6EEDF;border-radius:24px 24px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));font:16px/1.4 Nunito,-apple-system,sans-serif;color:#13324A}' +
    '.pp-sheet h2{margin:0 0 12px;font:900 22px Nunito,-apple-system,sans-serif;display:flex;align-items:center}.pp-sheet h2 button{margin-left:auto;border:0;background:#fff;border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer;color:#13324A}' +
    '.pp-sheet .it{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:0;background:#FFFDF8;border-radius:16px;padding:13px 14px;margin:0 0 8px;font:inherit;color:inherit;cursor:pointer}' +
    '.pp-sheet .it .ic{font-size:22px;line-height:1.1}.pp-sheet .it b{display:block;font-weight:800}.pp-sheet .it small{display:block;color:#5C6E7C;font-size:13.5px}' +
    '.pp-sheet .it.new{box-shadow:inset 4px 0 0 #C8553D}.pp-sheet .it.on{box-shadow:inset 0 0 0 2px #237566}.pp-sheet .it .ok{margin-left:auto;color:#237566;font-weight:900}' +
    '.pp-sheet .empty{text-align:center;color:#5C6E7C;padding:18px 8px}' +
    '.pp-sheet label{display:block;font:800 13px Nunito,-apple-system,sans-serif;margin:12px 2px 4px;color:#4F6475}' +
    '.pp-sheet input{width:100%;box-sizing:border-box;border:1.5px solid #E3D6BE;border-radius:14px;padding:12px;font:16px Nunito,-apple-system,sans-serif;background:#fff;color:#13324A}' +
    '.pp-sheet .two{display:flex;gap:10px}.pp-sheet .two > div{flex:1}' +
    '.pp-sheet .go{display:block;width:100%;min-height:56px;margin-top:16px;border:0;border-radius:16px;background:#237566;color:#fff;font:800 17px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    '.pp-sheet .go[disabled]{opacity:.6}.pp-sheet .note{font-size:13px;color:#5C6E7C;margin-top:8px;text-align:center}' +
    '#pp-me .pp-tripsrow{display:flex;width:100%;align-items:center;gap:12px;border:0;background:#237566;color:#fff;border-radius:18px;padding:15px 16px;margin:12px 0 0;font:inherit;text-align:left;cursor:pointer}' +
    '#pp-me .pp-tripsrow small{display:block;opacity:.85;font-size:13px}#pp-me .pp-tripsrow .chev{margin-left:auto}' +
    '@media (prefers-color-scheme: dark){#pp-story-say,.pp-sheet .it{background:#1C3444;color:#EAF4F7;box-shadow:none}#pp-story-say:after{border-top-color:#1C3444}#pp-story-say b{color:#7FD3C0}' +
    '#pp-story h3,#pp-story .t{color:#EAF4F7}#pp-story .k,#pp-story-crew{color:#A9BFC9}#pp-story .s{color:#B9CBD3}#pp-story .rail b{background:#1C3444;box-shadow:none}#pp-story .rail i{background:#2E4A5A}' +
    '#pp-story .all{background:#22404F;color:#EAF4F7}.pp-sheet .in{background:#122633;color:#EAF4F7}.pp-sheet .it small,.pp-sheet .empty,.pp-sheet .note{color:#A9BFC9}.pp-sheet input{background:#1C3444;border-color:#2E4A5A;color:#EAF4F7}.pp-sheet label{color:#A9BFC9}}';

  /* ---------- reading the trip ---------- */
  function info() {
    var T = load('penpenToday') || {}, P = load('penpenPlan') || {};
    var h = T.hello || {}, label = String(h.label || ''), m;
    var me = T.me || h.name || '', people = (T.people || []).filter(Boolean);
    var days = (P.days || []).map(function (d) { return { day: d.day, label: d.label, short: d.short, stops: d.stops || [] }; });
    var phase = 'before', left = null, dayNo = null;
    if ((m = label.match(/(\d+)\s+days?\s+to\s+go/i))) left = +m[1];
    else if (/tomorrow/i.test(label)) left = 1;
    else if ((m = label.match(/day\s+(\d+)/i))) { phase = 'during'; dayNo = +m[1]; }
    var today = ymd(new Date());
    if (left === null && days.length) {
      var first = days[0].day, last = days[days.length - 1].day;
      if (today < first) left = Math.round((new Date(first) - new Date(today)) / 864e5);
      else if (today <= last) phase = 'during';
      else phase = 'after';
    }
    if (days.length && today > days[days.length - 1].day) phase = 'after';
    return { T: T, P: P, me: me, people: people, days: days, phase: phase, left: left, dayNo: dayNo, trip: h.trip || localStorage.getItem('pp_trip_name') || 'My trip', line: h.line || '' };
  }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function others(I) { return I.people.filter(function (p) { return p && p !== I.me; }); }
  function isMine(I, text) {   // a stop that names only other people is theirs
    var t = String(text || ''), mine = new RegExp('\\b' + I.me + '\\b', 'i').test(t);
    var theirs = others(I).some(function (p) { return new RegExp('\\b' + p + '\\b', 'i').test(t); });
    return mine || !theirs;
  }
  function icon(t) {
    t = String(t).toLowerCase();
    if (/whale/.test(t)) return '🐋'; if (/canyon/.test(t)) return '🏞️'; if (/sunset/.test(t)) return '🌅';
    if (/fl(y|ies|ight)|land/.test(t)) return '✈️'; if (/boat|ferry/.test(t)) return '⛴️';
    if (/tour/.test(t)) return '🚐'; if (/free day|beach|swim/.test(t)) return '🏖️';
    if (/check in|check-in|hotel|inn|pension|suites|sleep/.test(t)) return '🏨'; if (/rest/.test(t)) return '😴';
    if (/eat|lunch|dinner|food/.test(t)) return '🍜'; return '📍';
  }
  var PRI = [/whale/, /canyon/, /tour/, /sunset/, /free day/, /boat|ferry/, /fl(y|ies|ight)|land/, /arrive/, /check/];
  function highlight(stops) {
    for (var i = 0; i < PRI.length; i++) for (var j = 0; j < stops.length; j++) if (PRI[i].test(String(stops[j].what).toLowerCase())) return stops[j];
    return stops[0] || { what: 'Free time' };
  }
  function clean(t) { t = String(t || '').replace(/^Tour Day \d+:?\s*/i, '').replace(/\s*\(PR \d+\)/, ''); return t.charAt(0).toUpperCase() + t.slice(1); }

  /* ---------- penpen's excited line ---------- */
  function cheer(I) {
    var n = I.left, nm = I.me ? I.me + ', ' : '', next = I.days[0] ? clean(highlight(I.days[0].stops).what) : '';
    if (I.phase === 'after') return 'What a trip!! 🥹 Want to make a little <b>diary recap</b> together?';
    if (I.phase === 'during') {
      var d = I.days.filter(function (x) { return x.day === ymd(new Date()); })[0];
      return d ? 'Today\'s chapter: <b>' + esc(clean(highlight(d.stops).what)) + '</b> ' + icon(highlight(d.stops).what) + ' — I\'m so ready!' : 'Trip mode ON 🐧 Tell me any expense and I\'ll note it.';
    }
    if (n === null) return 'Hi ' + esc(I.me || 'there') + '! Tell me any expense, or ask me anything. 🐧';
    if (n <= 0) return 'IT\'S TODAY!!! 🎉 Let\'s goooo ✈️';
    if (n === 1) return 'TOMORROW!!! 🤩 I can\'t sleep. Passport, charger, sunscreen?';
    if (n <= 7) return nm + 'this is the week!!! ☀️ Start packing — first up: <b>' + esc(next) + '</b>';
    if (n <= 14) return 'Under two weeks!! 🛂 Passports ready? I\'m practising my beach waddle.';
    if (n <= 30) return n + ' sleeps!! 🐧💤 I\'m already dreaming about <b>' + esc(next || 'the trip') + '</b>.';
    return 'Plenty of time — but I\'m already wiggling with excitement 🐧✨';
  }

  /* ---------- Today ---------- */
  function paint() {
    var t = document.getElementById('today'), sc = document.getElementById('pp-scene');
    if (!t || !sc || localStorage.getItem('pp_simple') === '0') {
      ['pp-story-hero', 'pp-story-say', 'pp-story-crew', 'pp-story'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
      bell(); return;
    }
    var I = info();
    // hero
    var big, small;
    if (I.phase === 'during') { big = 'Day ' + (I.dayNo || (I.days.map(function (d) { return d.day; }).indexOf(ymd(new Date())) + 1) || '—'); small = 'of your trip 🌴'; }
    else if (I.phase === 'after') { big = '🎉'; small = 'Trip complete!'; }
    else if (I.left === null) { big = '🐧'; small = 'Your trip'; }
    else if (I.left <= 0) { big = 'Today!'; small = 'the trip begins ✈️'; }
    else { big = String(I.left); small = I.left === 1 ? 'day to go!' : 'days to go!'; }
    var total = Math.max(I.days.length, 1), doneN = I.phase === 'after' ? total : I.phase === 'during' ? I.days.filter(function (d) { return d.day < ymd(new Date()); }).length + 1 : 0;
    var dots = I.days.length ? '<div class="dots">' + I.days.map(function (d, i) { return '<i class="' + (i < doneN ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '';
    var hero = '<div class="sun">' + (I.phase === 'after' ? '🎈' : '☀️') + '</div><div class="n">' + esc(big) + '</div><div class="l">' + esc(small) + '</div>' + dots +
      '<button type="button" class="trip">🧳 ' + esc(I.trip) + ' ▾</button>';
    put(t, 'pp-story-hero', 'div', hero, t.firstChild);
    document.querySelector('#pp-story-hero .trip').onclick = openTrips;
    // penpen talks
    put(t, 'pp-story-say', 'div', cheer(I), document.getElementById('pp-story-hero').nextSibling);
    // who's coming
    var o = others(I), crew = !o.length ? '🧳 Solo trip · just you & penpen' : o.length === 1 ? '👫 You & ' + esc(o[0]) + ' · travel buddies' : '🐧 Your crew · ' + (o.length + 1) + ' travel buddies';
    put(t, 'pp-story-crew', 'div', crew, sc);
    // the story
    var html = '';
    if (I.days.length) {
      var td = ymd(new Date()), shown = 0, chapters = '';
      if (I.phase === 'before') chapters += ch('now', '📦', 'Prologue · now', 'Getting ready', I.left !== null ? 'Countdown: ' + I.left + (I.left === 1 ? ' day' : ' days') : '');
      I.days.forEach(function (d, i) {
        var cls = d.day < td ? 'done' : d.day === td ? 'now' : '';
        if (cls === 'done' && I.phase !== 'after') return;    // past chapters fold away during the trip
        if (shown >= 4) return; shown++;
        var hl = highlight(d.stops), rest = d.stops.filter(function (s) { return s !== hl; }).slice(0, 2).map(function (s) { return clean(s.what); }).join(' · ');
        chapters += ch(cls, cls === 'done' ? '✓' : icon(hl.what), 'Chapter ' + (i + 1) + ' · ' + d.label + (cls === 'now' ? ' · today' : ''), clean(hl.what), rest);
      });
      html = '<h3>' + (I.phase === 'after' ? 'The story 📖' : I.phase === 'during' ? 'Your story so far 📖' : 'The story ahead 📖') + '</h3>' + chapters + '<button type="button" class="all">See every chapter ›</button>';
    }
    var st = put(t, 'pp-story', 'div', html, null);
    st.onclick = function (e) { if (e.target.closest('button')) nav('Plan'); };
    bell();
  }
  function ch(cls, ic, k, title, sub) {
    return '<button type="button" class="ch ' + cls + '"><span class="rail"><b>' + ic + '</b><i></i></span><span class="bd"><span class="k">' + esc(k) + '</span><div class="t">' + esc(title) + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</span></button>';
  }
  function put(parent, id, tag, html, before) {
    var e = document.getElementById(id);
    if (!e) { e = document.createElement(tag); e.id = id; }
    if (e.parentNode !== parent || (before !== undefined && before !== null && e.nextSibling !== before && e !== before)) parent.insertBefore(e, before || null);
    if (e.dataset.h !== html) { e.innerHTML = html; e.dataset.h = html; }
    return e;
  }

  /* ---------- 🔔 bell ---------- */
  function when(day, time) {
    var m = String(time || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)/i), d = new Date(day + 'T00:00:00');
    if (m) d.setHours((+m[1] % 12) + (/p/i.test(m[3]) ? 12 : 0), +m[2]);
    return d;
  }
  function items() {
    var I = info(), out = [], now = new Date(), td = ymd(now), tm = ymd(new Date(now.getTime() + 864e5));
    I.days.forEach(function (d) {
      if (d.day !== td && d.day !== tm) return;
      d.stops.forEach(function (s) {
        if (!/fl(y|ies|ight)|land|boat|ferry|bus|train|pick-?up/i.test(s.what) || !isMine(I, s.what)) return;
        var w = when(d.day, s.time); if (s.time && w < now) return;
        out.push({ id: 'go:' + d.day + ':' + s.what, ic: icon(s.what), t: (d.day === td ? 'Today' : 'Tomorrow') + (s.time ? ' · ' + s.time : ''), s: s.what + (s.place ? ' — ' + s.place : ''), go: 'Plan' });
      });
    });
    var T = I.T, st = String(T.settle || ''), m = st.match(/^(.+?) owes (.+?) (₱?[\d,.]+)$/);
    if (m && I.me && (m[1] === I.me || m[2] === I.me)) {
      var amt = m[3].replace(/\.\d\d$/, '');
      out.push({ id: 'owe:' + st, ic: '💸', t: m[1] === I.me ? 'You owe ' + m[2] + ' ' + amt : m[1] + ' owes you ' + amt, s: 'Tap to settle up when you\'re ready', go: 'Money' });
    }
    var look = T.look; var n = Array.isArray(look) ? look.length : (look && (look.count || look.n)) || 0;
    if (n) out.push({ id: 'look:' + n, ic: '🔎', t: n + (n === 1 ? ' entry needs' : ' entries need') + ' a look', s: 'Quick check so the money adds up', go: 'Money' });
    if (I.phase === 'before' && I.left !== null && I.left <= 3 && I.left >= 1) out.push({ id: 'soon:' + td, ic: '🎒', t: I.left === 1 ? 'Trip starts tomorrow!' : 'Trip in ' + I.left + ' days', s: 'Passport · charger · sunscreen · pesos', go: 'Plan' });
    return out;
  }
  function seen() { return get('pp_bell_seen') || {}; }
  function bell() {
    var me = document.getElementById('pp-mebtn'); if (!me) return;
    var b = document.getElementById('pp-bell');
    if (!b) { b = document.createElement('button'); b.id = 'pp-bell'; b.type = 'button'; b.setAttribute('aria-label', 'Reminders'); b.onclick = openBell; me.parentNode.insertBefore(b, me); }
    var S = seen(), n = items().filter(function (x) { return !S[x.id]; }).length;
    var h = '🔔' + (n ? '<em>' + n + '</em>' : '');
    if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; }
  }
  function sheet(title, body) {
    var s = document.createElement('div'); s.className = 'pp-sheet';
    s.innerHTML = '<div class="in"><h2>' + title + '<button type="button" aria-label="Close">✕</button></h2><div class="bd">' + body + '</div></div>';
    s.onclick = function (e) { if (e.target === s || e.target.closest('h2 button')) s.remove(); };
    document.body.appendChild(s); return s;
  }
  function openBell() {
    var list = items(), S = seen();
    var body = list.length ? list.map(function (x, i) {
      return '<button type="button" class="it' + (S[x.id] ? '' : ' new') + '" data-i="' + i + '"><span class="ic">' + x.ic + '</span><span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span></button>';
    }).join('') : '<div class="empty">🐧 All quiet! I\'ll ring here the day before each of your flights and boats.</div>';
    var s = sheet('Reminders', body);
    list.forEach(function (x) { S[x.id] = 1; }); localStorage.setItem('pp_bell_seen', JSON.stringify(S)); bell();
    s.querySelector('.bd').onclick = function (e) { var b = e.target.closest('.it'); if (!b) return; s.remove(); nav(list[+b.dataset.i].go); };
  }

  /* ---------- 🧳 My trips ---------- */
  function openTrips() {
    if (!window.ppTrips) return;
    var s = sheet('My trips', '<div class="empty">Loading your trips…</div>');
    var bd = s.querySelector('.bd');
    window.ppTrips.list().then(function (l) {
      var cur = window.ppTrips.current();
      bd.innerHTML = l.map(function (x, i) {
        var on = (x.id || '') === (cur || '') || (!cur && x.home);
        var dates = x.start ? x.start + (x.end ? ' → ' + x.end : '') : (x.home ? 'Your first trip' : '');
        return '<button type="button" class="it' + (on ? ' on' : '') + '" data-i="' + i + '"><span class="ic">' + (on ? '🧳' : '🗺️') + '</span><span><b>' + esc(x.name) + '</b><small>' + esc(dates) + ' · ' + esc(x.role) + '</small></span>' + (on ? '<span class="ok">✓</span>' : '') + '</button>';
      }).join('') + '<button type="button" class="go" data-new="1">＋ New trip</button>';
      bd.onclick = function (e) {
        if (e.target.closest('[data-new]')) return newTrip(s);
        var b = e.target.closest('.it'); if (!b) return;
        var x = l[+b.dataset.i]; if ((x.id || '') === (cur || '')) return s.remove();
        bd.innerHTML = '<div class="empty">🐧 Opening ' + esc(x.name) + '…</div>';
        window.ppTrips.open(x.id, x.name);
      };
    }, function () { bd.innerHTML = '<div class="empty">Couldn\'t load your trips — check your connection.</div>'; });
  }
  function newTrip(s) {
    s.querySelector('h2').firstChild.textContent = 'New trip';
    var bd = s.querySelector('.bd');
    bd.innerHTML = '<label>Trip name</label><input id="pp-nt-name" placeholder="e.g. Bohol with Mom" maxlength="60">' +
      '<label>Where to?</label><input id="pp-nt-where" placeholder="e.g. Bohol" maxlength="80">' +
      '<div class="two"><div><label>From</label><input id="pp-nt-start" type="date"></div><div><label>To</label><input id="pp-nt-end" type="date"></div></div>' +
      '<button type="button" class="go" id="pp-nt-go">Start this trip 🐧</button><div class="note">You\'ll be the trip creator — invite your travel buddies from Crew.</div>';
    bd.onclick = null;
    var go = document.getElementById('pp-nt-go');
    go.onclick = function () {
      var v = function (id) { return document.getElementById(id).value.trim(); };
      if (!v('pp-nt-name')) { document.getElementById('pp-nt-name').focus(); return; }
      go.disabled = true; go.textContent = '🐧 Packing your new trip… (about 20 seconds)';
      window.ppTrips.create({ name: v('pp-nt-name'), where: v('pp-nt-where'), start: v('pp-nt-start'), end: v('pp-nt-end') }).then(function (t) {
        go.textContent = '✨ Ready! Opening it…'; window.ppTrips.open(t.id, t.name);
      }, function (e) {
        go.disabled = false; go.textContent = 'Start this trip 🐧';
        alert(/getFileById|DriveApp|permission|pahintulot/i.test(e.message) ? 'penpen needs one-time Drive permission from the trip creator first.' : "Couldn't start the trip — " + e.message);
      });
    };
  }
  window.ppOpenTrips = openTrips;
  function profileRow() {
    var w = document.querySelector('#pp-me .wrapme'); if (!w || w.querySelector('.pp-tripsrow')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pp-tripsrow';
    b.innerHTML = '<span style="font-size:24px">🧳</span><span><b>My trips</b><small>' + esc(localStorage.getItem('pp_trip_name') || ((cached('penpenToday') || {}).hello || {}).trip || 'Switch trip or start a new one') + '</small></span><span class="chev">›</span>';
    b.onclick = openTrips; w.insertBefore(b, w.firstChild);
  }

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { try { paint(); profileRow(); } catch (e) { console.warn(e); } busy = false; });
    }).observe(document.body, { childList: true, subtree: true });
    paint();
    setInterval(paint, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
