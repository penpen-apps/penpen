/* penpen polish — Today hero, daily hook, my-location weather, privacy, offline banner,
   penpen's feature tour and the profile calendar. Loaded after more.js. */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function cache(fn) { var c = get('pp_c_' + fn + ':[]', null); return c && (c.data || c); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function say(text) { try { if (window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } } catch (e) {} }
  function penSvg(size) {
    var n = $('#navpen svg'), inner = window.ppLook && window.ppGuideNow ? window.ppLook.svg(window.ppGuideNow()) : (n ? n.innerHTML : '');
    return '<svg viewBox="-7 -14 134 134" width="' + size + '" height="' + size + '" aria-hidden="true">' + (inner || '') + '</svg>';
  }

  /* ---------- 1. the middle penpen fills his circle ---------- */
  function fillNav() { var s = $('#navpen svg'); if (s && s.getAttribute('viewBox') !== '-1 -6 122 122') s.setAttribute('viewBox', '-1 -6 122 122'); }

  /* ---------- 2. Today: greeting + countdown in one header, a bigger scene ---------- */
  function hero() {
    var h = $('#pp-story-hero'), hello = $('header.hero .hello');
    if (!h || !hello) return;
    var n = $('.n', h), l = $('.l', h), trip = $('.trip', h);
    var cd = $('#pp-cd', hello);
    if (!cd) { cd = document.createElement('div'); cd.id = 'pp-cd'; hello.appendChild(cd); }
    var html = '<span class="cdn">' + esc(n ? n.textContent.trim() : '') + '</span><span class="cdl">' + esc(l ? l.textContent.trim() : '') + '</span>' +
      (trip ? '<button type="button" class="cdt">' + esc(trip.textContent.trim()) + '</button>' : '');
    if (cd.getAttribute('data-h') !== html) { cd.innerHTML = html; cd.setAttribute('data-h', html); var b = $('.cdt', cd); if (b) b.onclick = function () { trip.click(); }; }
    var bg = $('#pp-scene svg.pp-bg'); if (bg && bg.getAttribute('preserveAspectRatio') !== 'xMidYMid slice') bg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }

  /* ---------- 3. a reason to open Today every day ---------- */
  var WORDS = [['Salamat', 'sa-LA-mat', 'Thank you'], ['Maayong buntag', 'ma-A-yong boon-TAG', 'Good morning'], ['Pila ni?', 'PEE-la nee', 'How much is this?'], ['Lami kaayo!', 'LA-mee ka-A-yo', 'So delicious!'],
    ['Asa ang CR?', 'A-sa ang see-AR', 'Where is the restroom?'], ['Palihug', 'pa-LEE-hoog', 'Please'], ['Hinay-hinay lang', 'HEE-nai HEE-nai lang', 'Slow down / take it easy'], ['Unsa ni?', 'OON-sa nee', 'What is this?'],
    ['Busog na ko', 'BOO-sog na ko', 'I\'m full'], ['Ingat!', 'EE-ngat', 'Take care!'], ['Tagpila?', 'tag-PEE-la', 'How much each?'], ['Para lang!', 'PA-ra lang', 'Stop here, please (to the driver)'],
    ['Gwapa / Gwapo', 'GWA-pa / GWA-po', 'Beautiful / Handsome'], ['Way problema', 'wai pro-BLE-ma', 'No problem'], ['Kumusta ka?', 'koo-MOOS-ta ka', 'How are you?']];
  var QS = [['Which island is Oslob on?', ['Cebu', 'Bohol', 'Palawan'], 0], ['What’s “thank you” in Bisaya?', ['Salamat', 'Gracias', 'Maayo'], 0], ['Whale sharks eat mostly…', ['Plankton', 'Tuna', 'Seaweed'], 0],
    ['What’s Cebu’s famous roast pig?', ['Lechon', 'Adobo', 'Sinigang'], 0], ['A group of penguins in water is a…', ['Raft', 'Pod', 'Waddle'], 0], ['Dipolog is on which island?', ['Mindanao', 'Luzon', 'Samar'], 0],
    ['Moalboal is famous for…', ['Sardine run', 'Rice terraces', 'Volcano'], 0], ['Puso is rice wrapped in…', ['Woven palm leaves', 'Banana peel', 'Paper'], 0], ['The Philippine peso sign is…', ['₱', '₽', '£'], 0],
    ['Fastest swimming penguin?', ['Gentoo', 'Emperor', 'Little blue'], 0], ['Kawasan Falls is in…', ['Badian, Cebu', 'Bohol', 'Siargao'], 0], ['“Lami” means…', ['Delicious', 'Cold', 'Far'], 0]];
  function dayNo() { return Math.floor(Date.now() / 864e5); }
  function daily() {
    var tiles = $('#pp-tiles'); if (!tiles) return;
    var card = $('#pp-daily'), D = get('pp_daily', {}), td = today();
    var w = WORDS[dayNo() % WORDS.length], q = QS[dayNo() % QS.length], done = D.d === td;
    var key = td + (done ? 'y' : 'n');
    if (card && card.getAttribute('data-k') === key) return;
    if (!card) { card = document.createElement('div'); card.id = 'pp-daily'; tiles.parentNode.insertBefore(card, tiles.nextSibling); }
    card.setAttribute('data-k', key);
    var streak = D.s || 0;
    card.innerHTML = '<div class="dh">' + penSvg(38) + '<div><b>penpen’s daily</b><small>' + (streak ? '🔥 ' + streak + '-day streak' : 'Come back every day for a streak') + '</small></div></div>' +
      '<div class="dw"><div><small>Word of the day</small><b>' + esc(w[0]) + '</b><span>' + esc(w[1]) + ' · ' + esc(w[2]) + '</span></div><button type="button" class="hear" aria-label="Hear it">🔊</button></div>' +
      (done ? '<div class="dq ok">✅ You answered today’s question. ' + (D.r ? '+5 coins for penpen!' : 'See you tomorrow!') + '</div>'
        : '<div class="dq"><small>Today’s question · +5 coins</small><b>' + esc(q[0]) + '</b><div class="ch">' + order(q).map(function (o) { return '<button type="button" data-i="' + o[1] + '">' + esc(o[0]) + '</button>'; }).join('') + '</div></div>');
    $('.hear', card).onclick = function () { say(w[0] + '. ' + w[2] + '.'); };
    $$('.ch button', card).forEach(function (b) {
      b.onclick = function () {
        var right = +b.dataset.i === q[2], y = new Date(Date.now() - 864e5), yd = y.getFullYear() + '-' + ('0' + (y.getMonth() + 1)).slice(-2) + '-' + ('0' + y.getDate()).slice(-2);
        var s = D.d === yd ? (D.s || 0) + 1 : 1;
        b.classList.add(right ? 'yes' : 'no');
        if (!right) { var c = $('.ch button[data-i="' + q[2] + '"]', card); if (c) c.classList.add('yes'); }
        if (right) { var p = get('pp_pet', null); if (p) { p.coins = (p.coins || 0) + 5; set('pp_pet', p); } }
        set('pp_daily', { d: td, s: s, r: right });
        setTimeout(function () { card.removeAttribute('data-k'); daily(); }, 1400);
      };
    });
  }
  function order(q) { var a = q[1].map(function (t, i) { return [t, i]; }); var r = dayNo() % 3; return a.slice(r).concat(a.slice(0, r)); }

  /* ---------- 4. weather where *this phone* is (only if you allow it) ---------- */
  var WX = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'cloudy', 45: 'foggy', 48: 'foggy', 51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 80: 'showers', 81: 'showers', 82: 'heavy showers', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm' };
  var here = null, asking = false, perm = 'unknown';
  // weather where you are shows only when this phone already lets penpen use location (and you haven't switched it off here)
  function locOn() { return perm === 'granted' && localStorage.getItem('pp_loc') !== 'off'; }
  function checkPerm(cb) {
    if (!navigator.permissions || !navigator.permissions.query) { perm = localStorage.getItem('pp_loc') === 'on' ? 'granted' : 'prompt'; return cb && cb(); }
    navigator.permissions.query({ name: 'geolocation' }).then(function (r) { perm = r.state; r.onchange = function () { perm = r.state; if (perm === 'granted') fetchHere(true); paintWx(); }; cb && cb(); }, function () { cb && cb(); });
  }
  function fetchHere(force) {
    if (!navigator.geolocation || asking || localStorage.getItem('pp_loc') === 'off') return;
    var c = get('pp_here', null);
    if (c && !force && Date.now() - c.t < 30 * 60e3) { here = c; return paintWx(); }
    asking = true;
    navigator.geolocation.getCurrentPosition(function (p) {
      perm = 'granted'; localStorage.setItem('pp_loc', 'on');
      var la = p.coords.latitude.toFixed(3), lo = p.coords.longitude.toFixed(3);
      Promise.all([
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo + '&current=temperature_2m,weather_code&timezone=auto').then(function (r) { return r.json(); }),
        fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + la + '&longitude=' + lo + '&localityLanguage=en').then(function (r) { return r.json(); }).catch(function () { return {}; })
      ]).then(function (a) {
        var cur = a[0] && a[0].current || {}, g = a[1] || {};
        here = { t: Date.now(), place: g.city || g.locality || g.principalSubdivision || 'Here', temp: Math.round(cur.temperature_2m), label: WX[cur.weather_code] || '' };
        set('pp_here', here); asking = false; paintWx();
      }).catch(function () { asking = false; });
    }, function (e) { asking = false; if (e && e.code === 1) { perm = 'denied'; paintWx(); } }, { maximumAge: 15 * 60e3, timeout: 15000 });
  }
  function paintWx() {
    var t = $('#wxt'), wx = $('#wx'); if (!t || !wx) return;
    var show = locOn() && here;
    wx.style.display = show ? '' : 'none';
    if (show) { var want = '📍 ' + here.place + (isFinite(here.temp) ? ' · ' + here.temp + '° ' + here.label : ''); if (t.textContent !== want) t.textContent = want; wx.title = 'Weather where you are'; }
  }

  /* ---------- 5. full-screen pages (Privacy, Tour) share one look ---------- */
  function page(id, title, body, crumb) {
    var old = document.getElementById(id); if (old) old.remove();
    var w = document.createElement('div'); w.id = id; w.className = 'pp-page'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', title);
    w.innerHTML = '<div class="top"><button class="back" aria-label="Back">‹</button><div class="tt">' + (crumb ? '<small>' + esc(crumb) + ' ›</small>' : '') + '<h2>' + esc(title) + '</h2></div></div><div class="wrap">' + body + '</div>';
    document.body.appendChild(w);
    $('.back', w).onclick = function () { w.remove(); };
    return w;
  }
  window.ppOpenPrivacy = function (from) {
    from = from || 'More';
    var on = locOn(), ex = (localStorage.getItem('pp_sess') || '').length > 0;
    var lo = locOn(), blocked = perm === 'denied';
    var w = page('pp-priv', 'Privacy and account',
      '<div class="pc"><div class="ph"><i>📍</i><div><b>Location</b><small>' + (lo ? 'On. penpen shows the weather where you are. Nothing is sent with your name.' : blocked ? 'Off in your phone settings. Turn it on there if you want local weather.' : localStorage.getItem('pp_loc') === 'off' ? 'Switched off for penpen on this phone.' : 'Not shared. Allow it to see the weather where you are.') + '</small></div></div>' +
      (blocked ? '' : '<button type="button" class="pbtn ' + (lo ? 'off' : 'on') + '" data-a="loc">' + (lo ? 'Withdraw' : 'I allow') + '</button>') + '</div>' +
      '<div class="pc"><div class="ph"><i>🎙️</i><div><b>Microphone</b><small>Used only while you talk to penpen or translate. Your phone asks first, and you can change it in your phone’s settings.</small></div></div></div>' +
      '<h3 class="ptitle">What happens to your data</h3>' +
      '<div class="pc col"><ul class="plist">' +
      '<li><b>Your trip</b> (plans, expenses, crew names and emails) is saved in the trip’s Google Sheet, in the Google Drive of the person who created the trip. Only the crew can see it in penpen.</li>' +
      '<li><b>Your diary</b>: “Just me” entries go to a doc only you can open. “Group” entries are shared with your crew.</li>' +
      '<li><b>Chat, voice and translation</b> are sent to Google’s Gemini service to make penpen’s replies. penpen doesn’t keep recordings of your voice.</li>' +
      '<li><b>On this phone</b> penpen keeps a copy of your trip so it works offline, plus your Play pet and settings.</li>' +
      '<li><b>We never sell</b> your data or use it for ads.</li></ul></div>' +
      '<div class="pc"><div class="ph"><i>🧹</i><div><b>Clear this phone</b><small>Removes everything penpen saved on this phone: the offline copy of every trip, your Play pet and coins, and your settings. Your trips themselves stay safe in their Google Sheets. You’ll need to sign in again.</small></div></div>' +
      '<button type="button" class="pbtn off" data-a="clear">Clear</button></div>' +
      '<p class="pnote">To delete your details from a trip, ask the trip’s creator to remove you from the trip.</p>', from);
    w.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'loc') {
        if (locOn()) { localStorage.setItem('pp_loc', 'off'); localStorage.removeItem('pp_here'); here = null; paintWx(); window.ppOpenPrivacy(from); }
        else { localStorage.removeItem('pp_loc'); b.textContent = 'Asking your phone…'; fetchHere(true); setTimeout(function () { checkPerm(function () { if (document.getElementById('pp-priv')) window.ppOpenPrivacy(from); }); }, 2500); }
      }
      if (b.dataset.a === 'clear' && confirmIn(b)) { localStorage.clear(); location.reload(); }
    });
  };
  function confirmIn(b) { var n = +(b.dataset.sure || 0) + 1; b.dataset.sure = n; if (n >= 3) return true; b.textContent = n === 1 ? 'Are you sure?' : 'Yes, clear it all'; b.classList.add('warn'); return false; }

  /* ---------- 6. offline: everyone can see what still works ---------- */
  function offline() {
    var bar = $('#pp-off');
    if (navigator.onLine) { if (bar) bar.remove(); return; }
    if (bar) return;
    bar = document.createElement('div'); bar.id = 'pp-off';
    bar.innerHTML = '<b>📴 No signal — penpen is napping</b> Your plans, expenses and Play still work. Type expenses in the chat and I’ll log them when you’re back online.';
    document.body.appendChild(bar);
  }
  function napSheet() {
    var old = document.getElementById('pp-nap'); if (old) old.remove();
    var w = document.createElement('div'); w.id = 'pp-nap';
    w.innerHTML = '<div class="nb"><div class="pen">' + penSvg(110).replace('</svg>', '<path d="M45 49 Q51 54 57 49 M63 49 Q69 54 75 49" fill="none" stroke="#1F2A36" stroke-width="3" stroke-linecap="round"/></svg>') + '<span>💤</span></div><b>Oops… no signal, so I’m napping 😴</b><p>I can’t hear you without internet. Type your expense in the chat instead, like “Lunch 450, I paid”. I’ll save it and log it the moment we’re back online 📶</p><button type="button">Got it</button></div>';
    document.body.appendChild(w); w.onclick = function (e) { if (e.target === w || e.target.closest('button')) w.remove(); };
  }
  function queued() { return get('pp_queue', []); }
  function flush() {
    var q = queued(); if (!q.length || !navigator.onLine || !window.ppCall) return;
    set('pp_queue', []);
    var n = 0; q.reduce(function (pr, t) { return pr.then(function () { return window.ppCall('penpenAsk', [t]).then(function () { n++; }, function () { var r = queued(); r.push(t); set('pp_queue', r); }); }); }, Promise.resolve())
      .then(function () { if (n) toast('📶 Back online! I logged ' + n + (n === 1 ? ' thing' : ' things') + ' you told me offline.'); });
  }
  function toast(t) { var d = document.createElement('div'); d.className = 'pp-ptoast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 4200); }
  // hold-to-talk while offline → penpen naps and explains
  function wrapTalk() {
    if (!window.ppTalk || window.ppTalk.ppWrapped) return;
    var orig = window.ppTalk, origT = window.ppTranslate;
    window.ppTalk = function (o) { if (!navigator.onLine) return napSheet(); return orig.apply(this, arguments); }; window.ppTalk.ppWrapped = 1;
    if (origT) window.ppTranslate = function () { if (!navigator.onLine) return napSheet(); return origT.apply(this, arguments); };
  }
  // typing while offline → saved on the phone, sent later
  document.addEventListener('submit', function (e) {
    if (navigator.onLine) return;
    var f = e.target, inp = f && f.closest && f.closest('#p-chat') && f.querySelector('input[type=text],textarea,input:not([type])');
    if (!inp || !inp.value.trim()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var q = queued(); q.push(inp.value.trim()); set('pp_queue', q); inp.value = '';
    toast('Saved on your phone 📝 I’ll log it when we’re back online (' + q.length + ' waiting).');
  }, true);
  addEventListener('online', flush);
  addEventListener('online', offline); addEventListener('offline', offline);

  /* ---------- 7. penpen gives the tour (voice or bubbles), always skippable ---------- */
  var TOUR = [
    ['Hi, I’m penpen! 🐧', 'Your travel buddy. Just tell me things and I’ll remember them, so your crew doesn’t have to.'],
    ['Spent money? Just say it 💸', '“Lunch 450, I paid.” I write it down, split it and keep score. Ask me “Who owes who?” anytime.'],
    ['Your trip, day by day 🗺️', 'Today shows what’s next. Itinerary has every stop, time and direction. Tell me to change things.'],
    ['Lost for words? 🌐', 'Tap Translate, hold your button and talk. I’ll say it in Bisaya, Tagalog and more.'],
    ['No signal? No problem 📴', 'Your plans and expenses stay on your phone, and you can play with me anytime in Play.'],
    ['That’s it! 🎉', 'Tap me in the middle whenever you need anything.']
  ];
  window.ppTour = function () {
    var w = document.getElementById('pp-tour'); if (w) w.remove();
    w = document.createElement('div'); w.id = 'pp-tour'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Feature tour');
    document.body.appendChild(w);
    var i = -1, voice = false;
    function end() { set('pp_tour', 1); try { speechSynthesis.cancel(); } catch (e) {} w.remove(); }
    function show() {
      if (i < 0) {
        w.innerHTML = '<button class="skip" type="button">Skip</button><div class="pen">' + penSvg(150) + '</div><div class="bub"><b>Hi! Want me to show you around?</b><p>It takes 30 seconds.</p></div>' +
          '<div class="acts"><button type="button" class="pri" data-v="1">🔊 Talk me through it</button><button type="button" data-v="0">💬 Can’t listen now</button></div>';
        return;
      }
      var s = TOUR[i];
      w.innerHTML = '<button class="skip" type="button">Skip</button><div class="pen hop">' + penSvg(150) + '</div><div class="bub"><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></div>' +
        '<div class="dots">' + TOUR.map(function (x, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="acts">' + (i ? '<button type="button" data-n="-1">Back</button>' : '') + '<button type="button" class="pri" data-n="1">' + (i === TOUR.length - 1 ? 'Let’s go' : 'Next') + '</button></div>';
      if (voice) say(s[0].replace(/[^\w\s’',.!?]/g, '') + ' ' + s[1]);
    }
    w.onclick = function (e) {
      if (e.target.closest('.skip')) return end();
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.v) { voice = b.dataset.v === '1'; i = 0; return show(); }
      if (b.dataset.n) { i += +b.dataset.n; if (i >= TOUR.length) return end(); show(); }
    };
    show();
  };

  /* ---------- 8. Settings: Help & support; Profile: my calendar ---------- */
  window.ppPage = page;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pp-me [data-x]'); if (!b) return;
    if (b.dataset.x === 'tour') window.ppTour();
    if (b.dataset.x === 'priv') window.ppOpenPrivacy('Settings');
    if (b.dataset.x === 'about') page('pp-about', 'About penpen', '<div class="pc col"><div class="ph"><i>🐧</i><div><b>penpen, your travel buddy</b><small>Keeps your group’s plans, money and memories in one place. Just tell penpen.</small></div></div></div><div class="pc col"><div class="ph"><i>✨</i><div><b>Built with Gemini</b><small>penpen’s chat, voice and translation are powered by Google Gemini.</small></div></div></div><div class="pc col"><div class="ph"><i>📴</i><div><b>Works offline</b><small>Your saved trip, Crew, Bookings and Play work with no signal.</small></div></div></div>', 'Settings');
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d.classList || !d.classList.contains('grp')) return;
    var k = (d.querySelector('summary span') || {}).textContent || ''; var o = get('pp_grp', {}); o[k.slice(0, 20)] = d.open; set('pp_grp', o);
  }, true);
  function settingsExtras() {
    var o = get('pp_grp', null); if (!o) return;
    $$('#pp-me details.grp:not([data-r])').forEach(function (d) { d.setAttribute('data-r', '1'); var k = ((d.querySelector('summary span') || {}).textContent || '').slice(0, 20); if (k in o) d.open = o[k]; });
  }
  var CC = { 'Asia/Manila': 'PH', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Australia/Sydney': 'AU', 'Europe/London': 'GB', 'America/Los_Angeles': 'US', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Toronto': 'CA', 'Asia/Hong_Kong': 'HK', 'Asia/Dubai': 'AE' };
  var PH = { '2026-01-01': 'New Year’s Day', '2026-04-02': 'Maundy Thursday', '2026-04-03': 'Good Friday', '2026-04-09': 'Day of Valor', '2026-05-01': 'Labor Day', '2026-06-12': 'Independence Day', '2026-08-31': 'National Heroes Day', '2026-11-01': 'All Saints’ Day', '2026-11-30': 'Bonifacio Day', '2026-12-08': 'Immaculate Conception', '2026-12-24': 'Christmas Eve', '2026-12-25': 'Christmas Day', '2026-12-30': 'Rizal Day', '2026-12-31': 'New Year’s Eve',
    '2027-01-01': 'New Year’s Day', '2027-03-25': 'Maundy Thursday', '2027-03-26': 'Good Friday', '2027-04-09': 'Day of Valor', '2027-05-01': 'Labor Day', '2027-06-12': 'Independence Day', '2027-08-30': 'National Heroes Day', '2027-11-01': 'All Saints’ Day', '2027-11-30': 'Bonifacio Day', '2027-12-08': 'Immaculate Conception', '2027-12-25': 'Christmas Day', '2027-12-30': 'Rizal Day' };
  function holidays(y, cb) {
    var cc = CC[(Intl.DateTimeFormat().resolvedOptions().timeZone) || ''] || 'PH', k = 'pp_hol_' + cc + y, c = get(k, null);
    if (c) return cb(c, cc);
    var fb = {}; if (cc === 'PH') Object.keys(PH).forEach(function (d) { if (d.indexOf(y) === 0) fb[d] = PH[d]; });
    cb(fb, cc);
    fetch('https://date.nager.at/api/v3/PublicHolidays/' + y + '/' + cc).then(function (r) { return r.json(); }).then(function (a) {
      var o = {}; a.forEach(function (h) { o[h.date] = h.localName === h.name ? h.name : h.name; }); if (cc === 'PH') Object.keys(fb).forEach(function (d) { if (!o[d]) o[d] = fb[d]; });
      set(k, o); cb(o, cc);
    }).catch(function () {});
  }
  function tripDays() {
    var out = {}, list = get('pp_trips_list', []), P = cache('penpenPlan') || {}, cur = localStorage.getItem('pp_trip_id') || '';
    list.forEach(function (t) {
      var s = t.start, e = t.end;
      if ((t.id || '') === cur && P.days && P.days.length) { s = P.days[0].day; e = P.days[P.days.length - 1].day; }
      if (!s) return; var a = new Date(s + 'T00:00'), b = new Date((e || s) + 'T00:00');
      for (var d = a; d <= b; d = new Date(d.getTime() + 864e5)) { var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); out[k] = t.name; }
    });
    return out;
  }
  var calM = null;
  function calendar() {
    var me = $('#pp-me:not(.pp-set)'); if (!me) { calM = null; return; }
    var sum = $('.sum', me), stats = sum && $('.stats', sum); if (!stats) return;
    var box = $('#pp-cal', me);
    if (box && box.parentNode === sum) return;
    if (!calM) { var n = new Date(); calM = new Date(n.getFullYear(), n.getMonth(), 1); }
    box = document.createElement('div'); box.id = 'pp-cal'; stats.parentNode.insertBefore(box, stats.nextSibling);
    drawCal(box);
  }
  function drawCal(box) {
    var y = calM.getFullYear(), m = calM.getMonth(), T = tripDays();
    holidays(String(y), function (H, cc) {
      var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), td = today(), cells = '', list = [];
      for (var i = 0; i < first; i++) cells += '<span></span>';
      for (var d = 1; d <= days; d++) {
        var k = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2), cl = (T[k] ? ' trip' : '') + (H[k] ? ' hol' : '') + (k === td ? ' now' : '');
        if (H[k]) list.push('<li><i class="hd"></i>' + new Date(y, m, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + esc(H[k]) + '</li>');
        cells += '<span class="' + cl.trim() + '"' + (T[k] ? ' title="' + esc(T[k]) + '"' : '') + '>' + d + '</span>';
      }
      box.innerHTML = '<h3>My calendar</h3><div class="calc"><div class="ch"><button type="button" data-m="-1" aria-label="Previous month">‹</button><b>' + calM.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + '</b><button type="button" data-m="1" aria-label="Next month">›</button></div>' +
        '<div class="wk">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="gr">' + cells + '</div>' +
        '<div class="lg"><span><i class="td"></i>Trip</span><span><i class="hd"></i>' + cc + ' holiday</span></div>' + (list.length ? '<ul>' + list.join('') + '</ul>' : '') + '</div>';
      box.onclick = function (e) { var b = e.target.closest('[data-m]'); if (!b) return; calM = new Date(y, m + +b.dataset.m, 1); drawCal(box); };
    });
  }

  /* ---------- 9. penpen's page (middle button): big penpen, Translate, History, a chat bar ---------- */
  var IDEAS = ['“Lunch 450, I paid”', 'What’s next today?', 'Who owes who?', '“Dinner 2,000, my treat”', 'Top 5 spots near our hotel', 'How do I say “how much?” in Bisaya', 'Call Brad', 'Find a pharmacy near me', '“Brad paid 1,200 for the van”', 'Where can we eat lechon?', 'Undo my last expense', 'What should I pack?'];
  var chatWas = false;
  function chatHome() {
    var p = $('#p-chat'); if (!p) return;
    var on = p.classList.contains('on');
    if (on && !chatWas) document.body.setAttribute('data-pph', 'home');
    chatWas = on;
    var h = $('#pp-home', p);
    if (!h) {
      h = document.createElement('div'); h.id = 'pp-home'; p.insertBefore(h, p.firstChild);
      var lst = IDEAS.concat(IDEAS).map(function (x) { return '<button type="button" data-idea="' + esc(x.replace(/[“”]/g, '')) + '">' + esc(x) + '</button>'; }).join('<i>·</i>');
      h.innerHTML = '<div class="hb"><button type="button" class="hh" data-h="hist">🕘 History</button><button type="button" class="ht" data-h="tr">🌐 Translate</button></div>' +
        '<div class="hm"><div class="hsay" id="pp-hsay"></div><button type="button" class="hpen" data-h="talk" aria-label="Talk to penpen"><span class="r1"></span><span class="r2"></span><span class="hp"></span></button><div class="htip">Tap penpen to talk · or type below</div></div>' +
        '<div class="hidea" aria-label="Things you can ask"><div class="trk">' + lst + '</div></div>';
      h.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.h === 'hist') document.body.setAttribute('data-pph', 'log');
        if (b.dataset.h === 'tr' && window.ppTranslate) window.ppTranslate();
        if (b.dataset.h === 'talk' && window.ppTalk) window.ppTalk();
        if (b.dataset.idea) { var i = $('#say'); if (i) { i.value = b.dataset.idea; i.focus(); } }
      };
      var lg = $('#log', p);
      if (lg && !$('#pp-hback', p)) { var bk = document.createElement('button'); bk.type = 'button'; bk.id = 'pp-hback'; bk.textContent = '‹ penpen'; bk.onclick = function () { document.body.setAttribute('data-pph', 'home'); }; p.insertBefore(bk, lg); }
      var f = $('#sayf', p); if (f) f.addEventListener('submit', function () { if (navigator.onLine) document.body.setAttribute('data-pph', 'log'); });
    }
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', hp = $('.hp', h);
    if (hp && hp.getAttribute('data-g') !== g) { hp.setAttribute('data-g', g); hp.innerHTML = penSvg(170); }
    var T = cache('penpenToday') || {}, nm = (T.hello && T.hello.name) || '', hs = $('#pp-hsay', h), want = 'Hi' + (nm ? ' ' + esc(nm) : '') + '! What do you need?';
    if (hs && hs.innerHTML !== want) hs.innerHTML = want;
    var si = $('#say'); if (si && si.placeholder !== 'Ask penpen anything') si.placeholder = 'Ask penpen anything';
    if (!document.body.getAttribute('data-pph')) document.body.setAttribute('data-pph', 'home');
  }

  /* ---------- styles ---------- */
  var css =
    'body[data-pph="home"] #p-chat #log,body[data-pph="home"] #p-chat #pp-hback{display:none!important}body:not([data-pph="home"]) #pp-home{display:none!important}' +
    '#p-chat #pp-trbig,#p-chat #chips,#p-chat #mic,#p-chat #hint{display:none!important}' +
    '#pp-home{flex:1;display:flex;flex-direction:column;min-height:0;padding:10px 14px 0;font-family:' + F + ';color:var(--ink)}' +
    '#pp-home .hb{display:flex;justify-content:space-between;align-items:center}#pp-home .hb button{border:0;border-radius:99px;padding:8px 14px;font:800 14px ' + F + ';cursor:pointer}#pp-home .hh{background:transparent;color:var(--muted)}#pp-home .ht{background:rgba(35,117,102,.14);color:#237566}' +
    '#pp-home .hm{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:300px}' +
    '#pp-home .hsay{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:9px 16px;font-weight:800;font-size:16px}' +
    '#pp-home .hpen{position:relative;width:250px;height:250px;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}#pp-home .hpen:active{transform:scale(.97)}' +
    '#pp-home .hpen .r1,#pp-home .hpen .r2{position:absolute;inset:0;border-radius:50%;background:rgba(35,117,102,.12)}#pp-home .hpen .r2{inset:26px;background:rgba(35,117,102,.18);animation:ppbreath 3s ease-in-out infinite}' +
    '@keyframes ppbreath{50%{transform:scale(1.06)}}#pp-home .hpen .hp{position:absolute;inset:40px;display:flex;align-items:center;justify-content:center}#pp-home .hpen .hp svg{width:100%;height:100%;animation:pphop 2.6s ease-in-out infinite}' +
    '#pp-home .hpen .pp-eyes{transform-box:fill-box;transform-origin:center;animation:ppblink 4.2s infinite}@keyframes ppblink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
    '#pp-home .htip{color:var(--muted);font-weight:800;font-size:14px}' +
    '#pp-home .hidea{overflow:hidden;white-space:nowrap;margin:6px -14px 8px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}' +
    '#pp-home .trk{display:inline-flex;align-items:center;gap:10px;animation:ppticker 60s linear infinite}#pp-home .hidea:hover .trk,#pp-home .hidea:active .trk{animation-play-state:paused}' +
    '#pp-home .trk button{border:0;background:none;color:var(--muted);opacity:.85;font:700 14px ' + F + ';padding:6px 2px;cursor:pointer}#pp-home .trk i{color:var(--muted);opacity:.5;font-style:normal}@keyframes ppticker{to{transform:translateX(-50%)}}' +
    '#pp-hback{align-self:flex-start;margin:8px 12px 0;border:0;background:var(--card);color:var(--ink);border-radius:99px;padding:7px 14px;font:800 14px ' + F + ';cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){#pp-home .trk{animation:none;flex-wrap:wrap;white-space:normal}}' +
    '#navpen{overflow:hidden}#navpen svg{width:100%!important;height:100%!important}' +
    '#pp-story-hero{display:none!important}' +
    '#pp-cd{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin-top:6px}#pp-cd .cdn{font:900 30px/1 ' + F + '}#pp-cd .cdl{font:800 15px ' + F + '}' +
    '#pp-cd .cdt{flex-basis:100%;width:max-content;max-width:100%;border:0;background:rgba(255,255,255,.55);color:inherit;border-radius:99px;padding:5px 12px;font:800 13px ' + F + ';text-align:left;cursor:pointer;margin-top:2px}' +
    '#pp-scene:not([data-big]){min-height:210px}#pp-scene:not([data-big]) .pp-stage{padding-top:70px}' +
    '#pp-daily{display:block!important;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:14px;margin:12px 0;font-family:' + F + ';color:var(--ink)}' +
    '#pp-daily .dh{display:flex;align-items:center;gap:10px;margin-bottom:10px}#pp-daily .dh b{display:block;font-size:16px;font-weight:900}#pp-daily small{display:block;color:var(--muted);font-weight:700;font-size:12.5px}' +
    '#pp-daily .dw{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--chip);border-radius:16px;padding:10px 12px;margin-bottom:10px}#pp-daily .dw b{display:block;font-size:20px;font-weight:900}#pp-daily .dw span{font-size:13px;color:var(--muted);font-weight:700}' +
    '#pp-daily .hear{border:0;background:var(--card);border-radius:50%;width:44px;height:44px;font-size:20px;flex:none;cursor:pointer}' +
    '#pp-daily .dq b{display:block;font-size:16px;font-weight:800;margin:2px 0 8px}#pp-daily .dq.ok{font-weight:800;font-size:14px;color:#237566}' +
    '#pp-daily .ch{display:flex;flex-wrap:wrap;gap:8px}#pp-daily .ch button{flex:1 1 auto;min-height:44px;border:1.5px solid var(--line);background:var(--card);color:inherit;border-radius:14px;padding:8px 12px;font:800 14px ' + F + ';cursor:pointer}' +
    '#pp-daily .ch button.yes{background:#2E9E6B;border-color:#2E9E6B;color:#fff}#pp-daily .ch button.no{background:#D9534F;border-color:#D9534F;color:#fff}' +
    '#wx{cursor:default}' +
    '.pp-page{position:fixed;left:0;right:0;top:0;bottom:calc(70px + env(safe-area-inset-bottom));z-index:99965;background:var(--bg,#F6F1E8);color:var(--ink);overflow:auto;font-family:' + F + ';animation:ppin .18s ease-out}' +
    '@keyframes ppin{from{transform:translateX(30px);opacity:0}}' +
    '.pp-page .top{position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 16px 10px;background:inherit;z-index:1;max-width:560px;margin:0 auto;box-sizing:border-box}.pp-page .top h2{margin:0;font-size:22px;font-weight:900;flex:1;text-align:left}' +
    '.pp-page .tt{flex:1;min-width:0}.pp-page .tt small{display:block;color:var(--muted);font:800 13px ' + F + ';margin-bottom:1px}.pp-page .pbtn.warn{background:#D9534F;color:#fff}' +
    'button.back{display:flex!important;align-items:center;justify-content:center;width:44px!important;height:44px!important;padding:0 0 3px 0!important;border:0;border-radius:50%!important;background:var(--card)!important;color:var(--ink)!important;font:900 32px/1 ' + F + '!important;box-shadow:0 2px 8px rgba(19,50,74,.12);cursor:pointer}' +
    'button,[role=button],.gctl{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}input[type=date]{min-width:0;max-width:100%;box-sizing:border-box}' +
    '.card.pp-tour{display:flex!important;flex-direction:column;gap:10px;padding:14px!important}.stbtn{display:block;width:100%;text-align:left;border:0;border-radius:18px;background:var(--chip);color:var(--ink);padding:14px 16px;font:900 16px ' + F + ';cursor:pointer}.stbtn small{display:block;font:700 13px ' + F + ';color:var(--muted);margin-top:2px}.stbtn.pri{background:#237566;color:#fff}.stbtn.pri small{color:rgba(255,255,255,.85)}' +
    '.pp-page .wrap{padding:4px 16px 24px;max-width:560px;margin:0 auto}' +
    '.pp-page .pc{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;justify-content:space-between}' +
    '.pp-page .ph{display:flex;gap:12px;align-items:flex-start}.pp-page .ph i{font-style:normal;font-size:24px}.pp-page .ph b{display:block;font-size:16px;font-weight:900}.pp-page .ph small{display:block;color:var(--muted);font-weight:700;font-size:13px;line-height:1.35;margin-top:2px}' +
    '.pp-page .pbtn{flex:none;border:0;border-radius:99px;padding:10px 16px;font:900 14px ' + F + ';cursor:pointer}.pp-page .pbtn.on{background:#237566;color:#fff}.pp-page .pbtn.off{background:var(--chip);color:var(--ink)}.pp-page .pnote{color:var(--muted);font-weight:700;text-align:center}' +
    '.pp-page .ptitle{font:900 17px ' + F + ';margin:18px 4px 8px}.pp-page .pc.col{display:block}.pp-page .plist{margin:0;padding-left:18px;font-weight:700;font-size:14px;line-height:1.45;color:var(--ink)}.pp-page .plist li{margin:4px 0 8px}.pp-page .plist b{font-weight:900}' +
    '#pp-nap{position:fixed;inset:0;z-index:99970;background:rgba(19,50,74,.45);display:flex;align-items:flex-end;justify-content:center}#pp-nap .nb{background:var(--card,#fff);color:var(--ink,#13324A);width:100%;max-width:520px;border-radius:26px 26px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));text-align:center;font-family:' + F + '}' +
    '#pp-nap .pen{position:relative;display:inline-block;opacity:.85}#pp-nap .pen svg .pp-eyes{display:none}#pp-nap .pen span{position:absolute;right:-8px;top:0;font-size:28px}#pp-nap b{display:block;font-size:19px;font-weight:900;margin:6px 0}#pp-nap p{margin:0 0 14px;font-weight:700;color:var(--muted,#4A6274);line-height:1.4}' +
    '#pp-nap button{width:100%;min-height:50px;border:0;border-radius:99px;background:#237566;color:#fff;font:900 16px ' + F + '}' +
    '.pp-ptoast{position:fixed;left:16px;right:16px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:99990;background:#13324A;color:#fff;border-radius:16px;padding:12px 14px;font:800 14px ' + F + ';text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}' +
    'body:not([data-ppv="crew"]) #pp-solo{display:none}#pp-solo{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:14px;margin:0 0 12px;font-family:' + F + ';color:var(--ink)}#pp-solo b{display:block;font-size:16px;font-weight:900}#pp-solo p{margin:4px 0 10px;color:var(--muted);font-weight:700;font-size:14px;line-height:1.4}#pp-solo button{border:0;border-radius:99px;background:#237566;color:#fff;padding:10px 16px;font:900 14px ' + F + ';cursor:pointer}' +
    '#pp-off{position:fixed;left:10px;right:10px;top:calc(8px + env(safe-area-inset-top));z-index:70;background:#13324A;color:#fff;border-radius:16px;padding:10px 14px;font:700 13px/1.35 ' + F + ';box-shadow:0 6px 20px rgba(0,0,0,.25)}#pp-off b{display:block;font-size:14px}' +
    '#pp-tour{position:fixed;inset:0;z-index:99980;background:linear-gradient(#DCEDF5,#F6F1E8);color:#13324A;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:' + F + ';text-align:center}' +
    '#pp-tour .skip{position:absolute;top:calc(14px + env(safe-area-inset-top));right:16px;border:0;background:rgba(255,255,255,.8);border-radius:99px;padding:8px 16px;font:800 15px ' + F + ';color:#13324A;cursor:pointer}' +
    '#pp-tour .pen svg{display:block}#pp-tour .pen.hop svg{animation:pphop 1.4s ease-in-out infinite}@keyframes pphop{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
    '#pp-tour .bub{background:#fff;border-radius:24px;padding:16px 18px;max-width:340px;margin-top:14px;position:relative;box-shadow:0 8px 24px rgba(19,50,74,.12)}#pp-tour .bub:before{content:"";position:absolute;top:-10px;left:50%;margin-left:-10px;border:10px solid transparent;border-top:0;border-bottom-color:#fff}' +
    '#pp-tour .bub b{display:block;font-size:20px;font-weight:900;margin-bottom:4px}#pp-tour .bub p{margin:0;font-size:16px;font-weight:700;line-height:1.4;color:#3B5568}' +
    '#pp-tour .dots{display:flex;gap:6px;margin:18px 0 6px}#pp-tour .dots i{width:8px;height:8px;border-radius:50%;background:#B9CCD8}#pp-tour .dots i.on{background:#237566;width:22px;border-radius:99px}' +
    '#pp-tour .acts{display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px;margin-top:14px}#pp-tour .acts button{min-height:50px;border:0;border-radius:99px;background:#fff;color:#13324A;font:900 16px ' + F + ';cursor:pointer}#pp-tour .acts .pri{background:#237566;color:#fff}' +
    '#pp-hs h3,#pp-cal h3{font:900 17px ' + F + ';margin:22px 0 10px}#pp-hs button{display:flex;align-items:center;gap:12px;width:100%;border:0;background:var(--card);color:inherit;text-align:left;padding:13px 14px;border-radius:18px;margin-bottom:8px;font:inherit;cursor:pointer}' +
    '#pp-hs i{font-style:normal;font-size:22px}#pp-hs b{display:block;font-weight:900;font-size:15px}#pp-hs small{display:block;color:var(--muted);font-weight:700;font-size:12.5px}' +
    '#pp-cal .calc{background:var(--card);border-radius:20px;padding:12px}#pp-cal .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}#pp-cal .ch b{font-weight:900}#pp-cal .ch button{border:0;background:var(--chip);color:inherit;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer}' +
    '#pp-cal .wk,#pp-cal .gr{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;gap:2px}#pp-cal .wk span{font-size:11px;font-weight:800;color:var(--muted)}' +
    '#pp-cal .gr span{position:relative;font-weight:800;font-size:13px;padding:7px 0;border-radius:10px}#pp-cal .gr span.trip{background:#237566;color:#fff}#pp-cal .gr span.now{box-shadow:inset 0 0 0 2px #F2A33A}' +
    '#pp-cal .gr span.hol:after{content:"";position:absolute;left:50%;bottom:2px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#D9534F}' +
    '#pp-cal .lg{display:flex;gap:14px;font-size:12px;font-weight:800;color:var(--muted);margin-top:8px}#pp-cal .lg i,#pp-cal li i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0}#pp-cal i.td{background:#237566}#pp-cal i.hd{background:#D9534F}' +
    '#pp-cal ul{list-style:none;margin:8px 0 0;padding:0;font-size:13px;font-weight:700}#pp-cal li{padding:3px 0}';

  function startCard() {
    var c = $('.card.pp-tour'); if (!c || c.getAttribute('data-pp')) return;
    c.setAttribute('data-pp', '1');
    var h = c.previousElementSibling; if (h && /quick tour/i.test(h.textContent)) h.textContent = 'You’re all set! 🎉';
    c.innerHTML = '<button type="button" class="stbtn pri" data-st="invite">📲 Invite your travel buddies<small>Send a link or show a QR code</small></button><button type="button" class="stbtn" data-st="tour">▶ Quick tour<small>penpen shows you around in 30 seconds</small></button><button type="button" class="stbtn" data-st="solo">🧳 I’m travelling solo<small>Skip inviting for now</small></button>';
    c.onclick = function (e) {
      var b = e.target.closest('[data-st]'); if (!b) return;
      if (b.dataset.st === 'tour') return window.ppTour();
      if (b.dataset.st === 'solo') { var t = document.querySelector('nav button[data-p="p-today"]'); if (t) t.click(); return; }
      if (window.ppGoTab) window.ppGoTab('Crew');
      setTimeout(function () { var x = [].slice.call(document.querySelectorAll('#p-safety button')).filter(function (y) { return /invite/i.test(y.textContent) && y.offsetParent; })[0]; if (x) x.click(); }, 500);
    };
  }
  function solo() {
    var sc = $('#crew'); if (!sc) return;
    $$('#crew .kick').forEach(function (k) { if (/^your crew$/i.test(k.textContent.trim())) k.textContent = 'Your travel buddies'; });
    var T = cache('penpenToday') || {}, n = (T.people || []).length, box = $('#pp-solo');
    if (n > 1) { if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div'); box.id = 'pp-solo';
    box.innerHTML = '<b>🧳 Travelling solo? Love that.</b><p>It’s just you and penpen for now. If a friend ever wants to tag along, you can share your invite. No pressure!</p><button type="button">📲 Share my invite</button>';
    sc.insertBefore(box, sc.firstChild);
    $('button', box).onclick = function () { var x = $$('#crew .kick').filter(function (k) { return /^invite to this trip$/i.test(k.textContent.trim()); })[0]; if (x) (x.parentElement || x).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  }
  function tick() { try { startCard(); solo(); fillNav(); hero(); daily(); paintWx(); settingsExtras(); calendar(); wrapTalk(); chatHome(); } catch (e) { console.warn('polish', e); } }
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    new MutationObserver(function () { clearTimeout(start.t); start.t = setTimeout(tick, 60); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    tick(); offline(); checkPerm(function () { if (perm === 'granted') fetchHere(); else paintWx(); }); setTimeout(flush, 3000);
    // first time on this phone: penpen shows you around
    setTimeout(function () { if (!get('pp_tour', 0) && localStorage.getItem('pp_sess') && !document.getElementById('pp-tour')) window.ppTour(); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
