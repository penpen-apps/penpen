/* penpen's Igloo: a little pet to look after + the Belly Slide game. Works with no signal.
   - Every expense you log earns a fish 🐟. Feed penpen to keep him happy.
   - Belly Slide: tap to hop over rocks, crabs and coconuts; grab fish and coins.
   - Coins buy food and outfits in the shop. Everything is saved on this phone. */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  var KEY = 'pp_pet';
  var FOODS = {
    fish:   { e: '🐟', n: 'Fish', food: 18, joy: 4, price: 0 },
    apple:  { e: '🍎', n: 'Apple', food: 10, joy: 3, price: 5 },
    veg:    { e: '🥦', n: 'Veggies', food: 12, joy: 1, price: 5 },
    tuna:   { e: '🍱', n: 'Tuna', food: 30, joy: 8, price: 15 },
    sushi:  { e: '🍣', n: 'Sushi', food: 25, joy: 15, price: 20 },
    mango:  { e: '🥭', n: 'Mango', food: 15, joy: 10, price: 10 }
  };
  var WEAR = {
    none:   { e: '', n: 'Nothing', price: 0 },
    hat:    { e: '🎩', n: 'Top hat', price: 0 },
    cap:    { e: '🧢', n: 'Cap', price: 30 },
    shades: { e: '🕶️', n: 'Shades', price: 40 },
    flower: { e: '🌺', n: 'Flower', price: 25 },
    crown:  { e: '👑', n: 'Crown', price: 120 }
  };
  function load() {
    var p = null; try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    p = p || { food: 70, joy: 70, energy: 80, xp: 0, coins: 20, best: 0, bag: { fish: 3 }, own: { none: 1, hat: 1 }, wear: 'none', t: Date.now(), exp: -1 };
    // time passes: penpen gets hungry and sleepy slowly (about 1 point every 20 minutes)
    var hrs = Math.max(0, (Date.now() - (p.t || Date.now())) / 36e5), d = Math.floor(hrs * 3);
    if (d > 0) { p.food = Math.max(5, p.food - d); p.joy = Math.max(5, p.joy - Math.floor(d / 2)); p.energy = Math.min(100, p.energy + d * 2); p.t = Date.now(); }
    return p;
  }
  function save(p) { p.t = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function level(p) { return 1 + Math.floor(Math.sqrt(p.xp / 20)); }
  function speedSkill(p) { return Math.min(10, 1 + Math.floor(level(p) / 2)); }

  // one fish for every expense logged on the trip
  function expenseCount() {
    var X = null; try { X = JSON.parse(localStorage.getItem('pp_trip') || 'null'); } catch (e) {}
    return X && X.tabs && X.tabs.Expenses ? X.tabs.Expenses.rows.slice(1).filter(function (r) { return r[1]; }).length : -1;
  }
  function rewardExpenses(p) {
    var n = expenseCount(); if (n < 0) return 0;
    if (p.exp < 0) { p.exp = n; return 0; }
    var add = Math.max(0, n - p.exp); p.exp = n;
    if (add) p.bag.fish = (p.bag.fish || 0) + add;
    return add;
  }
  setInterval(function () { var p = load(), a = rewardExpenses(p); save(p); if (a) toast('+' + a + ' 🐟 for logging ' + (a === 1 ? 'an expense' : a + ' expenses') + '! Feed penpen in More → Play'); }, 15000);
  function toast(t) {
    var d = document.createElement('div'); d.className = 'pp-pt'; d.textContent = t; document.body.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 400); }, 3200);
  }

  function penSvg() {
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', L = window.ppLook, inner = L && L.svg(g);
    if (!inner) { var n = document.querySelector('#navpen svg'); inner = n ? (n.getAttribute('data-orig') || n.innerHTML) : ''; }
    return '<svg viewBox="-7 -14 134 134" width="150" height="150" aria-hidden="true">' + inner + '</svg>';
  }
  function bodyColor() {
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', m = window.ppLook && window.ppLook.svg(g).match(/rx="36" ry="44" fill="([^"]+)"/);
    return m ? m[1] : '#1E2B4A';
  }

  /* ---------- the Igloo screen ---------- */
  var w = null, tab = 'pet';
  function open() {
    if (document.getElementById('pp-play')) return;
    w = document.createElement('div'); w.id = 'pp-play'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Play');
    document.body.appendChild(w);
    var p = load(); var a = rewardExpenses(p); save(p);
    paint(a ? '+' + a + ' 🐟 for the expenses you logged!' : '');
    w.onclick = click;
  }
  function bar(n, label, c) { return '<div class="bar"><span>' + label + '</span><i><u style="width:' + Math.round(n) + '%;background:' + c + '"></u></i><b>' + Math.round(n) + '</b></div>'; }
  function paint(msg) {
    var p = load(), lv = level(p), wear = WEAR[p.wear] || WEAR.none;
    var mood = p.food < 25 ? 'Hungry… 🥺' : p.joy < 25 ? 'Bored. Play with me? 🥱' : p.energy < 20 ? 'So sleepy 💤' : 'Happy penpen! 🐧';
    var h = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>Play</h2><span class="coins">🪙 ' + p.coins + '</span></div><div class="wrap">' +
      '<div class="tabs"><button data-tab="pet" class="' + (tab === 'pet' ? 'on' : '') + '">🐧 penpen</button><button data-tab="game" class="' + (tab === 'game' ? 'on' : '') + '">🛷 Belly Slide</button><button data-tab="shop" class="' + (tab === 'shop' ? 'on' : '') + '">🛍️ Shop</button></div>';
    if (tab === 'pet') {
      h += '<div class="pet"><div class="stage"><div class="pen" id="pp-petpen">' + penSvg() + (wear.e ? '<span class="wear">' + wear.e + '</span>' : '') + '</div><div class="say">' + (msg || mood) + '</div></div>' +
        '<div class="lv">Level ' + lv + ' · Speed ' + speedSkill(p) + ' · Best slide ' + p.best + '</div>' +
        bar(p.food, '🍽️ Full', '#F4A62A') + bar(p.joy, '💛 Happy', '#E46F8F') + bar(p.energy, '⚡ Energy', '#4A90C2') +
        '<h3>Feed penpen</h3><div class="foods">' + Object.keys(FOODS).map(function (k) { var n = p.bag[k] || 0; return '<button data-feed="' + k + '"' + (n ? '' : ' disabled') + '><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>×' + n + '</small></button>'; }).join('') + '</div>' +
        '<div class="row2"><button data-act="pet">🤗 Cuddle</button><button data-act="nap">💤 Nap</button><button data-tab="game">🛷 Play</button></div>' +
        '<p class="tip">Log an expense → get a 🐟. Play Belly Slide → earn 🪙 and XP. Higher level = faster penpen.</p></div>';
    } else if (tab === 'game') {
      h += '<div class="game"><canvas id="pp-slide" width="360" height="220"></canvas><div class="ghud" id="pp-ghud">Tap or press space to hop. Grab 🐟 and 🪙!</div><button class="go" data-act="start">▶ Start sliding' + (p.energy < 10 ? ' (penpen is tired — nap first)' : '') + '</button></div>';
    } else {
      h += '<h3>Food</h3><div class="shop">' + Object.keys(FOODS).filter(function (k) { return FOODS[k].price; }).map(function (k) { return '<button data-buy="f:' + k + '"><span>' + FOODS[k].e + '</span>' + FOODS[k].n + '<small>🪙 ' + FOODS[k].price + '</small></button>'; }).join('') + '</div>' +
        '<h3>Outfits</h3><div class="shop">' + Object.keys(WEAR).map(function (k) { var own = p.own[k], on = p.wear === k; return '<button data-buy="w:' + k + '" class="' + (on ? 'on' : '') + '"><span>' + (WEAR[k].e || '🚫') + '</span>' + WEAR[k].n + '<small>' + (on ? 'wearing' : own ? 'wear' : WEAR[k].price ? '🪙 ' + WEAR[k].price : 'free') + '</small></button>'; }).join('') + '</div>' +
        '<p class="tip">More games, outfits and coin packs are coming soon.</p>';
    }
    w.innerHTML = h + '</div>';
    if (tab === 'game') drawIdle();
  }
  function click(e) {
    var b = e.target.closest('button'); if (!b) return;
    var p = load();
    if (b.classList.contains('back')) { stopGame(); w.remove(); w = null; return; }
    if (b.dataset.tab) { stopGame(); tab = b.dataset.tab; return paint(); }
    if (b.dataset.feed) {
      var k = b.dataset.feed, f = FOODS[k]; if (!(p.bag[k] > 0)) return;
      if (p.food >= 100) return paint("I'm full! Maybe later 😋");
      p.bag[k]--; p.food = Math.min(100, p.food + f.food); p.joy = Math.min(100, p.joy + f.joy); p.xp += 2; save(p);
      paint(pick(['Nom nom! ' + f.e, 'Yum, ' + f.n.toLowerCase() + '! ' + f.e, 'Salamat! ' + f.e]));
      hop(); return;
    }
    if (b.dataset.act === 'pet') { p.joy = Math.min(100, p.joy + 6); p.xp += 1; save(p); paint(pick(['Hehe that tickles 💕', 'Again! 🐧', 'Best hooman ever 💛'])); hop(); return; }
    if (b.dataset.act === 'nap') { p.energy = Math.min(100, p.energy + 25); p.food = Math.max(0, p.food - 5); save(p); paint('Zzz… 💤 (+25 energy)'); return; }
    if (b.dataset.act === 'start') return startGame();
    if (b.dataset.buy) {
      var kind = b.dataset.buy.split(':')[0], id = b.dataset.buy.split(':')[1];
      if (kind === 'f') { var pr = FOODS[id].price; if (p.coins < pr) return toast('Not enough 🪙 — slide for more!'); p.coins -= pr; p.bag[id] = (p.bag[id] || 0) + 1; save(p); toast('Bought ' + FOODS[id].e + ' ' + FOODS[id].n); return paint(); }
      if (p.own[id]) { p.wear = id; save(p); return paint(); }
      var wp = WEAR[id].price; if (p.coins < wp) return toast('Not enough 🪙 — slide for more!');
      p.coins -= wp; p.own[id] = 1; p.wear = id; save(p); toast('New outfit: ' + WEAR[id].e + ' ' + WEAR[id].n); return paint();
    }
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function hop() { var s = document.querySelector('#pp-petpen'); if (s && s.animate) s.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' }); }

  /* ---------- Belly Slide ---------- */
  var G = null;
  function drawPen(c, x, y, air, t) {
    c.save(); c.translate(x, y); c.rotate(air ? -0.25 : Math.sin(t / 90) * 0.04);
    var b = bodyColor();
    c.fillStyle = 'rgba(19,50,74,.15)'; if (!air) { c.beginPath(); c.ellipse(0, 14, 26, 4, 0, 0, 7); c.fill(); }
    c.fillStyle = b; c.beginPath(); c.ellipse(0, 0, 28, 15, 0, 0, 7); c.fill();                 // body lying on its belly
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(4, 5, 22, 9, 0, 0, 7); c.fill();          // belly
    c.fillStyle = b; c.beginPath(); c.ellipse(24, -8, 12, 11, 0, 0, 7); c.fill();               // head
    c.fillStyle = '#FFF8EE'; c.beginPath(); c.ellipse(27, -6, 8, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#13324A'; c.beginPath(); c.arc(29, -9, 2.2, 0, 7); c.fill();
    c.fillStyle = '#F4A62A'; c.beginPath(); c.moveTo(34, -6); c.lineTo(42, -4); c.lineTo(34, -2); c.fill();   // beak
    c.beginPath(); c.ellipse(-27, 4, 6, 3, 0.3, 0, 7); c.fill();                               // feet behind
    c.fillStyle = b; c.beginPath(); c.ellipse(-4, -6, 12, 4, -0.2 + (air ? -0.6 : Math.sin(t / 60) * 0.3), 0, 7); c.fill();   // flipper
    var wear = (WEAR[load().wear] || {}).e; if (wear) { c.font = '16px serif'; c.fillText(wear, 16, -16); }
    c.restore();
  }
  function scene(c, W, H, off) {
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#CFEAF5'); sky.addColorStop(1, '#F6EEDF'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFD86B'; c.beginPath(); c.arc(W - 50, 40, 18, 0, 7); c.fill();
    c.fillStyle = '#9FD3DF'; c.fillRect(0, H * 0.58, W, 14);
    c.fillStyle = '#EAD7B0'; c.fillRect(0, H * 0.58 + 14, W, H);
    c.fillStyle = 'rgba(0,0,0,.06)'; for (var i = 0; i < 8; i++) { var x = ((i * 70 - off * 0.6) % (W + 70) + W + 70) % (W + 70) - 35; c.fillRect(x, H - 30, 22, 3); }
    c.fillStyle = '#6FA06B'; for (var j = 0; j < 3; j++) { var px = ((j * 160 - off * 0.25) % (W + 160) + W + 160) % (W + 160) - 60; c.fillRect(px + 12, H * 0.58 - 46, 6, 46); c.beginPath(); c.ellipse(px + 15, H * 0.58 - 48, 22, 8, 0, 0, 7); c.fill(); }
  }
  function drawIdle() {
    var cv = document.getElementById('pp-slide'); if (!cv) return; var c = cv.getContext('2d');
    scene(c, cv.width, cv.height, 0); drawPen(c, 80, cv.height - 52, false, 0);
  }
  function startGame() {
    var p = load(); if (p.energy < 10) return toast('penpen is too tired — tap 💤 Nap first');
    var cv = document.getElementById('pp-slide'); if (!cv) return;
    stopGame();
    var c = cv.getContext('2d'), W = cv.width, H = cv.height, ground = H - 52;
    G = { y: ground, vy: 0, t: 0, off: 0, speed: 3.2 + speedSkill(p) * 0.1, items: [], score: 0, fish: 0, coins: 0, next: 60, alive: true, raf: 0, last: 0 };
    p.energy = Math.max(0, p.energy - 10); save(p);
    var btn = w.querySelector('.go'); if (btn) btn.style.display = 'none';
    function jump() { if (!G || !G.alive) return; if (G.y >= ground - 1) G.vy = -9.2 - speedSkill(load()) * 0.05; }
    G.jump = jump;
    cv.onpointerdown = function (e) { e.preventDefault(); jump(); };
    G.key = function (e) { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
    document.addEventListener('keydown', G.key);
    function step(ts) {
      if (!G) return;
      G.raf = requestAnimationFrame(step);
      if (ts - G.last < 14) return; G.last = ts;
      G.t += 16; G.off += G.speed; G.speed += 0.0016; G.score += G.speed / 10;
      G.vy += 0.5; G.y = Math.min(ground, G.y + G.vy);
      if (--G.next <= 0) {
        var r = Math.random();
        G.items.push(r < 0.55 ? { k: pick(['🪨', '🦀', '🥥', '🌵']), x: W + 20, y: ground + 4, bad: 1 } : r < 0.8 ? { k: '🐟', x: W + 20, y: ground - 30 - Math.random() * 50 } : { k: '🪙', x: W + 20, y: ground - 20 - Math.random() * 60 });
        G.next = 45 + Math.random() * 60 - Math.min(25, G.speed * 2);
      }
      scene(c, W, H, G.off);
      c.font = '26px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (var i = G.items.length - 1; i >= 0; i--) {
        var it = G.items[i]; it.x -= G.speed; c.fillText(it.k, it.x, it.y);
        var hit = Math.abs(it.x - 92) < 26 && Math.abs(it.y - G.y) < (it.bad ? 18 : 26);
        if (hit) {
          if (it.bad) { G.alive = false; }
          else { if (it.k === '🐟') G.fish++; else G.coins += 2; G.items.splice(i, 1); continue; }
        }
        if (it.x < -30) G.items.splice(i, 1);
      }
      drawPen(c, 80, G.y, G.y < ground - 1, G.t);
      var hud = document.getElementById('pp-ghud'); if (hud) hud.textContent = '🏁 ' + Math.floor(G.score) + '   🐟 ' + G.fish + '   🪙 ' + G.coins;
      if (!G.alive) end();
    }
    G.raf = requestAnimationFrame(step);
  }
  function end() {
    var g = G; stopGame();
    var p = load(), s = Math.floor(g.score), earn = g.coins + Math.floor(s / 50);
    p.coins += earn; p.bag.fish = (p.bag.fish || 0) + g.fish; p.xp += Math.floor(s / 20) + g.fish; p.joy = Math.min(100, p.joy + 8);
    var best = s > p.best; if (best) p.best = s; save(p);
    var hud = document.getElementById('pp-ghud'); if (hud) hud.textContent = (best ? '🏆 New best! ' : 'Oof! ') + s + ' · +' + earn + ' 🪙 · +' + g.fish + ' 🐟';
    var btn = w && w.querySelector('.go'); if (btn) { btn.style.display = ''; btn.textContent = '↻ Slide again'; }
    var co = w && w.querySelector('.coins'); if (co) co.textContent = '🪙 ' + p.coins;
  }
  function stopGame() {
    if (!G) return; cancelAnimationFrame(G.raf); if (G.key) document.removeEventListener('keydown', G.key);
    var cv = document.getElementById('pp-slide'); if (cv) cv.onpointerdown = null; G = null;
  }
  window.ppOpenPlay = open;

  var css =
    '#pp-play{position:fixed;inset:0;z-index:99960;background:var(--bg);color:var(--ink);overflow:auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:16px/1.4 ' + F + '}' +
    '#pp-play .top{display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto 10px}#pp-play h2{flex:1;margin:0;font:900 24px ' + F + '}' +
    '#pp-play .back{border:0;background:var(--card);color:var(--ink);border-radius:50%;width:40px;height:40px;font-size:24px;line-height:1;padding:0 0 3px;cursor:pointer}' +
    '#pp-play .coins{background:var(--card);border-radius:99px;padding:6px 12px;font-weight:900}' +
    '#pp-play .wrap{max-width:560px;margin:0 auto}#pp-play h3{font:900 13px ' + F + ';letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:18px 4px 8px}' +
    '#pp-play .tabs{display:flex;gap:6px;background:var(--chip);border-radius:99px;padding:4px;margin-bottom:12px}#pp-play .tabs button{flex:1;border:0;background:none;border-radius:99px;padding:9px 6px;font:800 14px ' + F + ';color:var(--ink);cursor:pointer}#pp-play .tabs .on{background:var(--card);box-shadow:0 2px 6px rgba(0,0,0,.08)}' +
    '#pp-play .stage{background:linear-gradient(180deg,var(--accentSoft),var(--card));border-radius:24px;padding:14px;text-align:center;position:relative}' +
    '#pp-play .pen{position:relative;display:inline-block;animation:pppb 1.6s ease-in-out infinite alternate}#pp-play .wear{position:absolute;left:50%;top:6px;transform:translateX(-50%);font-size:40px}' +
    '@keyframes pppb{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-6px) rotate(3deg)}}' +
    '#pp-play .say{display:inline-block;background:var(--card);border-radius:16px;padding:6px 12px;font-weight:800;margin-top:4px}' +
    '#pp-play .lv{text-align:center;color:var(--muted);font-weight:800;font-size:14px;margin:10px 0}' +
    '#pp-play .bar{display:flex;align-items:center;gap:10px;margin:6px 0}#pp-play .bar span{width:90px;font-weight:800;font-size:14px}#pp-play .bar i{flex:1;height:12px;background:var(--line);border-radius:8px;overflow:hidden}#pp-play .bar u{display:block;height:100%;border-radius:8px}#pp-play .bar b{width:28px;text-align:right;font-size:13px}' +
    '#pp-play .foods,#pp-play .shop{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
    '#pp-play .foods button,#pp-play .shop button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:16px;padding:10px 4px;font:800 13px ' + F + ';cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}' +
    '#pp-play .foods span,#pp-play .shop span{font-size:28px}#pp-play small{color:var(--muted);font-weight:700}#pp-play button[disabled]{opacity:.45}#pp-play .shop .on{border-color:var(--accent);background:var(--accentSoft)}' +
    '#pp-play .row2{display:flex;gap:8px;margin-top:12px}#pp-play .row2 button{flex:1;border:0;background:var(--accent);color:#fff;border-radius:14px;padding:12px;font:800 15px ' + F + ';cursor:pointer}' +
    '#pp-play .tip{color:var(--muted);font-size:13px;text-align:center;margin-top:14px}' +
    '#pp-play canvas{width:100%;height:auto;border-radius:20px;display:block;touch-action:manipulation;background:#CFEAF5}' +
    '#pp-play .ghud{text-align:center;font-weight:900;margin:10px 0}#pp-play .go{display:block;width:100%;border:0;background:var(--accent);color:#fff;border-radius:16px;padding:14px;font:900 17px ' + F + ';cursor:pointer}' +
    '.pp-pt{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99970;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:9px 14px;font:800 14px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);max-width:86vw;text-align:center}.pp-pt.out{opacity:0;transition:.35s}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
