/* penpen's Igloo — a little pet to look after (works with no signal).
   penpen gets hungry, bored and sleepy over time. Look after him and he levels up.
   No-fail: he never dies or runs away, games are always open, and while you're away he only
   gets a bit hungry and bored (never below 20) and naps, so he's always fine when you come back.
   Tabs: penpen (feed, rub belly, sleep, medicine) · Slide (snowy downhill run) · Exercise (jumping jacks) · Quiz · Shop.
   Every expense you log on the trip earns a 🐟. Everything is saved on this phone. */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  var KEY = 'pp_pet';
  var COIN = '<i class="cn" aria-label="coins"></i>';
  var FOODS = {
    fish:   { e: '🐟', n: 'Fish', food: 18, joy: 4, en: 4, price: 0 },
    mango:  { e: '🥭', n: 'Mango', food: 15, joy: 10, en: 8, price: 10 },
    sushi:  { e: '🍣', n: 'Sushi', food: 30, joy: 15, en: 10, price: 20 },
    bat:    { e: '🔋', n: 'Battery', food: 0, joy: 2, en: 45, price: 25 },
    meds:   { e: '💊', n: 'Medicine', food: 0, joy: 0, hp: 45, price: 12 }
  };
  var WEAR = {
    none:   { e: '', n: 'Nothing', price: 0 },
    hat:    { e: '🎩', n: 'Top hat', price: 0 },
    cap:    { e: '🧢', n: 'Cap', price: 30 },
    shades: { e: '🕶️', n: 'Shades', price: 40 },
    flower: { e: '🌺', n: 'Flower', price: 25 },
    crown:  { e: '👑', n: 'Crown', price: 120 }
  };
  // questions tagged 'PH' only come up on Philippine trips
  var QUIZ = [
    ['How many islands does the Philippines have?', ['About 7,641', 'About 700', 'About 70,000'], 0, 'PH'],
    ['What do Cebuanos call lechon’s crispy skin?', ['Panit', 'Ube', 'Kalamay'], 0, 'PH'],
    ['Which is the national bird of the Philippines?', ['Philippine eagle', 'Maya', 'Kingfisher'], 0, 'PH'],
    ['Where can you swim with whale sharks in Cebu?', ['Oslob', 'Bantayan', 'Moalboal only'], 0, 'PH'],
    ['How fast can a penguin swim?', ['Up to ~35 km/h', '5 km/h', '100 km/h'], 0],
    ['Which penguin is the tallest?', ['Emperor', 'King', 'Little blue'], 0],
    ['What does “Salamat” mean?', ['Thank you', 'Hello', 'Goodbye'], 0, 'PH'],
    ['“Maayong buntag” in Bisaya means…', ['Good morning', 'Good night', 'How much?'], 0, 'PH'],
    ['Which fruit is Cebu famous for?', ['Mango', 'Durian', 'Kiwi'], 0, 'PH'],
    ['Do penguins live at the North Pole?', ['No — almost all live south of the equator', 'Yes, lots', 'Only in winter'], 0],
    ['What is Magellan’s Cross?', ['A cross planted in Cebu in 1521', 'A bridge', 'A dance'], 0, 'PH'],
    ['“Pila ni?” in Bisaya means…', ['How much is this?', 'Where is it?', 'I’m full'], 0, 'PH'],
    ['Penguins can drink salt water because…', ['They have a gland that removes salt', 'They can’t', 'They boil it'], 0],
    ['Which Cebu delicacy is a sticky rice treat?', ['Puso (hanging rice)', 'Adobo', 'Sinigang'], 0, 'PH'],
    ['What do you call a group of penguins on land?', ['A waddle', 'A flock of ducks', 'A pod'], 0]
  ];
  // the coin shows the trip's money sign (¥, ₱, €…); for longer ones like "NT$" or "RM", one character
  var COIN_SIGN = (function (y) { var m = y.match(/\p{Sc}/u), c = m ? m[0] : y.charAt(0); return /^[\p{L}\p{Sc}]$/u.test(c) ? c : '$'; })(window.ppPlace().sym || '');
  function now() { return Date.now(); }
  var FLOOR = 20;   // how low hunger and happiness can drop while you're away
  function fresh() { return { food: 80, joy: 75, energy: 80, hp: 100, xp: 0, fit: 0, coins: 20, best: 0, bag: { fish: 3, meds: 1 }, own: { none: 1, hat: 1 }, wear: 'none', t: now(), exp: -1, asleep: false, born: now() }; }
  function away(v, drop) { return v > FLOOR ? Math.max(FLOOR, v - drop) : v; }
  function load() {
    var p = null; try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    p = p || fresh();
    if (p.hp == null) { p.hp = 100; p.fit = 0; p.bag.meds = p.bag.meds || 1; }
    if (p.ghost) {   // older versions could turn penpen into a ghost: bring him back, keep everything he had
      delete p.ghost; p.asleep = false; p.hi = 1;
      p.food = Math.max(p.food, 50); p.joy = Math.max(p.joy, 50); p.energy = Math.max(p.energy, 60); p.hp = Math.max(p.hp, 60);
    }
    var hrs = Math.max(0, (now() - (p.t || now())) / 36e5);
    if (hrs > 0.01) {
      // life goes on while you're away, gently: a bit hungry and bored, never sick, and he naps
      p.food = away(p.food, hrs * (p.asleep ? 1.5 : 3));
      p.joy = away(p.joy, hrs * (p.asleep ? 0.5 : 2));
      p.energy = clamp(p.energy + hrs * (p.asleep ? 60 : 10));
      if (p.asleep && p.energy >= 100) p.asleep = false;
      p.hp = clamp(p.hp + hrs * 3);
      p.t = now();
    }
    return p;
  }
  function clamp(n) { return Math.max(0, Math.min(100, n)); }
  function save(p) { p.t = now(); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function level(p) { return 1 + Math.floor(Math.sqrt(p.xp / 20)); }
  function speedSkill(p) { return Math.min(10, 1 + Math.floor(level(p) / 3) + Math.floor((p.fit || 0) / 40)); }
  function sick(p) { return p.hp < 30; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // one fish for every expense logged on the trip
  function expenseCount() {
    var X = null; try { X = JSON.parse(localStorage.getItem('pp_trip') || 'null'); } catch (e) {}
    return X && X.tabs && X.tabs.Expenses ? X.tabs.Expenses.rows.slice(1).filter(function (r) { return r[1]; }).length : -1;
  }
  function rewardExpenses(p) {
    var n = expenseCount(); if (n < 0) return 0;
    // one penpen for you across every trip: count each trip's expenses separately
    var tid = localStorage.getItem('pp_trip_id') || 'home'; p.expBy = p.expBy || {};
    if (p.expBy[tid] == null) { p.expBy[tid] = n; if (p.exp < 0) p.exp = n; return 0; }
    var add = Math.max(0, n - p.expBy[tid]); p.expBy[tid] = n; p.exp = n;
    if (add) p.bag.fish = (p.bag.fish || 0) + add;
    return add;
  }
  setInterval(function () { var p = load(), a = rewardExpenses(p); save(p); if (a) toast('+' + a + ' 🐟 for logging ' + (a === 1 ? 'an expense' : a + ' expenses') + '! Feed penpen in More → Garden'); }, 15000);
  function toast(t) {
    var d = document.createElement('div'); d.className = 'pp-pt'; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, 3000);
  }

  function inner() {
    var g = 'bubbly', L = window.ppLook, s = L && L.svg(g);
    if (!s && window.ppFrontPen) s = window.ppFrontPen();
    if (!s) { var n = document.querySelector('#navpen svg'); s = n ? (n.getAttribute('data-orig') || n.innerHTML) : ''; }
    return s;
  }
  function bodyColor() {
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', m = window.ppLook && window.ppLook.svg(g).match(/rx="36" ry="44" fill="([^"]+)"/);
    return m ? m[1] : '#1E2B4A';
  }

  /* ---------- garden: drawn in code. To use a picture instead, swap gardenArt() for an <img> ---------- */
  var PALS = ['sweet', 'surfer', 'sunny', 'buddy', 'goofydad', 'grandma'];   // penguin friends who wander the garden (ids from guides.js)
  var START = [[20, 22], [80, 16], [32, 30], [68, 28], [12, 8], [88, 6]];   // where each friend stands when the garden opens (% across, % up)
  var MUSIC_FILE = '';              // set to a music file (e.g. 'audio/garden.m4a') to play it instead of the code-made tune
  var SHUT = '<path class="shut" d="M45 49 Q51 54 57 49 M63 49 Q69 54 75 49" fill="none" stroke="#1F2A36" stroke-width="3" stroke-linecap="round"/>';
  var JOY = '<path class="joy" d="M45 51 Q51 44 57 51 M63 51 Q69 44 75 51" fill="none" stroke="#1F2A36" stroke-width="3.2" stroke-linecap="round"/>';
  function gardenArt() {
    var fl = [[24, 250, '#F28AA5'], [62, 272, '#FFFFFF'], [150, 258, '#F4A62A'], [200, 276, '#B7A2F0'], [340, 254, '#F28AA5'], [122, 204, '#FFFFFF'], [214, 208, '#F28AA5'], [330, 220, '#F4A62A'],
      [40, 340, '#B7A2F0'], [104, 372, '#F4A62A'], [182, 350, '#FFFFFF'], [268, 380, '#F28AA5'], [326, 344, '#FFFFFF'], [86, 412, '#F28AA5'], [236, 418, '#B7A2F0'], [300, 404, '#F4A62A']].map(function (f) {
      return '<g><path d="M' + f[0] + ' ' + (f[1] + 4) + ' v10" stroke="#4E9A48" stroke-width="2"/><circle cx="' + f[0] + '" cy="' + f[1] + '" r="5" fill="' + f[2] + '"/><circle cx="' + f[0] + '" cy="' + f[1] + '" r="2" fill="#F4C542"/></g>';
    }).join('');
    function cloud(x, y, k) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + 30 * k + '" ry="' + 9 * k + '"/><ellipse cx="' + (x - 12 * k) + '" cy="' + (y - 6 * k) + '" rx="' + 14 * k + '" ry="' + 8 * k + '"/><ellipse cx="' + (x + 10 * k) + '" cy="' + (y - 7 * k) + '" rx="' + 12 * k + '" ry="' + 8 * k + '"/>'; }
    // 360x600: tall enough for a full-screen phone garden; on wider screens the top of the sky is cut off, never the ground
    return '<svg class="gart" viewBox="0 0 360 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FCFF2"/><stop offset=".55" stop-color="#CDEBFA"/></linearGradient></defs>' +
      '<rect width="360" height="600" fill="url(#pp-sky)"/><circle cx="300" cy="166" r="34" fill="#FFF3C4" opacity=".6"/><circle cx="300" cy="166" r="21" fill="#FFE58A"/>' +
      '<g class="cloud c1" fill="#fff" opacity=".9">' + cloud(70, 150, 1) + cloud(240, 228, .8) + '</g><g class="cloud c2" fill="#fff" opacity=".7">' + cloud(170, 196, .7) + cloud(320, 120, .6) + '</g>' +
      '<path d="M96 186 q5 -5 10 0 q5 -5 10 0 M128 172 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#5B7A99" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M0 322 L34 282 L62 300 L108 250 L156 304 L204 268 L236 290 L292 246 L336 292 L360 276 V340 H0Z" fill="#E4F1FA"/><path d="M95 265 L108 250 L121 264 L112 260 Z M280 261 L292 246 L305 260 L296 256 Z" fill="#fff"/>' +
      '<g transform="translate(0 160)">' +
      '<path d="M0 156 Q90 132 180 152 T360 144 V440 H0Z" fill="#A6DA92"/><path d="M0 184 Q120 164 220 182 T360 174 V440 H0Z" fill="#86C977"/><path d="M0 300 Q140 284 250 298 T360 292 V440 H0Z" fill="#7BBF6C"/>' +
      '<ellipse cx="282" cy="194" rx="54" ry="13" fill="#7FC8E8"/><ellipse cx="270" cy="191" rx="24" ry="4" fill="#BFE6F5" opacity=".75"/>' +
      '<path d="M22 176 A36 36 0 0 1 94 176 Z" fill="#F4FAFF" stroke="#C9DCEA" stroke-width="2"/><path d="M50 176 A8 11 0 0 1 66 176Z" fill="#5B7A99"/><path d="M30 164 H86 M40 152 H76" stroke="#C9DCEA" stroke-width="2"/>' +
      fl + '</g></svg>';
  }
  var GD = { t: {}, hold: 0, s: [] }, Y = 37;   // Y: how far back (in % of the garden) the penguins can walk
  function still() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function later(el, key, ms) { clearTimeout(GD.t[key]); GD.t[key] = setTimeout(function () { stroll(el, key); }, ms); }
  // walk el to x% across, y% up; returns the seconds it takes (pace: % per second)
  // the walking class is 'walking', not 'go': #pp-play .go is the green Start button style, and it painted a green box behind penpen
  function go(el, x, y, pace) {
    var x0 = parseFloat(el.style.left) || 50, secs = Math.max(pace ? 0.5 : 1.2, Math.abs(x - x0) / (pace || 14));
    el.style.transitionDuration = secs + 's'; if (x !== x0) el.classList.toggle('l', x < x0); el.classList.add('walking');
    el.style.left = x + '%'; el.style.bottom = y + '%'; el.style.zIndex = String(40 - Math.round(y)); el.style.setProperty('--d', (1 - y / 160).toFixed(3));
    clearTimeout(el.ppStop); el.ppStop = setTimeout(function () { el.classList.remove('walking'); }, secs * 1000);
    return secs;
  }
  // walk to a random spot, then rest a bit (unless he's busy playing)
  function stroll(el, key) {
    if (!el.isConnected) return;
    if ((key === 'me' && GD.hold > now()) || el.ppBusy) return later(el, key, 1200);
    later(el, key, go(el, 10 + Math.random() * 80, 3 + Math.random() * Y) * 1000 + 1500 + Math.random() * 3500);
  }
  // stop penpen where he is (while you drag food or rub his belly)
  function freeze(ms) {
    var el = document.getElementById('pp-walk'), g = document.getElementById('pp-garden'); GD.hold = now() + ms; endPlay();
    if (!el || !g || !el.classList.contains('walking')) return;
    var r = el.getBoundingClientRect(), b = g.getBoundingClientRect();
    if (b.width) { el.style.transitionDuration = '0s'; el.style.left = ((r.left + r.width / 2 - b.left) / b.width * 100) + '%'; el.style.bottom = ((b.bottom - r.bottom) / b.height * 100) + '%'; }
    el.classList.remove('walking');
  }

  /* ---------- penpen plays with his friends: meet and high-five, tag, dance, catch ---------- */
  function step(ms, f) { GD.s.push(setTimeout(f, ms)); }
  function pos(el) { return [parseFloat(el.style.left) || 50, parseFloat(el.style.bottom) || 8]; }
  function face(a, b) { var r = pos(a)[0] < pos(b)[0]; a.classList.toggle('l', !r); b.classList.toggle('l', r); }
  function pop(el, ch) { var r = el.getBoundingClientRect(); if (r.width) hearts(r.left + r.width / 2, r.top + r.height * 0.15, 1, ch); }
  function endPlay() {
    GD.s.forEach(clearTimeout); GD.s = [];
    if (w) { [].slice.call(w.querySelectorAll('#pp-garden .walker')).forEach(function (el) { el.ppBusy = false; el.classList.remove('dance'); }); [].slice.call(w.querySelectorAll('#pp-garden .ball')).forEach(function (b) { b.remove(); }); }
    if (GD.line) { var s = document.getElementById('pp-say'); if (s && s.textContent === GD.line) s.textContent = mood(load()); GD.line = ''; }
  }
  function tell(t) { var s = document.getElementById('pp-say'); if (s && now() - (GD.said || 0) > 6000) { s.textContent = t; GD.line = t; } }
  function playSoon() { clearTimeout(GD.t.play); GD.t.play = setTimeout(playTime, 7000 + Math.random() * 7000); }
  function playTime() {
    var me = document.getElementById('pp-walk'), pals = w ? [].slice.call(w.querySelectorAll('#pp-garden .walker.pal')) : [];
    if (!me || !me.isConnected) return;
    if (load().asleep || still() || document.hidden || GD.hold > now() || !pals.length) return playSoon();
    var f = pick(pals), nm = window.ppLook ? window.ppLook.name(f.dataset.pal) : 'his friend', who = [me].concat(pals), game = pick(['meet', 'tag', 'dance', 'ball']);
    function done(ms) { step(ms, function () { endPlay(); playSoon(); }); }
    (game === 'dance' ? who : [me, f]).forEach(function (el) { el.ppBusy = true; });
    if (game === 'meet') {
      var mx = 25 + Math.random() * 50, my = 4 + Math.random() * Y * 0.6;
      var walk = Math.max(go(me, mx - 11, my), go(f, mx + 11, my)) * 1000;
      step(walk + 100, function () {
        face(me, f); hop(me.querySelector('.pen')); hop(f.querySelector('.pen')); pop(me, pick(['✋', '💛', '🤗'])); sfx('hi');
        tell('penpen and ' + nm + ' ' + pick(['high-five! ✋', 'share a hug 🤗', 'are best buds 💛']));
      });
      return done(walk + 1800);
    }
    if (game === 'tag') {
      tell(nm + ' is it! Tag! 🏃');
      (function leg(n) {
        var at = pos(f), nx = at[0] < 50 ? 60 + Math.random() * 30 : 10 + Math.random() * 30;
        if (!n) { var t = go(me, at[0] + (pos(me)[0] < at[0] ? -9 : 9), at[1], 30); step(t * 1000 + 50, function () { face(me, f); hop(f.querySelector('.pen')); pop(f, '😆'); sfx('hi'); tell('Tagged! penpen got ' + nm + ' 😆'); }); return done(t * 1000 + 1600); }
        step(Math.max(go(f, nx, 3 + Math.random() * Y, 32), go(me, at[0], at[1], 26)) * 1000 + 150, function () { leg(n - 1); });
      })(2);
      return;
    }
    if (game === 'dance') {
      var dy = 6 + Math.random() * 10, arrive = 0;
      who.forEach(function (el, i) { arrive = Math.max(arrive, go(el, [50, 37, 63, 24, 76, 11, 89][i] || 50, dy)); });
      step(arrive * 1000 + 100, function () {
        tell('Dance party! 🎶'); sfx('la');
        who.forEach(function (el) { el.classList.add('dance'); });
        [0, 900, 1800].forEach(function (ms) { step(ms, function () { pop(pick(who), pick(['🎵', '🎶', '✨'])); }); });
      });
      return done(arrive * 1000 + 3400);
    }
    // catch: toss a ball back and forth
    var x1 = 18 + Math.random() * 12, x2 = 66 + Math.random() * 14, by = 4 + Math.random() * Y * 0.5, g = document.getElementById('pp-garden');
    var reach = Math.max(go(me, x1, by), go(f, x2, by)) * 1000;
    step(reach + 100, function () {
      face(me, f); tell('penpen and ' + nm + ' play catch 🏐');
      var ball = document.createElement('span'), i = document.createElement('i'); ball.className = 'ball'; i.textContent = '🏐'; ball.appendChild(i);
      ball.style.left = (x1 + 6) + '%'; ball.style.bottom = (by + 9) + '%'; g.appendChild(ball);
      [0, 1, 2, 3].forEach(function (k) {
        step(k * 950 + 50, function () { ball.style.left = (k % 2 ? x1 + 6 : x2 - 6) + '%'; i.classList.remove('up'); void i.offsetWidth; i.classList.add('up'); });
        step(k * 950 + 850, function () { hop((k % 2 ? me : f).querySelector('.pen')); sfx('hi'); });
      });
    });
    done(reach + 4200);
  }
  function startGarden() {
    stopGarden();
    if (!load().asleep && !still()) { [].slice.call(w.querySelectorAll('#pp-garden .walker')).forEach(function (el, i) { var me = el.id === 'pp-walk'; later(el, me ? 'me' : 'p' + i, me ? 700 : 1300 + i * 600); }); playSoon(); }   // penpen sets off first, then his friends one by one
    music(true);
  }
  function stopGarden() { Object.keys(GD.t).forEach(function (k) { clearTimeout(GD.t[k]); }); GD.t = {}; endPlay(); music(false); }

  /* ---------- sounds and music, made in code (no files) ---------- */
  var AC = null, MU = null;
  function soundOn() { try { return localStorage.getItem('pp_sound') !== 'off'; } catch (e) { return true; } }
  function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  function tone(c, f, f2, t, len, vol, type, out, att) {
    var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (att || Math.min(0.04, len / 3))); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out || c.destination); o.start(t); o.stop(t + len + 0.05);
  }
  function sfx(kind) {
    if (!soundOn()) return; var c = ac(); if (!c) return; var t = c.currentTime;
    if (kind === 'chomp') { [0, 0.17, 0.34].forEach(function (d) { tone(c, 230, 110, t + d, 0.09, 0.22, 'triangle'); }); tone(c, 880, 1320, t + 0.58, 0.16, 0.1); tone(c, 1175, 1760, t + 0.76, 0.2, 0.09); }
    else if (kind === 'la') [784, 988, 1175].forEach(function (f, i) { tone(c, f, 0, t + i * 0.22, 0.25, 0.09); });
    else tone(c, 660, 990, t, 0.15, 0.08);
  }
  var NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5], PADS = [[130.81, 196, 329.63], [110, 164.81, 261.63], [174.61, 220, 349.23], [146.83, 220, 293.66]];
  function music(on) {
    if (MU) { if (MU.el) MU.el.pause(); clearInterval(MU.iv); if (MU.g) MU.g.disconnect(); MU = null; }
    if (!on || !soundOn() || !w || tab !== 'pet') return;
    if (MUSIC_FILE) { var el = new Audio(MUSIC_FILE), pr; el.loop = true; el.volume = 0.35; pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); MU = { el: el }; return; }
    var c = ac(); if (!c) return;
    var g = c.createGain(), n = 0; g.gain.value = 0.05; g.connect(c.destination);
    MU = { g: g, iv: setInterval(function () {
      var t = c.currentTime + 0.05;
      if (n % 8 === 0) PADS[(n / 8) % 4].forEach(function (f) { tone(c, f, 0, t, 5, 0.45, 'sine', g, 1.4); });
      if (Math.random() < 0.65) tone(c, pick(NOTES), 0, t, 1.5, 0.55, 'sine', g);
      n++;
    }, 600) };
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) music(false); else if (w && tab === 'pet') music(true); });

  /* ---------- screen ---------- */
  var w = null, tab = 'pet', G = null, X = null, Q = null;
  function open() {
    if (document.getElementById('pp-play')) return;
    w = document.createElement('div'); w.id = 'pp-play'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Garden');
    document.body.appendChild(w); tab = 'pet';
    var p = load(), a = rewardExpenses(p), hi = p.hi; delete p.hi; save(p);
    paint(hi ? 'I’m back! 🐣 Missed you' : a ? '+' + a + ' 🐟 for the expenses you logged!' : '');
    w.addEventListener('click', click);
    w.addEventListener('pointerdown', function () { if (AC && AC.state === 'suspended') AC.resume(); });
  }
  function close() { stopAll(); if (w) w.remove(); w = null; }
  function back() { if (tab !== 'pet') { stopAll(); tab = 'pet'; paint(); } else close(); }
  window.ppPlayBack = function () { if (!document.getElementById('pp-play')) return false; back(); return true; };
  function tint(n) { return n > 60 ? '#3FAF6B' : n > 30 ? '#F4A62A' : '#D9534F'; }
  function meters(p) {
    return [[p.food, '🍽️', 'Full'], [p.joy, '💛', 'Happy']].map(function (m) {
      return '<button type="button" class="mtr" data-act="stats" aria-label="' + m[2] + ' ' + Math.round(m[0]) + '%. Open stats"><b>' + m[1] + '</b><i><u style="width:' + Math.round(m[0]) + '%;background:' + tint(m[0]) + '"></u></i></button>';
    }).join('');
  }
  function bats4(p) { return battery(p.food, '🍽️', 'Full') + battery(p.joy, '💛', 'Happy') + battery(p.energy, '⚡', 'Energy') + battery(p.hp, '❤️', 'Health'); }
  function battery(n, ic, label) {
    var c = tint(n);
    return '<button type="button" class="bat" data-bat="' + label + '" title="' + label + ' ' + Math.round(n) + '%"><span class="tip"></span><span class="cell"><u style="height:' + Math.round(n) + '%;background:' + c + '"></u></span><b>' + ic + '</b><small>' + label + '</small></button>';
  }
  function mood(p) {
    if (p.asleep) return 'Zzz… 💤 (tap Wake up when he’s rested)';
    if (sick(p)) return 'I don’t feel well 🤒 Medicine please?';
    if (p.food < 25) return 'Hungry… 🥺 drag me some food!';
    if (p.energy < 20) return 'So sleepy… 😪';
    if (p.joy < 25) return 'Bored. Rub my belly? 🥱';
    return pick(['Happy penpen! 🐧', 'Rub my belly! 💕', 'Let’s slide! 🛷', 'I love this trip ✨']);
  }
  function tabs() {
    return '<div class="tabs">' + [['pet', '🐧', 'My penpen'], ['games', '🎮', 'Games'], ['quiz', '🎓', 'Quiz'], ['learn', '📚', 'Learn'], ['sing', '🎤', 'Sing'], ['shop', '🛍️', 'Shop']].map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</div>';
  }
  function paint(msg) {
    var p = load(), wear = WEAR[p.wear] || WEAR.none;
    var h = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>' + (tab === 'pet' ? 'Garden' : { games: 'Games', slide: 'Belly Slide', quiz: 'Professor Pen’s quiz', learn: 'Learn with penpen', sing: 'Sing with penpen', shop: 'Shop' }[tab]) + '</h2><span class="coins">' + COIN + ' <b id="pp-coins">' + p.coins + '</b></span></div><div class="wrap">' + tabs();
    if (tab === 'pet') {
      var face = (p.asleep ? SHUT : '') + JOY;
      h += '<div class="garden' + (p.asleep ? ' night' : '') + '" id="pp-garden">' + gardenArt() +
        '<div class="gtop"><span class="meters">' + meters(p) + '</span><button type="button" data-act="stats" class="gbtn" aria-haspopup="dialog">📊 Stats</button><button type="button" data-act="sound" class="gbtn" aria-pressed="' + soundOn() + '" aria-label="Music and sounds">' + (soundOn() ? '🔊' : '🔇') + '</button></div>' +
        (window.ppLook ? PALS.map(function (id, i) { return '<button type="button" class="walker pal" data-pal="' + id + '" aria-label="' + window.ppLook.name(id) + ', penpen’s friend" style="left:' + START[i][0] + '%;bottom:' + START[i][1] + '%;--d:' + (1 - START[i][1] / 160).toFixed(3) + '"><span class="pen' + (p.asleep ? ' zz' : '') + '"><svg viewBox="-7 -14 134 134" width="74" height="74" aria-hidden="true">' + window.ppLook.svg(id) + (p.asleep ? SHUT : '') + '</svg></span></button>'; }).join('') : '') +
        '<div class="walker" id="pp-walk" style="left:50%;bottom:8%"><div class="pen' + (sick(p) ? ' sick' : p.asleep ? ' zz' : '') + '" id="pp-petpen">' +
        '<svg viewBox="-7 -14 134 134" width="74" height="74" aria-hidden="true">' + inner() + face + '</svg>' + (wear.e ? '<span class="wear">' + wear.e + '</span>' : '') + (sick(p) ? '<span class="fx">🤒</span>' : p.asleep ? '<span class="fx">💤</span><span class="bed">🛏️</span>' : '') +
        '</div></div><div class="say" id="pp-say">' + (msg || mood(p)) + '</div>' +
        (p.asleep ? '<button data-act="wake" class="zbtn">☀️ Wake</button>' : '<button data-act="sleep" class="zbtn">💤 Sleep</button>') +
        '</div><div class="lv">Level ' + level(p) + '</div>';
      h += '<h3>Food pile <small>(drag to penpen, or tap)</small></h3><div class="foods">' + Object.keys(FOODS).map(function (k) { var n = p.bag[k] || 0; return '<button data-feed="' + k + '"' + (n ? '' : ' disabled') + '><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>×' + n + '</small></button>'; }).join('') + '</div>' +
          '<div class="petacts"><button data-act="tickle">🪶 Tickle</button><button data-act="selfie">📸 Selfie</button><button data-act="album">🖼 Album' + (album().length ? ' (' + album().length + ')' : '') + '</button></div>' +
          '<p class="tip">Rub or tap his belly for love 💕 · Tap his friends to say hi · Log an expense → get a 🐟 · Games are always open, even when he’s sleepy.</p>';
    } else if (tab === 'slide') {
      h += '<div class="game"><canvas id="pp-slide" width="360" height="230"></canvas><div class="ghud" id="pp-ghud">Jump over rocks & snowmen, duck under snowballs ❄️</div>' +
        '<div class="pad"><button class="go" data-act="start">▶ Start</button><button class="ctl" id="pp-duck" aria-label="Duck">⬇ Duck</button><button class="ctl" id="pp-jump" aria-label="Jump">⬆ Jump</button></div></div>';
    } else if (tab === 'gym') {
      h += '<div class="gym"><div class="stage"><div class="pen" id="pp-gympen"><svg viewBox="-7 -14 134 134" width="150" height="150" aria-hidden="true">' + inner() + '</svg></div><div class="say" id="pp-gsay">Tap “Jump!” when the ring turns green 🟢</div></div>' +
        '<div class="beat"><i id="pp-beat"></i></div><div class="ghud" id="pp-gcount">Jumping jacks: 0 / 20</div>' +
        '<div class="pad"><button class="go" data-act="gym">▶ Start workout</button><button class="ctl big" id="pp-jj">Jump!</button></div>' +
        '<p class="tip">Workouts make penpen fitter (faster in Slide). He gets a bit tired, but never too tired to play.</p></div>';
    } else if (tab === 'quiz' || tab === 'games' || tab === 'sing' || tab === 'learn') {
      h += '<div id="pp-ghost-host"></div>';
    } else {
      h += '<h3>Food & care</h3><div class="shop">' + Object.keys(FOODS).filter(function (k) { return FOODS[k].price; }).map(function (k) { return '<button data-buy="f:' + k + '"><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>' + COIN + ' ' + FOODS[k].price + '</small><em>' + eff(FOODS[k]) + '</em></button>'; }).join('') + '</div>' +
        '<h3>Outfits</h3><div class="shop">' + Object.keys(WEAR).map(function (k) { var own = p.own[k], on = p.wear === k; return '<button data-buy="w:' + k + '" class="' + (on ? 'on' : '') + '"><span>' + (WEAR[k].e || '🚫') + '</span>' + WEAR[k].n + '<small>' + (on ? 'wearing' : own ? 'wear' : WEAR[k].price ? COIN + ' ' + WEAR[k].price : 'free') + '</small></button>'; }).join('') + '</div>' +
        '<p class="tip">Earn coins in Games and Quiz. A 🔋 Battery perks him up when he’s sleepy.</p>';
    }
    w.classList.toggle('imm', tab === 'pet');   // the garden fills the screen; other tabs scroll as before
    w.innerHTML = h + '</div>';
    if (tab === 'pet') { petHooks(); startGarden(); }
    if (tab === 'slide') { drawIdle(); slideHooks(); }
    var gh = document.getElementById('pp-ghost-host');
    if (gh && window.ppGames) {
      if (tab === 'games') gh.innerHTML = window.ppGames.cards(p.bests);
      if (tab === 'quiz') window.ppGames.quiz(gh, function (c) { var q = load(); q.coins += c; q.xp += c; save(q); setCoins(q); });
      if (tab === 'sing') window.ppGames.sing(gh);
      if (tab === 'learn' && window.ppGames.learn) window.ppGames.learn(gh, function (c) { var q = load(); q.coins += c; q.xp += c; q.joy = clamp(q.joy + 3); save(q); setCoins(q); });
    }
  }
  function showStats() {
    var p = load(), d = document.createElement('dialog'), b = p.bests || {}, names = { slide: 'Belly Slide', dive: 'Dive', chase: 'Chase', honk: 'Honk!' };
    d.className = 'pp-stats'; d.setAttribute('aria-label', 'penpen’s stats');
    d.innerHTML = '<div class="st-top"><b>📊 penpen’s stats</b><button type="button" data-act="stats-x" aria-label="Close stats">✕</button></div>' +
      '<div class="bats" id="pp-sbats">' + bats4(p) + '</div><p class="st-tip" id="pp-stip">Tap a battery to see what it does.</p>' +
      '<div class="st-grid"><span>Level<b>' + level(p) + '</b></span><span>Fitness<b>' + (p.fit || 0) + '</b></span><span>Coins<b>' + p.coins + '</b></span></div>' +
      (Object.keys(b).length ? '<p class="st-tip">Best scores: ' + Object.keys(b).map(function (k) { return (names[k] || k) + ' ' + b[k]; }).join(' · ') + '</p>' : '');
    w.appendChild(d); d.addEventListener('close', function () { d.remove(); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function say(t) { var s = document.getElementById('pp-say'); GD.said = now(); GD.line = ''; if (s) s.textContent = t; }
  function setCoins(p) { var c = document.getElementById('pp-coins'); if (c) c.textContent = p.coins; }
  function hop(el) { if (el && el.animate) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px) scale(1.04)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' }); }
  function hearts(x, y, n, ch) {
    for (var i = 0; i < (n || 1); i++) {
      var hrt = document.createElement('span'); hrt.className = 'pp-heart'; hrt.textContent = ch || pick(['❤️', '💕', '💖', '💗']);
      hrt.style.left = (x + (Math.random() * 40 - 20)) + 'px'; hrt.style.top = (y + (Math.random() * 20 - 10)) + 'px';
      document.body.appendChild(hrt); setTimeout(function (el) { el.remove(); }.bind(null, hrt), 1200);
    }
  }
  function eff(f) { return [f.food ? '🍽️+' + f.food : '', f.en ? '⚡+' + f.en : '', f.hp ? '❤️+' + f.hp : '', f.joy > 5 ? '💛+' + f.joy : ''].filter(Boolean).join(' '); }
  function album() { try { return JSON.parse(localStorage.getItem('pp_album') || '[]'); } catch (e) { return []; } }
  function selfie() {
    var p = load(), wear = (WEAR[p.wear] || {}).e || '';
    var sv = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -14 134 134" width="400" height="400">' + inner() + (p.asleep ? '<path d="M45 49 Q51 54 57 49 M63 49 Q69 54 75 49" fill="none" stroke="#1F2A36" stroke-width="3" stroke-linecap="round"/>' : '') + (wear ? '<text x="60" y="8" font-size="30" text-anchor="middle">' + wear + '</text>' : '') + '</svg>';
    var img = new Image(), c = document.createElement('canvas'); c.width = 480; c.height = 560;
    img.onload = function () {
      var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 560), bgs = [['#BFE6F5', '#FFF4DE'], ['#FFD9C2', '#FFF1E6'], ['#D9F2E3', '#F5FBF0'], ['#E6E0FF', '#FFF4FB']], bg = pick(bgs);
      g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); x.fillStyle = '#fff'; x.fillRect(0, 0, 480, 560); x.fillStyle = g; x.fillRect(20, 20, 440, 440);
      x.drawImage(img, 40, 40, 400, 400);
      x.fillStyle = '#13324A'; x.font = '800 26px Nunito, sans-serif'; x.textAlign = 'center';
      x.fillText(pick(['Me & my penpen 🐧', 'Cheese! 🧀', 'Travel buddy 💛', 'Peace ✌️']), 240, 500);
      x.font = '700 16px Nunito, sans-serif'; x.fillStyle = '#7A8B99'; x.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · Level ' + level(p), 240, 530);
      var url = c.toDataURL('image/jpeg', 0.8), a = album(); a.unshift({ u: url, t: now() }); a = a.slice(0, 12);
      try { localStorage.setItem('pp_album', JSON.stringify(a)); } catch (e) { a.pop(); try { localStorage.setItem('pp_album', JSON.stringify(a)); } catch (x2) {} }
      var q = load(); q.joy = clamp(q.joy + 4); q.xp += 1; save(q);
      showAlbum('📸 Snap! Saved to the album.');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv);
  }
  function showAlbum(msg) {
    var a = album(), box = document.createElement('div'); box.className = 'pp-album';
    box.innerHTML = '<div class="al-in"><div class="al-top"><b>🖼 penpen’s album</b><button type="button" class="al-x" aria-label="Close">✕</button></div>' + (msg ? '<p class="al-msg">' + msg + '</p>' : '') +
      (a.length ? '<div class="al-grid">' + a.map(function (x, i) { return '<figure><img alt="Selfie ' + (i + 1) + '" src="' + x.u + '"><figcaption><a download="penpen-selfie.jpg" href="' + x.u + '">Save</a> · <button type="button" data-del="' + i + '">Delete</button></figcaption></figure>'; }).join('') + '</div>' : '<p class="al-msg">No selfies yet. Tap 📸 Selfie!</p>') +
      '<p class="al-tip">Keeps your last 12 on this phone.</p></div>';
    document.body.appendChild(box);
    box.onclick = function (e) {
      if (e.target === box || e.target.closest('.al-x')) { box.remove(); paint(); return; }
      var d = e.target.closest('[data-del]'); if (d) { var l = album(); l.splice(+d.dataset.del, 1); localStorage.setItem('pp_album', JSON.stringify(l)); box.remove(); showAlbum(); }
    };
  }
  function feed(k) {
    var p = load(), f = FOODS[k]; if (!(p.bag[k] > 0)) return;
    if (p.asleep) return say('Shh… he’s sleeping 💤');
    if (k !== 'meds' && k !== 'bat' && p.food >= 100) return say('I’m stuffed! Maybe later 😋');
    if (k === 'bat' && p.energy >= 100) return say('Already fully charged! ⚡');
    p.bag[k]--; p.food = clamp(p.food + f.food); p.joy = clamp(p.joy + f.joy); p.energy = clamp(p.energy + (f.en || 0)); p.hp = clamp(p.hp + (f.hp || 0)); p.xp += 2; save(p);
    var fb = w && w.querySelector('[data-feed="' + k + '"]'); if (fb) { fb.querySelector('small').textContent = '×' + p.bag[k]; fb.disabled = !p.bag[k]; }
    refreshBats(p); if (!sick(p)) { var fx = w && w.querySelector('#pp-petpen .fx'); if (fx) fx.remove(); var sp = document.getElementById('pp-petpen'); if (sp) sp.classList.remove('sick'); }
    say(k === 'meds' ? 'Bleh… but I feel better! 💊' : k === 'bat' ? 'Bzzzt! Recharged ⚡😎' : pick(['Nom nom nom! ' + f.e + ' 😋', 'Yum, ' + f.n.toLowerCase() + '! ' + f.e, 'Salamat! So full 😌 ' + f.e]));
    var pen = document.getElementById('pp-petpen');
    if (pen) {
      freeze(1600); pen.classList.remove('eat'); void pen.offsetWidth; pen.classList.add('eat');
      clearTimeout(GD.t.eat); GD.t.eat = setTimeout(function () { pen.classList.remove('eat'); }, 1400);
      var r = pen.getBoundingClientRect(); hearts(r.left + r.width / 2, r.top + r.height * 0.4, 3, pick(['😋', '💖', '✨']));
    }
    sfx('chomp');
  }
  function petHooks() {
    var pen = document.getElementById('pp-petpen'); if (!pen) return;
    // tap or rub the belly → hearts
    var last = 0, rub = 0;
    pen.addEventListener('pointerdown', function (e) { love(e, 2); });
    pen.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') { rub += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (rub > 40) { rub = 0; love(e, 1); } } });
    function love(e, n) {
      var p = load(); freeze(3000);
      if (p.asleep) { say('Zzz… *happy snore* 💤'); return; }
      hearts(e.clientX, e.clientY - 20, n);
      if (now() - last > 700) { last = now(); p.joy = clamp(p.joy + 3); p.xp += 1; save(p); say(pick(['Hehe that tickles 💕', 'More belly rubs! 🥰', 'Best hooman ever 💛', 'Purr… wait, penguins don’t purr 🐧'])); refreshBats(p); }
    }
    // drag food onto penpen
    [].slice.call(w.querySelectorAll('[data-feed]')).forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        if (b.disabled) return;
        freeze(60000);
        var k = b.dataset.feed, ghost = document.createElement('span'), moved = false, sx = e.clientX, sy = e.clientY;
        ghost.className = 'pp-drag'; ghost.textContent = FOODS[k].e; document.body.appendChild(ghost);
        function mv(ev) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 8) moved = true; ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
        function up(ev) {
          document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); ghost.remove(); GD.hold = now() + 1500;
          var r = pen.getBoundingClientRect(), m = 24;
          if (!moved || (ev.clientX > r.left - m && ev.clientX < r.right + m && ev.clientY > r.top - m && ev.clientY < r.bottom + m)) feed(k);
        }
        mv(e); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
        e.preventDefault();
      });
    });
  }
  function refreshBats(p) { if (!w) return; var m = w.querySelector('.meters'), b = w.querySelector('#pp-sbats'); if (m) m.innerHTML = meters(p); if (b) b.innerHTML = bats4(p); }
  function click(e) {
    var b = e.target.closest('button'); if (!b || !w) return;
    if (b.dataset.bat) { var sy = document.getElementById('pp-stip') || document.getElementById('pp-say'); if (sy) sy.textContent = { Full: '🍽️ Full: drops over time. Drag food to penpen — bigger meals fill more.', Happy: '💛 Happy: rub or tap his belly, play games or the quiz.', Energy: '⚡ Energy: games use a little. He naps to recharge, but you can always play.', Health: '❤️ Health: comes back on its own over time. Medicine helps fast.' }[b.dataset.bat] || ''; return; }
    var p = load();
    if (b.classList.contains('back')) return back();
    if (b.dataset.tab) { stopAll(); tab = b.dataset.tab; return paint(); }
    if (b.dataset.game && window.ppGames) {
      wakeToPlay(p); p.energy = clamp(p.energy - 10); save(p);
      var host = document.getElementById('pp-ghost-host'), id = b.dataset.game;
      return window.ppGames.open(id, host, function (score, coins, ended) {
        if (score === null) return paint();
        if (!ended) return;
        var q = load(); q.coins += coins; q.xp += Math.ceil(coins / 2); q.joy = clamp(q.joy + 8); q.bests = q.bests || {}; if (score > (q.bests[id] || 0)) q.bests[id] = score; if (id === 'slide' && score > q.best) q.best = score; save(q); setCoins(q);
      });
    }
    if (b.dataset.act === 'tickle') {
      if (p.asleep) return say('Zzz… *giggles in his sleep* 💤');
      p.joy = clamp(p.joy + 6); p.energy = clamp(p.energy - 1); p.xp += 1; save(p); refreshBats(p);
      say(pick(['Hahaha stop it!! 🤣', 'Not the flippers! 😂', 'Hehehe… again! 🪶', 'I’m… so… ticklish 🤭']));
      var tp = document.getElementById('pp-petpen'); if (tp && tp.animate) tp.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 600 });
      if (tp) { var tr = tp.getBoundingClientRect(); hearts(tr.left + tr.width / 2, tr.top + tr.height * 0.3, 3, '😂'); }
      return;
    }
    if (b.dataset.act === 'stats') return showStats();
    if (b.dataset.act === 'stats-x') { var sd = w.querySelector('.pp-stats'); if (sd && sd.close && sd.open) sd.close(); else if (sd) sd.remove(); return; }
    if (b.dataset.act === 'sound') {
      var on = !soundOn(); try { localStorage.setItem('pp_sound', on ? 'on' : 'off'); } catch (e2) {}
      b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(on)); music(on); return;
    }
    if (b.dataset.pal) {
      var pal = b.querySelector('.pen'); hop(pal); sfx('hi');
      return say(p.asleep ? 'Shh… everyone’s napping 💤' : window.ppLook.name(b.dataset.pal) + pick([' says hi! 👋', ' wants to play tag! 🏃', ' loves your penpen 💛', ' found a shiny shell! 🐚']));
    }
    if (b.dataset.act === 'selfie') return selfie();
    if (b.dataset.act === 'album') return showAlbum();
    if (b.dataset.act === 'sleep') { p.asleep = true; save(p); return paint('Night night 💤'); }
    if (b.dataset.act === 'wake') { p.asleep = false; save(p); return paint(p.energy > 70 ? 'Good morning! ☀️ Fully charged' : 'Yawn… still a bit sleepy 😪'); }
    if (b.dataset.act === 'start') return startSlide();
    if (b.dataset.act === 'gym') return startGym();
    if (b.dataset.q != null) return answer(+b.dataset.q);
    if (b.dataset.act === 'quiz') return quiz(true);
    if (b.dataset.buy) {
      var kind = b.dataset.buy.split(':')[0], id = b.dataset.buy.split(':')[1];
      if (kind === 'f') { var pr = FOODS[id].price; if (p.coins < pr) return toast('Not enough coins — play games or the quiz for more!'); p.coins -= pr; p.bag[id] = (p.bag[id] || 0) + 1; save(p); toast('Bought ' + FOODS[id].e + ' ' + FOODS[id].n); return paint(); }
      if (p.own[id]) { p.wear = id; save(p); return paint(); }
      var wp = WEAR[id].price; if (p.coins < wp) return toast('Not enough coins — play games or the quiz for more!');
      p.coins -= wp; p.own[id] = 1; p.wear = id; save(p); toast('New outfit: ' + WEAR[id].e + ' ' + WEAR[id].n); return paint();
    }
  }
  // games are always open: if he's napping, he wakes up to play
  function wakeToPlay(p) { if (p.asleep) { p.asleep = false; toast('penpen woke up to play! ☀️'); } }

  /* ---------- Belly Slide: down a snowy hill ---------- */
  function drawPen(c, x, y, air, duck, t) {
    c.save(); c.translate(x, y); c.rotate(air ? -0.3 : 0.12 + Math.sin(t / 90) * 0.04); if (duck) c.scale(1.15, 0.7);
    var b = bodyColor();
    c.fillStyle = 'rgba(19,50,74,.15)'; if (!air) { c.beginPath(); c.ellipse(0, 14, 26, 4, 0, 0, 7); c.fill(); }
    c.fillStyle = b; c.beginPath(); c.ellipse(0, 0, 28, 15, 0, 0, 7); c.fill();
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(4, 5, 22, 9, 0, 0, 7); c.fill();
    c.fillStyle = b; c.beginPath(); c.ellipse(24, -8, 12, 11, 0, 0, 7); c.fill();
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(27, -6, 8, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#13324A'; c.beginPath(); c.arc(29, -9, 2.2, 0, 7); c.fill();
    c.fillStyle = '#F4A62A'; c.beginPath(); c.moveTo(34, -6); c.lineTo(42, -4); c.lineTo(34, -2); c.fill();
    c.beginPath(); c.ellipse(-27, 4, 6, 3, 0.3, 0, 7); c.fill();
    c.fillStyle = b; c.beginPath(); c.ellipse(-4, -6, 12, 4, -0.2 + (air ? -0.6 : Math.sin(t / 60) * 0.3), 0, 7); c.fill();
    var wear = (WEAR[load().wear] || {}).e; if (wear) { c.font = '16px serif'; c.fillText(wear, 16, -16); }
    c.restore();
  }
  function hill(c, W, H, off, t) {
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#BFE0F2'); sky.addColorStop(1, '#EAF4FA'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = '#DCEAF3'; c.beginPath(); c.moveTo(0, 90); for (var i = 0; i <= W; i += 40) c.lineTo(i, 70 + Math.sin((i + off * 0.2) / 50) * 18); c.lineTo(W, H); c.lineTo(0, H); c.fill();   // far mountains
    c.fillStyle = '#4E8A6B'; for (var j = 0; j < 5; j++) { var px = ((j * 95 - off * 0.5) % (W + 95) + W + 95) % (W + 95) - 40, py = 120 + (j % 2) * 8; c.beginPath(); c.moveTo(px, py - 34); c.lineTo(px - 12, py); c.lineTo(px + 12, py); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(px, py - 34); c.lineTo(px - 5, py - 22); c.lineTo(px + 5, py - 22); c.fill(); c.fillStyle = '#4E8A6B'; }
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(0, H - 70); c.lineTo(W, H - 50); c.lineTo(W, H); c.lineTo(0, H); c.fill();   // the slope
    c.strokeStyle = 'rgba(120,160,190,.25)'; c.lineWidth = 2; for (var k = 0; k < 6; k++) { var lx = ((k * 70 - off) % (W + 70) + W + 70) % (W + 70) - 35; c.beginPath(); c.moveTo(lx, H - 30 + lx * 0.055); c.lineTo(lx + 24, H - 30 + (lx + 24) * 0.055); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.9)'; for (var s = 0; s < 24; s++) { var sx = (s * 53 + t / 8) % W, sy = (s * 37 + t / 5) % (H - 60); c.beginPath(); c.arc(sx, sy, 1.6, 0, 7); c.fill(); }
  }
  function groundY(x, H) { return H - 70 + x * (20 / 360) - 6; }
  function drawIdle() { var cv = document.getElementById('pp-slide'); if (!cv) return; var c = cv.getContext('2d'); hill(c, cv.width, cv.height, 0, 0); drawPen(c, 80, groundY(80, cv.height) - 10, false, false, 0); }
  function slideHooks() {
    var j = document.getElementById('pp-jump'), d = document.getElementById('pp-duck');
    if (j) j.addEventListener('pointerdown', function (e) { e.preventDefault(); if (G) G.jump(); });
    if (d) { d.addEventListener('pointerdown', function (e) { e.preventDefault(); if (G) G.duck = true; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { d.addEventListener(ev, function () { if (G) G.duck = false; }); }); }
  }
  function startSlide() {
    var p = load(); wakeToPlay(p);
    var cv = document.getElementById('pp-slide'); if (!cv) return;
    stopAll();
    var c = cv.getContext('2d'), W = cv.width, H = cv.height, px = 80, gy = groundY(px, H) - 10;
    G = { y: gy, vy: 0, t: 0, off: 0, speed: 3.4 + speedSkill(p) * 0.12, items: [], score: 0, fish: 0, coins: 0, next: 50, alive: true, raf: 0, last: 0, duck: false };
    p.energy = clamp(p.energy - 10); save(p);
    var go = w.querySelector('.go'); if (go) go.style.display = 'none';
    G.jump = function () { if (G && G.alive && G.y >= gy - 1 && !G.duck) G.vy = -9.4 - speedSkill(load()) * 0.05; };
    G.key = function (e) { if (!G) return; if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); G.jump(); } if (e.key === 'ArrowDown') { e.preventDefault(); G.duck = e.type === 'keydown'; } };
    document.addEventListener('keydown', G.key); document.addEventListener('keyup', G.key);
    function step(ts) {
      if (!G) return; G.raf = requestAnimationFrame(step);
      if (ts - G.last < 14) return; G.last = ts;
      G.t += 16; G.off += G.speed; G.speed += 0.0018; G.score += G.speed / 10;
      G.vy += 0.5; G.y = Math.min(gy, G.y + G.vy);
      if (--G.next <= 0) {
        var r = Math.random(), x0 = W + 20;
        G.items.push(r < 0.4 ? { k: pick(['🪨', '⛄', '🌲']), x: x0, ground: 1, bad: 1 } : r < 0.6 ? { k: '❄️', x: x0, y: gy - 26, bad: 1, high: 1 } : r < 0.82 ? { k: '🐟', x: x0, y: gy - 30 - Math.random() * 40 } : { k: 'coin', x: x0, y: gy - 20 - Math.random() * 50 });
        G.next = 42 + Math.random() * 55 - Math.min(22, G.speed * 2);
      }
      hill(c, W, H, G.off, G.t);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (var i = G.items.length - 1; i >= 0; i--) {
        var it = G.items[i]; it.x -= G.speed; var iy = it.ground ? groundY(it.x, H) - 12 : it.y;
        if (it.k === 'coin') { c.fillStyle = '#F4C542'; c.beginPath(); c.arc(it.x, iy, 9, 0, 7); c.fill(); c.strokeStyle = '#C9962B'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#8A6516'; c.font = 'bold 10px sans-serif'; c.fillText(COIN_SIGN, it.x, iy + 1); }
        else { c.font = (it.high ? '22px' : '26px') + ' serif'; c.fillText(it.k, it.x, iy); }
        var hy = G.duck ? G.y + 6 : G.y, near = Math.abs(it.x - (px + 12)) < 24;
        if (near) {
          if (it.bad) { if (it.high ? !G.duck && Math.abs(iy - hy) < 22 : Math.abs(iy - hy) < 20) G.alive = false; }
          else if (Math.abs(iy - hy) < 26) { if (it.k === '🐟') G.fish++; else G.coins += 2; G.items.splice(i, 1); continue; }
        }
        if (it.x < -30) G.items.splice(i, 1);
      }
      drawPen(c, px, G.duck && G.y >= gy - 1 ? gy + 4 : G.y, G.y < gy - 1, G.duck, G.t);
      var hud = document.getElementById('pp-ghud'); if (hud) hud.innerHTML = '🏁 ' + Math.floor(G.score) + ' &nbsp; 🐟 ' + G.fish + ' &nbsp; ' + COIN + ' ' + G.coins;
      if (!G.alive) endSlide();
    }
    G.raf = requestAnimationFrame(step);
  }
  function endSlide() {
    var g = G; stopAll();
    var p = load(), s = Math.floor(g.score), earn = g.coins + Math.floor(s / 50);
    p.coins += earn; p.bag.fish = (p.bag.fish || 0) + g.fish; p.xp += Math.floor(s / 20) + g.fish; p.joy = clamp(p.joy + 8);
    var best = s > p.best; if (best) p.best = s; save(p);
    var hud = document.getElementById('pp-ghud'); if (hud) hud.innerHTML = (best ? '🏆 New best! ' : 'Wipeout! ') + s + ' · +' + earn + ' ' + COIN + ' · +' + g.fish + ' 🐟';
    var go = w && w.querySelector('.go'); if (go) { go.style.display = ''; go.textContent = '↻ Again'; }
    setCoins(p);
  }

  /* ---------- Exercise: jumping jacks to the beat ---------- */
  function startGym() {
    var p = load(); wakeToPlay(p);
    stopAll(); p.energy = clamp(p.energy - 15); save(p);
    var go = w.querySelector('.go'); if (go) go.style.display = 'none';
    X = { reps: 0, miss: 0, t0: performance.now(), period: 900, raf: 0 };
    var ring = document.getElementById('pp-beat'), pen = document.getElementById('pp-gympen'), btn = document.getElementById('pp-jj');
    function phase() { return ((performance.now() - X.t0) % X.period) / X.period; }
    function loop() { if (!X) return; X.raf = requestAnimationFrame(loop); var f = phase(); if (ring) { ring.style.transform = 'scale(' + (0.4 + f * 0.6) + ')'; ring.style.background = f > 0.8 ? '#3FAF6B' : '#9AA7B4'; } }
    loop();
    X.tap = function (e) {
      if (!X) return; e.preventDefault();
      var f = phase(), good = f > 0.75;
      if (good) { X.reps++; if (pen && pen.animate) pen.animate([{ transform: 'translateY(0) scaleX(1)' }, { transform: 'translateY(-22px) scaleX(1.12)' }, { transform: 'translateY(0) scaleX(1)' }], { duration: 300 }); }
      else X.miss++;
      var c = document.getElementById('pp-gcount'); if (c) c.textContent = 'Jumping jacks: ' + X.reps + ' / 20' + (X.miss ? ' · missed ' + X.miss : '');
      var s = document.getElementById('pp-gsay'); if (s) s.textContent = good ? pick(['One more! 💪', 'Yes! 🔥', 'Hup! 🐧', 'Feel the burn 😤']) : 'Wait for green 🟢';
      if (X.reps >= 20 || X.miss >= 8) endGym();
    };
    if (btn) btn.addEventListener('pointerdown', X.tap);
  }
  function endGym() {
    var x = X; stopAll();
    var p = load(), gain = Math.max(0, x.reps); p.fit = (p.fit || 0) + gain; p.xp += Math.floor(gain / 2); p.food = clamp(p.food - 6);
    save(p);
    var s = document.getElementById('pp-gsay'); if (s) s.textContent = x.reps >= 20 ? 'Workout done! 💪 Fitness +' + gain : 'Phew… ' + x.reps + ' reps 😮‍💨';
    var go = w && w.querySelector('.go'); if (go) { go.style.display = ''; go.textContent = '↻ Another set'; }
  }

  /* ---------- Trivia quiz ---------- */
  function quiz(next) {
    if (!Q || next) { var ph = window.ppPlace().cc === 'PH', pool = QUIZ.filter(function (q) { return ph || q[3] !== 'PH'; }).sort(function () { return Math.random() - 0.5; }); Q = { qs: pool.slice(0, 3), i: 0, right: 0 }; }
    var box = document.getElementById('pp-quiz'); if (!box) return;
    if (Q.i >= Q.qs.length) {
      var p = load(), earn = Q.right * 3; p.coins += earn; p.joy = clamp(p.joy + Q.right * 3); p.xp += Q.right; save(p); setCoins(p);
      box.innerHTML = '<div class="qcard"><div class="qq">' + (Q.right === 3 ? '🏆 Perfect!' : Q.right ? '🎉 Nice!' : '🐧 Next time!') + '</div><p>' + Q.right + ' / 3 right · +' + earn + ' ' + COIN + '</p><button class="go" data-act="quiz">Play again</button></div>';
      Q = null; return;
    }
    var q = Q.qs[Q.i], order = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
    Q.order = order;
    box.innerHTML = '<div class="qcard"><small>Question ' + (Q.i + 1) + ' of 3</small><div class="qq">' + q[0] + '</div>' + order.map(function (o, n) { return '<button class="qa" data-q="' + n + '">' + q[1][o] + '</button>'; }).join('') + '</div>';
  }
  function answer(n) {
    if (!Q) return; var q = Q.qs[Q.i], ok = Q.order[n] === q[2];
    var bs = [].slice.call(w.querySelectorAll('.qa')); bs.forEach(function (b, i) { b.disabled = true; if (Q.order[i] === q[2]) b.classList.add('ok'); else if (i === n) b.classList.add('no'); });
    if (ok) Q.right++;
    setTimeout(function () { if (!Q) return; Q.i++; quiz(); }, 900);
  }

  function stopAll() {
    stopGarden();
    if (window.ppGames) window.ppGames.stop();
    if (G) { cancelAnimationFrame(G.raf); document.removeEventListener('keydown', G.key); document.removeEventListener('keyup', G.key); G = null; }
    if (X) { cancelAnimationFrame(X.raf); var b = document.getElementById('pp-jj'); if (b) b.removeEventListener('pointerdown', X.tap); X = null; }
  }
  window.ppOpenPlay = open;

  var css =
    '#pp-play{position:fixed;inset:0;z-index:99965;background:var(--bg);color:var(--ink);overflow:auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:16px/1.4 ' + F + ';user-select:none;-webkit-user-select:none}' +
    '#pp-play .top{display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto 10px}#pp-play h2{flex:1;margin:0;font:900 24px ' + F + '}' +
    '#pp-play .back{border:0;background:var(--card);color:var(--ink);border-radius:50%;width:40px;height:40px;font-size:24px;line-height:1;padding:0 0 3px;cursor:pointer}' +
    '#pp-play .coins{background:var(--card);border-radius:99px;padding:6px 12px;font-weight:900;display:flex;align-items:center;gap:6px}' +
    '.cn{display:inline-block;width:1.05em;height:1.05em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE58A,#F4C542 55%,#C9962B);box-shadow:inset 0 0 0 2px #E0AE36;vertical-align:-0.15em;position:relative}.cn::after{content:"' + COIN_SIGN + '";position:absolute;inset:0;display:grid;place-items:center;font:900 .62em/1 ' + F + ';color:#8A6516;font-style:normal}' +
    '#pp-play .wrap{max-width:560px;margin:0 auto}#pp-play h3{font:900 13px ' + F + ';letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:16px 4px 8px}#pp-play h3 small{text-transform:none;letter-spacing:0;font-weight:700}' +
    '#pp-play .tabs{display:flex;gap:4px;background:var(--chip);border-radius:18px;padding:4px;margin-bottom:12px}#pp-play .tabs button{flex:1;border:0;background:none;border-radius:14px;padding:6px 2px;font:800 12px ' + F + ';color:var(--ink);cursor:pointer;display:flex;flex-direction:column;align-items:center}#pp-play .tabs span{font-size:20px}#pp-play .tabs .on{background:var(--card);box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '#pp-play .stage{flex:1;background:linear-gradient(180deg,var(--accentSoft),var(--card));border-radius:24px;padding:12px 8px;text-align:center;position:relative;transition:background .4s}#pp-play .stage.night{background:linear-gradient(180deg,#24324F,#3C4C70)}' +
    '#pp-play .pen{position:relative;display:inline-block;animation:pppb 1.6s ease-in-out infinite alternate;touch-action:none;cursor:pointer}#pp-play .pen.zz{animation-duration:3s}#pp-play .pen.sick{filter:saturate(.5) hue-rotate(40deg)}' +
    '#pp-play .wear{position:absolute;left:50%;top:2px;transform:translateX(-50%);font-size:27px;pointer-events:none}#pp-play .fx{position:absolute;right:-6px;top:2px;font-size:20px;pointer-events:none}' +
    '@keyframes pppb{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-6px) rotate(3deg)}}' +
    '#pp-play .say{display:inline-block;background:var(--card);color:var(--ink);border-radius:16px;padding:6px 12px;font-weight:800;margin-top:4px;font-size:14.5px}' +
    '#pp-play .bats{display:grid;grid-template-columns:1fr;gap:6px;width:58px;align-content:center}#pp-play .bat{border:0;font:inherit;color:inherit;cursor:pointer}#pp-play .bat .cell{width:20px!important;height:36px!important}' +
    '#pp-play .zbtn{position:absolute;top:10px;right:10px;border:0;border-radius:99px;background:rgba(255,255,255,.9);color:#13324A;padding:6px 10px;font:800 13px ' + F + ';cursor:pointer;z-index:2}' +
    '#pp-play .bat{background:var(--card);border-radius:16px;padding:8px 4px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative}' +
    '#pp-play .bat .tip{width:12px;height:4px;border-radius:2px 2px 0 0;background:var(--line)}#pp-play .bat .cell{width:26px;height:46px;border:2.5px solid var(--line);border-radius:7px;display:flex;align-items:flex-end;overflow:hidden;padding:2px;box-sizing:border-box}#pp-play .bat u{display:block;width:100%;border-radius:3px;transition:height .4s}' +
    '#pp-play .bat b{font-size:15px;line-height:1}#pp-play .bat small{font-size:11px;font-weight:800;color:var(--muted)}' +
    '#pp-play .lv{text-align:center;color:var(--muted);font-weight:800;font-size:13.5px;margin:10px 0 0}' +
    '#pp-play .petacts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 0}#pp-play .petacts button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:16px;padding:10px 4px;font:800 14px ' + F + '}#pp-play .shop em{font-style:normal;font-size:11px;color:var(--muted);font-weight:700;margin-top:2px}#pp-play .bed{position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);font-size:42px;z-index:0;opacity:.9;pointer-events:none}#pp-play .pen{position:relative;z-index:1}#pp-play .pen.zz svg{position:relative;z-index:1}.pp-album{position:fixed;inset:0;z-index:99990;background:rgba(10,20,30,.55);display:flex;align-items:flex-end;justify-content:center}.pp-album .al-in{background:var(--card,#fff);color:var(--ink,#13324A);width:100%;max-width:520px;max-height:86vh;overflow:auto;border-radius:24px 24px 0 0;padding:16px;font-family:' + F + '}.pp-album .al-top{display:flex;justify-content:space-between;align-items:center;font-size:18px}.pp-album .al-x{border:0;background:none;font-size:20px}.pp-album .al-msg{color:var(--muted);font-weight:700}.pp-album .al-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.pp-album figure{margin:0}.pp-album img{width:100%;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.15)}.pp-album figcaption{font-size:13px;text-align:center;margin-top:4px}.pp-album figcaption a,.pp-album figcaption button{color:#237566;font-weight:800;border:0;background:none;font:inherit;font-weight:800;padding:0}.pp-album .al-tip{font-size:12px;color:var(--muted);text-align:center}' +
    '#pp-play .foods,#pp-play .shop{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}#pp-play .shop{grid-template-columns:repeat(3,1fr)}' +
    '#pp-play .foods button,#pp-play .shop button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:16px;padding:8px 2px;font:800 12.5px ' + F + ';cursor:grab;display:flex;flex-direction:column;align-items:center;gap:1px;touch-action:none}' +
    '#pp-play .foods span,#pp-play .shop span{font-size:28px}#pp-play small{color:var(--muted);font-weight:700}#pp-play button[disabled]{opacity:.4}#pp-play .shop .on{border-color:var(--accent);background:var(--accentSoft)}' +
    '#pp-play .row2{display:flex;gap:8px;margin-top:12px}#pp-play .row2 button{flex:1;border:0;background:var(--accent);color:#fff;border-radius:14px;padding:12px 6px;font:800 14.5px ' + F + ';cursor:pointer}' +
    '#pp-play .tip{color:var(--muted);font-size:13px;text-align:center;margin-top:14px}' +
    '#pp-play canvas{width:100%;height:auto;border-radius:20px;display:block;background:#BFE0F2}' +
    '#pp-play .ghud{text-align:center;font-weight:900;margin:10px 0}' +
    '#pp-play .pad{display:flex;gap:10px;align-items:stretch}#pp-play .pad .go{flex:1.2}#pp-play .go{border:0;background:var(--accent);color:#fff;border-radius:16px;padding:14px;font:900 16px ' + F + ';cursor:pointer}' +
    '#pp-play .ctl{flex:1;border:0;background:var(--card);color:var(--ink);border-radius:18px;padding:16px 6px;font:900 18px ' + F + ';box-shadow:0 4px 0 var(--line);touch-action:none;cursor:pointer}#pp-play .ctl:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}#pp-play .ctl.big{flex:2;font-size:22px}' +
    '#pp-play .zz .pp-eyes{display:none}#pp-play .gym .stage{min-height:200px}#pp-play .beat{height:70px;display:grid;place-items:center}#pp-play .beat i{display:block;width:60px;height:60px;border-radius:50%;background:#9AA7B4;opacity:.85}' +
    '#pp-play .qcard{background:var(--card);border-radius:22px;padding:18px;text-align:center}#pp-play .qq{font:900 19px/1.3 ' + F + ';margin:6px 0 14px}' +
    '#pp-play .qa{display:block;width:100%;margin:8px 0;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:14px;padding:13px;font:800 15px ' + F + ';cursor:pointer}#pp-play .qa.ok{background:#DFF3E6;border-color:#3FAF6B}#pp-play .qa.no{background:#FBE1DE;border-color:#D9534F}' +
    '#pp-play .garden{position:relative;aspect-ratio:9/11;min-height:340px;max-height:500px;border-radius:24px;overflow:hidden;background:#CDEBFA}#pp-play .gart{position:absolute;inset:0;width:100%;height:100%;transition:filter .4s}#pp-play .garden.night .gart{filter:brightness(.5) saturate(.6)}' +
    '#pp-play.imm{display:flex;flex-direction:column;padding-bottom:calc(12px + env(safe-area-inset-bottom))}#pp-play.imm .top{width:100%}#pp-play.imm .wrap{flex:1;width:100%;display:flex;flex-direction:column;min-height:0}' +
    '#pp-play.imm .garden{flex:1 1 auto;aspect-ratio:auto;min-height:340px;max-height:none}#pp-play.imm h3,#pp-play.imm .tip{display:none}#pp-play.imm .lv{margin:6px 0}#pp-play.imm .foods button{padding:6px 2px}#pp-play.imm .foods span{font-size:24px}#pp-play.imm .petacts{margin-top:8px}#pp-play.imm .petacts button{padding:8px 4px}' +
    '@media(max-width:600px){#pp-play.imm .garden{margin:0 -16px;border-radius:0}}' +
    '#pp-play .cloud{animation:ppcloud 60s linear infinite alternate}#pp-play .cloud.c2{animation-duration:90s}@keyframes ppcloud{to{transform:translateX(40px)}}@media(prefers-reduced-motion:reduce){#pp-play .cloud{animation:none}}' +
    '#pp-play .gtop{position:absolute;left:10px;right:10px;top:10px;display:flex;gap:6px;align-items:center;z-index:50}#pp-play .meters{flex:1;display:flex;gap:6px}' +
    '#pp-play .mtr{flex:1;max-width:120px;border:0;background:rgba(255,255,255,.88);border-radius:99px;padding:5px 8px;display:flex;align-items:center;gap:5px;cursor:pointer}#pp-play .mtr b{font-size:14px}#pp-play .mtr i{flex:1;height:8px;border-radius:9px;background:#DDE6EE;overflow:hidden}#pp-play .mtr u{display:block;height:100%;border-radius:9px;transition:width .4s}' +
    '#pp-play .gbtn{border:0;border-radius:99px;background:rgba(255,255,255,.9);color:#13324A;padding:6px 10px;font:800 13px ' + F + ';cursor:pointer}' +
    '#pp-play .garden .say{position:absolute;left:50%;top:52px;transform:translateX(-50%);z-index:50;max-width:84%;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.1)}#pp-play .garden .zbtn{top:auto;bottom:10px;z-index:50}' +
    '#pp-play .walker{position:absolute;transform:translateX(-50%) scale(var(--d,1));transform-origin:50% 100%;transition-property:left,bottom,transform;transition-timing-function:linear;z-index:30}#pp-play .walker.pal{border:0;background:none;padding:0;cursor:pointer}#pp-play .walker.l svg{transform:scaleX(-1)}' +
    '#pp-play .walker.walking .pen{animation:ppwd .32s ease-in-out infinite alternate}@keyframes ppwd{from{transform:rotate(-7deg)}to{transform:rotate(7deg) translateY(-3px)}}' +
    '#pp-play .joy{display:none}#pp-play .walker .pen.eat{animation:ppchew .2s ease-in-out 6 alternate}#pp-play .pen.eat .joy{display:inline}#pp-play .pen.eat .pp-eyes,#pp-play .pen.eat .shut{display:none}@keyframes ppchew{to{transform:scale(1.07,.9)}}' +
    '#pp-play .garden .bed{font-size:52px}' +
    '#pp-play .walker.dance .pen{animation:ppdance .45s ease-in-out infinite alternate}@keyframes ppdance{from{transform:rotate(-12deg) translateY(0)}to{transform:rotate(12deg) translateY(-12px)}}' +
    '#pp-play .ball{position:absolute;transform:translateX(-50%);transition:left .8s linear;z-index:45;font-size:24px;pointer-events:none}#pp-play .ball i{display:block;font-style:normal}#pp-play .ball i.up{animation:pparc .8s ease-in-out}@keyframes pparc{50%{transform:translateY(-56px) rotate(180deg)}}' +
    '.pp-stats{border:0;border-radius:24px;padding:16px;width:min(92vw,420px);background:var(--card,#fff);color:var(--ink,#13324A);font-family:' + F + ';box-shadow:0 12px 40px rgba(0,0,0,.25)}.pp-stats:not([open]){display:none}.pp-stats[open]:not(:modal){position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99980;margin:0}.pp-stats::backdrop{background:rgba(10,20,30,.45)}' +
    '.pp-stats .st-top{display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:12px}.pp-stats .st-top button{border:0;background:none;font-size:20px;color:inherit;cursor:pointer}' +
    '#pp-play .pp-stats .bats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:auto}.pp-stats .st-tip{color:var(--muted,#7A8B99);font-size:13.5px;font-weight:700;text-align:center;margin:10px 0}' +
    '.pp-stats .st-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pp-stats .st-grid span{background:var(--bg,#F5F8FA);border-radius:14px;padding:8px;text-align:center;font-size:12.5px;font-weight:800;color:var(--muted,#7A8B99)}.pp-stats .st-grid b{display:block;font-size:20px;color:var(--ink,#13324A)}' +
    '@media (prefers-reduced-motion: reduce){#pp-play .walker{transition:none}#pp-play .pen,#pp-play .walker .pen.eat{animation:none}}' +
    '.pp-heart{position:fixed;z-index:99990;font-size:24px;pointer-events:none;animation:pphrt 1.2s ease-out forwards}@keyframes pphrt{to{transform:translateY(-70px) scale(1.4);opacity:0}}' +
    '.pp-drag{position:fixed;z-index:99990;font-size:40px;pointer-events:none;transform:translate(-50%,-60%)}' +
    '.pp-pt{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99970;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:9px 14px;font:800 14px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);max-width:86vw;text-align:center}.pp-pt.out{opacity:0;transition:.35s}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
