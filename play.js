/* penpen's Igloo — a little pet to look after (works with no signal).
   penpen gets hungry, bored and sleepy over time. Look after him and he levels up;
   leave him starving and exhausted and he gets sick… and can even become a ghost 👻 (you can always start over).
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
  var COIN_SIGN = (function (y) { var m = y.match(/\p{Sc}/u); return (m ? m[0] : y.charAt(0)) || '$'; })(window.ppPlace().sym || '');
  function now() { return Date.now(); }
  function fresh() { return { food: 80, joy: 75, energy: 80, hp: 100, xp: 0, fit: 0, coins: 20, best: 0, bag: { fish: 3, meds: 1 }, own: { none: 1, hat: 1 }, wear: 'none', t: now(), exp: -1, asleep: false, ghost: false, born: now() }; }
  function load() {
    var p = null; try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    p = p || fresh();
    if (p.hp == null) { p.hp = 100; p.fit = 0; p.bag.meds = p.bag.meds || 1; }
    var hrs = Math.max(0, (now() - (p.t || now())) / 36e5);
    if (hrs > 0.01 && !p.ghost) {
      // life goes on while you're away
      p.food = clamp(p.food - hrs * (p.asleep ? 1.5 : 3));
      p.joy = clamp(p.joy - hrs * (p.asleep ? 0.5 : 2));
      p.energy = clamp(p.energy + hrs * (p.asleep ? 60 : -2.5));
      if (p.asleep && p.energy >= 100) p.asleep = false;
      var bad = (p.food < 20 ? 1 : 0) + (p.energy < 10 ? 1 : 0) + (p.joy < 10 ? 0.5 : 0);
      p.hp = clamp(p.hp + hrs * (bad ? -6 * bad : (p.food > 50 && p.energy > 30 ? 3 : 0)));
      if (p.hp <= 0) { p.ghost = true; p.asleep = false; }
      p.t = now();
    }
    return p;
  }
  function clamp(n) { return Math.max(0, Math.min(100, n)); }
  function save(p) { p.t = now(); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function level(p) { return 1 + Math.floor(Math.sqrt(p.xp / 20)); }
  function speedSkill(p) { return Math.min(10, 1 + Math.floor(level(p) / 3) + Math.floor((p.fit || 0) / 40)); }
  function sick(p) { return !p.ghost && p.hp < 30; }
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
  setInterval(function () { var p = load(), a = rewardExpenses(p); save(p); if (a) toast('+' + a + ' 🐟 for logging ' + (a === 1 ? 'an expense' : a + ' expenses') + '! Feed penpen in More → Play'); }, 15000);
  function toast(t) {
    var d = document.createElement('div'); d.className = 'pp-pt'; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, 3000);
  }

  function inner() {
    var g = 'bubbly', L = window.ppLook, s = L && L.svg(g);
    if (!s) { var n = document.querySelector('#navpen svg'); s = n ? (n.getAttribute('data-orig') || n.innerHTML) : ''; }
    return s;
  }
  function bodyColor() {
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', m = window.ppLook && window.ppLook.svg(g).match(/rx="36" ry="44" fill="([^"]+)"/);
    return m ? m[1] : '#1E2B4A';
  }
  function ghostSvg() {
    return '<svg viewBox="-7 -14 134 134" width="160" height="160" aria-hidden="true"><ellipse cx="60" cy="16" rx="22" ry="6" fill="none" stroke="#F4C542" stroke-width="4"/>' +
      '<path d="M24 64 Q24 20 60 20 Q96 20 96 64 L96 104 L86 96 L76 106 L66 96 L56 106 L46 96 L36 106 L24 98 Z" fill="#fff" opacity=".85" stroke="#C9D6E2" stroke-width="2"/>' +
      '<circle cx="50" cy="56" r="5" fill="#13324A"/><circle cx="70" cy="56" r="5" fill="#13324A"/><path d="M55 70 Q60 64 65 70" fill="none" stroke="#13324A" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  /* ---------- screen ---------- */
  var w = null, tab = 'pet', G = null, X = null, Q = null;
  function open() {
    if (document.getElementById('pp-play')) return;
    w = document.createElement('div'); w.id = 'pp-play'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Play');
    document.body.appendChild(w); tab = 'pet';
    var p = load(); var a = rewardExpenses(p); save(p);
    paint(a ? '+' + a + ' 🐟 for the expenses you logged!' : '');
    w.addEventListener('click', click);
  }
  function close() { stopAll(); if (w) w.remove(); w = null; }
  function back() { if (tab !== 'pet') { stopAll(); tab = 'pet'; paint(); } else close(); }
  window.ppPlayBack = function () { if (!document.getElementById('pp-play')) return false; back(); return true; };
  function battery(n, ic, label) {
    var c = n > 60 ? '#3FAF6B' : n > 30 ? '#F4A62A' : '#D9534F';
    return '<button type="button" class="bat" data-bat="' + label + '" title="' + label + ' ' + Math.round(n) + '%"><span class="tip"></span><span class="cell"><u style="height:' + Math.round(n) + '%;background:' + c + '"></u></span><b>' + ic + '</b><small>' + label + '</small></button>';
  }
  function mood(p) {
    if (p.ghost) return 'Boo… I got too hungry and tired 👻';
    if (p.asleep) return 'Zzz… 💤 (tap Wake up when he’s rested)';
    if (sick(p)) return 'I don’t feel well 🤒 Medicine please?';
    if (p.food < 25) return 'Hungry… 🥺 drag me some food!';
    if (p.energy < 20) return 'So sleepy… 😪';
    if (p.joy < 25) return 'Bored. Rub my belly? 🥱';
    return pick(['Happy penpen! 🐧', 'Rub my belly! 💕', 'Let’s slide! 🛷', 'I love this trip ✨']);
  }
  function tabs() {
    return '<div class="tabs">' + [['pet', '🐧', 'penpen'], ['games', '🎮', 'Games'], ['quiz', '🎓', 'Quiz'], ['learn', '📚', 'Learn'], ['sing', '🎤', 'Sing'], ['shop', '🛍️', 'Shop']].map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</div>';
  }
  function paint(msg) {
    var p = load(), wear = WEAR[p.wear] || WEAR.none;
    var h = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>' + (tab === 'pet' ? 'Play' : { games: 'Games', slide: 'Belly Slide', quiz: 'Professor Pen’s quiz', learn: 'Learn with penpen', sing: 'Sing with penpen', shop: 'Shop' }[tab]) + '</h2><span class="coins">' + COIN + ' <b id="pp-coins">' + p.coins + '</b></span></div><div class="wrap">' + tabs();
    if (tab === 'pet') {
      h += '<div class="petrow"><div class="bats">' + battery(p.food, '🍽️', 'Full') + battery(p.joy, '💛', 'Happy') + '</div><div class="stage' + (p.asleep ? ' night' : '') + '"><div class="pen' + (p.ghost ? ' ghost' : sick(p) ? ' sick' : p.asleep ? ' zz' : '') + '" id="pp-petpen">' +
        (p.ghost ? ghostSvg() : '<svg viewBox="-7 -14 134 134" width="160" height="160" aria-hidden="true">' + inner() + (p.asleep ? '<path class="shut" d="M45 49 Q51 54 57 49 M63 49 Q69 54 75 49" fill="none" stroke="#1F2A36" stroke-width="3" stroke-linecap="round"/>' : '') + '</svg>' + (wear.e ? '<span class="wear">' + wear.e + '</span>' : '') + (sick(p) ? '<span class="fx">🤒</span>' : p.asleep ? '<span class="fx">💤</span><span class="bed">🛏️</span>' : '')) +
        '</div><div class="say" id="pp-say">' + (msg || mood(p)) + '</div></div>' +
        (p.ghost ? '' : p.asleep ? '<button data-act="wake" class="zbtn">☀️ Wake</button>' : '<button data-act="sleep" class="zbtn">💤 Sleep</button>') +
        '</div><div class="bats">' + battery(p.energy, '⚡', 'Energy') + battery(p.hp, '❤️', 'Health') + '</div></div>' +
        '<div class="lv">Level ' + level(p) + '</div>';
      if (p.ghost) {
        h += '<div class="row2"><button data-act="reset">✨ Start over with a new penpen</button></div><p class="tip">Ghosts don’t eat. Start over to hatch a new penpen (your coins stay).</p>';
      } else {
        h += '<h3>Drag food to penpen <small>(or tap it)</small></h3><div class="foods">' + Object.keys(FOODS).map(function (k) { var n = p.bag[k] || 0; return '<button data-feed="' + k + '"' + (n ? '' : ' disabled') + '><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>×' + n + '</small></button>'; }).join('') + '</div>' +
          '<div class="petacts"><button data-act="tickle">🪶 Tickle</button><button data-act="selfie">📸 Selfie</button><button data-act="album">🖼 Album' + (album().length ? ' (' + album().length + ')' : '') + '</button></div>' +
          '<p class="tip">Rub or tap his belly for love 💕 · Log an expense → get a 🐟 · He gets tired if he never sleeps, and sick if he’s starving.</p>';
      }
    } else if (tab === 'slide') {
      h += '<div class="game"><canvas id="pp-slide" width="360" height="230"></canvas><div class="ghud" id="pp-ghud">Jump over rocks & snowmen, duck under snowballs ❄️</div>' +
        '<div class="pad"><button class="go" data-act="start">▶ Start</button><button class="ctl" id="pp-duck" aria-label="Duck">⬇ Duck</button><button class="ctl" id="pp-jump" aria-label="Jump">⬆ Jump</button></div></div>';
    } else if (tab === 'gym') {
      h += '<div class="gym"><div class="stage"><div class="pen" id="pp-gympen"><svg viewBox="-7 -14 134 134" width="150" height="150" aria-hidden="true">' + inner() + '</svg></div><div class="say" id="pp-gsay">Tap “Jump!” when the ring turns green 🟢</div></div>' +
        '<div class="beat"><i id="pp-beat"></i></div><div class="ghud" id="pp-gcount">Jumping jacks: 0 / 20</div>' +
        '<div class="pad"><button class="go" data-act="gym">▶ Start workout</button><button class="ctl big" id="pp-jj">Jump!</button></div>' +
        '<p class="tip">Workouts make penpen fitter (faster in Slide) but use energy. Too much and he’s exhausted.</p></div>';
    } else if (tab === 'quiz' || tab === 'games' || tab === 'sing' || tab === 'learn') {
      h += '<div id="pp-ghost-host"></div>';
    } else {
      h += '<h3>Food & care</h3><div class="shop">' + Object.keys(FOODS).filter(function (k) { return FOODS[k].price; }).map(function (k) { return '<button data-buy="f:' + k + '"><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>' + COIN + ' ' + FOODS[k].price + '</small><em>' + eff(FOODS[k]) + '</em></button>'; }).join('') + '</div>' +
        '<h3>Outfits</h3><div class="shop">' + Object.keys(WEAR).map(function (k) { var own = p.own[k], on = p.wear === k; return '<button data-buy="w:' + k + '" class="' + (on ? 'on' : '') + '"><span>' + (WEAR[k].e || '🚫') + '</span>' + WEAR[k].n + '<small>' + (on ? 'wearing' : own ? 'wear' : WEAR[k].price ? COIN + ' ' + WEAR[k].price : 'free') + '</small></button>'; }).join('') + '</div>' +
        '<p class="tip">Earn coins in Games and Quiz. A 🔋 Battery tops up energy so he can keep playing.</p>';
    }
    w.innerHTML = h + '</div>';
    if (tab === 'pet' && !p.ghost) petHooks();
    if (tab === 'slide') { drawIdle(); slideHooks(); }
    var gh = document.getElementById('pp-ghost-host');
    if (gh && window.ppGames) {
      if (tab === 'games') gh.innerHTML = window.ppGames.cards(p.bests);
      if (tab === 'quiz') window.ppGames.quiz(gh, function (c) { var q = load(); q.coins += c; q.xp += c; save(q); setCoins(q); });
      if (tab === 'sing') window.ppGames.sing(gh);
      if (tab === 'learn' && window.ppGames.learn) window.ppGames.learn(gh, function (c) { var q = load(); q.coins += c; q.xp += c; q.joy = clamp(q.joy + 3); save(q); setCoins(q); });
    }
  }
  function say(t) { var s = document.getElementById('pp-say'); if (s) s.textContent = t; }
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
    var p = load(), f = FOODS[k]; if (p.ghost || !(p.bag[k] > 0)) return;
    if (p.asleep) return say('Shh… he’s sleeping 💤');
    if (k !== 'meds' && k !== 'bat' && p.food >= 100) return say('I’m stuffed! Maybe later 😋');
    if (k === 'bat' && p.energy >= 100) return say('Already fully charged! ⚡');
    p.bag[k]--; p.food = clamp(p.food + f.food); p.joy = clamp(p.joy + f.joy); p.energy = clamp(p.energy + (f.en || 0)); p.hp = clamp(p.hp + (f.hp || 0)); p.xp += 2; save(p);
    paint(k === 'meds' ? 'Bleh… but I feel better! 💊' : k === 'bat' ? 'Bzzzt! Recharged ⚡😎' : pick(['Nom nom nom! ' + f.e + ' 😋', 'Yum, ' + f.n.toLowerCase() + '! ' + f.e, 'Salamat! So full 😌 ' + f.e]));
    var pen = document.getElementById('pp-petpen'); if (pen) { hop(pen); var r = pen.getBoundingClientRect(); hearts(r.left + r.width / 2, r.top + r.height * 0.4, 2, '😋'); }
  }
  function petHooks() {
    var pen = document.getElementById('pp-petpen'); if (!pen) return;
    // tap or rub the belly → hearts
    var last = 0, rub = 0;
    pen.addEventListener('pointerdown', function (e) { love(e, 2); });
    pen.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') { rub += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (rub > 40) { rub = 0; love(e, 1); } } });
    function love(e, n) {
      var p = load(); if (p.ghost) return;
      if (p.asleep) { say('Zzz… *happy snore* 💤'); return; }
      hearts(e.clientX, e.clientY - 20, n);
      if (now() - last > 700) { last = now(); p.joy = clamp(p.joy + 3); p.xp += 1; save(p); say(pick(['Hehe that tickles 💕', 'More belly rubs! 🥰', 'Best hooman ever 💛', 'Purr… wait, penguins don’t purr 🐧'])); refreshBats(p); }
    }
    // drag food onto penpen
    [].slice.call(w.querySelectorAll('[data-feed]')).forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        if (b.disabled) return;
        var k = b.dataset.feed, ghost = document.createElement('span'), moved = false, sx = e.clientX, sy = e.clientY;
        ghost.className = 'pp-drag'; ghost.textContent = FOODS[k].e; document.body.appendChild(ghost);
        function mv(ev) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 8) moved = true; ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
        function up(ev) {
          document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); ghost.remove();
          var r = pen.getBoundingClientRect();
          if (!moved || (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom)) feed(k);
        }
        mv(e); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
        e.preventDefault();
      });
    });
  }
  function refreshBats(p) { var b = w && w.querySelector('.bats'); if (b) b.innerHTML = battery(p.food, '🍽️', 'Full') + battery(p.joy, '💛', 'Happy') + battery(p.energy, '⚡', 'Energy') + battery(p.hp, '❤️', 'Health'); }
  function click(e) {
    var b = e.target.closest('button'); if (!b || !w) return;
    if (b.dataset.bat) { var sy = document.getElementById('pp-say'); if (sy) sy.textContent = { Full: '🍽️ Full: drops over time. Drag food to penpen — bigger meals fill more.', Happy: '💛 Happy: rub or tap his belly, play games or the quiz.', Energy: '⚡ Energy: each game uses some. Put him to sleep to recharge.', Health: '❤️ Health: drops if he’s starving, exhausted or bumps around in games. Medicine helps.' }[b.dataset.bat] || ''; return; }
    var p = load();
    if (b.classList.contains('back')) return back();
    if (b.dataset.tab) { stopAll(); tab = b.dataset.tab; return paint(); }
    if (b.dataset.game && window.ppGames) {
      if (!canPlay(p, 10)) return;
      p.energy = clamp(p.energy - 10); save(p);
      var host = document.getElementById('pp-ghost-host'), id = b.dataset.game;
      return window.ppGames.open(id, host, function (score, coins, ended) {
        if (score === null) return paint();
        if (!ended) return;
        var q = load(); q.coins += coins; q.xp += Math.ceil(coins / 2); q.joy = clamp(q.joy + 8); q.hp = clamp(q.hp - 4); q.bests = q.bests || {}; if (score > (q.bests[id] || 0)) q.bests[id] = score; if (id === 'slide' && score > q.best) q.best = score; save(q); setCoins(q);
      });
    }
    if (b.dataset.act === 'tickle') {
      if (p.ghost) return; if (p.asleep) return say('Zzz… *giggles in his sleep* 💤');
      p.joy = clamp(p.joy + 6); p.energy = clamp(p.energy - 1); p.xp += 1; save(p); refreshBats(p);
      say(pick(['Hahaha stop it!! 🤣', 'Not the flippers! 😂', 'Hehehe… again! 🪶', 'I’m… so… ticklish 🤭']));
      var tp = document.getElementById('pp-petpen'); if (tp && tp.animate) tp.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 600 });
      if (tp) { var tr = tp.getBoundingClientRect(); hearts(tr.left + tr.width / 2, tr.top + tr.height * 0.3, 3, '😂'); }
      return;
    }
    if (b.dataset.act === 'selfie') { if (p.ghost) return; return selfie(); }
    if (b.dataset.act === 'album') return showAlbum();
    if (b.dataset.act === 'sleep') { p.asleep = true; save(p); return paint('Night night 💤'); }
    if (b.dataset.act === 'wake') { p.asleep = false; save(p); return paint(p.energy > 70 ? 'Good morning! ☀️ Fully charged' : 'Yawn… still a bit sleepy 😪'); }
    if (b.dataset.act === 'reset') { var c = p.coins, np = fresh(); np.coins = c; np.exp = p.exp; save(np); return paint('Hello again! 🐣 A brand-new penpen'); }
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
  function canPlay(p, cost) {
    if (p.ghost) { toast('penpen is a ghost 👻 — start over on the penpen tab'); return false; }
    if (sick(p)) { toast('penpen is sick 🤒 — give him medicine first'); return false; }
    if (p.asleep) { toast('Shh, he’s sleeping 💤'); return false; }
    if (p.energy < cost) { toast('Too tired 😪 — let penpen sleep first'); return false; }
    return true;
  }

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
    var p = load(); if (!canPlay(p, 10)) return;
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
    var p = load(); if (!canPlay(p, 15)) return;
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
    if (p.energy < 10) p.hp = clamp(p.hp - 10);   // overdoing it
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
    '#pp-play .petrow{display:flex;gap:10px;align-items:stretch}#pp-play .stage{flex:1;background:linear-gradient(180deg,var(--accentSoft),var(--card));border-radius:24px;padding:12px 8px;text-align:center;position:relative;transition:background .4s}#pp-play .stage.night{background:linear-gradient(180deg,#24324F,#3C4C70)}' +
    '#pp-play .pen{position:relative;display:inline-block;animation:pppb 1.6s ease-in-out infinite alternate;touch-action:none;cursor:pointer}#pp-play .pen.zz{animation-duration:3s}#pp-play .pen.sick{filter:saturate(.5) hue-rotate(40deg)}#pp-play .pen.ghost{animation:ppgh 2.4s ease-in-out infinite alternate}' +
    '#pp-play .wear{position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:42px;pointer-events:none}#pp-play .fx{position:absolute;right:-6px;top:6px;font-size:30px;pointer-events:none}' +
    '@keyframes pppb{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-6px) rotate(3deg)}}@keyframes ppgh{from{transform:translateY(0)}to{transform:translateY(-14px)}}' +
    '#pp-play .say{display:inline-block;background:var(--card);color:var(--ink);border-radius:16px;padding:6px 12px;font-weight:800;margin-top:4px;font-size:14.5px}' +
    '#pp-play .bats{display:grid;grid-template-columns:1fr;gap:6px;width:58px;align-content:center}#pp-play .bat{border:0;font:inherit;color:inherit;cursor:pointer}#pp-play .bat .cell{width:20px!important;height:36px!important}' +
    '#pp-play .zbtn{position:absolute;top:10px;right:10px;border:0;border-radius:99px;background:rgba(255,255,255,.9);color:#13324A;padding:6px 10px;font:800 13px ' + F + ';cursor:pointer;z-index:2}' +
    '#pp-play .bat{background:var(--card);border-radius:16px;padding:8px 4px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative}' +
    '#pp-play .bat .tip{width:12px;height:4px;border-radius:2px 2px 0 0;background:var(--line)}#pp-play .bat .cell{width:26px;height:46px;border:2.5px solid var(--line);border-radius:7px;display:flex;align-items:flex-end;overflow:hidden;padding:2px;box-sizing:border-box}#pp-play .bat u{display:block;width:100%;border-radius:3px;transition:height .4s}' +
    '#pp-play .bat b{font-size:15px;line-height:1}#pp-play .bat small{font-size:11px;font-weight:800;color:var(--muted)}' +
    '#pp-play .lv{text-align:center;color:var(--muted);font-weight:800;font-size:13.5px;margin:10px 0 0}' +
    '#pp-play .petacts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 0}#pp-play .petacts button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:16px;padding:10px 4px;font:800 14px ' + F + '}#pp-play .shop em{font-style:normal;font-size:11px;color:var(--muted);font-weight:700;margin-top:2px}#pp-play .bed{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font-size:64px;z-index:0;opacity:.9;pointer-events:none}#pp-play .pen{position:relative;z-index:1}#pp-play .pen.zz svg{position:relative;z-index:1}.pp-album{position:fixed;inset:0;z-index:99990;background:rgba(10,20,30,.55);display:flex;align-items:flex-end;justify-content:center}.pp-album .al-in{background:var(--card,#fff);color:var(--ink,#13324A);width:100%;max-width:520px;max-height:86vh;overflow:auto;border-radius:24px 24px 0 0;padding:16px;font-family:' + F + '}.pp-album .al-top{display:flex;justify-content:space-between;align-items:center;font-size:18px}.pp-album .al-x{border:0;background:none;font-size:20px}.pp-album .al-msg{color:var(--muted);font-weight:700}.pp-album .al-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.pp-album figure{margin:0}.pp-album img{width:100%;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.15)}.pp-album figcaption{font-size:13px;text-align:center;margin-top:4px}.pp-album figcaption a,.pp-album figcaption button{color:#237566;font-weight:800;border:0;background:none;font:inherit;font-weight:800;padding:0}.pp-album .al-tip{font-size:12px;color:var(--muted);text-align:center}' +
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
    '.pp-heart{position:fixed;z-index:99990;font-size:24px;pointer-events:none;animation:pphrt 1.2s ease-out forwards}@keyframes pphrt{to{transform:translateY(-70px) scale(1.4);opacity:0}}' +
    '.pp-drag{position:fixed;z-index:99990;font-size:40px;pointer-events:none;transform:translate(-50%,-60%)}' +
    '.pp-pt{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99970;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:9px 14px;font:800 14px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);max-width:86vw;text-align:center}.pp-pt.out{opacity:0;transition:.35s}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
