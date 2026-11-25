/* penpen's Igloo — a little pet to look after (works with no signal).
   penpen gets hungry, bored and sleepy over time. Look after him and he levels up.
   No-fail: he never dies or runs away, games are always open, and while you're away he only
   gets a bit hungry and bored (never below 20) and naps, so he's always fine when you come back.
   A new game starts with an egg: tap it to hatch, then pick his name, colours, eyes and outfit (change them later in Wardrobe).
   Tabs: penpen (feed, rub belly, sleep) · Games · Quiz · Learn · Sing · Shop.
   Tap the garden's igloo to go inside: a cozy games room where you walk penpen to a thing (goggles = Dive, rug = Chase, sled = Belly Slide, trumpet = Honk!, chalkboard = Quiz, bookshelf = Learn, record player = Sing, wardrobe = Shop) and Play pops up.
   Every expense you log on the trip earns a 🐟. Everything is saved on this phone. */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  var KEY = 'pp_pet';
  var COIN = '<i class="cn" aria-label="coins"></i>';
  var FOODS = {
    fish:   { e: '🐟', n: 'Fish', food: 18, joy: 4, en: 4, price: 0 },
    mango:  { e: '🥭', n: 'Mango', food: 15, joy: 10, en: 8, price: 10 },
    sushi:  { e: '🍣', n: 'Sushi', food: 30, joy: 15, en: 10, price: 20 },
    bat:    { e: '🔋', n: 'Battery', food: 0, joy: 2, en: 45, price: 25 }
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
  // V: the save's version. A save from before eggs (no v, or an older one) starts fresh once with a new egg; travel data is never touched.
  var V = 2;
  function fresh() { return { v: V, egg: true, name: 'penpen', food: 80, joy: 75, energy: 80, xp: 0, fit: 0, coins: 20, best: 0, bag: { fish: 3 }, own: { none: 1, hat: 1 }, wear: 'none', t: now(), exp: -1, asleep: false, born: now() }; }
  function away(v, drop) { return v > FLOOR ? Math.max(FLOOR, v - drop) : v; }
  function load() {
    var p = null; try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!p || p.v !== V) p = fresh();
    var hrs = Math.max(0, (now() - (p.t || now())) / 36e5);
    if (hrs > 0.01) {
      // life goes on while you're away, gently: a bit hungry and bored, and he naps
      p.food = away(p.food, hrs * (p.asleep ? 1.5 : 3));
      p.joy = away(p.joy, hrs * (p.asleep ? 0.5 : 2));
      p.energy = clamp(p.energy + hrs * (p.asleep ? 60 : 10));
      if (p.asleep && p.energy >= 100) p.asleep = false;
      p.t = now();
    }
    return p;
  }
  function clamp(n) { return Math.max(0, Math.min(100, n)); }
  function save(p) { p.t = now(); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function level(p) { return 1 + Math.floor(Math.sqrt(p.xp / 20)); }
  function speedSkill(p) { return Math.min(10, 1 + Math.floor(level(p) / 3) + Math.floor((p.fit || 0) / 40)); }
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

  /* ---------- his look: your own design, made when he hatches (separate from your travel avatar) ---------- */
  // only these values are ever saved or drawn, so nothing typed can get into the drawing
  var PAL = {
    body: [['#1E2B4A', 'Navy'], ['#5DA9E9', 'Sky blue'], ['#1F8FA6', 'Teal'], ['#3D7A4B', 'Green'], ['#7C6BB8', 'Purple'], ['#E87EA1', 'Pink'], ['#E46F5A', 'Coral'], ['#F4A62A', 'Gold'], ['#17181C', 'Black']],
    eyes: [['dots', 'Dots'], ['shine', 'Shiny'], ['happy', 'Happy'], ['lashes', 'Lashes'], ['wink', 'Wink']],
    beak: [['#F4A62A', 'Orange'], ['#F4D03F', 'Yellow'], ['#F28AA5', 'Pink'], ['#D9534F', 'Red'], ['#9AA7B4', 'Grey']]
  };
  PAL.feet = PAL.beak;
  function okVal(k, v) { return PAL[k].some(function (o) { return o[0] === v; }); }
  function look(p) {
    var l = p.look || {}, out = {};
    Object.keys(PAL).forEach(function (k) { out[k] = okVal(k, l[k]) ? l[k] : PAL[k][0][0]; });
    return out;
  }
  function inner(p) { return window.ppLook ? window.ppLook.svg(look(p || load())) : ''; }
  // the games draw your garden penpen too
  window.ppGamePen = function () { return inner(); };
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function nameOf(p) { return p.name || 'penpen'; }

  /* ---------- his stats: Swim, Run, Power, Stamina, Charm (0 to 99). Each grows from sea glass won in its game ---------- */
  var STATS = [['swim', '🌊', 'Swim', '#3B8FD9', 'Dive'], ['run', '👟', 'Run', '#3FAF6B', 'Chase'], ['power', '💪', 'Power', '#D9534F', 'Honk!'], ['stamina', '🔋', 'Stamina', '#E39B1E', 'Belly Slide'], ['charm', '💖', 'Charm', '#D9649A', 'Quiz and Learn']];
  var GLASS_FOR = { dive: 'swim', chase: 'run', honk: 'power', slide: 'stamina', quiz: 'charm', learn: 'charm' };
  function stat(p, k) { return (p.st && p.st[k]) || 0; }
  // a finished game drops 1 to 3 pieces of sea glass (more for a better game); each piece is +1 to the matching stat
  function winGlass(p, game, coins) {
    var k = GLASS_FOR[game]; if (!k || !(coins > 0)) return 0;
    var n = Math.min(3, 1 + Math.floor(coins / 10)), was = stat(p, k);
    p.st = p.st || {}; p.st[k] = Math.min(99, was + n);
    return p.st[k] - was;
  }
  function glassLine(game, n) { var s = STATS.filter(function (x) { return x[0] === GLASS_FOR[game]; })[0]; return n && s ? '+' + n + ' sea glass <i class="sg" style="--c:' + s[3] + '"></i> ' + s[2] + ' +' + n : ''; }

  /* ---------- garden: drawn in code. To use a picture instead, swap gardenArt() for an <img> ---------- */
  var PALS = ['sweet', 'surfer', 'sunny', 'buddy', 'goofydad', 'grandma'];   // penguin friends who wander the garden (ids from guides.js)
  var START = [[20, 22], [80, 16], [32, 30], [68, 28], [12, 8], [88, 6]];   // where each friend stands when the garden opens (% across, % up)
  var MUSIC_FILE = '';              // set to a music file (e.g. 'audio/garden.m4a') to play it instead of the code-made tune
  // the garden's igloo: the cozy games room is inside (tap it or its sign to go in)
  var IGLOO = '<path d="M22 176 A36 36 0 0 1 94 176 Z" fill="#F4FAFF" stroke="#C9DCEA" stroke-width="2"/><path d="M50 176 A8 11 0 0 1 66 176Z" fill="#5B7A99"/><path d="M30 164 H86 M40 152 H76" stroke="#C9DCEA" stroke-width="2"/>';
  var SHUT = '<path class="shut" d="M45 49 Q51 54 57 49 M63 49 Q69 54 75 49" fill="none" stroke="#1F2A36" stroke-width="3" stroke-linecap="round"/>';
  // the egg a new game starts with; its cracks show one by one as you tap
  var EGG = '<ellipse cx="60" cy="112" rx="24" ry="4" fill="#13324A" opacity=".14"/><path d="M60 20 C80 20 92 56 92 78 C92 98 78 110 60 110 C42 110 28 98 28 78 C28 56 40 20 60 20 Z" fill="#FFF8EE" stroke="#C9DCEA" stroke-width="2"/>' +
    '<g fill="#8FCFF2"><circle cx="48" cy="52" r="6"/><circle cx="72" cy="44" r="4.5"/><circle cx="76" cy="84" r="7"/><circle cx="44" cy="92" r="5"/><circle cx="60" cy="70" r="3.5"/></g>' +
    '<g fill="none" stroke="#5B7A99" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="ck ck1" d="M36 66 L46 72 L52 64 L60 72"/><path class="ck ck2" d="M60 72 L68 64 L76 72 L86 66"/></g>';
  var JOY = '<path class="joy" d="M45 51 Q51 44 57 51 M63 51 Q69 44 75 51" fill="none" stroke="#1F2A36" stroke-width="3.2" stroke-linecap="round"/>';
  /* ---------- livelier penguins: a side view for walking, blinking eyes, sad brows, an open beak, flappy flippers ---------- */
  var SKIN = '#FFF9F2';
  // laid over a front view: eyelids that blink (or droop when sad), sad brows, and an open beak for big smiles; CSS decides which show
  function faceBits(x1, x2, y, r) {
    function lid(x) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + r + '" fill="' + SKIN + '"/><path d="M' + (x - r + 1) + ' ' + y + ' H' + (x + r - 1) + '" stroke="#1F2A36" stroke-width="2.2" stroke-linecap="round"/>'; }
    return '<g class="lid">' + lid(x1) + lid(x2) + '</g>' +
      '<path class="brow" d="M' + (x1 - 6) + ' ' + (y - 8) + ' L' + (x1 + 4) + ' ' + (y - 12) + ' M' + (x2 + 6) + ' ' + (y - 8) + ' L' + (x2 - 4) + ' ' + (y - 12) + '" fill="none" stroke="#1F2A36" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path class="mouth" d="M55.5 60 Q60 68 64.5 60 Z" fill="#B8502A"/>';
  }
  // front view, plus the side view that shows while walking
  function views(front, side) {
    var v = ' viewBox="-7 -14 134 134" width="74" height="74" aria-hidden="true">';
    return '<svg class="fv"' + v + front + '</svg><svg class="sv"' + v + side + '</svg>';
  }
  function sad(p) { return !p.asleep && !p.egg && (p.food < 25 || p.joy < 25); }
  // a happy moment: open beak and flappy flippers for a bit
  function cheer(el, ms) { if (!el) return; el.classList.add('yay'); clearTimeout(el.ppYay); el.ppYay = setTimeout(function () { el.classList.remove('yay'); }, ms || 1400); }
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
      '<g transform="translate(40 0)">' + IGLOO + '</g>' +
      fl + '</g></svg>';
  }
  var GD = { t: {}, hold: 0, s: [] }, Y = 37;   // Y: how far back (in % of the garden) the penguins can walk
  function still() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function later(el, key, ms) { clearTimeout(GD.t[key]); GD.t[key] = setTimeout(function () { stroll(el, key); }, ms); }
  // walk el to x% across, y% up; returns the seconds it takes (pace: % per second)
  // the walking class is 'walking', not 'go': #pp-play .go is the green Start button style, and it painted a green box behind penpen
  function go(el, x, y, pace, deep) {
    var x0 = parseFloat(el.style.left) || 50, secs = Math.max(pace ? 0.5 : 1.2, Math.abs(x - x0) / (pace || 14));
    el.style.transitionDuration = secs + 's'; if (x !== x0) el.classList.toggle('l', x < x0); el.classList.add('walking');
    el.style.left = x + '%'; el.style.bottom = y + '%'; el.style.zIndex = String(40 - Math.round(y)); el.style.setProperty('--d', (1 - y / (deep || 160)).toFixed(3));
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
    var mb = parseFloat(getComputedStyle(el).marginBottom) || 0;   // full screen lifts the walkers above the food bar with a bottom margin
    if (b.width) { el.style.transitionDuration = '0s'; el.style.left = ((r.left + r.width / 2 - b.left) / b.width * 100) + '%'; el.style.bottom = ((b.bottom - r.bottom - mb) / b.height * 100) + '%'; }
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
    var f = pick(pals), nm = window.ppLook ? window.ppLook.name(f.dataset.pal) : 'his friend', mine = nameOf(load()), who = [me].concat(pals), game = pick(['meet', 'tag', 'dance', 'ball']);
    function done(ms) { step(ms, function () { endPlay(); playSoon(); }); }
    (game === 'dance' ? who : [me, f]).forEach(function (el) { el.ppBusy = true; });
    if (game === 'meet') {
      var mx = 25 + Math.random() * 50, my = 4 + Math.random() * Y * 0.6;
      var walk = Math.max(go(me, mx - 11, my), go(f, mx + 11, my)) * 1000;
      step(walk + 100, function () {
        face(me, f); hop(me.querySelector('.pen')); hop(f.querySelector('.pen')); pop(me, pick(['✋', '💛', '🤗'])); sfx('hi');
        tell(mine + ' and ' + nm + ' ' + pick(['high-five! ✋', 'share a hug 🤗', 'are best buds 💛']));
      });
      return done(walk + 1800);
    }
    if (game === 'tag') {
      tell(nm + ' is it! Tag! 🏃');
      (function leg(n) {
        var at = pos(f), nx = at[0] < 50 ? 60 + Math.random() * 30 : 10 + Math.random() * 30;
        if (!n) { var t = go(me, at[0] + (pos(me)[0] < at[0] ? -9 : 9), at[1], 30); step(t * 1000 + 50, function () { face(me, f); hop(f.querySelector('.pen')); pop(f, '😆'); sfx('hi'); tell('Tagged! ' + mine + ' got ' + nm + ' 😆'); }); return done(t * 1000 + 1600); }
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
      face(me, f); tell(mine + ' and ' + nm + ' play catch 🏐');
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
    if (!on || !soundOn() || !w || (tab !== 'pet' && tab !== 'igloo')) return;
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
  document.addEventListener('visibilitychange', function () { if (document.hidden) music(false); else if (w && (tab === 'pet' || tab === 'igloo')) music(true); });

  /* ---------- the cozy igloo: a games room inside the garden's igloo. Walk penpen to a thing and Play pops up ---------- */
  // the door layer over the garden art: the igloo's doorway glows, and a little Games sign points the way in
  function doorArt() {
    return '<svg class="gart gdoor" viewBox="0 0 360 600" preserveAspectRatio="xMidYMax slice"><g transform="translate(40 160)" class="door" data-act="igloo" role="button" tabindex="0" aria-label="Igloo: go inside to play">' +
      '<rect class="hit" x="16" y="120" width="122" height="62" rx="12" fill="transparent"/><path class="glow" d="M50 176 A8 11 0 0 1 66 176Z" fill="#F7B955"/>' +
      '<path d="M116 178 V146" stroke="#8B5530" stroke-width="3" stroke-linecap="round"/><rect x="98" y="132" width="36" height="16" rx="3" fill="#C98A52" stroke="#8B5530" stroke-width="1.5"/>' +
      '<text x="116" y="143.5" text-anchor="middle" font-family="' + F + '" font-size="8.5" font-weight="900" fill="#fff">Games</text></g></svg>';
  }
  // the room, seen from inside the dome: rings of ice blocks curve up and over, a round wood floor with a woven rug,
  // a crackling fire pit a little left of the middle, a round window, string lights and a crooked fish picture
  function iglooArt() {
    var rings = '', joints = '', k, j, prev = null;
    // each ring of blocks is the back half of a circle around the dome, seen in perspective: lower rings are wide, higher ones small
    for (k = 0; k <= 15; k++) {
      var f = k * Math.PI / 30, cy = 380 - 450 * Math.sin(f), rx = 170 * Math.cos(f), ry = 100 * Math.cos(f), cur = { cy: cy, rx: rx, ry: ry };
      rings += '<path d="M' + (178 - rx).toFixed(1) + ' ' + cy.toFixed(1) + ' A' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' 0 0 1 ' + (178 + rx).toFixed(1) + ' ' + cy.toFixed(1) + '"/>';
      if (prev) for (j = 1; j < 12; j++) {   // the joints between blocks, staggered row to row
        var a2 = (j + (k % 2) / 2) * Math.PI / 12;
        joints += 'M' + (178 + prev.rx * Math.cos(a2)).toFixed(1) + ' ' + (prev.cy - prev.ry * Math.sin(a2)).toFixed(1) + ' L' + (178 + rx * Math.cos(a2)).toFixed(1) + ' ' + (cy - ry * Math.sin(a2)).toFixed(1) + ' ';
      }
      prev = cur;
    }
    var bulbs = '';
    for (j = 0; j <= 12; j++) {   // string lights, two drooping loops across the wall
      var t = (j % 6.5) / 6.5, x0 = j < 7 ? 24 : 178, x1 = j < 7 ? 178 : 336, y0 = j < 7 ? 168 : 132, y1 = j < 7 ? 132 : 172, cx = (x0 + x1) / 2, cyy = (y0 + y1) / 2 + 46;
      if (j === 6) continue;
      var bx = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1, by = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * cyy + t * t * y1;
      bulbs += '<circle class="bulb" cx="' + bx.toFixed(1) + '" cy="' + (by + 4).toFixed(1) + '" r="4" fill="' + ['#F7B955', '#F28AA5', '#8FD3F0', '#B7E08F'][j % 4] + '"/>';
    }
    var floor = [70, 140, 210, 280].map(function (r) { return '<ellipse cx="178" cy="476" rx="' + r + '" ry="' + r * 0.38 + '"/>'; }).join('');
    var stones = [-34, -24, -12, 0, 12, 24, 34].map(function (dx, i) { return '<ellipse cx="' + (160 + dx) + '" cy="' + (330 + Math.abs(dx) / 34 * -6 + (i % 2)) + '" rx="7" ry="5"/>'; }).join('');
    return '<svg class="gart" viewBox="0 0 360 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<radialGradient id="pp-warm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB45A" stop-opacity=".6"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pp-round" cx="178" cy="300" r="330" gradientUnits="userSpaceOnUse"><stop offset=".45" stop-color="#5E87A8" stop-opacity="0"/><stop offset="1" stop-color="#5E87A8" stop-opacity=".42"/></radialGradient></defs>' +
      '<rect width="360" height="600" fill="#D3E8F3"/><g fill="none" stroke="#AFCFE2" stroke-width="1.8">' + rings + '<path d="' + joints + '" stroke-width="1.4"/></g>' +
      // the window (round, on the curve) and a fish picture hung a bit crooked
      '<g transform="translate(266 214) rotate(8)"><ellipse rx="25" ry="29" fill="#C9DCEA"/><ellipse rx="19" ry="23" fill="#28406B"/><circle cx="-6" cy="-8" r="2" fill="#fff"/><circle cx="7" cy="9" r="1.5" fill="#fff"/><circle cx="6" cy="-10" r="5" fill="#FFF3C4"/><path d="M-19 0 H19 M0 -23 V23" stroke="#C9DCEA" stroke-width="3"/></g>' +
      '<g transform="translate(78 214) rotate(-9)"><rect x="-22" y="-17" width="44" height="34" rx="3" fill="#FFF8EE" stroke="#A8683A" stroke-width="4"/><path d="M-10 0 Q0 -10 10 0 Q0 10 -10 0 Z M10 0 L17 -6 V6 Z" fill="#3B8FD9"/><circle cx="-5" cy="-1" r="1.3" fill="#fff"/></g>' +
      '<path d="M24 168 Q101 196 178 132 Q257 196 336 172" fill="none" stroke="#5B7A99" stroke-width="1.5"/>' + bulbs +
      // the round floor: warm wood rings and a woven rug, with the curved wall meeting it at the back
      '<path d="M8 380 A170 100 0 0 1 348 380 V600 H8 Z M-40 380 H8 V600 H-40 Z M348 380 H400 V600 H348 Z" fill="#D29A66"/><path d="M8 380 A170 100 0 0 1 348 380" fill="none" stroke="#9A6438" stroke-width="5"/>' +
      '<g fill="none" stroke="#A8703F" stroke-width="2" opacity=".5">' + floor + '</g>' +
      '<ellipse cx="178" cy="476" rx="116" ry="44" fill="#E46F5A"/><ellipse cx="178" cy="476" rx="96" ry="36" fill="#F4C542"/><ellipse cx="178" cy="476" rx="74" ry="28" fill="#3FAF6B"/><ellipse cx="178" cy="476" rx="52" ry="20" fill="#F4C542"/><ellipse cx="178" cy="476" rx="30" ry="11" fill="#E46F5A"/>' +
      '<rect width="360" height="600" fill="url(#pp-round)"/><ellipse cx="164" cy="360" rx="190" ry="140" fill="url(#pp-warm)"/>' +
      // the fire pit: a ring of stones, logs and flames that flicker
      '<circle cx="160" cy="302" r="52" fill="url(#pp-warm)"/><g fill="#9C8F86" stroke="#7F736B" stroke-width="1.2">' + stones + '</g>' +
      '<rect x="142" y="322" width="36" height="6" rx="3" fill="#6E4224" transform="rotate(-10 160 325)"/><rect x="142" y="322" width="36" height="6" rx="3" fill="#8B5530" transform="rotate(12 160 325)"/>' +
      '<g class="flm"><path d="M146 326 Q140 308 152 296 Q150 310 158 314 Q160 302 168 294 Q166 308 174 304 Q180 316 172 326 Z" fill="#F28A2E"/></g>' +
      '<g class="flm f2"><path d="M152 326 Q150 314 158 306 Q160 316 166 312 Q170 320 166 326 Z" fill="#FFD25A"/></g>' +
      '<g fill="#8B5530" stroke="#6E4224" stroke-width="1"><rect x="196" y="318" width="26" height="7" rx="3.5"/><rect x="200" y="311" width="22" height="7" rx="3.5"/></g></svg>';
  }
  // the eight things around the round room, near and far: [id, name, what it is, % across, % up, width in px when near, drawing]
  var ROOM = [
    ['shop', 'Shop', 'a wardrobe', 27, 47, 120, '<svg viewBox="0 -14 64 110"><path d="M4 12 Q32 0 60 12Z" fill="#8B5530"/><rect x="6" y="10" width="52" height="80" rx="5" fill="#A8683A" stroke="#7A4A26" stroke-width="2"/><rect x="10" y="16" width="21" height="66" rx="3" fill="#BD7C4A"/><rect x="33" y="16" width="21" height="66" rx="3" fill="#BD7C4A"/><path d="M32 60 q5 10 -2 24" stroke="#E46F5A" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="28" cy="48" r="2" fill="#F4C542"/><circle cx="36" cy="48" r="2" fill="#F4C542"/><rect x="10" y="89" width="6" height="6" fill="#7A4A26"/><rect x="48" y="89" width="6" height="6" fill="#7A4A26"/><rect x="24" y="-12" width="16" height="13" rx="1" fill="#1F2A36"/><rect x="24" y="-4" width="16" height="2.5" fill="#D9534F"/><rect x="19" y="0" width="26" height="3" rx="1.5" fill="#1F2A36"/></svg>'],
    ['learn', 'Learn', 'a bookshelf', 10, 39, 104, '<svg viewBox="0 0 64 96"><rect x="4" y="4" width="56" height="88" rx="4" fill="#9A6438" stroke="#7A4A26" stroke-width="2"/><rect x="9" y="9" width="46" height="78" fill="#6E4224"/><path d="M9 35 H55 M9 62 H55" stroke="#9A6438" stroke-width="4"/>' +
      [[11, 7, 22, '#D9534F'], [19, 6, 18, '#3B8FD9'], [26, 8, 24, '#F4A62A'], [35, 6, 20, '#3FAF6B'], [42, 7, 23, '#7C6BB8'], [11, 8, 22, '#3FAF6B', 1], [20, 6, 17, '#F28AA5', 1], [27, 7, 24, '#3B8FD9', 1], [44, 9, 21, '#D9534F', 1], [12, 6, 20, '#F4A62A', 2], [19, 8, 23, '#7C6BB8', 2], [36, 6, 18, '#3FAF6B', 2], [43, 7, 24, '#3B8FD9', 2]].map(function (b) { var floor = [33, 60, 87][b[4] || 0]; return '<rect x="' + b[0] + '" y="' + (floor - b[2]) + '" width="' + b[1] + '" height="' + b[2] + '" rx="1" fill="' + b[3] + '"/>'; }).join('') +
      '<circle cx="38" cy="50" r="7" fill="#5DA9E9"/><path d="M33 47 Q38 52 43 46" stroke="#3FAF6B" stroke-width="3" fill="none"/><path d="M38 57 V60" stroke="#C9962B" stroke-width="2"/></svg>'],
    ['quiz', 'Quiz', 'a chalkboard', 88, 37, 110, '<svg viewBox="0 0 70 96"><path d="M14 52 L7 94 M56 52 L63 94 M35 52 L35 92" stroke="#8B5530" stroke-width="4" stroke-linecap="round"/><rect x="5" y="6" width="60" height="48" rx="3" fill="#2F5444" stroke="#A8683A" stroke-width="4"/><rect x="9" y="56" width="52" height="4" rx="2" fill="#A8683A"/><rect x="40" y="53" width="8" height="3" rx="1" fill="#fff"/>' +
      '<text x="12" y="27" font-family="' + F + '" font-size="12" font-weight="900" fill="#F4FAFF">A B C</text><text x="50" y="44" font-family="' + F + '" font-size="18" font-weight="900" fill="#FFE58A">?</text><path d="M13 38 H40 M13 45 H32" stroke="#F4FAFF" stroke-width="1.6" opacity=".7"/></svg>'],
    ['sing', 'Sing', 'a record player and a mic', 70, 46, 120, '<svg viewBox="0 0 80 96"><rect x="2" y="54" width="50" height="6" rx="2" fill="#8B5530"/><path d="M8 60 V94 M46 60 V94" stroke="#7A4A26" stroke-width="4"/><rect x="5" y="38" width="44" height="16" rx="3" fill="#1F8FA6"/><ellipse cx="25" cy="38" rx="17" ry="5.5" fill="#1F2A36"/><ellipse cx="25" cy="38" rx="5" ry="1.8" fill="#F4C542"/><path d="M45 30 L34 37" stroke="#C9DCEA" stroke-width="2.5" stroke-linecap="round"/><circle cx="45" cy="30" r="2.5" fill="#C9DCEA"/>' +
      '<path d="M12 22 V12 L20 10 V20 M28 16 V6 L34 5 V14" stroke="#13324A" stroke-width="1.8" fill="none"/><circle cx="10" cy="22" r="2.6" fill="#13324A"/><circle cx="18" cy="20" r="2.6" fill="#13324A"/><circle cx="26" cy="16" r="2.4" fill="#13324A"/><circle cx="32" cy="14" r="2.4" fill="#13324A"/>' +
      '<path d="M68 36 V90" stroke="#5B6470" stroke-width="3"/><ellipse cx="68" cy="92" rx="10" ry="3" fill="#5B6470"/><rect x="62" y="16" width="12" height="20" rx="6" fill="#9AA7B4" stroke="#5B6470" stroke-width="1.5"/><path d="M62 24 H74 M62 29 H74" stroke="#5B6470" stroke-width="1"/></svg>'],
    ['dive', 'Dive', 'swim goggles and a snorkel', 11, 15, 92, '<svg viewBox="0 0 64 80"><rect x="6" y="52" width="52" height="26" rx="5" fill="#E8F4FA" stroke="#AFCFE2" stroke-width="2"/><path d="M8 65 H56" stroke="#AFCFE2" stroke-width="1.5"/>' +
      '<path d="M52 4 V40 Q52 50 42 50" stroke="#F4D03F" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="47" y="2" width="10" height="6" rx="2" fill="#F28A2E"/>' +
      '<path d="M6 40 Q32 30 58 40" stroke="#1F2A36" stroke-width="3" fill="none"/><circle cx="21" cy="40" r="9" fill="#8FD3F0" stroke="#F28A2E" stroke-width="3"/><circle cx="41" cy="40" r="9" fill="#8FD3F0" stroke="#F28A2E" stroke-width="3"/><path d="M30 40 H32" stroke="#F28A2E" stroke-width="3"/><path d="M16 36 L19 33 M36 36 L39 33" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'],
    ['chase', 'Chase', 'a polar bear rug', 50, 9, 180, '<svg viewBox="0 0 120 64"><g fill="#F7F9FB" stroke="#D5DEE6" stroke-width="1.5"><ellipse cx="34" cy="14" rx="9" ry="7" transform="rotate(-30 34 14)"/><ellipse cx="34" cy="50" rx="9" ry="7" transform="rotate(30 34 50)"/><ellipse cx="94" cy="12" rx="9" ry="7" transform="rotate(30 94 12)"/><ellipse cx="94" cy="52" rx="9" ry="7" transform="rotate(-30 94 52)"/><circle cx="110" cy="32" r="4"/><ellipse cx="64" cy="32" rx="38" ry="19"/><circle cx="10" cy="22" r="5"/><circle cx="10" cy="42" r="5"/><circle cx="18" cy="32" r="14"/></g>' +
      '<ellipse cx="9" cy="32" rx="6" ry="5" fill="#EEF2F6"/><circle cx="5" cy="32" r="2.4" fill="#1F2A36"/><circle cx="17" cy="26" r="1.8" fill="#1F2A36"/><circle cx="17" cy="38" r="1.8" fill="#1F2A36"/><path d="M60 22 Q64 32 60 42 M72 24 Q75 32 72 40" stroke="#E2E9EF" stroke-width="2" fill="none"/></svg>'],
    ['slide', 'Belly Slide', 'a sled', 84, 23, 120, '<svg viewBox="0 0 90 54"><path d="M20 34 L24 22 M40 34 L42 22 M60 34 L62 22" stroke="#8B5530" stroke-width="3"/><rect x="14" y="14" width="64" height="9" rx="3" fill="#C98A52" stroke="#8B5530" stroke-width="1.5"/><path d="M30 14 V23 M46 14 V23 M62 14 V23" stroke="#8B5530" stroke-width="1"/>' +
      '<path d="M6 38 H72 Q86 38 84 26 Q82 18 75 21" stroke="#D9534F" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M76 18 Q60 6 40 12" stroke="#F4D03F" stroke-width="1.8" fill="none"/></svg>'],
    ['honk', 'Honk!', 'a trumpet', 26, 30, 106, '<svg viewBox="0 0 80 66"><path d="M22 40 L16 64 M58 40 L64 64 M40 42 V64" stroke="#8B5530" stroke-width="4" stroke-linecap="round"/><ellipse cx="40" cy="40" rx="26" ry="6" fill="#A8683A"/>' +
      '<g stroke="#C9962B" stroke-width="1.5"><rect x="8" y="22" width="44" height="6" rx="3" fill="#F4C542"/><path d="M50 25 L72 13 V37 Z" fill="#F4C542" stroke-linejoin="round"/><ellipse cx="72" cy="25" rx="3" ry="12" fill="#FFE58A"/><rect x="22" y="14" width="4" height="10" rx="1" fill="#F4C542"/><rect x="29" y="14" width="4" height="10" rx="1" fill="#F4C542"/><rect x="36" y="14" width="4" height="10" rx="1" fill="#F4C542"/><path d="M14 28 Q12 36 22 36 H44 Q50 36 48 28" fill="none"/><rect x="3" y="23" width="6" height="4" rx="1" fill="#C9962B"/></g></svg>']
  ];
  var BIG = { dive: 1, chase: 1, honk: 1, slide: 1 };   // the four that open in the games player; the rest are their own tabs
  // the floor is round: penpen walks inside an oval (wide at the front, narrow at the back), and things far back look smaller
  var DEEP = 110;   // depth: at y% up, things are drawn at (1 - y / DEEP) of their near size
  function inRoom(x, y) { var dx = (x - 50) / 46, dy = y / 47, m = Math.hypot(dx, dy); if (m > 1) { x = 50 + dx / m * 46; y = dy / m * 47; } return [x, Math.max(4, y)]; }
  function spot(it) { return inRoom(it[3], it[4] - 6); }   // where penpen stands to use it: just in front of it
  function iglooRoom(p) {
    var wear = WEAR[p.wear] || WEAR.none;
    return '<div class="garden igl" id="pp-igloo">' + iglooArt() +
      '<div class="gtop"><button class="back" aria-label="Back to the garden">‹</button><b class="ititle">' + esc(nameOf(p)) + '’s igloo</b><span class="coins">' + COIN + ' <b id="pp-coins">' + p.coins + '</b></span>' +
      '<button type="button" data-act="sound" class="gbtn" aria-pressed="' + soundOn() + '" aria-label="Music and sounds">' + (soundOn() ? '🔊' : '🔇') + '</button></div>' +
      '<div class="say" id="pp-say">Walk to something to play 🎮</div>' +
      ROOM.map(function (it) {
        return '<button type="button" class="iitem" data-item="' + it[0] + '" aria-label="' + it[1] + ': ' + it[2] + '" style="left:' + it[3] + '%;bottom:' + it[4] + '%;width:' + it[5] + 'px;z-index:' + (it[0] === 'chase' ? 1 : Math.max(1, 50 - Math.round(it[4]))) + ';--d:' + (1 - it[4] / DEEP).toFixed(3) + '">' + it[6] + '<span class="itag">' + it[1] + '</span></button>';
      }).join('') +
      '<div class="walker' + (sad(p) ? ' sad' : '') + '" id="pp-iwalk" style="left:50%;bottom:10%;z-index:40;--d:' + (1 - 10 / DEEP).toFixed(3) + '"><div class="pen" aria-label="' + esc(nameOf(p)) + '">' + views(inner(p) + faceBits(51, 69, 49, 6) + JOY, window.ppLook ? window.ppLook.side(look(p)) : '') + (wear.e ? '<span class="wear">' + wear.e + '</span>' : '') + '</div></div>' +
      '<button type="button" class="iplay" id="pp-iplay" hidden></button>' +
      '<div class="ijoy" id="pp-ijoy" role="img" aria-label="Joystick: drag to walk (arrow keys work too)"><i></i></div></div>';
  }
  var I = null;   // the igloo while it's open: penpen's spot, the joystick, the keys, the thing he's next to
  function enterIgloo() { var p = load(); wakeToPlay(p); save(p); stopAll(); tab = 'igloo'; paint(); }
  function iglooHooks() {
    var me = document.getElementById('pp-iwalk'), base = document.getElementById('pp-ijoy'), knob = base.firstChild, id = null;
    I = { x: 50, y: 10, v: null, keys: {}, near: null, last: 0 };
    function stick(e) {
      var r = base.getBoundingClientRect(), R = r.width / 2 || 1, x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R, m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      I.v = { x: x, y: y }; knob.style.transform = 'translate(' + Math.round(x * 30) + 'px,' + Math.round(y * 30) + 'px)';
    }
    base.addEventListener('pointerdown', function (e) { e.preventDefault(); id = e.pointerId; if (base.setPointerCapture) { try { base.setPointerCapture(id); } catch (x) {} } base.classList.add('on'); stick(e); });
    base.addEventListener('pointermove', function (e) { if (e.pointerId === id) stick(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { base.addEventListener(ev, function (e) { if (e.pointerId !== id) return; id = null; I.v = null; base.classList.remove('on'); knob.style.transform = ''; }); });
    I.key = function (e) {
      var k = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[e.key];
      if (!k || !I || (e.target && e.target.closest && e.target.closest('dialog,input'))) return;
      e.preventDefault(); I.keys[k] = e.type === 'keydown';
    };
    document.addEventListener('keydown', I.key); document.addEventListener('keyup', I.key);
    I.last = performance.now();
    (function frame(t) {
      if (!I || !me.isConnected) return;
      var dt = Math.min(0.05, (t - I.last) / 1000), k = I.keys, v = I.v && Math.hypot(I.v.x, I.v.y) > 0.2 ? I.v : null; I.last = t;
      var vx = v ? v.x : (k.r ? 1 : 0) - (k.l ? 1 : 0), vy = v ? v.y : (k.d ? 1 : 0) - (k.u ? 1 : 0);
      if (vx || vy) {
        var at = inRoom(I.x + vx * 30 * dt, I.y - vy * 22 * dt); I.x = at[0]; I.y = at[1];
        me.style.transitionDuration = '0s'; me.style.left = I.x + '%'; me.style.bottom = I.y + '%'; me.style.zIndex = String(50 - Math.round(I.y)); me.style.setProperty('--d', (1 - I.y / DEEP).toFixed(3));
        if (Math.abs(vx) > 0.1) me.classList.toggle('l', vx < 0);
        me.classList.add('walking'); clearTimeout(me.ppStop); me.ppStop = setTimeout(function () { me.classList.remove('walking'); }, 150);
        nearBy();
      }
      I.raf = requestAnimationFrame(frame);
    })(I.last);
    music(true);
  }
  // which thing is penpen next to? Light it up and pop up its Play button
  function nearBy() {
    var best = null, bd = 11;
    ROOM.forEach(function (it) { var s = spot(it), d = Math.hypot(I.x - s[0], (I.y - s[1]) * 1.5); if (d < bd) { bd = d; best = it; } });
    var id = best ? best[0] : null; if (id === I.near) return; I.near = id;
    [].slice.call(w.querySelectorAll('.iitem')).forEach(function (b) { b.classList.toggle('near', b.dataset.item === id); });
    var pb = document.getElementById('pp-iplay');
    if (!best) { pb.hidden = true; return say('Walk to something to play 🎮'); }
    pb.hidden = false; pb.dataset.play = id; pb.textContent = '▶ Play ' + best[1]; sfx('hi');
    say(best[1] + '! ' + { shop: 'Food and outfits 🛍️', learn: 'Read a little 📚', quiz: 'Professor Pen’s quiz 🎓', sing: 'Sing along 🎤', dive: 'Catch fish, dodge the sea lion 🌊', chase: 'Eat the fish, flee the bear 🐻‍❄️', slide: 'Down the mountain 🛷', honk: 'Sneak up and HONK 📣' }[id]);
  }
  // tap a thing: penpen walks over to it
  function walkTo(id) {
    var it = ROOM.filter(function (x) { return x[0] === id; })[0], me = document.getElementById('pp-iwalk'); if (!it || !me || !I) return;
    var s = spot(it), secs = go(me, s[0], s[1], 30, DEEP); I.x = s[0]; I.y = s[1]; me.style.zIndex = String(50 - Math.round(s[1]));
    clearTimeout(I.arrive); I.arrive = setTimeout(nearBy, secs * 1000);
  }
  // Play: the four big games open in the games player; Quiz, Learn, Sing and Shop open their own screens. Back comes home to the igloo
  function playFromIgloo(id) {
    stopAll(); ret = 'igloo';
    if (BIG[id]) { tab = 'games'; paint(); return playGame(id); }
    tab = id; paint();
  }

  /* ---------- screen ---------- */
  var w = null, tab = 'pet', G = null, X = null, Q = null, ret = null;   // ret: the screen Back returns to (the igloo, when a game was opened from it)
  function open() {
    if (document.getElementById('pp-play')) return;
    w = document.createElement('div'); w.id = 'pp-play'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Garden');
    document.body.appendChild(w); tab = 'pet'; GD.cracks = 0;
    var p = load(), a = rewardExpenses(p), hi = p.hi; delete p.hi; save(p);
    paint(hi ? 'I’m back! 🐣 Missed you' : a ? '+' + a + ' 🐟 for the expenses you logged!' : '');
    w.addEventListener('click', click);
    w.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-act="igloo"]')) { e.preventDefault(); enterIgloo(); } });
    w.addEventListener('pointerdown', function () { if (AC && AC.state === 'suspended') AC.resume(); });
  }
  function close() { stopAll(); if (w) w.remove(); w = null; }
  function back() { if (tab === 'pet') return close(); stopAll(); tab = tab !== 'igloo' && ret ? ret : 'pet'; paint(); }
  window.ppPlayBack = function () { if (!document.getElementById('pp-play')) return false; back(); return true; };
  function tint(n) { return n > 60 ? '#3FAF6B' : n > 30 ? '#F4A62A' : '#D9534F'; }
  function meters(p) {
    return [[p.food, '🍽️', 'Full'], [p.joy, '💛', 'Happy']].map(function (m) {
      return '<button type="button" class="mtr" data-act="stats" aria-label="' + m[2] + ' ' + Math.round(m[0]) + '%. Open stats"><b>' + m[1] + '</b><i><u style="width:' + Math.round(m[0]) + '%;background:' + tint(m[0]) + '"></u></i></button>';
    }).join('');
  }
  function bats4(p) { return battery(p.food, '🍽️', 'Full') + battery(p.joy, '💛', 'Happy') + battery(p.energy, '⚡', 'Energy'); }
  function battery(n, ic, label) {
    var c = tint(n);
    return '<button type="button" class="bat" data-bat="' + label + '" title="' + label + ' ' + Math.round(n) + '%"><span class="tip"></span><span class="cell"><u style="height:' + Math.round(n) + '%;background:' + c + '"></u></span><b>' + ic + '</b><small>' + label + '</small></button>';
  }
  function mood(p) {
    if (p.egg) return 'An egg! 🥚 Tap it to hatch';
    if (p.asleep) return 'Zzz… 💤 (tap Wake up when he’s rested)';
    if (p.food < 25) return 'Hungry… 🥺 drag me some food!';
    if (p.energy < 20) return 'So sleepy… 😪';
    if (p.joy < 25) return 'Bored. Rub my belly? 🥱';
    return pick(['Happy penpen! 🐧', 'Rub me to tickle! 🪶', 'Let’s slide! 🛷', 'I love this trip ✨']);
  }
  function tabs() {
    return '<div class="tabs">' + [['pet', '🐧', 'My penpen'], ['games', '🎮', 'Games'], ['quiz', '🎓', 'Quiz'], ['learn', '📚', 'Learn'], ['sing', '🎤', 'Sing'], ['shop', '🛍️', 'Shop']].map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</div>';
  }
  // the garden's one menu: games and the other screens, plus stats, sleep, selfie and album (a native <details>, so it opens and closes with no extra code)
  function menu(p) {
    var n = album().length;
    return '<details class="gmenu"><summary class="gbtn" aria-label="Menu: games, quiz, learn, sing, shop and more">☰</summary><div class="gm"><b class="gm-lv">Level ' + level(p) + '</b>' +
      [['games', '🎮', 'Games'], ['quiz', '🎓', 'Quiz'], ['learn', '📚', 'Learn'], ['sing', '🎤', 'Sing'], ['shop', '🛍️', 'Shop']].map(function (t) { return '<button data-tab="' + t[0] + '"><span>' + t[1] + '</span>' + t[2] + '</button>'; }).join('') +
      (p.egg ? '' : '<button data-act="make" aria-haspopup="dialog"><span>🎨</span>Wardrobe</button>') + '<button data-act="stats" aria-haspopup="dialog"><span>📊</span>Stats</button>' + (p.asleep ? '' : '<button data-act="sleep"><span>💤</span>Sleep</button>') +
      '<button data-act="selfie"><span>📸</span>Selfie</button><button data-act="album"><span>🖼</span>Album' + (n ? ' (' + n + ')' : '') + '</button></div></details>';
  }
  function paint(msg) {
    if (tab === 'pet') ret = null;   // back in the garden: Back no longer leads to the igloo
    var p = load(), wear = WEAR[p.wear] || WEAR.none;
    var coins = '<span class="coins">' + COIN + ' <b id="pp-coins">' + p.coins + '</b></span>';
    // the garden tab is the whole phone screen: only a back arrow, the meters, coins, sound and one menu button float on top
    var h = tab === 'pet' || tab === 'igloo' ? '<div class="wrap">' : '<div class="top"><button class="back" aria-label="Back">‹</button><h2>' + { games: 'Games', slide: 'Belly Slide', quiz: 'Professor Pen’s quiz', learn: 'Learn with penpen', sing: 'Sing with penpen', shop: 'Shop' }[tab] + '</h2>' + coins + '</div><div class="wrap">' + tabs();
    if (tab === 'igloo') h += iglooRoom(p);
    else if (tab === 'pet') {
      var face = (p.asleep ? SHUT : '') + JOY;
      h += '<div class="garden' + (p.asleep ? ' night' : '') + '" id="pp-garden">' + gardenArt() + (p.egg ? '' : doorArt()) +
        '<div class="gtop"><button class="back" aria-label="Back">‹</button><span class="meters">' + meters(p) + '</span>' + coins + '<button type="button" data-act="sound" class="gbtn" aria-pressed="' + soundOn() + '" aria-label="Music and sounds">' + (soundOn() ? '🔊' : '🔇') + '</button>' + menu(p) + '</div>' +
        (window.ppLook ? PALS.map(function (id, i) { return '<button type="button" class="walker pal" data-pal="' + id + '" aria-label="' + window.ppLook.name(id) + ', penpen’s friend" style="left:' + START[i][0] + '%;bottom:' + START[i][1] + '%;--d:' + (1 - START[i][1] / 160).toFixed(3) + '"><span class="pen' + (p.asleep ? ' zz' : '') + '">' + views(window.ppLook.svg(id) + faceBits(51, 69, 49, 6) + (p.asleep ? SHUT : ''), window.ppLook.side(id)) + '</span></button>'; }).join('') : '') +
        (p.egg ? '<button type="button" class="egg" id="pp-egg" data-act="hatch" aria-label="Your egg. Tap to hatch it"><svg viewBox="-7 -14 134 134" width="120" height="120" aria-hidden="true">' + EGG + '</svg></button>' :
        '<div class="walker' + (sad(p) ? ' sad' : '') + '" id="pp-walk" style="left:50%;bottom:8%"><div class="pen' + (p.asleep ? ' zz' : '') + '" id="pp-petpen" aria-label="' + esc(nameOf(p)) + '">' +
        views(inner(p) + faceBits(51, 69, 49, 6) + face, window.ppLook ? window.ppLook.side(look(p)) : '') + (wear.e ? '<span class="wear">' + wear.e + '</span>' : '') + (p.asleep ? '<span class="fx">💤</span><span class="bed">🛏️</span>' : '') +
        '</div></div>') + '<div class="say" id="pp-say">' + (msg || mood(p)) + '</div>' +
        (p.asleep ? '<button data-act="wake" class="zbtn">☀️ Wake</button>' : '') +
        // food: just the pictures with a small count; drag one to penpen, or tap it (hidden until he hatches)
        (p.egg ? '' : '<div class="foods" aria-label="Food: drag to penpen, or tap">' + Object.keys(FOODS).map(function (k) { var n = p.bag[k] || 0; return '<button data-feed="' + k + '"' + (n ? '' : ' disabled') + ' title="' + FOODS[k].n + '"><span aria-hidden="true">' + FOODS[k].e + '</span><i class="sr">' + FOODS[k].n + '</i><small>×' + n + '</small></button>'; }).join('') + '</div>') + '</div>';
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
    w.classList.toggle('imm', tab === 'pet' || tab === 'igloo');   // the garden fills the screen; other tabs scroll as before
    w.innerHTML = h + '</div>';
    if (tab === 'pet') { petHooks(); startGarden(); }
    if (tab === 'igloo') iglooHooks();
    if (tab === 'slide') { drawIdle(); slideHooks(); }
    var gh = document.getElementById('pp-ghost-host');
    if (gh && window.ppGames) {
      if (tab === 'games') gh.innerHTML = window.ppGames.cards(p.bests);
      if (tab === 'quiz') window.ppGames.quiz(gh, function (c) { var q = load(), gl = winGlass(q, 'quiz', c); q.coins += c; q.xp += c; save(q); setCoins(q); if (gl) toast('+' + gl + ' sea glass 💖 Charm +' + gl); });
      if (tab === 'sing') window.ppGames.sing(gh);
      if (tab === 'learn' && window.ppGames.learn) window.ppGames.learn(gh, function (c) { var q = load(), gl = winGlass(q, 'learn', c); q.coins += c; q.xp += c; q.joy = clamp(q.joy + 3); save(q); setCoins(q); if (gl) toast('+' + gl + ' sea glass 💖 Charm +' + gl); });
    }
  }
  function showStats() {
    var p = load(), d = document.createElement('dialog'), b = p.bests || {}, names = { slide: 'Belly Slide', dive: 'Dive', chase: 'Chase', honk: 'Honk!' };
    d.className = 'pp-stats'; d.setAttribute('aria-label', nameOf(p) + '’s stats');
    d.innerHTML = '<div class="st-top"><b>📊 ' + esc(nameOf(p)) + '’s stats</b><button type="button" data-act="stats-x" aria-label="Close stats">✕</button></div>' +
      '<div class="bats" id="pp-sbats">' + bats4(p) + '</div><p class="st-tip" id="pp-stip">Tap a battery to see what it does.</p>' +
      '<ul class="st-st" aria-label="Stats">' + STATS.map(function (s) { var v = stat(p, s[0]); return '<li><button type="button" data-stat="' + s[0] + '"><b aria-hidden="true">' + s[1] + '</b><span>' + s[2] + '</span><i aria-hidden="true"><u style="width:' + v + '%;background:' + s[3] + '"></u></i><em>' + v + '</em></button></li>'; }).join('') + '</ul><p class="st-tip" id="pp-sttip">Win sea glass in games to grow these. Tap one to see which game.</p>' +
      '<div class="st-grid"><span>Level<b>' + level(p) + '</b></span><span>Coins<b>' + p.coins + '</b></span></div>' +
      (Object.keys(b).length ? '<p class="st-tip">Best scores: ' + Object.keys(b).map(function (k) { return (names[k] || k) + ' ' + b[k]; }).join(' · ') + '</p>' : '');
    w.appendChild(d); d.addEventListener('close', function () { d.remove(); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  // tap the egg: it wobbles and cracks; the third tap hatches him, then you design him
  function crack(p) {
    var egg = document.getElementById('pp-egg'), n = (GD.cracks || 0) + 1;
    if (!p.egg || !egg) return;
    GD.cracks = n; sfx('hi');
    if (n < 3) { egg.classList.add('c' + n); egg.classList.remove('wob'); void egg.offsetWidth; egg.classList.add('wob'); return say(n === 1 ? 'It moved! Tap again 🥚' : 'Crack! Almost… 🥚'); }
    GD.cracks = 0; p.egg = false; p.look = look(p); p.xp += 1; save(p); sfx('la');
    var r = egg.getBoundingClientRect(); hearts(r.left + r.width / 2, r.top, 4, pick(['🐣', '✨', '💛']));
    paint('Hello! 🐣 Let’s make me look just right');
    makeMe(true);
  }
  // design your penpen: name, body, eyes, beak, feet and an outfit you own. A native <dialog> with radio buttons; only known values are saved.
  function makeMe(born) {
    var p = load(), lk = look(p), d = document.createElement('dialog');
    function swatches(k, label) {
      return '<fieldset class="mk-row"><legend>' + label + '</legend>' + PAL[k].map(function (o) {
        var chosen = lk[k] === o[0];
        return k === 'eyes' ? '<label class="mk-txt"><input type="radio" name="eyes" value="' + o[0] + '"' + (chosen ? ' checked' : '') + '><span>' + o[1] + '</span></label>' :
          '<label class="mk-sw" title="' + o[1] + '"><input type="radio" name="' + k + '" value="' + o[0] + '" aria-label="' + o[1] + '"' + (chosen ? ' checked' : '') + '><i style="background:' + o[0] + '"></i></label>';
      }).join('') + '</fieldset>';
    }
    var outfits = Object.keys(WEAR).filter(function (k) { return p.own[k]; }).map(function (k) {
      return '<label class="mk-txt"><input type="radio" name="wear" value="' + k + '"' + (p.wear === k ? ' checked' : '') + '><span>' + (WEAR[k].e || '🚫') + ' ' + WEAR[k].n + '</span></label>';
    }).join('');
    d.className = 'pp-stats pp-make'; d.setAttribute('aria-label', 'Design your penpen');
    d.innerHTML = '<form method="dialog"><div class="st-top"><b>' + (born ? '🐣 Your penpen hatched!' : '🎨 Wardrobe') + '</b><button type="submit" value="x" aria-label="Close">✕</button></div>' +
      '<div class="mk-prev" id="pp-mkprev"></div>' +
      '<label class="mk-name">Name <input name="name" maxlength="12" autocomplete="off" value="' + esc(nameOf(p)) + '"></label>' +
      swatches('body', 'Body') + swatches('eyes', 'Eyes') + swatches('beak', 'Beak') + swatches('feet', 'Feet') +
      '<fieldset class="mk-row"><legend>Outfit</legend>' + outfits + '</fieldset><p class="st-tip">More outfits in the Shop.</p>' +
      '<button type="submit" value="save" class="go mk-go">' + (born ? 'Done, let’s play!' : 'Save') + '</button></form>';
    var f = d.querySelector('form');
    function chosen() {
      var o = {}; Object.keys(PAL).forEach(function (k) { var el = f.querySelector('input[name="' + k + '"]:checked'); o[k] = el && okVal(k, el.value) ? el.value : lk[k]; });
      return o;
    }
    function preview() {
      var wr = f.querySelector('input[name="wear"]:checked'), e = wr && WEAR[wr.value] ? WEAR[wr.value].e : '';
      d.querySelector('#pp-mkprev').innerHTML = '<svg viewBox="-7 -14 134 134" width="120" height="120" aria-hidden="true">' + window.ppLook.svg(chosen()) + (e ? '<text x="60" y="8" font-size="30" text-anchor="middle">' + e + '</text>' : '') + '</svg>';
    }
    f.addEventListener('change', preview); preview();
    d.addEventListener('close', function () {
      if (d.returnValue === 'save') {
        var q = load(), wr = f.querySelector('input[name="wear"]:checked'), nm = f.querySelector('input[name="name"]').value.replace(/\s+/g, ' ').trim().slice(0, 12);
        q.look = chosen(); q.name = nm || 'penpen'; if (wr && q.own[wr.value]) q.wear = wr.value; save(q);
        paint(born ? 'Hi! I’m ' + q.name + ' 💛' : 'Looking good! ✨');
      }
      d.remove();
    });
    w.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function say(t) { var s = document.getElementById('pp-say'); GD.said = now(); GD.line = ''; if (s) s.textContent = t; }
  function setCoins(p) { var c = document.getElementById('pp-coins'); if (c) c.textContent = p.coins; }
  function hop(el) { cheer(el && el.closest && el.closest('.walker')); if (el && el.animate) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px) scale(1.04)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' }); }
  function hearts(x, y, n, ch) {
    for (var i = 0; i < (n || 1); i++) {
      var hrt = document.createElement('span'); hrt.className = 'pp-heart'; hrt.textContent = ch || pick(['❤️', '💕', '💖', '💗']);
      hrt.style.left = (x + (Math.random() * 40 - 20)) + 'px'; hrt.style.top = (y + (Math.random() * 20 - 10)) + 'px';
      document.body.appendChild(hrt); setTimeout(function (el) { el.remove(); }.bind(null, hrt), 1200);
    }
  }
  function eff(f) { return [f.food ? '🍽️+' + f.food : '', f.en ? '⚡+' + f.en : '', f.joy > 5 ? '💛+' + f.joy : ''].filter(Boolean).join(' '); }
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
    var p = load(), f = FOODS[k]; if (!f || !(p.bag[k] > 0) || p.egg) return;
    if (p.asleep) return say('Shh… he’s sleeping 💤');
    if (k !== 'bat' && p.food >= 100) return say('I’m stuffed! Maybe later 😋');
    if (k === 'bat' && p.energy >= 100) return say('Already fully charged! ⚡');
    p.bag[k]--; p.food = clamp(p.food + f.food); p.joy = clamp(p.joy + f.joy); p.energy = clamp(p.energy + (f.en || 0)); p.xp += 2; save(p);
    var fb = w && w.querySelector('[data-feed="' + k + '"]'); if (fb) { fb.querySelector('small').textContent = '×' + p.bag[k]; fb.disabled = !p.bag[k]; }
    refreshBats(p);
    say(k === 'bat' ? 'Bzzzt! Recharged ⚡😎' : pick(['Nom nom nom! ' + f.e + ' 😋', 'Yum, ' + f.n.toLowerCase() + '! ' + f.e, 'Salamat! So full 😌 ' + f.e]));
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
    // tap him for love; rub him with your finger to tickle (he wiggles and giggles). There's no Tickle button: your finger is the tickle.
    var last = 0, rub = 0;
    pen.addEventListener('pointerdown', function (e) { rub = 0; if (pen.setPointerCapture && e.pointerId != null) { try { pen.setPointerCapture(e.pointerId); } catch (x) {} } love(e, 2); });
    pen.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') { rub += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (rub > 40) { rub = 0; tickle(e); } } });
    function love(e, n) {
      var p = load(); freeze(3000);
      if (p.asleep) { say('Zzz… *happy snore* 💤'); return; }
      hearts(e.clientX, e.clientY - 20, n);
      if (now() - last > 700) { last = now(); cheer(document.getElementById('pp-walk')); p.joy = clamp(p.joy + 3); p.xp += 1; save(p); say(pick(['Aww, love you too 💕', 'More belly rubs! 🥰', 'Best hooman ever 💛', 'Purr… wait, penguins don’t purr 🐧'])); refreshBats(p); }
    }
    function tickle(e) {
      var p = load(); freeze(3000);
      if (p.asleep) { say('Zzz… *giggles in his sleep* 💤'); return; }
      hearts(e.clientX, e.clientY - 20, 1, pick(['😂', '🤣', '💕']));
      pen.classList.remove('tk'); void pen.offsetWidth; pen.classList.add('tk'); clearTimeout(pen.ppTk); pen.ppTk = setTimeout(function () { pen.classList.remove('tk'); }, 650);
      if (now() - last > 700) { last = now(); cheer(document.getElementById('pp-walk')); p.joy = clamp(p.joy + 4); p.xp += 1; save(p); say(pick(['Hahaha stop it!! 🤣', 'Not the flippers! 😂', 'Hehehe… again! 🪶', 'I’m… so… ticklish 🤭'])); sfx('hi'); refreshBats(p); }
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
  function refreshBats(p) { if (!w) return; var me = document.getElementById('pp-walk'); if (me) me.classList.toggle('sad', sad(p)); var m = w.querySelector('.meters'), b = w.querySelector('#pp-sbats'); if (m) m.innerHTML = meters(p); if (b) b.innerHTML = bats4(p); }
  function click(e) {
    if (!w) return;
    var gm = w.querySelector('.gmenu[open]'), b = e.target.closest('button');
    if (gm && (!e.target.closest('.gmenu') || b)) gm.open = false;   // a tap outside the menu, or on one of its buttons, closes it
    if (e.target.closest('[data-act="igloo"]')) return enterIgloo();
    if (!b) return;
    if (b.dataset.bat) { var sy = document.getElementById('pp-stip') || document.getElementById('pp-say'); if (sy) sy.textContent = { Full: '🍽️ Full: drops over time. Drag food to penpen — bigger meals fill more.', Happy: '💛 Happy: rub or tap his belly, play games or the quiz.', Energy: '⚡ Energy: games use a little. He naps to recharge, but you can always play.' }[b.dataset.bat] || ''; return; }
    var p = load();
    if (b.classList.contains('back')) return back();
    if (b.dataset.tab) { stopAll(); tab = b.dataset.tab; return paint(); }
    if (b.dataset.game) return playGame(b.dataset.game);
    if (b.dataset.item) return walkTo(b.dataset.item);
    if (b.dataset.play) return playFromIgloo(b.dataset.play);
    if (b.dataset.act === 'stats') return showStats();
    if (b.dataset.stat) { var ss = STATS.filter(function (x) { return x[0] === b.dataset.stat; })[0], st = document.getElementById('pp-sttip'); if (ss && st) st.textContent = ss[1] + ' ' + ss[2] + ' grows from sea glass you win in ' + ss[4] + '.'; return; }
    if (b.dataset.act === 'stats-x') { var sd = w.querySelector('.pp-stats'); if (sd && sd.close && sd.open) sd.close(); else if (sd) sd.remove(); return; }
    if (b.dataset.act === 'sound') {
      var on = !soundOn(); try { localStorage.setItem('pp_sound', on ? 'on' : 'off'); } catch (e2) {}
      b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(on)); music(on); return;
    }
    if (b.dataset.pal) {
      var pal = b.querySelector('.pen'); hop(pal); sfx('hi');
      return say(p.asleep ? 'Shh… everyone’s napping 💤' : window.ppLook.name(b.dataset.pal) + pick([' says hi! 👋', ' wants to play tag! 🏃', ' loves your penpen 💛', ' found a shiny shell! 🐚']));
    }
    if (b.dataset.act === 'hatch') return crack(p);
    if (b.dataset.act === 'make') return makeMe(false);
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
  function playGame(id) {
    if (!window.ppGames) return;
    var p = load(); wakeToPlay(p); p.energy = clamp(p.energy - 10); save(p);
    var host = document.getElementById('pp-ghost-host');
    window.ppGames.open(id, host, function (score, coins, ended) {
      if (score === null) { if (ret) tab = ret; return paint(); }
      if (!ended) return;
      var q = load(), gl = winGlass(q, id, coins); q.coins += coins; q.xp += Math.ceil(coins / 2); q.joy = clamp(q.joy + 8); q.bests = q.bests || {}; if (score > (q.bests[id] || 0)) q.bests[id] = score; if (id === 'slide' && score > q.best) q.best = score; save(q); setCoins(q);
      var res = host && host.querySelector('.gres'); if (res && gl) res.insertAdjacentHTML('beforeend', '<span class="gl">' + glassLine(id, gl) + '</span>');
    });
  }
  // games are always open: if he's napping, he wakes up to play
  function wakeToPlay(p) { if (p.asleep) { p.asleep = false; toast('penpen woke up to play! ☀️'); } }

  /* ---------- Belly Slide: down a snowy hill ---------- */
  function drawPen(c, x, y, air, duck, t) {
    c.save(); c.translate(x, y); c.rotate(air ? -0.3 : 0.12 + Math.sin(t / 90) * 0.04); if (duck) c.scale(1.15, 0.7);
    var P = load(), lk = look(P), b = lk.body;
    c.fillStyle = 'rgba(19,50,74,.15)'; if (!air) { c.beginPath(); c.ellipse(0, 14, 26, 4, 0, 0, 7); c.fill(); }
    c.fillStyle = b; c.beginPath(); c.ellipse(0, 0, 28, 15, 0, 0, 7); c.fill();
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(4, 5, 22, 9, 0, 0, 7); c.fill();
    c.fillStyle = b; c.beginPath(); c.ellipse(24, -8, 12, 11, 0, 0, 7); c.fill();
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(27, -6, 8, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#13324A'; c.beginPath(); c.arc(29, -9, 2.2, 0, 7); c.fill();
    c.fillStyle = lk.beak; c.beginPath(); c.moveTo(34, -6); c.lineTo(42, -4); c.lineTo(34, -2); c.fill();
    c.fillStyle = lk.feet; c.beginPath(); c.ellipse(-27, 4, 6, 3, 0.3, 0, 7); c.fill();
    c.fillStyle = b; c.beginPath(); c.ellipse(-4, -6, 12, 4, -0.2 + (air ? -0.6 : Math.sin(t / 60) * 0.3), 0, 7); c.fill();
    var wear = (WEAR[P.wear] || {}).e; if (wear) { c.font = '16px serif'; c.fillText(wear, 16, -16); }
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
    if (I) { cancelAnimationFrame(I.raf); clearTimeout(I.arrive); document.removeEventListener('keydown', I.key); document.removeEventListener('keyup', I.key); I = null; }
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
    '#pp-play .pen{position:relative;display:inline-block;animation:pppb 1.6s ease-in-out infinite alternate;touch-action:none;cursor:pointer}#pp-play .pen.zz{animation-duration:3s}' +
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
    // full screen: the garden is the whole Play screen, edge to edge; everything else floats small on top of it
    '#pp-play.imm{padding:0;overflow:hidden}#pp-play.imm .wrap{max-width:none;height:100%;margin:0}' +
    '#pp-play.imm .garden{position:absolute;inset:0;aspect-ratio:auto;min-height:0;max-height:none;border-radius:0;--fb:calc(64px + env(safe-area-inset-bottom))}' +
    '#pp-play.imm .walker,#pp-play.imm .ball{margin-bottom:var(--fb)}' +
    '#pp-play.imm .gtop{top:calc(8px + env(safe-area-inset-top));left:8px;right:8px;z-index:60}#pp-play.imm .gtop .back{width:36px;height:36px;font-size:22px;background:rgba(255,255,255,.9);color:#13324A;flex:none}#pp-play.imm .gtop .coins{background:rgba(255,255,255,.9);color:#13324A;padding:5px 10px;font-size:14px;flex:none}#pp-play.imm .mtr{padding:5px 7px}#pp-play.imm .gbtn{flex:none;min-width:36px;height:34px;padding:0 9px}' +
    '#pp-play.imm .garden .say{top:calc(56px + env(safe-area-inset-top))}#pp-play.imm .garden .zbtn{top:calc(96px + env(safe-area-inset-top));bottom:auto;right:10px}' +
    '#pp-play .gmenu{position:relative;flex:none}#pp-play .gmenu summary{list-style:none;display:grid;place-items:center;font-size:18px;line-height:1;cursor:pointer}#pp-play .gmenu summary::-webkit-details-marker{display:none}' +
    '#pp-play .gm{position:absolute;right:0;top:42px;width:min(78vw,250px);display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:rgba(255,255,255,.96);color:#13324A;border-radius:18px;padding:10px;box-shadow:0 10px 28px rgba(0,0,0,.2)}#pp-play .gm-lv{grid-column:1/-1;text-align:center;font-size:13px;color:#5B7A99}' +
    '#pp-play .gm button{border:0;background:#EEF5FA;color:#13324A;border-radius:14px;padding:8px 2px;font:800 12px ' + F + ';display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}#pp-play .gm button span{font-size:22px}' +
    '#pp-play.imm .foods{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(8px + env(safe-area-inset-bottom));z-index:50;display:flex;gap:6px;background:rgba(255,255,255,.55);border-radius:99px;padding:5px 8px}' +
    '#pp-play.imm .foods button{position:relative;width:46px;height:46px;border:0;border-radius:50%;background:rgba(255,255,255,.85);padding:0;display:grid;place-items:center}#pp-play.imm .foods span{font-size:26px;line-height:1}' +
    '#pp-play.imm .foods small{position:absolute;right:-3px;top:-3px;min-width:18px;height:18px;border-radius:9px;background:#13324A;color:#fff;font:900 10.5px/18px ' + F + ';text-align:center;padding:0 3px;box-sizing:border-box}' +
    '#pp-play .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '#pp-play .walker .pen.tk{animation:pptk .6s ease-in-out}@keyframes pptk{20%{transform:rotate(-12deg) scale(1.05,.95)}40%{transform:rotate(12deg)}60%{transform:rotate(-9deg) translateY(-4px)}80%{transform:rotate(7deg)}}' +
    '#pp-play .cloud{animation:ppcloud 60s linear infinite alternate}#pp-play .cloud.c2{animation-duration:90s}@keyframes ppcloud{to{transform:translateX(40px)}}@media(prefers-reduced-motion:reduce){#pp-play .cloud{animation:none}}' +
    '#pp-play .garden .gtop{position:absolute;left:10px;right:10px;top:10px;display:flex;gap:6px;align-items:center;z-index:50}#pp-play .meters{flex:1;display:flex;gap:6px}' +
    '#pp-play .mtr{flex:1;max-width:120px;border:0;background:rgba(255,255,255,.88);border-radius:99px;padding:5px 8px;display:flex;align-items:center;gap:5px;cursor:pointer}#pp-play .mtr b{font-size:14px}#pp-play .mtr i{flex:1;height:8px;border-radius:9px;background:#DDE6EE;overflow:hidden}#pp-play .mtr u{display:block;height:100%;border-radius:9px;transition:width .4s}' +
    '#pp-play .gbtn{border:0;border-radius:99px;background:rgba(255,255,255,.9);color:#13324A;padding:6px 10px;font:800 13px ' + F + ';cursor:pointer}' +
    '#pp-play .garden .say{position:absolute;left:50%;top:52px;transform:translateX(-50%);z-index:50;max-width:84%;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.1)}#pp-play .garden .zbtn{top:auto;bottom:10px;z-index:50}' +
    '#pp-play .walker{position:absolute;transform:translateX(-50%) scale(var(--d,1));transform-origin:50% 100%;transition-property:left,bottom,transform;transition-timing-function:linear;z-index:30}#pp-play .walker.pal{border:0;background:none;padding:0;cursor:pointer}#pp-play .walker.l svg{transform:scaleX(-1)}' +
    '#pp-play .walker .sv{display:none}#pp-play .walker.walking .sv{display:inline}#pp-play .walker.walking .fv{display:none}' +
    // a real-penguin waddle: rock side to side on the feet, with a little bob in the middle of each step
    '#pp-play .walker.walking .pen{animation:ppwd .34s ease-in-out infinite alternate;transform-origin:50% 92%}@keyframes ppwd{0%{transform:rotate(-9deg)}50%{transform:translateY(-3px) rotate(0)}100%{transform:rotate(9deg)}}' +
    '#pp-play .sv .f1{animation:ppstep .34s ease-in-out infinite alternate}#pp-play .sv .f2{animation:ppstep .34s ease-in-out infinite alternate-reverse}@keyframes ppstep{from{transform:translateX(-4px)}to{transform:translateX(4px)}}' +
    '#pp-play .sv .fl{transform-box:fill-box;transform-origin:50% 8%;animation:ppswing .34s ease-in-out infinite alternate}@keyframes ppswing{from{transform:rotate(-6deg)}to{transform:rotate(30deg)}}' +
    '#pp-play .lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0);animation:ppblink 4.3s infinite}#pp-play .walker:nth-child(odd) .lid{animation-duration:5.2s}#pp-play .walker:nth-child(3n) .lid{animation-duration:3.7s}@keyframes ppblink{0%,94%,100%{transform:scaleY(0)}97%{transform:scaleY(1)}}' +
    '#pp-play .brow,#pp-play .mouth{display:none}#pp-play .walker.sad .brow{display:inline}#pp-play .walker.sad .lid{animation:none;transform:scaleY(.42)}' +
    '#pp-play .walker.yay .mouth,#pp-play .walker.dance .mouth,#pp-play .pen.eat .mouth{display:inline}#pp-play .pen.eat .mouth{transform-box:fill-box;transform-origin:50% 0;animation:ppchomp .2s infinite alternate}@keyframes ppchomp{to{transform:scaleY(.3)}}' +
    '#pp-play .fl-l,#pp-play .fl-r{transform-box:fill-box;transform-origin:50% 10%}#pp-play .walker.yay .fl-l,#pp-play .walker.dance .fl-l{animation:ppflapl .28s ease-in-out infinite alternate}#pp-play .walker.yay .fl-r,#pp-play .walker.dance .fl-r{animation:ppflapr .28s ease-in-out infinite alternate}@keyframes ppflapl{to{transform:rotate(28deg)}}@keyframes ppflapr{to{transform:rotate(-28deg)}}' +
    '#pp-play .pen.zz .lid{animation:none}#pp-play .pen.zz .brow,#pp-play .pen.zz .mouth{display:none}' +
    '@media(prefers-reduced-motion:reduce){#pp-play .lid,#pp-play .fl-l,#pp-play .fl-r,#pp-play .sv *,#pp-play .mouth{animation:none!important}}' +
    '#pp-play .joy{display:none}#pp-play .walker .pen.eat{animation:ppchew .2s ease-in-out 6 alternate}#pp-play .pen.eat .joy{display:inline}#pp-play .pen.eat .pp-eyes,#pp-play .pen.eat .shut{display:none}@keyframes ppchew{to{transform:scale(1.07,.9)}}' +
    '#pp-play .garden .bed{font-size:52px}' +
    '#pp-play .walker.dance .pen{animation:ppdance .45s ease-in-out infinite alternate}@keyframes ppdance{from{transform:rotate(-12deg) translateY(0)}to{transform:rotate(12deg) translateY(-12px)}}' +
    '#pp-play .ball{position:absolute;transform:translateX(-50%);transition:left .8s linear;z-index:45;font-size:24px;pointer-events:none}#pp-play .ball i{display:block;font-style:normal}#pp-play .ball i.up{animation:pparc .8s ease-in-out}@keyframes pparc{50%{transform:translateY(-56px) rotate(180deg)}}' +
    '.pp-stats{border:0;border-radius:24px;padding:16px;width:min(92vw,420px);background:var(--card,#fff);color:var(--ink,#13324A);font-family:' + F + ';box-shadow:0 12px 40px rgba(0,0,0,.25)}.pp-stats:not([open]){display:none}.pp-stats[open]:not(:modal){position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99980;margin:0}.pp-stats::backdrop{background:rgba(10,20,30,.45)}' +
    '.pp-stats .st-top{display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:12px}.pp-stats .st-top button{border:0;background:none;font-size:20px;color:inherit;cursor:pointer}' +
    '#pp-play .pp-stats .bats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:auto}.pp-stats .st-tip{color:var(--muted,#7A8B99);font-size:13.5px;font-weight:700;text-align:center;margin:10px 0}' +
    // the egg, and the design-your-penpen dialog
    '#pp-play .egg{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);z-index:60;border:0;background:none;padding:0;cursor:pointer;animation:ppegg 2.4s ease-in-out infinite}#pp-play .egg .ck{opacity:0;transition:opacity .2s}#pp-play .egg.c1 .ck1,#pp-play .egg.c2 .ck{opacity:1}' +
    '#pp-play .egg.wob{animation:ppwob .5s ease-in-out}@keyframes ppegg{0%,85%,100%{rotate:0deg}90%{rotate:-6deg}95%{rotate:6deg}}@keyframes ppwob{25%{rotate:-12deg}75%{rotate:12deg}}' +
    '.pp-make{max-height:92vh;overflow:auto}.pp-make .mk-prev{display:flex;justify-content:center;margin:-4px 0 6px}.pp-make .mk-name{display:flex;gap:10px;align-items:center;font-weight:800;margin-bottom:8px}.pp-make .mk-name input{flex:1;font:800 16px ' + F + ';padding:9px 12px;border:2px solid var(--line,#DCE6EE);border-radius:12px;background:var(--bg,#F5F8FA);color:inherit;min-width:0}' +
    '.pp-make .mk-row{border:0;margin:0 0 8px;padding:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.pp-make legend{font-weight:800;font-size:13.5px;color:var(--muted,#7A8B99);padding:0;margin-bottom:6px}' +
    '.pp-make input[type=radio]{position:absolute;opacity:0;width:1px;height:1px}.pp-make .mk-sw{position:relative;cursor:pointer}.pp-make .mk-sw i{display:block;width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--line,#DCE6EE)}.pp-make .mk-sw input:checked+i{box-shadow:0 0 0 3px var(--accent,#2E86DE)}' +
    '.pp-make .mk-txt{position:relative;cursor:pointer}.pp-make .mk-txt span{display:block;padding:8px 12px;border-radius:999px;background:var(--bg,#F5F8FA);font-weight:800;font-size:14px;border:2px solid transparent}.pp-make .mk-txt input:checked+span{border-color:var(--accent,#2E86DE)}' +
    '.pp-make input:focus-visible+i,.pp-make input:focus-visible+span{outline:3px solid var(--accent,#2E86DE);outline-offset:2px}.pp-make .mk-go{width:100%;margin-top:6px}' +
    '.pp-stats .st-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.pp-stats .st-grid span{background:var(--bg,#F5F8FA);border-radius:14px;padding:8px;text-align:center;font-size:12.5px;font-weight:800;color:var(--muted,#7A8B99)}.pp-stats .st-grid b{display:block;font-size:20px;color:var(--ink,#13324A)}' +
    '.pp-stats .st-st{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px}.pp-stats .st-st button{display:grid;grid-template-columns:22px 64px 1fr 26px;align-items:center;gap:8px;width:100%;border:0;border-radius:12px;padding:6px 8px;background:var(--bg,#F5F8FA);font:inherit;font-size:14px;font-weight:800;color:inherit;cursor:pointer;text-align:left}' +
    '.pp-stats .st-st button:focus-visible{outline:3px solid #3B8FD9;outline-offset:2px}.pp-stats .st-st i{height:10px;border-radius:6px;background:var(--line,#DDE6EE);overflow:hidden}.pp-stats .st-st u{display:block;height:100%;border-radius:6px;min-width:4px}.pp-stats .st-st em{font-style:normal;text-align:right}' +
    '.sg{display:inline-block;width:11px;height:13px;vertical-align:-1px;background:var(--c);opacity:.85;clip-path:polygon(30% 0,85% 12%,100% 60%,62% 100%,8% 82%,0 30%);border-radius:2px}.gres .gl{display:block;font-weight:800}' +
    // the door into the igloo, and the cozy games room inside
    '#pp-play .gdoor{pointer-events:none}#pp-play .gdoor .door{pointer-events:auto;cursor:pointer;outline:none}#pp-play .gdoor .door:focus-visible .hit{stroke:#fff;stroke-width:3}#pp-play .gdoor .glow{animation:ppglow 2.2s ease-in-out infinite alternate}@keyframes ppglow{from{opacity:.55}to{opacity:1}}' +
    '#pp-play.imm .garden.igl{--fb:0px;background:#C8875A}#pp-play .igl .gtop .ititle{flex:1;min-width:0;background:rgba(255,255,255,.9);color:#13324A;border-radius:99px;padding:6px 12px;font:900 14px ' + F + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#pp-play .iitem{position:absolute;transform:translateX(-50%) scale(var(--d,1));transform-origin:50% 100%;border:0;background:none;padding:0 0 18px;cursor:pointer;-webkit-tap-highlight-color:transparent}#pp-play .iitem svg{display:block;width:100%;height:auto;overflow:visible;transition:filter .2s}' +
    '#pp-play .iitem .itag{position:absolute;left:50%;bottom:0;transform:translateX(-50%) scale(calc(1 / var(--d,1)));transform-origin:50% 100%;white-space:nowrap;background:rgba(255,255,255,.85);color:#13324A;border-radius:99px;padding:1px 8px;font:900 11.5px/16px ' + F + '}' +
    '#pp-play .iitem.near svg{filter:drop-shadow(0 0 6px #FFE58A) drop-shadow(0 0 2px #fff);animation:ppnear .9s ease-in-out infinite alternate}#pp-play .iitem.near .itag{background:#F7B955}#pp-play .iitem:focus-visible{outline:3px solid #fff;outline-offset:2px;border-radius:12px}@keyframes ppnear{to{transform:translateY(-4px)}}' +
    '#pp-play .igl .flm{transform-box:fill-box;transform-origin:50% 100%;animation:ppflm .45s ease-in-out infinite alternate}#pp-play .igl .flm.f2{animation-duration:.33s}@keyframes ppflm{to{transform:scale(.88,1.12)}}#pp-play .igl .bulb{animation:ppglow 1.6s ease-in-out infinite alternate}#pp-play .igl .bulb:nth-of-type(2n){animation-delay:.8s}' +
    '#pp-play .iplay{position:absolute;left:14px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:60;border:0;border-radius:99px;background:#3FAF6B;color:#fff;font:900 17px ' + F + ';padding:14px 20px;box-shadow:0 4px 0 #2B8550,0 8px 18px rgba(0,0,0,.2);cursor:pointer;animation:pppop .25s ease-out}#pp-play .iplay[hidden]{display:none}@keyframes pppop{from{transform:scale(.6);opacity:0}}' +
    '#pp-play .ijoy{position:absolute;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:60;width:112px;height:112px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 2px rgba(19,50,74,.2);display:flex;align-items:center;justify-content:center;touch-action:none;cursor:grab}#pp-play .ijoy i{width:50px;height:50px;border-radius:50%;background:#13324A;box-shadow:0 4px 10px rgba(19,50,74,.3);pointer-events:none}#pp-play .ijoy.on i{background:#237566}' +
    '@media (prefers-reduced-motion: reduce){#pp-play .walker{transition:none}#pp-play .pen,#pp-play .walker .pen.eat,#pp-play .walker .pen.tk,#pp-play .flm,#pp-play .bulb,#pp-play .glow,#pp-play .iitem.near svg,#pp-play .iplay{animation:none}}' +
    '.pp-heart{position:fixed;z-index:99990;font-size:24px;pointer-events:none;animation:pphrt 1.2s ease-out forwards}@keyframes pphrt{to{transform:translateY(-70px) scale(1.4);opacity:0}}' +
    '.pp-drag{position:fixed;z-index:99990;font-size:40px;pointer-events:none;transform:translate(-50%,-60%)}' +
    '.pp-pt{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99970;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:9px 14px;font:800 14px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);max-width:86vw;text-align:center}.pp-pt.out{opacity:0;transition:.35s}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
