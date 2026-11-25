/* penpen Today as a story + the 🔔 bell + My trips.
   Today:  countdown hero → penpen's speech bubble → "You & Brad" label → scene → tiles → the story (one chapter per day).
   Bell:   reminders worked out on the phone (no setup): your trips the day before and on the day, money to settle, entries to check.
           Flights/boats that name someone else ("Brad flies…") are theirs, so they stay out of your bell.
   Trips:  "My trips" (switch trip) and "New trip", from My profile or the trip name on Today. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function cached(fn) { return get('pp_c_' + fn + ':[]'); }
  function nav(label) { if (window.ppGoTab && window.ppGoTab(label)) return; var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === label && x.className !== 'back'; })[0]; if (b) b.click(); }
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
        '#pp-story-hero .sun{position:absolute;right:-16px;top:-16px;font-size:86px;opacity:.9;animation:ppWig 3s ease-in-out infinite}' +
    '@keyframes ppWig{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}' +
    '#pp-story-say{position:relative;z-index:2;margin:6px 0 -2px;background:var(--card);border-radius:22px;padding:12px 16px 12px 14px;font:700 16px/1.35 Nunito,-apple-system,sans-serif;color:var(--ink);box-shadow:0 2px 0 var(--line),0 6px 18px rgba(19,50,74,.08);cursor:pointer;animation:ppSay .35s ease-out}' +
    '#pp-story-say:after{content:"";position:absolute;left:var(--tx,72%);bottom:-13px;width:22px;height:16px;background:var(--card);clip-path:polygon(0 0,100% 0,30% 100%)}' +
    '#pp-story-say .who{display:block;font:900 11.5px Nunito,-apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--accentText);margin-bottom:2px}' +
    '#pp-story-say .hear{float:right;margin:-2px -4px 0 8px;font-size:15px;opacity:.6}' +
    '#pp-story-say b{color:var(--accentText)}@keyframes ppSay{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}' +
    '#pp-story-crew{font:800 13px Nunito,-apple-system,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:16px 2px 8px}' +
    '#pp-story{margin:18px 0 6px}#pp-story h3{font:900 20px Nunito,-apple-system,sans-serif;margin:0 2px 10px;color:var(--ink)}' +
    '#pp-story .ch{display:flex;gap:12px;width:100%;text-align:left;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}' +
    '#pp-story .rail{display:flex;flex-direction:column;align-items:center;width:34px}#pp-story .rail b{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--card);box-shadow:0 1px 0 var(--line);font-size:17px}' +
    '#pp-story .rail i{flex:1;width:3px;background:var(--line);margin:3px 0;min-height:14px}#pp-story .ch:last-of-type .rail i{display:none}' +
    '#pp-story .bd{flex:1;padding:4px 0 16px}#pp-story .k{font:800 12px Nunito,-apple-system,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}' +
    '#pp-story .t{font:800 16px/1.3 Nunito,-apple-system,sans-serif;color:var(--ink);margin-top:2px}#pp-story .s{font-size:13.5px;color:var(--muted);margin-top:2px}' +
    '#pp-story .done{opacity:.55}#pp-story .now .rail b{background:#237566;color:#fff}#pp-story .now .k{color:#237566}' +
    '#pp-story .all{display:block;width:100%;margin-top:2px;min-height:52px;border:0;border-radius:16px;background:var(--chip);color:var(--ink);font:800 15px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    /* bell */
    '#pp-bell{position:relative;width:44px;height:44px;border-radius:50%;border:0;background:var(--card,#fff);box-shadow:0 2px 8px rgba(0,0,0,.08);font-size:21px;margin-left:6px;cursor:pointer;padding:0}' +
    '#pp-bell em{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;border-radius:10px;background:#C8553D;color:#fff;font:800 11.5px/19px -apple-system,sans-serif;font-style:normal;padding:0 5px}' +
    '.pp-sheet{position:fixed;inset:0;z-index:99970;background:rgba(19,50,74,.35);display:flex;align-items:flex-end;justify-content:center}' +
    '.pp-sheet .in{width:100%;max-width:560px;max-height:86vh;overflow:auto;background:var(--bg);border-radius:24px 24px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));font:16px/1.4 Nunito,-apple-system,sans-serif;color:var(--ink)}' +
    '.pp-sheet h2{margin:0 0 12px;font:900 22px Nunito,-apple-system,sans-serif;display:flex;align-items:center}.pp-sheet h2 button{margin-left:auto;border:0;background:var(--card);border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer;color:var(--ink)}' +
    '.pp-sheet .it{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:0;background:var(--card);border-radius:16px;padding:13px 14px;margin:0 0 8px;font:inherit;color:inherit;cursor:pointer}' +
    '.pp-sheet .it .ic{font-size:22px;line-height:1.1}.pp-sheet .it b{display:block;font-weight:800}.pp-sheet .it small{display:block;color:var(--muted);font-size:13.5px}' +
    '.pp-sheet .it.new{box-shadow:inset 4px 0 0 #C8553D}.pp-sheet .it.on{box-shadow:inset 0 0 0 2px #237566}.pp-sheet .it .ok{margin-left:auto;color:#237566;font-weight:900}' +
    '.pp-sheet .it .del{margin-left:auto;align-self:center;font-size:13px;font-weight:800;color:#C8553D;padding:6px 8px;border-radius:10px}.pp-sheet .it .del.sure{background:#C8553D;color:#fff}' +
    '.pp-sheet .empty{text-align:center;color:var(--muted);padding:18px 8px}' +
    '.pp-sheet label{display:block;font:800 13px Nunito,-apple-system,sans-serif;margin:12px 2px 4px;color:var(--muted)}' +
    '.pp-sheet input{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:14px;padding:12px;font:16px Nunito,-apple-system,sans-serif;background:var(--card);color:var(--ink)}' +
    '.pp-sheet .two{display:flex;gap:10px}.pp-sheet .two > div{flex:1}' +
    '.pp-sheet .go{display:block;width:100%;min-height:56px;margin-top:16px;border:0;border-radius:16px;background:#237566;color:#fff;font:800 17px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    '.pp-sheet .go[disabled]{opacity:.6}.pp-sheet .note{font-size:13px;color:var(--muted);margin-top:8px;text-align:center}' +
    '#pp-me .pp-tripsrow{display:flex;width:100%;align-items:center;gap:12px;border:0;background:#237566;color:#fff;border-radius:18px;padding:15px 16px;margin:12px 0 0;font:inherit;text-align:left;cursor:pointer}' +
    '#pp-me .pp-tripsrow small{display:block;opacity:.85;font-size:13px}#pp-me .pp-tripsrow .chev{margin-left:auto}' +
    '#pp-bell em.seen{background:var(--muted)}' +
    '.pp-pop{background:rgba(19,50,74,.18);display:block}.pp-pop .in{position:fixed;max-height:min(70vh,520px);border-radius:20px;padding:14px 12px 12px;box-shadow:0 14px 40px rgba(19,50,74,.28);animation:ppDrop .16s ease-out}' +
    '.pp-pop .in:before{content:"";position:absolute;top:-7px;left:var(--ax,20px);width:14px;height:14px;background:var(--bg);transform:rotate(45deg);border-radius:3px}' +
    '.pp-pop h2{font-size:18px;margin:0 2px 10px}.pp-pop h2 button{width:30px;height:30px;font-size:15px}.pp-pop .it{padding:11px 12px}' +
    '@keyframes ppDrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}';

  /* ---------- reading the trip ---------- */
  function info() {
    var T = load('penpenToday') || {}, P = load('penpenPlan') || {};
    // a label saved on an earlier day ("46 days to go") is out of date: work it out from the plan's dates instead
    var h = T.hello || {}, label = !window.ppFromToday || window.ppFromToday('penpenToday') ? String(h.label || '') : '', m;
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
    if (!t || !sc) {
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
    var dots = '';
    var hero = '<div class="sun">' + (I.phase === 'after' ? '🎈' : '☀️') + '</div><div class="n">' + esc(big) + '</div><div class="l">' + esc(small) + '</div>' + dots +
      '<button type="button" class="trip">🧳 ' + esc(I.trip) + ' ▾</button>';
    put(t, 'pp-story-hero', 'div', hero, t.firstChild);
    document.querySelector('#pp-story-hero .trip').onclick = openTrips;
    // who's coming
    // nobody else yet: use the trip type picked in setup, so a Friends trip isn't called solo
    var kind = (cached('penpenProfiles') || {}).tripType, WAIT = { couple: '💑 Couple trip · invite your partner', family: '👨‍👩‍👧 Family trip · invite your family', friends: '🐧 Friends trip · invite your friends' };
    var o = others(I), crew = !o.length ? (WAIT[kind] || '🧳 Solo trip · just you & penpen') : o.length === 1 ? '👫 You & ' + esc(o[0]) + ' · travel buddies' : '🐧 ' + (o.length + 1) + ' travel buddies';
    put(t, 'pp-story-crew', 'div', crew, sc);
    // penpen's line now pops up over his head when you tap him (me.js)
    var old = document.getElementById('pp-story-say'); if (old) old.remove();
    window.ppCheer = function () { var d = document.createElement('div'); d.innerHTML = cheer(info()); return d.textContent; };
    if (window.ppVoicePrefetch && paint.pf !== window.ppCheer()) { paint.pf = window.ppCheer(); setTimeout(function () { window.ppVoicePrefetch(paint.pf); }, 1500); }   // ready before you tap him
    // the header already has the date; the countdown lives in the big card
    var dt = document.querySelector('header .date');
    if (dt && / · \d+ days? to go/i.test(dt.textContent)) dt.textContent = dt.textContent.replace(/ · \d+ days? to go/i, '');
    // the story
    var html = '';
    if (I.days.length) {
      var td = ymd(new Date()), shown = 0, chapters = '';
      if (I.phase === 'before') chapters += ch('now', '📦', 'Prologue · now', 'Getting ready', 'Passports · chargers · sunscreen · pesos');
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
      out.push({ id: 'owe:' + st, ic: '💸', t: m[1] === I.me ? 'You owe ' + m[2] + ' ' + amt : m[1] + ' owes you ' + amt, s: 'Tap to settle up when you\'re ready', go: 'Money', todo: true });
    }
    var look = T.look; var n = Array.isArray(look) ? look.length : (look && (look.count || look.n)) || 0;
    if (n) out.push({ id: 'look:' + n, ic: '🔎', t: n + (n === 1 ? ' entry needs' : ' entries need') + ' a look', s: 'Quick check so the money adds up', go: 'Money', todo: true });
    if (I.phase === 'before' && I.left !== null && I.left <= 3 && I.left >= 1) out.push({ id: 'soon:' + td, ic: '🎒', t: I.left === 1 ? 'Trip starts tomorrow!' : 'Trip in ' + I.left + ' days', s: 'Passport · charger · sunscreen · pesos', go: 'Plan' });
    if (window.ppFeed) { try { out = out.concat(window.ppFeed()); } catch (e) {} }   // app updates + what the crew logged this week
    return out;
  }
  function seen() { return get('pp_bell_seen') || {}; }
  function bell() {
    var me = document.getElementById('pp-mebtn'); if (!me) return;
    var b = document.getElementById('pp-bell');
    if (!b) { b = document.createElement('button'); b.id = 'pp-bell'; b.type = 'button'; b.setAttribute('aria-label', 'Reminders'); b.onclick = openBell; me.parentNode.insertBefore(b, me); }
    // the number = new things + money to-dos that aren't finished yet; read updates stay in the list for a week
    var S = seen(), all = items(), n = all.filter(function (x) { return !S[x.id] || x.todo; }).length;
    var h = '🔔' + (n ? '<em>' + n + '</em>' : '');
    b.setAttribute('aria-label', 'Notifications' + (n ? ', ' + n + ' new' : ''));
    if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; }
  }
  // a little dropdown that opens right under the button you tapped (like normal notifications)
  function sheet(title, body, anchor, align) {
    [].slice.call(document.querySelectorAll('.pp-sheet')).forEach(function (x) { x.remove(); });
    var s = document.createElement('div'); s.className = 'pp-sheet pp-pop';
    s.innerHTML = '<div class="in"><h2>' + title + '<button type="button" aria-label="Close">✕</button></h2><div class="bd">' + body + '</div></div>';
    s.onclick = function (e) { if (e.target === s || e.target.closest('h2 button')) s.remove(); };
    document.body.appendChild(s);
    var inn = s.querySelector('.in'), W = Math.min(380, window.innerWidth - 20);
    inn.style.width = W + 'px';
    if (anchor) {
      var r = anchor.getBoundingClientRect(), left = align === 'left' ? r.left : r.right - W;
      left = Math.max(10, Math.min(window.innerWidth - W - 10, left));
      inn.style.left = left + 'px'; inn.style.top = (r.bottom + 10) + 'px';
      inn.style.setProperty('--ax', Math.max(14, Math.min(W - 28, r.left + r.width / 2 - left - 8)) + 'px');
    }
    return s;
  }
  function openBell() {
    var list = items(), S = seen();
    var body = list.length ? list.map(function (x, i) {
      return '<button type="button" class="it' + (S[x.id] && !x.todo ? '' : ' new') + '" data-i="' + i + '"><span class="ic">' + x.ic + '</span><span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span></button>';
    }).join('') : '<div class="empty">🐧 All quiet! Updates, reminders and what your travel buddies log show up here.</div>';
    var s = sheet('Notifications', body, document.getElementById('pp-bell'), 'right');
    list.forEach(function (x) { S[x.id] = 1; }); localStorage.setItem('pp_bell_seen', JSON.stringify(S)); bell();
    s.querySelector('.bd').onclick = function (e) { var b = e.target.closest('.it'); if (!b) return; s.remove(); nav(list[+b.dataset.i].go); };
  }

  /* ---------- 🧳 My trips ---------- */
  function openTrips() {
    if (!window.ppTrips) return;
    var s = sheet('My trips', '<div class="empty">Loading your trips…</div>', this && this.nodeType ? this : document.querySelector('#pp-story-hero .trip'), 'left');
    var bd = s.querySelector('.bd');
    window.ppTrips.list().then(function (l) {
      var cur = window.ppTrips.current();
      bd.innerHTML = l.map(function (x, i) {
        var on = (x.id || '') === (cur || '') || (!cur && x.home);
        var dates = x.start ? x.start + (x.end ? ' → ' + x.end : '') : (x.home ? 'Your first trip' : '');
        return '<button type="button" class="it' + (on ? ' on' : '') + '" data-i="' + i + '"><span class="ic">' + (on ? '🧳' : '🗺️') + '</span><span><b>' + esc(x.name) + '</b><small>' + esc(dates) + ' · ' + esc(x.role) + '</small></span>' + (on ? '<span class="ok">✓</span>' : (!x.home && x.role === 'creator' ? '<span class="del" data-del="' + i + '">Delete</span>' : '')) + '</button>';
      }).join('') + '<button type="button" class="go" data-new="1">＋ New trip</button>';
      bd.onclick = function (e) {
        if (e.target.closest('[data-new]')) return newTrip(s);
        var del = e.target.closest('.del');
        if (del) {
          e.stopPropagation();
          if (!del.classList.contains('sure')) { del.classList.add('sure'); del.textContent = 'Tap again to delete'; return; }
          del.textContent = 'Deleting…';
          window.ppTrips.remove(l[+del.dataset.del].id).then(function () { s.remove(); openTrips(); }, function (er) { del.textContent = 'Couldn\'t delete'; });
          return;
        }
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
      '<button type="button" class="go" id="pp-nt-go">Start this trip 🐧</button><div class="note">You\'ll be the trip creator — invite your travel buddies right after.</div>';
    bd.onclick = null;
    var go = document.getElementById('pp-nt-go');
    go.onclick = function () {
      var v = function (id) { return document.getElementById(id).value.trim(); };
      if (!v('pp-nt-name')) { document.getElementById('pp-nt-name').focus(); return; }
      go.disabled = true; go.textContent = '🐧 Packing your new trip… (up to a minute)';
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
    return;   // trips now live in My profile's album
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
