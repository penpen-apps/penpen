/* penpen's games — all offline, all with the same start: big Start circle → 3, 2, 1 → controls.
   Belly Slide (front view), Dive, Chase, Honk!, plus Professor Pen's quiz and Sing with penpen.
   window.ppGames.open(id, host, done(score, coins)) · .quiz(host, award) · .sing(host) · .stop() */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  var GAMES = {
    slide: { t: 'Belly Slide', e: '🛷', how: 'Slide down the mountain! Tap ◀ ▶ (or swipe) to dodge rocks and trees. Grab the fish.', pad: 'lr' },
    dive:  { t: 'Dive', e: '🌊', how: 'Swim with the joystick: down to dive for fish, up to swim up, and a little left and right. When a sea lion comes, get up onto the ice!', pad: 'ud' },
    chase: { t: 'Chase', e: '🐻‍❄️', how: 'Steer with the joystick and eat every fish in the maze. Don’t let the polar bear catch you! ❄️ freezes him.', pad: 'dpad' },
    honk:  { t: 'Honk!', e: '📣', how: 'Walk with the joystick, sneak up on tourists, HONK to make them drop things, and carry the loot to your igloo. Don’t get caught!', pad: 'honk' }
  };
  var cur = null;
  // "How to play": the ? button in every game opens this and pauses the game until you close it
  var HELP = {
    slide: ['Slide down the mountain as far as you can.', ['Tap <b>◀</b> or <b>▶</b> (or swipe) to move one lane left or right.', 'Grab 🐟 fish for 10 points. You also score as you go.', 'Don’t hit a rock, tree or snowman. One bump ends the run.', 'It gets faster the longer you last.']],
    dive: ['Catch fish, and hide from the sea lion.', ['Swim with the <b>joystick</b>: down to dive, up to swim up, and a little left and right. Push further to swim faster. Let go and you float up slowly.', 'Swim into 🐟 for 1 point, 🦐 for 3.', 'When “Sea lion! Swim up!” shows, get up onto the ice at the top and stay there until it swims past (+5).', 'If the sea lion reaches you underwater, the game is over.']],
    chase: ['Eat every fish in the maze before the polar bear gets you.', ['Push the <b>joystick</b> (or swipe) to turn. You keep moving that way until a wall. Push diagonally to take the next turn that way.', 'Each 🐟 is 1 point. Clear the maze for +20 and the next level, with a faster bear.', 'Grab a ❄️ for 5 points: it freezes the bear for 5 seconds.', 'You have 3 hearts ❤️. The bear takes one each time he catches you.']],
    honk: ['Steal the tourists’ stuff and bring it home to your igloo (bottom left).', ['Walk with the <b>joystick</b>, in any direction, until you’re right next to a tourist holding something.', 'Tap <b>HONK</b>. They drop it (+2), then get angry 💢 and chase you for a few seconds.', 'Walk over the dropped thing to pick it up, then carry it to the igloo (+10). You’re slower while carrying.', 'If an angry tourist catches you, you lose a heart ❤️ and drop what you’re carrying.', 'Reach the goal score at the top before the clock hits 0 to go up a level. Tip: honk, then run!']]
  };
  // difficulty (all games) and Honk!'s scene, remembered on this phone
  var DIFF = { easy: ['Easy', 0.75], normal: ['Normal', 1], hard: ['Hard', 1.3] };
  var SCENES = { beach: '🏖️ Beach', park: '🌳 Park', snow: '❄️ Snow', city: '🏙️ City' };
  function gset(o) { var v = {}; try { v = JSON.parse(localStorage.getItem('pp_games') || '{}') || {}; } catch (e) {} if (o) { Object.assign(v, o); try { localStorage.setItem('pp_games', JSON.stringify(v)); } catch (e) {} } if (!DIFF[v.diff]) v.diff = 'normal'; if (!SCENES[v.scene]) v.scene = 'beach'; return v; }
  function chips(kind, list, on) { return '<div class="gopt" role="group" aria-label="' + kind + '">' + Object.keys(list).map(function (k) { return '<button type="button" data-' + kind + '="' + k + '" aria-pressed="' + (k === on) + '">' + (kind === 'diff' ? list[k][0] : list[k]) + '</button>'; }).join('') + '</div>'; }
  function $(s, r) { return (r || document).querySelector(s); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* the garden penpen you designed (play.js), drawn as a sprite for the games */
  function gamePen() { return window.ppGamePen ? window.ppGamePen() : ''; }
  var sprite = null;   // made once per game (stop() clears it), so a new look shows in the next game
  function penImg() {
    if (sprite) return sprite;
    var inner = gamePen();
    if (!inner && window.ppFrontPen) inner = window.ppFrontPen();
    if (!inner) { var n = document.querySelector('#navpen svg'); inner = n ? (n.getAttribute('data-orig') || n.innerHTML) : ''; }
    var img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -14 134 134" width="268" height="268">' + inner + '</svg>');
    sprite = img; return img;
  }
  function drawPen(c, x, y, s, rot) {
    var im = penImg(); c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    if (im.complete && im.naturalWidth) c.drawImage(im, -s / 2, -s / 2, s, s);
    else { c.font = s * 0.8 + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🐧', 0, 0); }
    c.restore();
  }
  function emoji(c, ch, x, y, s, flip) {
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
    c.font = s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, 0); c.restore();
  }
  function txt(c, s, x, y, size, col, al) { c.font = '900 ' + size + 'px ' + F; c.fillStyle = col || '#13324A'; c.textAlign = al || 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }

  /* ---------- shared shell: Start circle → 3·2·1 → controls ---------- */
  function shell(host, id, done) {
    stop();
    var G = GAMES[id], O = gset();
    function opts() { return chips('diff', DIFF, O.diff) + (id === 'honk' ? chips('scene', SCENES, O.scene) : ''); }
    // the game fills the phone: the picture runs edge to edge under a floating back arrow, How to play and the score, with the controls in a band at the bottom
    host.innerHTML = '<div class="gx" data-g="' + id + '" role="region" aria-label="' + G.t + '"><div class="gtop"><button type="button" class="gback" aria-label="Back to games">‹</button><button type="button" class="ghelp" aria-label="How to play" title="How to play">?</button>' + soundBtn() + '<span class="gs" aria-label="Score">0</span></div>' +
      '<div class="gstage"><canvas></canvas><div class="gover"><button type="button" class="gstart"><span>▶</span>Start</button><p>' + G.how + '</p><button type="button" class="ghow">How to play</button>' + opts() + '</div></div><div class="gctl"></div>' +
      '<dialog class="ghd" aria-label="How to play ' + G.t + '"><b>How to play ' + G.t + '</b><p>' + HELP[id][0] + '</p><ol>' + HELP[id][1].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol><form method="dialog"><button>Got it</button></form></dialog></div>';
    // size the picture to the space the screen gives it (no layout, as in tests: the old phone-sized box); wide screens keep a phone-width picture
    var cv = $('canvas', host), stage = $('.gstage', host), W = Math.min(stage.clientWidth || host.clientWidth || 340, stage.clientWidth ? 600 : 480), H = Math.round(stage.clientHeight || Math.min(Math.max(300, innerHeight - 330), W * 1.3));
    var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; if (!stage.clientHeight) stage.style.height = H + 'px';
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    // S.top: how far down the picture the floating ‹ ? score bar reaches, so games keep their own top text and the player clear of it
    var sr = stage.getBoundingClientRect(), top = sr.height ? Math.max(0, Math.round($('.gtop', host).getBoundingClientRect().bottom - sr.top)) : 0;
    var S = { id: id, host: host, c: c, W: W, H: H, top: top, keys: {}, raf: 0, on: false, score: 0, done: done, game: null, diff: DIFF[O.diff][1], scene: O.scene };
    cur = S;
    var over = $('.gover', host), ctl = $('.gctl', host);
    $('.gback', host).onclick = function () { stop(); if (done) done(null); };
    function begin() {
      over.style.display = 'none'; ctl.innerHTML = ''; S.score = 0; $('.gs', host).textContent = '0';
      S.game = MAKERS[id](S); S.game.draw(0);
      var n = 3, cd = document.createElement('div'); cd.className = 'gcd'; stage.appendChild(cd);
      (function step() {
        if (cur !== S) return cd.remove();
        if (n === 0) { sfx('go'); music(id); cd.textContent = 'Go!'; cd.className = 'gcd go'; setTimeout(function () { cd.remove(); }, 450); pad(S, G.pad, ctl); S.on = true; S.last = performance.now(); S.raf = requestAnimationFrame(loop); return; }
        sfx('count'); cd.textContent = n; cd.className = 'gcd'; void cd.offsetWidth; cd.className = 'gcd pop'; n--; setTimeout(step, 750);
      })();
    }
    function loop(t) {
      if (cur !== S || !S.on) return;
      if (S.paused) { S.last = t; S.raf = requestAnimationFrame(loop); return; }   // How to play is open: hold still
      var dt = Math.min(0.05, (t - S.last) / 1000); S.last = t;
      S.game.step(dt); S.game.draw(dt);
      S.raf = requestAnimationFrame(loop);
    }
    S.end = function (msg) {
      S.on = false; cancelAnimationFrame(S.raf); ctl.innerHTML = ''; music(null); sfx('over');
      var coins = Math.min(30, Math.floor(S.score / (id === 'slide' ? 40 : 2)));
      over.style.display = ''; over.innerHTML = '<div class="gres"><b>' + (msg || 'Game over!') + '</b><span>Score ' + S.score + ' · +' + coins + ' coins</span></div><button type="button" class="gstart"><span>↻</span>Again</button><button type="button" class="gclose">✕ Back to games</button>';
      over.insertAdjacentHTML('beforeend', '<button type="button" class="ghow">How to play</button>' + opts());
      $('.gstart', over).onclick = begin; $('.gclose', over).onclick = function () { stop(); if (done) done(null); };
      if (done) done(S.score, coins, true);
    };
    S.add = function (n) { S.score += n; $('.gs', host).textContent = S.score; };
    $('.gstart', over).onclick = begin;
    var hd = $('.ghd', host);
    function help() {
      S.paused = true; S.keys = {}; S.stick = null; [].slice.call(ctl.querySelectorAll('.on')).forEach(function (b) { b.classList.remove('on'); }); var kb = $('.gjoy i', ctl); if (kb) kb.style.transform = '';
      if (hd.showModal) hd.showModal(); else hd.setAttribute('open', '');
    }
    hd.addEventListener('close', function () { S.paused = false; });
    if (!hd.showModal) $('form', hd).addEventListener('submit', function (e) { e.preventDefault(); hd.removeAttribute('open'); S.paused = false; });
    $('.ghelp', host).onclick = help;
    $('.gsnd', host).onclick = function () { toggleSound(this, id, function () { return cur === S && S.on; }); };
    over.addEventListener('click', function (e) {   // Easy / Normal / Hard and the scene: pick before you start
      if (e.target.closest('.ghow')) return help();
      var b = e.target.closest('[data-diff],[data-scene]'); if (!b) return;
      O = gset(b.dataset.diff ? { diff: b.dataset.diff } : { scene: b.dataset.scene }); S.diff = DIFF[O.diff][1]; S.scene = O.scene;
      [].slice.call(b.parentNode.children).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (!S.on) MAKERS[id](S).draw(0);
    });
    // a still picture behind the Start circle
    MAKERS[id](S).draw(0);
    swipe(cv, S);
    return S;
  }
  // Belly Slide keeps its ◀ ▶ buttons; Dive, Chase and Honk! get the joystick (Honk! also keeps its HONK button)
  function pad(S, kind, el) {
    var B = kind === 'lr' ? [['left', '◀'], ['right', '▶']] : kind === 'honk' ? [['honk', 'HONK']] : [];
    el.className = 'gctl ' + (kind === 'lr' ? 'lr' : 'stk');
    el.innerHTML = (kind === 'lr' ? '' : '<div class="gjoy" role="img" aria-label="Joystick: drag to move (arrow keys work too)"><i></i></div>') +
      B.map(function (b) { return '<button type="button" data-k="' + b[0] + '" aria-label="' + b[0] + '">' + b[1] + '</button>'; }).join('');
    if (kind !== 'lr') joy(S, kind, $('.gjoy', el));
    [].slice.call(el.querySelectorAll('button')).forEach(function (b) {
      var k = b.dataset.k;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); S.keys[k] = true; b.classList.add('on'); if (S.game && S.game.press) S.game.press(k); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { S.keys[k] = false; b.classList.remove('on'); }); });
    });
  }
  // On-screen joystick: put a thumb on it and drag any way. It presses the same keys as the arrow keys
  // (Dive: up/down, Chase: one way at a time), and S.stick ({x, y} from -1 to 1) lets Dive, Chase and Honk! read the exact push.
  var DZ = 0.12;   // the joystick's dead zone: a tiny nudge (about 8px) already moves him
  function joy(S, kind, base) {
    var knob = base.firstChild, id = null;
    function set(x, y) {
      var on = {}, far = Math.max(Math.abs(x), Math.abs(y)) > DZ;
      S.stick = id === null ? null : { x: x, y: y };
      knob.style.transform = id === null ? '' : 'translate(' + Math.round(x * 36) + 'px,' + Math.round(y * 36) + 'px)';
      if (kind === 'ud') { if (y < -DZ) on.up = 1; if (y > DZ) on.down = 1; }
      else if (kind === 'dpad') { if (far) on[Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up')] = 1; }
      else { if (x < -DZ) on.left = 1; if (x > DZ) on.right = 1; if (y < -DZ) on.up = 1; if (y > DZ) on.down = 1; }
      ['up', 'down', 'left', 'right'].forEach(function (k) { if (on[k] && !S.keys[k] && S.game && S.game.press) S.game.press(k); S.keys[k] = !!on[k]; });
    }
    function move(e) {
      var r = base.getBoundingClientRect(), R = r.width / 2 || 1, x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R, m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; } set(x, y);
    }
    base.addEventListener('pointerdown', function (e) { if (S.paused) return; e.preventDefault(); id = e.pointerId; if (base.setPointerCapture) base.setPointerCapture(id); base.classList.add('on'); move(e); });
    base.addEventListener('pointermove', function (e) { if (e.pointerId === id && !S.paused) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { base.addEventListener(ev, function (e) { if (e.pointerId !== id) return; id = null; base.classList.remove('on'); set(0, 0); }); });
  }
  function swipe(cv, S) {
    var sx, sy;
    cv.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    cv.addEventListener('touchend', function (e) {
      if (!S.on || !S.game || !S.game.press) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      S.game.press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });
  }
  document.addEventListener('keydown', function (e) {
    if (!cur || !cur.on || cur.paused) return; var k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'honk' }[e.key]; if (!k) return;
    e.preventDefault(); if (!cur.keys[k] && cur.game.press) cur.game.press(k); cur.keys[k] = true;
  });
  document.addEventListener('keyup', function (e) { if (!cur) return; var k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'honk' }[e.key]; if (k) cur.keys[k] = false; });
  function stop() { if (cur) { cur.on = false; cancelAnimationFrame(cur.raf); } cur = null; sprite = null; if (song) song.stop(); music(null); }

  var MAKERS = {};

  /* ---------- music and sound effects, made in code (no files). The 🔊 button turns them all off: the same switch as the garden's ---------- */
  var AU = null, NOISE = null, TUNE = null;
  function soundOn() { try { return localStorage.getItem('pp_sound') !== 'off'; } catch (e) { return true; } }
  function au() {
    if (!soundOn()) return null;
    try { AU = AU || new (window.AudioContext || window.webkitAudioContext)(); if (AU.state === 'suspended' && AU.resume) AU.resume(); return AU; } catch (e) { return null; }
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }   // a note number (60 = middle C) to its pitch
  // one note: a wave that starts at f (gliding to f2 if given), fades in quickly and dies away over len seconds
  function note(c, f, f2, t, len, vol, type, out) {
    var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, len / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out || c.destination); o.start(t); o.stop(t + len + 0.05);
  }
  // a burst of hiss through a band filter that sweeps from f to f2: splashes, whooshes, drum hits
  function hiss(c, t, len, vol, f, f2, out) {
    if (!NOISE) { NOISE = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = NOISE; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f, t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(out || c.destination); s.start(t); s.stop(t + len + 0.05);
  }
  // the cartoon honk: two buzzy reeds through a nasal filter, a quick squeak up then a droop down, twice ("HONK-onk")
  function honk(c, t) {
    [[0, 1, 0.3], [0.2, 0.86, 0.22]].forEach(function (h) {
      var s = t + h[0], bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3; bp.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.5, s + 0.02); g.gain.setValueAtTime(0.5, s + h[2] * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, s + h[2]);
      [0, 7].forEach(function (cents) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = cents;
        o.frequency.setValueAtTime(330 * h[1], s); o.frequency.exponentialRampToValueAtTime(440 * h[1], s + 0.04); o.frequency.exponentialRampToValueAtTime(290 * h[1], s + h[2]);
        o.connect(bp); o.start(s); o.stop(s + h[2] + 0.05);
      });
    });
  }
  // every sound effect in the games, by name
  var FX = {
    count: function (c, t) { note(c, 660, 0, t, 0.14, 0.18, 'square'); },
    go: function (c, t) { note(c, 990, 0, t, 0.3, 0.2, 'square'); note(c, 1320, 0, t + 0.08, 0.3, 0.12, 'square'); },
    over: function (c, t) { [523, 392, 330, 262].forEach(function (f, i) { note(c, f, 0, t + i * 0.16, 0.22, 0.18, 'triangle'); }); },
    level: function (c, t) { [523, 659, 784, 1047].forEach(function (f, i) { note(c, f, 0, t + i * 0.09, 0.16, 0.16, 'square'); }); },
    fish: function (c, t) { note(c, 880, 1320, t, 0.08, 0.2, 'triangle'); note(c, 1320, 1760, t + 0.07, 0.1, 0.16, 'triangle'); },
    shrimp: function (c, t) { [1047, 1319, 1568].forEach(function (f, i) { note(c, f, 0, t + i * 0.06, 0.1, 0.16, 'triangle'); }); },
    splash: function (c, t) { hiss(c, t, 0.4, 0.7, 2400, 500); hiss(c, t + 0.05, 0.25, 0.35, 900, 300); [0.12, 0.2, 0.3].forEach(function (d) { note(c, 500 + Math.random() * 300, 1100, t + d, 0.06, 0.12); }); },
    warn: function (c, t) { note(c, 196, 185, t, 0.35, 0.22, 'sawtooth'); note(c, 165, 155, t + 0.4, 0.45, 0.22, 'sawtooth'); },
    safe: function (c, t) { note(c, 784, 0, t, 0.12, 0.16, 'triangle'); note(c, 1047, 0, t + 0.1, 0.2, 0.16, 'triangle'); },
    whoosh: function (c, t) { hiss(c, t, 0.18, 0.35, 700, 2600); },
    ding: function (c, t) { note(c, 1568, 0, t, 0.3, 0.16); note(c, 2093, 0, t + 0.05, 0.35, 0.12); },
    bonk: function (c, t) { hiss(c, t, 0.2, 0.6, 400, 150); note(c, 140, 50, t, 0.3, 0.4, 'sine'); },
    munch: function (c, t, hi) { var f = hi ? 620 : 480; note(c, f, f * 0.55, t, 0.07, 0.16, 'triangle'); },
    freeze: function (c, t) { [1568, 2093, 2637, 3136, 2637].forEach(function (f, i) { note(c, f, 0, t + i * 0.05, 0.12, 0.1); }); },
    ouch: function (c, t) { note(c, 440, 150, t, 0.45, 0.2, 'sawtooth'); },
    drop: function (c, t) { note(c, 1250, 0, t, 0.06, 0.14, 'square'); note(c, 940, 0, t + 0.07, 0.08, 0.12, 'square'); },
    loot: function (c, t) { note(c, 988, 0, t, 0.08, 0.15, 'square'); note(c, 1319, 0, t + 0.08, 0.25, 0.15, 'square'); },
    grumble: function (c, t) { note(c, 170, 110, t, 0.18, 0.25, 'sawtooth'); note(c, 150, 95, t + 0.2, 0.25, 0.25, 'sawtooth'); },
    honk: honk,
    right: function (c, t) { [784, 988, 1319].forEach(function (f, i) { note(c, f, 0, t + i * 0.08, 0.2, 0.14, 'triangle'); }); },
    wrong: function (c, t) { note(c, 220, 200, t, 0.2, 0.16, 'square'); note(c, 196, 160, t + 0.2, 0.3, 0.16, 'square'); }
  };
  function sfx(name, arg) { var c = au(); if (!c || !FX[name]) return; try { FX[name](c, c.currentTime + 0.01, arg); } catch (e) {} }
  // each game's own little loop: notes in eighths (numbers from the root note, null = rest), a bass line and a drum line (k kick, s snare, h hat)
  var TUNES = {
    // Belly Slide: bright and quick, whee down the mountain
    slide: { bpm: 152, root: 67, wave: 'square', len: 0.6,
      lead: [0, 2, 4, 7, null, 4, 7, null, 9, 7, 4, 2, 4, null, null, null, 5, 4, 2, 0, 2, null, 4, null, 7, null, null, 4, 2, null, 0, null],
      bass: [0, null, 7, null, 0, null, 7, null, 5, null, 12, null, 5, null, 12, null, 2, null, 9, null, 2, null, 9, null, 7, null, 14, null, 7, null, 2, null],
      drum: 'k.hsk.hsk.hsk.hsk.hsk.hskkhsshs' },
    // Dive: medium tempo, bouncy and fun, with an echo like being underwater
    dive: { bpm: 116, root: 72, wave: 'triangle', len: 0.8, echo: 1,
      lead: [0, null, 4, 7, 9, null, 7, null, 5, null, 4, null, 2, null, null, null, 0, null, 4, 7, 12, null, 11, 9, 7, null, 9, null, 7, null, null, null],
      bass: [-24, -12, -24, -12, -19, -7, -19, -7, -17, -5, -17, -5, -24, -12, -17, -12],
      drum: 'k.h.s.h.k.h.s.hh' },
    // Chase: quick and a little tense, a minor run-around
    chase: { bpm: 138, root: 69, wave: 'square', len: 0.5,
      lead: [0, 3, 7, 12, 7, 3, 0, 3, 0, 3, 7, 12, 15, 12, 7, 3, -4, 0, 3, 8, 3, 0, -4, 0, -2, 2, 5, 10, 14, 10, 5, 2],
      bass: [-24, -24, -12, -24, -24, -24, -12, -24, -28, -28, -16, -28, -26, -26, -14, -26],
      drum: 'khshkhsh' },
    // Honk!: sneaky tiptoe music, plucked and creeping, with a cheeky little run at the end
    honk: { bpm: 104, root: 64, wave: 'triangle', len: 0.3,
      lead: [0, null, 3, null, null, 4, null, null, 7, null, 6, null, null, null, null, null, 0, null, 3, null, null, 4, null, null, 10, 9, 7, 6, 7, null, null, null],
      bass: [-24, null, -17, null, -24, null, -17, null, -21, null, -14, null, -21, null, -14, null, -19, null, -12, null, -19, null, -12, null, -18, null, -17, null, null, null, -24, null],
      drum: 'k...h...k...h.h.' },
    // Professor Pen's quiz: a calm thinking tune
    quiz: { bpm: 92, root: 72, wave: 'sine', len: 1.2,
      lead: [0, null, 4, null, 7, null, 4, null, 5, null, 9, null, 7, null, null, null, 4, null, 7, null, 12, null, 11, null, 9, null, 7, null, 5, null, null, null],
      bass: [-24, null, null, null, -19, null, null, null, -20, null, null, null, -17, null, null, null],
      drum: '' }
  };
  function music(id) {
    if (TUNE) { TUNE.stop(); TUNE = null; }
    var T = TUNES[id], c = T && au(); if (!c) return;
    try {
      var g = c.createGain(), step = 30 / T.bpm, n = 0, at = c.currentTime + 0.1, out = g;
      g.gain.value = 0.32; g.connect(c.destination);
      if (T.echo) { var dl = c.createDelay(1), fb = c.createGain(); dl.delayTime.value = step * 3; fb.gain.value = 0.3; g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(c.destination); }
      var play = function () {
        while (at < c.currentTime + 0.3) {   // schedule a little ahead, so a busy moment doesn't make the beat stumble
          var l = T.lead[n % T.lead.length], b = T.bass[n % T.bass.length], d = T.drum ? T.drum[n % T.drum.length] : '.';
          if (l != null) note(c, hz(T.root + l), 0, at, step * (T.len * 2), 0.16, T.wave, out);
          if (b != null) note(c, hz(T.root + b), 0, at, step * 1.6, 0.3, 'triangle', out);
          if (d === 'k') note(c, 150, 45, at, 0.16, 0.6, 'sine', out);
          if (d === 's') hiss(c, at, 0.12, 0.35, 1800, 1200, out);
          if (d === 'h') hiss(c, at, 0.04, 0.18, 8000, 7000, out);
          n++; at += step;
        }
      };
      play(); var iv = setInterval(play, 100);
      TUNE = { id: id, stop: function () { clearInterval(iv); try { g.gain.setTargetAtTime(0.0001, c.currentTime, 0.04); } catch (e) {} setTimeout(function () { g.disconnect(); }, 400); } };
    } catch (e) { TUNE = null; }   // a browser missing a sound part plays no music rather than breaking the game
  }
  // the game's 🔊 button: the same switch as the garden's, so one press quiets everything everywhere
  function soundBtn() { var on = soundOn(); return '<button type="button" class="gsnd" aria-pressed="' + on + '" aria-label="Music and sounds">' + (on ? '🔊' : '🔇') + '</button>'; }
  function toggleSound(b, id, playing) {
    var on = !soundOn(); try { localStorage.setItem('pp_sound', on ? 'on' : 'off'); } catch (e) {}
    b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '🔊' : '🔇';
    if (!on) music(null); else if (playing()) music(id);
  }
  // put the phone away mid-game and the music waits for you
  document.addEventListener('visibilitychange', function () { if (!AU || !AU.suspend) return; try { if (document.hidden) AU.suspend(); else if (TUNE) AU.resume(); } catch (e) {} });

  /* ---------- Belly Slide: front view, racing down toward you ---------- */
  MAKERS.slide = function (S) {
    var c = S.c, W = S.W, H = S.H, hz = H * 0.28, lane = 1, px = W / 2, speed = 0.45 * S.diff, dist = 0, objs = [], spawn = 0.6, flakes = [], hit = 0, lean = 0;
    for (var i = 0; i < 40; i++) flakes.push([Math.random() * W, Math.random() * H, rnd(1, 3)]);
    function laneX(l, z) { var vx = W / 2, bw = W * 0.95; return vx + (l - 1) * (bw / 3) * (1 - z * 0.92); }
    function yOf(z) { return hz + (H * 0.86 - hz) * (1 - z); }
    return {
      press: function (k) { var was = lane; if (k === 'left') lane = Math.max(0, lane - 1), lean = -1; if (k === 'right') lane = Math.min(2, lane + 1), lean = 1; if (lane !== was) sfx('whoosh'); },
      step: function (dt) {
        speed = Math.min(1.3 * S.diff, speed + dt * 0.012); dist += dt * speed * 60; spawn -= dt;
        if (spawn <= 0) { spawn = rnd(0.55, 1.1) / speed; var fish = Math.random() < 0.3; objs.push({ l: Math.floor(Math.random() * 3), z: 1, k: fish ? '🐟' : pick(['🪨', '🌲', '⛄', '🪨']), fish: fish }); }
        objs.forEach(function (o) { o.z -= dt * speed * 0.55; });
        px += (laneX(lane, 0) - px) * Math.min(1, dt * 12); lean *= 0.9;
        for (var i = objs.length - 1; i >= 0; i--) {
          var o = objs[i];
          if (o.z < 0.08 && o.z > -0.02 && o.l === lane && !o.got) { if (o.fish) { o.got = 1; S.add(10); sfx('ding'); objs.splice(i, 1); continue; } hit = 1; }
          if (o.z < -0.15) objs.splice(i, 1);
        }
        var d = Math.floor(dist / 3); if (d !== S._d) { S._d = d; S.add(1); }
        flakes.forEach(function (f) { f[1] += dt * 60 * speed * f[2]; f[0] += Math.sin(f[1] / 30) * 0.3; if (f[1] > H) { f[1] = -5; f[0] = Math.random() * W; } });
        if (hit) { sfx('bonk'); S.end('Bonk! 🌲'); }
      },
      draw: function () {
        var g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#9FD3F0'); g.addColorStop(1, '#E3F3FB'); c.fillStyle = g; c.fillRect(0, 0, W, hz + 1);
        c.fillStyle = '#C9DCEA'; c.beginPath(); c.moveTo(0, hz); c.lineTo(W * 0.18, hz - 50); c.lineTo(W * 0.35, hz - 18); c.lineTo(W * 0.55, hz - 62); c.lineTo(W * 0.78, hz - 22); c.lineTo(W, hz - 44); c.lineTo(W, hz); c.fill();
        c.fillStyle = '#F7FBFE'; c.fillRect(0, hz, W, H - hz);
        c.strokeStyle = 'rgba(120,160,190,.25)'; c.lineWidth = 2;
        [0.5, 1.5].forEach(function (b) { c.beginPath(); c.moveTo(W / 2 + (b - 1) * W * 0.95 / 3 * 0.08, hz); c.lineTo(W / 2 + (b - 1) * W * 0.95 / 3, H); c.stroke(); });
        for (var s = 0; s < 8; s++) { var z = ((s / 8) + (dist * 0.02) % (1 / 8)) % 1; c.strokeStyle = 'rgba(150,185,210,' + (0.35 * (1 - z)) + ')'; c.beginPath(); c.moveTo(0, yOf(z)); c.lineTo(W, yOf(z)); c.stroke(); }
        objs.slice().sort(function (a, b) { return b.z - a.z; }).forEach(function (o) { var sz = 18 + (1 - o.z) * 70; emoji(c, o.k, laneX(o.l, o.z), yOf(o.z) - sz * 0.35, sz); });
        c.fillStyle = 'rgba(0,0,0,.08)'; c.beginPath(); c.ellipse(px, H * 0.9, 36, 9, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)'; for (var q = 0; q < 6; q++) { c.beginPath(); c.arc(px - 40 + q * 16, H * 0.9 + Math.sin(dist + q) * 3, 6 + (q % 3) * 2, 0, 7); c.fill(); }
        var im = penImg(); c.save(); c.translate(px, H * 0.9 - 46); c.rotate(lean * 0.2);
        if (im.complete && im.naturalWidth) c.drawImage(im, -48, -48, 96, 96); c.restore();
        c.fillStyle = '#fff'; flakes.forEach(function (f) { c.beginPath(); c.arc(f[0], f[1], f[2], 0, 7); c.fill(); });
      }
    };
  };

  /* ---------- Dive: catch fish, hop on the ice when a sea lion comes ---------- */
  MAKERS.dive = function (S) {
    var c = S.c, W = S.W, H = S.H, ice = H * 0.2, x = W * 0.3, y = H * 0.55, vy = 0, vx = 0, fish = [], sp = 0, foe = null, warn = 0, next = 6, t = 0, bub = [];
    for (var i = 0; i < 14; i++) bub.push([Math.random() * W, ice + Math.random() * (H - ice), rnd(1, 4)]);
    return {
      step: function (dt) {
        t += dt; var k = S.keys, base = (90 + Math.min(80, t * 2)) * S.diff;
        // the joystick sets his speed directly (push further, swim faster) and he gets there in a blink; let go and he floats up slowly
        var j = S.stick && Math.hypot(S.stick.x, S.stick.y) > DZ ? S.stick : null, ty = j ? j.y * 320 : k.down ? 320 : k.up ? -320 : -70, tx = j ? j.x * 200 : (k.right ? 200 : 0) - (k.left ? 200 : 0), e = Math.min(1, dt * 14);
        vy += (ty - vy) * e; vx += (tx - vx) * e; y += vy * dt; x = clamp(x + vx * dt, 30, W * 0.7);
        this.pos = [x, y];
        if (y > H - 26) { y = H - 26; vy = 0; }
        var safe = y <= ice - 6; if (safe !== this.up) { if (this.up != null) sfx('splash'); this.up = safe; }   // a splash each time he breaks the surface, up or down
        if (y < ice - 22) { y = ice - 22; vy = Math.max(vy, 0); }
        sp -= dt; if (sp <= 0) { sp = rnd(0.5, 1.1); fish.push({ x: W + 20, y: rnd(ice + 30, H - 30), k: Math.random() < 0.15 ? '🦐' : '🐟' }); }
        fish.forEach(function (f) { f.x -= base * dt; });
        for (var i = fish.length - 1; i >= 0; i--) { var f = fish[i]; if (Math.abs(f.x - x) < 26 && Math.abs(f.y - y) < 24) { S.add(f.k === '🦐' ? 3 : 1); sfx(f.k === '🦐' ? 'shrimp' : 'fish'); fish.splice(i, 1); } else if (f.x < -20) fish.splice(i, 1); }
        next -= dt;
        if (!foe && next <= 0) { warn = 1.6; sfx('warn'); foe = { x: W + 80, y: rnd(ice + 40, H - 40), go: false, v: (170 + Math.min(120, t * 3)) * S.diff }; next = rnd(6, 10); }
        if (foe) {
          if (warn > 0) warn -= dt; else foe.go = true;
          if (foe.go) {
            foe.x -= foe.v * dt; if (!safe) foe.y += (y - foe.y) * Math.min(1, dt * 2.2);
            if (!safe && Math.abs(foe.x - x) < 38 && Math.abs(foe.y - y) < 30) return S.end('The sea lion got you! 🦭');
            if (foe.x < -90) { foe = null; S.add(5); sfx('safe'); }
          }
        }
        bub.forEach(function (b) { b[1] -= dt * 30 * b[2]; if (b[1] < ice) { b[1] = H; b[0] = Math.random() * W; } });
      },
      draw: function () {
        c.fillStyle = '#CFEAF7'; c.fillRect(0, 0, W, ice);
        var g = c.createLinearGradient(0, ice, 0, H); g.addColorStop(0, '#4FB3D9'); g.addColorStop(1, '#13507A'); c.fillStyle = g; c.fillRect(0, ice, W, H - ice);
        c.fillStyle = '#F4FBFF'; c.beginPath(); c.moveTo(0, ice - 6); for (var i = 0; i <= W; i += 30) c.lineTo(i, ice - 6 + (i / 30 % 2 ? 4 : -2)); c.lineTo(W, ice + 8); c.lineTo(0, ice + 8); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; bub.forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2], 0, 7); c.fill(); });
        fish.forEach(function (f) { emoji(c, f.k, f.x, f.y, 26); });
        if (foe) { if (!foe.go) { txt(c, '⚠️ Sea lion! Swim up!', W / 2, ice + 26, 18, '#fff'); emoji(c, '🦭', W - 24, foe.y, 30); } else emoji(c, '🦭', foe.x, foe.y, 54); }
        var under = y > ice - 6; drawPen(c, x, y, 64, under ? clamp(vy / 600, -0.6, 0.6) + Math.PI / 2 * 0.0 : 0);
        if (!under && foe && foe.go) txt(c, 'Safe! 🧊', x, y - 44, 15, '#13324A');
      }
    };
  };

  /* ---------- Chase: a little maze, a hungry polar bear ---------- */
  // a tall phone gets a taller level (17 rows, same width), so the maze fills the screen; shorter screens keep the 13-row one
  var TALL = ['###########', '#.........#', '#.##.#.##.#', '#*#..#..#*#', '#.#.###.#.#', '#.........#', '###.#.#.###', '#...#.#...#', '#.###.###.#', '#.........#', '#.#.###.#.#', '#.#.....#.#', '#.##.#.##.#', '#.........#', '#.##.#.##.#', '#*...#...*#', '###########'];
  var MAZE = ['###########', '#.........#', '#.##.#.##.#', '#*#..#..#*#', '#.#.###.#.#', '#.........#', '###.#.#.###', '#...#.#...#', '#.###.###.#', '#.........#', '#.##.#.##.#', '#*...#...*#', '###########'];
  MAKERS.chase = function (S) {
    var c = S.c, W = S.W, H = S.H, T = S.top ? S.top + 20 : 0, M = (H - T) * MAZE[0].length / W >= 16 ? TALL : MAZE, R = M.length, C = M[0].length, cs = Math.floor(Math.min(W / C, (H - T) / R)), ox = (W - cs * C) / 2, oy = T + (H - T - cs * R) / 2;   // the maze sits below the floating bar, room for the hearts line above it
    var grid = M.map(function (r) { return r.split(''); }), lives = 3, lvl = 1, PR = R - 4;   // penpen starts 4 rows up from the bottom, the bear in row 5
    var P = { r: PR, c: 5, fr: PR, fc: 5, d: null, want: null, p: 1 }, B = { r: 5, c: 5, fr: 5, fc: 5, p: 1 }, frozen = 0;
    function left() { var n = 0; grid.forEach(function (r) { r.forEach(function (x) { if (x === '.' || x === '*') n++; }); }); return n; }
    function open(r, cc) { return grid[r] && grid[r][cc] && grid[r][cc] !== '#'; }
    var D = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    function bfs(fr, fc, tr, tc) {
      var q = [[fr, fc]], seen = {}, prev = {}; seen[fr + ',' + fc] = 1;
      while (q.length) { var n = q.shift(); if (n[0] === tr && n[1] === tc) break; for (var k in D) { var a = n[0] + D[k][0], b = n[1] + D[k][1], key = a + ',' + b; if (!seen[key] && open(a, b)) { seen[key] = 1; prev[key] = n; q.push([a, b]); } } }
      var cur2 = [tr, tc], p = prev[tr + ',' + tc]; if (!p) return null;
      while (p && !(p[0] === fr && p[1] === fc)) { cur2 = p; p = prev[p[0] + ',' + p[1]]; }
      return cur2;
    }
    var OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    // the joystick's way: on a diagonal push, the side he isn't already going is tried first, so up-right while running right turns up at the next gap
    function steer() {
      var j = S.stick; if (!j) return null;
      var ax = Math.abs(j.x), ay = Math.abs(j.y); if (Math.max(ax, ay) < DZ) return null;
      var h = j.x > 0 ? 'right' : 'left', v = j.y > 0 ? 'down' : 'up', ks = ax > ay ? [h, v] : [v, h];
      if (Math.min(ax, ay) < 0.4 * Math.max(ax, ay)) ks.pop(); else if (ks[0] === P.d) ks.reverse();
      for (var i = 0; i < ks.length; i++) if (open(P.r + D[ks[i]][0], P.c + D[ks[i]][1])) return ks[i];
      return ks[0];
    }
    // turning back the way he came happens at once, even between squares
    function turn(k) { P.want = k; if (P.d && k === OPP[P.d] && P.p > 0 && P.p < 1) { var r = P.r, cc = P.c; P.r = P.fr; P.c = P.fc; P.fr = r; P.fc = cc; P.p = 1 - P.p; P.d = k; } }
    function reset() { P.r = P.fr = PR; P.c = P.fc = 5; P.p = 1; P.d = P.want = null; B.r = B.fr = 5; B.c = B.fc = 5; B.p = 1; frozen = 1.5; }
    return {
      press: function (k) { if (D[k]) turn(k); },
      step: function (dt) {
        var ps = 5.2, bs = (3.4 + lvl * 0.5) * S.diff, w = steer();
        if (w && w !== P.want) turn(w);
        P.p += dt * ps;
        if (P.p >= 1) {
          P.fr = P.r; P.fc = P.c; P.p = 0;
          var e = grid[P.r][P.c]; if (e === '.') { grid[P.r][P.c] = ' '; S.add(1); sfx('munch', S.score % 2); } if (e === '*') { grid[P.r][P.c] = ' '; S.add(5); frozen = 5; sfx('freeze'); }
          if (w = steer()) P.want = w;   // decide again at each square, where he can turn
          if (P.want && open(P.r + D[P.want][0], P.c + D[P.want][1])) P.d = P.want;
          if (P.d && open(P.r + D[P.d][0], P.c + D[P.d][1])) { P.r += D[P.d][0]; P.c += D[P.d][1]; } else P.p = 1;
          if (!left()) { lvl++; grid = M.map(function (r) { return r.split(''); }); reset(); S.add(20); sfx('level'); }
        }
        if (frozen > 0) frozen -= dt; else {
          B.p += dt * bs;
          if (B.p >= 1) { B.fr = B.r; B.fc = B.c; B.p = 0; var n = Math.random() < 0.15 ? null : bfs(B.r, B.c, P.r, P.c); if (!n) { var ks = Object.keys(D).filter(function (k) { return open(B.r + D[k][0], B.c + D[k][1]); }); var k2 = pick(ks); n = [B.r + D[k2][0], B.c + D[k2][1]]; } B.r = n[0]; B.c = n[1]; }
        }
        var px = P.fc + (P.c - P.fc) * Math.min(1, P.p), py = P.fr + (P.r - P.fr) * Math.min(1, P.p), bx = B.fc + (B.c - B.fc) * Math.min(1, B.p), by = B.fr + (B.r - B.fr) * Math.min(1, B.p);
        if (frozen <= 0 && Math.abs(px - bx) < 0.6 && Math.abs(py - by) < 0.6) { lives--; if (lives <= 0) return S.end('The polar bear caught you! 🐻‍❄️'); sfx('ouch'); reset(); }
        this.pp = [px, py]; this.bp = [bx, by];
      },
      draw: function () {
        c.fillStyle = '#EAF5FB'; c.fillRect(0, 0, W, H);
        for (var r = 0; r < R; r++) for (var cc = 0; cc < C; cc++) {
          var x = ox + cc * cs, y = oy + r * cs, e = grid[r][cc];
          if (e === '#') { c.fillStyle = '#9CC9E2'; c.beginPath(); c.roundRect ? c.roundRect(x + 1, y + 1, cs - 2, cs - 2, 6) : c.rect(x + 1, y + 1, cs - 2, cs - 2); c.fill(); }
          else if (e === '.') emoji(c, '🐟', x + cs / 2, y + cs / 2, cs * 0.42);
          else if (e === '*') emoji(c, '❄️', x + cs / 2, y + cs / 2, cs * 0.6);
        }
        var pp = this.pp || [P.c, P.r], bp = this.bp || [B.c, B.r];
        drawPen(c, ox + pp[0] * cs + cs / 2, oy + pp[1] * cs + cs / 2, cs * 1.25);
        c.globalAlpha = frozen > 0 ? 0.55 : 1; emoji(c, '🐻‍❄️', ox + bp[0] * cs + cs / 2, oy + bp[1] * cs + cs / 2, cs * 0.95); c.globalAlpha = 1;
        if (frozen > 0) txt(c, 'Frozen! 🥶', ox + bp[0] * cs + cs / 2, oy + bp[1] * cs - 6, 12, '#13507A');
        txt(c, '❤️'.repeat(Math.max(0, lives)) + '  Level ' + lvl, ox + 6, oy - 10 > 8 ? oy - 10 : 12, 13, '#13324A', 'left');
      }
    };
  };

  /* ---------- Honk!: annoy the tourists, steal the loot. Four places; reach the goal before time's up for the next level ---------- */
  var HONK_AT = {
    beach: { ground: '#F3E3BE', top: '#7CC7DB', loot: ['🍦', '🎩', '🥪', '🕶️', '📷', '🥥', '🩴', '🍢'], deco: [['⛱️', 0.7, 0.45, 40], ['🌴', 0.92, 0.2, 44], ['🌴', 0.45, 0.9, 40]] },
    park:  { ground: '#BFE3A0', top: '#9FD3F0', loot: ['🍦', '🎈', '🥪', '🧺', '🍎', '🕶️', '📷', '🌭'], deco: [['🌳', 0.9, 0.2, 46], ['🌳', 0.5, 0.88, 40], ['🪑', 0.72, 0.5, 30], ['🦆', 0.32, 0.3, 24]], pond: 1 },
    snow:  { ground: '#F4F8FB', top: '#C9DCEA', loot: ['🧣', '🧤', '☕', '🍫', '📷', '🥨', '🎿', '🕶️'], deco: [['⛄', 0.72, 0.45, 40], ['🌲', 0.92, 0.2, 44], ['🌲', 0.48, 0.9, 40]] },
    city:  { ground: '#DAD6CF', top: '#9AA9B8', loot: ['🍔', '🛍️', '☕', '🕶️', '📷', '🌭', '🧋', '🎧'], deco: [['🚦', 0.9, 0.22, 36], ['🏪', 0.7, 0.48, 38], ['🛴', 0.46, 0.9, 30]], road: 1 }
  };
  MAKERS.honk = function (S) {
    var c = S.c, W = S.W, H = S.H, P = { x: W * 0.15, y: H * 0.82, carry: null }, nest = { x: W * 0.14, y: H * 0.86 }, lives = 3, time = 90, items = [], honkT = 0, said = '', saidT = 0;
    var AT = HONK_AT[S.scene] || HONK_AT.beach, LOOT = AT.loot, lvl = 1, goal = function () { return lvl * 40; };
    function person() { return { x: rnd(W * 0.3, W * 0.9), y: rnd(H * 0.15, H * 0.7), tx: 0, ty: 0, item: pick(LOOT), mad: 0, f: pick(['🧍', '🧍‍♀️', '🧍‍♂️', '🚶', '🚶‍♀️', '🚶‍♂️']), wait: 0 }; }
    var folk = [0, 1, 2, 3].map(person);
    function retarget(f) { f.tx = rnd(W * 0.25, W * 0.92); f.ty = rnd(H * 0.12, H * 0.75); }
    folk.forEach(retarget);
    return {
      press: function (k) {
        if (k !== 'honk') return; honkT = 0.35; sfx('honk'); said = pick(['HONK!', 'HONK HONK!', 'HOOONK!']); saidT = 0.8;
        folk.forEach(function (f) { if (Math.hypot(f.x - P.x, f.y - P.y) < 70) { if (f.item) { items.push({ x: f.x + rnd(-20, 20), y: f.y + 24, k: f.item }); f.item = null; S.add(2); setTimeout(function () { sfx('drop'); }, 350); } f.mad = 4; } });
      },
      step: function (dt) {
        var k = S.keys, sp = P.carry ? 120 : 150;
        var j = S.stick && Math.hypot(S.stick.x, S.stick.y) > DZ ? S.stick : null, mx = j ? j.x : (k.right ? 1 : 0) - (k.left ? 1 : 0), my = j ? j.y : (k.down ? 1 : 0) - (k.up ? 1 : 0);
        P.x = clamp(P.x + mx * sp * dt, 16, W - 16); P.y = clamp(P.y + my * sp * dt, S.top + 16, H - 16);
        time -= dt; honkT -= dt; saidT -= dt;
        if (!P.carry) for (var i = items.length - 1; i >= 0; i--) if (Math.hypot(items[i].x - P.x, items[i].y - P.y) < 26) { P.carry = items[i].k; items.splice(i, 1); break; }
        if (P.carry && Math.hypot(nest.x - P.x, nest.y - P.y) < 48) { S.add(10); sfx('loot'); P.carry = null; said = 'Mine now! 😈'; saidT = 1; }
        folk.forEach(function (f) {
          var tx = f.tx, ty = f.ty, v = 40 + (lvl - 1) * 6;
          if (f.mad > 0) { f.mad -= dt; tx = P.x; ty = P.y; v = (95 + (lvl - 1) * 10) * S.diff; }
          var dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
          if (d > 4) { f.x += dx / d * v * dt; f.y += dy / d * v * dt; } else if (f.mad <= 0) { f.wait -= dt; if (f.wait <= 0) { retarget(f); f.wait = rnd(0.5, 2); } }
          if (!f.item && f.mad <= 0 && Math.random() < dt * 0.05) f.item = pick(LOOT);
          if (f.mad > 0 && d < 22) { f.mad = 0; retarget(f); lives--; if (P.carry) { items.push({ x: P.x, y: P.y + 10, k: P.carry }); P.carry = null; } said = 'Shoo! 😠'; saidT = 1; sfx('grumble'); P.x = nest.x + 20; P.y = nest.y - 20; }
        });
        if (lives <= 0) return S.end('They chased you off! 😠');
        if (time <= 0) {
          if (S.score < goal()) return S.end('Time’s up! Level ' + lvl + ' · what a menace 😈');
          lvl++; time = 75; var nf = person(); retarget(nf); folk.push(nf); said = 'Level ' + lvl + '! 🎉'; saidT = 1.6; S.add(10); sfx('level');   // next level: one more tourist, a bit faster
        }
      },
      draw: function () {
        c.fillStyle = AT.ground; c.fillRect(0, 0, W, H);
        c.fillStyle = AT.top; c.fillRect(0, 0, W, H * 0.08);
        c.fillStyle = 'rgba(255,255,255,.5)'; for (var i = 0; i < W; i += 40) { c.beginPath(); c.arc(i + 20, H * 0.08, 12, 0, Math.PI); c.fill(); }
        if (AT.pond) { c.fillStyle = '#7CC7DB'; c.beginPath(); c.ellipse(W * 0.32, H * 0.3, W * 0.14, H * 0.06, 0, 0, 7); c.fill(); }
        if (AT.road) { c.fillStyle = '#8A8F96'; c.fillRect(0, H * 0.6, W, H * 0.07); c.fillStyle = '#fff'; for (var j = 0; j < W; j += 36) c.fillRect(j, H * 0.632, 18, 3); }
        AT.deco.forEach(function (d) { emoji(c, d[0], W * d[1], H * d[2], d[3]); });
        c.fillStyle = '#E8F4FA'; c.beginPath(); c.arc(nest.x, nest.y, 40, Math.PI, 0); c.fill(); c.fillStyle = '#9CC9E2'; c.fillRect(nest.x - 10, nest.y - 18, 20, 18); txt(c, 'Igloo', nest.x, nest.y + 13, 12, '#13507A');
        items.forEach(function (it) { emoji(c, it.k, it.x, it.y, 22); });
        folk.forEach(function (f) { emoji(c, f.f, f.x, f.y, 36); if (f.item) emoji(c, f.item, f.x + 16, f.y - 8, 18); if (f.mad > 0) emoji(c, '💢', f.x + 14, f.y - 24, 16); });
        drawPen(c, P.x, P.y, 52, honkT > 0 ? -0.15 : 0); if (P.carry) emoji(c, P.carry, P.x + 18, P.y - 18, 20);
        if (honkT > 0) { c.strokeStyle = 'rgba(19,50,74,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(P.x, P.y, 70 * (1 - honkT / 0.35) + 10, 0, 7); c.stroke(); }
        if (saidT > 0) txt(c, said, P.x, P.y - 40, 16, '#13324A');
        txt(c, '❤️'.repeat(Math.max(0, lives)) + '   ⏱ ' + Math.ceil(time) + '   Lv ' + lvl + ' · goal ' + goal(), 8, S.top + 14, 14, '#13324A', 'left');
      }
    };
  };

  /* ---------- Professor Pen's quiz: choose, fill in the blank, finish the sentence ---------- */
  // ph: 1 = only on Philippine trips
  var QB = [
    { t: 'mc', q: 'How many islands does the Philippines have?', o: ['About 7,641', 'About 700', 'About 70,000'], a: 0, ph: 1 },
    { t: 'mc', q: 'Which is the biggest fish in the world?', o: ['Whale shark', 'Blue whale', 'Great white shark'], a: 0, why: 'Blue whales are bigger, but they’re mammals!' },
    { t: 'fill', q: 'In Bisaya, “thank you” is ____.', a: ['salamat'], hint: 'Starts with S', ph: 1 },
    { t: 'fill', q: 'The Philippine money is called the ____.', a: ['peso', 'piso'], hint: '₱', ph: 1 },
    { t: 'fill', q: 'A group of penguins on land is called a ____.', a: ['waddle', 'colony', 'rookery'], hint: 'How we walk 🐧' },
    { t: 'fill', q: 'Cebu’s famous whole roast pig is called ____.', a: ['lechon', 'litson'], hint: 'L…', ph: 1 },
    { t: 'fill', q: 'Penguins can’t fly, but they can ____ really fast.', a: ['swim'], hint: '🌊' },
    { t: 'complete', q: '“Lami kaayo!” means “So ____!”', o: ['delicious', 'expensive', 'hot'], a: 0, ph: 1 },
    { t: 'complete', q: 'Magellan’s Cross in Cebu was planted in the year ____.', o: ['1521', '1898', '1946'], a: 0, ph: 1 },
    { t: 'complete', q: 'In Oslob you can swim with ____.', o: ['whale sharks', 'dolphins', 'manatees'], a: 0, ph: 1 },
    { t: 'complete', q: 'Emperor penguins can dive deeper than ____ metres.', o: ['500', '50', '5'], a: 0 },
    { t: 'mc', q: 'What does “Pila ni?” mean?', o: ['How much is this?', 'Where is this?', 'What time is it?'], a: 0, ph: 1 },
    { t: 'mc', q: 'Which fruit is the national fruit of the Philippines?', o: ['Mango', 'Banana', 'Durian'], a: 0, ph: 1 },
    { t: 'fill', q: 'To tell a jeepney driver to stop, say “____ lang!”', a: ['para'], hint: 'P…', ph: 1 },
    { t: 'complete', q: 'Puso is rice cooked in woven ____ leaves.', o: ['palm', 'banana', 'mango'], a: 0, ph: 1 },
    { t: 'mc', q: 'Where are the Chocolate Hills?', o: ['Bohol', 'Cebu', 'Palawan'], a: 0, ph: 1 },
    { t: 'fill', q: 'Good morning in Bisaya is “Maayong ____”.', a: ['buntag'], hint: 'B…', ph: 1 },
    { t: 'complete', q: 'Penguins drink seawater because a special gland removes the ____.', o: ['salt', 'sand', 'fish'], a: 0 }
  ];
  var PROF = '<g transform="translate(60 22)"><rect x="-22" y="-8" width="44" height="6" rx="2" fill="#1F2A36"/><path d="M-14 -2 L14 -2 L10 6 L-10 6 Z" fill="#1F2A36"/><path d="M18 -5 L24 10" stroke="#F2A33A" stroke-width="2.5"/><circle cx="24" cy="12" r="3" fill="#F2A33A"/></g><g fill="none" stroke="#1F2A36" stroke-width="2.4"><circle cx="51" cy="49" r="8"/><circle cx="69" cy="49" r="8"/><path d="M59 49 L61 49"/></g>';
  /* ---------- Learn with penpen: bite-size Bisaya & Tagalog lessons ---------- */
  var LESSONS = {
    'Bisaya (Cebuano)': [
      { t: 'Hello & thanks', e: '👋', w: [['Good morning', 'Maayong buntag'], ['Thank you', 'Salamat'], ['Thank you very much', 'Daghang salamat'], ['Yes', 'Oo'], ['No', 'Dili'], ['You’re welcome', 'Walay sapayan']] },
      { t: 'Food', e: '🍚', w: [['Delicious!', 'Lami kaayo!'], ['Water', 'Tubig'], ['Rice', 'Kan-on'], ['I’m hungry', 'Gigutom ko'], ['Fish', 'Isda'], ['The bill, please', 'Palihug, ang bill']] },
      { t: 'Getting around', e: '🛺', w: [['Stop here (in a jeepney)', 'Para lang!'], ['Where is…?', 'Asa ang…?'], ['Left', 'Wala'], ['Right', 'Tuo'], ['Near', 'Duol'], ['Far', 'Layo']] },
      { t: 'Shopping', e: '🛍️', w: [['How much is this?', 'Pila ni?'], ['Expensive', 'Mahal'], ['Cheap', 'Barato'], ['Can you lower the price?', 'Pwede menos?'], ['One', 'Usa'], ['Two', 'Duha']] }
    ],
    'Tagalog': [
      { t: 'Hello & thanks', e: '👋', w: [['Good morning', 'Magandang umaga'], ['Thank you', 'Salamat'], ['Thank you very much', 'Maraming salamat'], ['Yes', 'Oo'], ['No', 'Hindi'], ['You’re welcome', 'Walang anuman']] },
      { t: 'Food', e: '🍚', w: [['Delicious!', 'Ang sarap!'], ['Water', 'Tubig'], ['Rice', 'Kanin'], ['I’m hungry', 'Gutom na ako'], ['Fish', 'Isda'], ['The bill, please', 'Bill po, please']] },
      { t: 'Getting around', e: '🛺', w: [['Stop here (in a jeepney)', 'Para po!'], ['Where is…?', 'Saan ang…?'], ['Left', 'Kaliwa'], ['Right', 'Kanan'], ['Near', 'Malapit'], ['Far', 'Malayo']] },
      { t: 'Shopping', e: '🛍️', w: [['How much is this?', 'Magkano ito?'], ['Expensive', 'Mahal'], ['Cheap', 'Mura'], ['Can you lower the price?', 'Pwede pong tawad?'], ['One', 'Isa'], ['Two', 'Dalawa']] }
    ]
  };
  function lget() { try { return JSON.parse(localStorage.getItem('pp_learn') || '{}'); } catch (e) { return {}; } }
  function lset(o) { try { localStorage.setItem('pp_learn', JSON.stringify(o)); } catch (e) {} }
  function sayIt(t) { try { if (!window.speechSynthesis) return; speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = 'fil-PH'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) {} }
  function learn(host, award) {
    stop();
    var L = lget(); L.lang = L.lang || 'Bisaya (Cebuano)'; L.done = L.done || {};
    function home(msg) {
      var ls = LESSONS[L.lang], today = new Date().toDateString();
      host.innerHTML = '<div class="lrn"><div class="lrh"><b>📚 Learn with penpen</b><small>' + (L.streak > 1 ? '🐧 ' + L.streak + ' days in a row' : 'Learn a few words a day') + '</small></div>' +
        (msg ? '<p class="lrmsg">' + msg + '</p>' : '') +
        '<div class="lrlang">' + Object.keys(LESSONS).map(function (k) { return '<button type="button" data-ll="' + k + '" class="' + (k === L.lang ? 'on' : '') + '">' + k.replace(/ \(.*\)/, '') + '</button>'; }).join('') + '</div>' +
        '<div class="lrlist">' + ls.map(function (l, i) { var st = L.done[L.lang + i] || 0; return '<button type="button" data-li="' + i + '"><span>' + l.e + '</span><b>' + l.t + '</b><small>' + (st ? '⭐'.repeat(st) + '☆'.repeat(3 - st) : l.w.length + ' words') + '</small></button>'; }).join('') + '</div>' +
        '<p class="lrtip">Tap 🔊 to hear each word. Works offline. ' + (L.last === today ? 'See you tomorrow for more words!' : '') + '</p></div>';
      host.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.ll) { L.lang = b.dataset.ll; lset(L); return home(); }
        if (b.dataset.li != null) return lesson(+b.dataset.li);
      };
    }
    function lesson(li) {
      var ls = LESSONS[L.lang][li], words = ls.w.slice(), step = 0, right = 0, mode = 'learn';
      var qs = words.map(function (w, i) { return i; }).sort(function () { return Math.random() - 0.5; }).slice(0, 4);
      function card() {
        if (mode === 'learn') {
          if (step >= words.length) { mode = 'quiz'; step = 0; return card(); }
          var w = words[step];
          host.innerHTML = '<div class="lrn"><div class="lrh"><button type="button" class="lrx" data-x="1">✕</button><b>' + ls.e + ' ' + ls.t + '</b><small>Learn ' + (step + 1) + ' / ' + words.length + '</small></div><div class="lrbar"><i style="width:' + Math.round(100 * step / (words.length + qs.length)) + '%"></i></div>' +
            '<div class="lrcard"><small>' + w[0] + '</small><b>' + w[1] + '</b><button type="button" data-say="' + w[1] + '">🔊 Hear it</button></div><button type="button" class="lrgo" data-next="1">Got it →</button></div>';
          sayIt(w[1]); return;
        }
        if (step >= qs.length) return finish();
        var q = words[qs[step]], opts = [qs[step]];
        while (opts.length < 3) { var r = Math.floor(Math.random() * words.length); if (opts.indexOf(r) < 0) opts.push(r); }
        opts.sort(function () { return Math.random() - 0.5; });
        host.innerHTML = '<div class="lrn"><div class="lrh"><button type="button" class="lrx" data-x="1">✕</button><b>' + ls.e + ' ' + ls.t + '</b><small>Quiz ' + (step + 1) + ' / ' + qs.length + '</small></div><div class="lrbar"><i style="width:' + Math.round(100 * (words.length + step) / (words.length + qs.length)) + '%"></i></div>' +
          '<div class="lrcard"><small>How do you say…</small><b>' + q[0] + '</b></div><div class="lropts">' + opts.map(function (o) { return '<button type="button" data-o="' + o + '">' + words[o][1] + '</button>'; }).join('') + '</div></div>';
      }
      function finish() {
        var stars = right >= qs.length ? 3 : right >= qs.length - 1 ? 2 : 1, key = L.lang + li, today = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
        L.done[key] = Math.max(L.done[key] || 0, stars);
        if (L.last !== today) { L.streak = L.last === y ? (L.streak || 0) + 1 : 1; L.last = today; }
        lset(L); var coins = right * 2 + (stars === 3 ? 4 : 0); if (award) award(coins);
        home('🎉 ' + right + ' / ' + qs.length + ' right · ' + '⭐'.repeat(stars) + ' · +' + coins + ' coins');
      }
      host.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.x) return home();
        if (b.dataset.say) return sayIt(b.dataset.say);
        if (b.dataset.next) { step++; return card(); }
        if (b.dataset.o != null) {
          var ok = +b.dataset.o === qs[step]; if (ok) right++;
          [].slice.call(host.querySelectorAll('[data-o]')).forEach(function (x) { x.disabled = true; if (+x.dataset.o === qs[step]) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
          sayIt(words[qs[step]][1]);
          setTimeout(function () { if (host.isConnected) { step++; card(); } }, ok ? 700 : 1400);
        }
      };
      card();
    }
    home();
  }
  function quiz(host, award) {
    stop(); music('quiz');
    var round = [], n = 0, right = 0, used = {};
    var ph = window.ppPlace().cc === 'PH', qb = QB.filter(function (q) { return ph || !q.ph; });
    while (round.length < 3) { var i = Math.floor(Math.random() * qb.length); if (!used[i]) { used[i] = 1; round.push(qb[i]); } }
    var inner = gamePen();
    function prof(mood) { return '<div class="prof' + (mood ? ' ' + mood : '') + '"><svg viewBox="-7 -14 134 134" width="110" height="110" aria-hidden="true">' + inner + PROF + '</svg></div>'; }
    function show(msg, mood) {
      if (n >= round.length) {
        host.innerHTML = '<div class="qz">' + prof('yay') + '<div class="qb"><small>Professor Pen says</small><b>' + (right === 3 ? 'Perfect score! You’re a genius 🎓' : right ? 'Well done! ' + right + ' out of 3 🎉' : 'Practice makes perfect! 📚') + '</b><p>+' + right * 3 + ' coins</p></div><button type="button" class="gstart sm" data-qa="again"><span>↻</span>Another round</button></div>';
        if (award) award(right * 3);
        return;
      }
      var q = round[n];
      var body = q.t === 'fill' ? '<div class="qfill"><input type="text" autocomplete="off" autocapitalize="off" placeholder="Type your answer"><button type="button" class="qgo" data-qa="go">Check</button></div><button type="button" class="qhint" data-qa="hint">Hint</button><p class="qerr" hidden>Type an answer first</p>'
        : '<div class="qo">' + q.o.map(function (o, i) { return { o: o, i: i }; }).sort(function () { return Math.random() - 0.5; }).map(function (x) { return '<button type="button" data-qi="' + x.i + '">' + x.o + '</button>'; }).join('') + '</div>';
      host.innerHTML = '<div class="qz">' + prof(mood) + '<div class="qb"><small>Professor Pen · Question ' + (n + 1) + ' of 3 · ' + { mc: 'Pick one', fill: 'Fill in the blank', complete: 'Finish the sentence' }[q.t] + '</small><b>' + q.q.replace('____', '<u>&nbsp;?&nbsp;</u>') + '</b>' + (msg ? '<p class="qmsg">' + msg + '</p>' : '') + '</div>' + body + '</div>';
      var inp = $('input', host); if (inp) { inp.focus(); inp.onkeydown = function (e) { if (e.key === 'Enter') check(); }; inp.oninput = function () { var er = $('.qerr', host); if (er) er.hidden = true; }; }
    }
    function next(ok, q, given) {
      if (ok) right++; sfx(ok ? 'right' : 'wrong');
      var ans = q.t === 'fill' ? q.a[0] : q.o[q.a];
      var msg = ok ? pick(['Correct! 🎉', 'Brilliant! 🧠', 'Yes! Gold star ⭐']) : 'Not quite — it’s “' + ans + '”.' + (q.why ? ' ' + q.why : '');
      n++; setTimeout(function () { if (host.isConnected) show(msg, ok ? 'yay' : 'hmm'); }, 50);
    }
    function check() {
      var q = round[n], v = ($('input', host).value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      if (!v) { $('.qerr', host).hidden = false; return; }
      next(q.a.some(function (a) { return a.replace(/[^a-z]/g, '') === v; }), q);
    }
    host.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.qa === 'again') return quiz(host, award);
      if (b.dataset.qa === 'go') return check();
      if (b.dataset.qa === 'hint') { b.textContent = round[n].hint || '…'; return; }
      if (b.dataset.qi != null) { var q = round[n], ok = +b.dataset.qi === q.a; b.classList.add(ok ? 'yes' : 'no'); setTimeout(function () { next(ok, q); }, 500); }
    };
    show();
  }

  /* ---------- Sing with penpen: original little songs, played on the phone (no signal needed) ---------- */
  var SONGS = [
    { t: 'The Salamat Song', note: 'Learn “thank you” and “good morning” in Bisaya', bpm: 120, L: [
      ['Sa', 'G4', 1], ['la', 'A4', 1], ['mat,', 'B4', 2], ['sa', 'G4', 1], ['la', 'A4', 1], ['mat,', 'B4', 2], ['thank', 'C5', 1], ['you', 'B4', 1], ['ve', 'A4', 1], ['ry', 'G4', 1], ['much!', 'A4', 4], ['/'],
      ['Maa', 'G4', 1], ['yong', 'A4', 1], ['bun', 'B4', 1], ['tag,', 'D5', 2], ['maa', 'C5', 1], ['yong', 'B4', 1], ['bun', 'A4', 1], ['tag,', 'B4', 2], ['good', 'A4', 1], ['mor', 'G4', 1], ['ning', 'A4', 1], ['to', 'B4', 1], ['you!', 'G4', 4]] },
    { t: 'Waddle Waddle Road Trip', note: 'A silly song for the road', bpm: 132, L: [
      ['Wad', 'C4', 1], ['dle', 'E4', 1], ['wad', 'G4', 1], ['dle', 'E4', 1], ['down', 'F4', 1], ['the', 'E4', 1], ['road,', 'D4', 2], ['/'],
      ['pen', 'C4', 1], ['pen’s', 'E4', 1], ['got', 'G4', 1], ['a', 'E4', 1], ['hea', 'F4', 1], ['vy', 'D4', 1], ['load,', 'C4', 2], ['/'],
      ['snacks', 'E4', 1], ['and', 'E4', 1], ['sun', 'F4', 1], ['screen,', 'G4', 2], ['maps', 'A4', 1], ['and', 'G4', 1], ['more,', 'F4', 2], ['/'],
      ['let’s', 'G4', 1], ['go', 'A4', 1], ['see', 'B4', 1], ['the', 'A4', 1], ['san', 'G4', 1], ['dy', 'D4', 1], ['shore!', 'C4', 4]] },
    { t: 'Pila Ni? (Market Song)', note: 'Phrases for shopping at the market', bpm: 116, L: [
      ['Pi', 'E4', 1], ['la', 'G4', 1], ['ni?', 'A4', 2], ['How', 'G4', 1], ['much', 'E4', 1], ['is', 'D4', 1], ['this?', 'E4', 3], ['/'],
      ['Tag', 'E4', 1], ['pi', 'G4', 1], ['la?', 'A4', 2], ['How', 'G4', 1], ['much', 'E4', 1], ['for', 'D4', 1], ['each?', 'C4', 3], ['/'],
      ['La', 'A4', 1], ['mi', 'C5', 1], ['kaa', 'B4', 1], ['yo!', 'A4', 2], ['So', 'G4', 1], ['yum', 'A4', 1], ['my,', 'G4', 1], ['yum!', 'E4', 3], ['/'],
      ['Sa', 'D4', 1], ['la', 'E4', 1], ['mat', 'G4', 1], ['po,', 'A4', 2], ['see', 'G4', 1], ['you', 'E4', 1], ['soon!', 'C4', 4]] }
  ];
  var FREQ = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33 };
  var song = null;
  function sing(host) {
    stop();
    var inner = gamePen();
    host.innerHTML = '<div class="sg"><div class="sgpen"><svg viewBox="-7 -14 134 134" width="130" height="130" aria-hidden="true">' + inner + '</svg><span class="sgm">🎤</span></div>' +
      '<div class="sglist">' + SONGS.map(function (s, i) { return '<button type="button" data-s="' + i + '"><b>▶ ' + s.t + '</b><small>' + s.note + '</small></button>'; }).join('') + '</div>' +
      '<div class="sglyr" hidden></div><p class="tip">penpen’s own songs, played on your phone — they work with no signal. Sing along! 🎶 More songs for every country you visit are coming.</p></div>';
    host.onclick = function (e) { var b = e.target.closest('[data-s]'); if (b) play(+b.dataset.s); var s = e.target.closest('[data-stop]'); if (s && song) song.toggle(s); };
    function play(i) {
      if (song) song.stop();
      var S2 = SONGS[i], ac; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      var beat = 60 / S2.bpm, t0 = ac.currentTime + 0.4, t = t0, lines = [[]], words = [];
      S2.L.forEach(function (w) { if (w[0] === '/') { lines.push([]); return; } var o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = FREQ[w[1]]; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + w[2] * beat * 0.95); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + w[2] * beat); var it = { w: w[0], at: t - t0, line: lines.length - 1 }; lines[lines.length - 1].push(it); words.push(it); t += w[2] * beat; });
      var lyr = $('.sglyr', host); lyr.hidden = false;
      lyr.innerHTML = '<b>' + S2.t + '</b>' + lines.map(function (l, li) { return '<p data-l="' + li + '">' + l.map(function (x, k) { return '<span data-w="' + words.indexOf(x) + '">' + x.w + '</span>'; }).join(' ') + '</p>'; }).join('') + '<button type="button" data-stop="1" class="sgpp">⏸ Pause</button>';
      var pen = $('.sgpen', host); pen.classList.add('on');
      var raf, start = performance.now() + 400, pausedAt = 0;
      (function hl() {
        if (pausedAt) { raf = requestAnimationFrame(hl); return; }
        var el = (performance.now() - start) / 1000, k = -1; words.forEach(function (w, j) { if (el >= w.at) k = j; });
        [].slice.call(lyr.querySelectorAll('span')).forEach(function (s) { var j = +s.dataset.w; s.className = j < k ? 'sung' : j === k ? 'now' : ''; });
        if (el < t - t0 + 0.3) raf = requestAnimationFrame(hl); else { pen.classList.remove('on'); var pb = $('.sgpp', lyr); if (pb) { pb.textContent = '↻ Play again'; pb.dataset.again = i; } }
      })();
      song = { toggle: function (btn) {
        if (btn.dataset.again != null) return play(+btn.dataset.again);
        if (!pausedAt) { pausedAt = performance.now(); ac.suspend(); btn.textContent = '▶ Play'; pen.classList.remove('on'); }
        else { start += performance.now() - pausedAt; pausedAt = 0; ac.resume(); btn.textContent = '⏸ Pause'; pen.classList.add('on'); }
      }, stop: function () { cancelAnimationFrame(raf); try { ac.close(); } catch (e) {} pen.classList.remove('on'); song = null; } };
    }
  }

  // full screen: .gx covers the phone; the stage takes all the height the control band leaves (the band is a fixed height, so the picture never resizes mid-game)
  var css = '.gx{font-family:' + F + ';position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;background:#CFE2EE;color:#13324A}' +
    '.gx .gtop{position:absolute;top:calc(8px + env(safe-area-inset-top));left:8px;right:8px;z-index:3;display:flex;align-items:center;gap:8px;pointer-events:none}.gx .gtop>*{pointer-events:auto}' +
    '.gx .gtop .ghelp{margin-left:auto}.gx .gs{font-weight:900;font-size:16px;min-width:44px;text-align:center;background:rgba(255,255,255,.9);color:#13324A;border-radius:99px;padding:6px 12px}' +
    '.gx .gback{width:40px;height:40px;flex:none;border:0;border-radius:50%;background:rgba(255,255,255,.9);color:#13324A;font:900 24px/1 ' + F + ';padding:0 0 3px;cursor:pointer}' +
    '.gx .gstage{position:relative;flex:1;min-height:0;overflow:hidden;display:flex;justify-content:center;background:#BFE0F2}.gx canvas{display:block;touch-action:none}' +
    '.gx .gover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(246,241,232,.55);backdrop-filter:blur(2px);padding:20px;text-align:center}.gx .gover p{margin:0;font-weight:800;font-size:15px;color:#13324A;max-width:300px;background:rgba(255,255,255,.85);border-radius:16px;padding:10px 12px}' +
    '.gstart{width:130px;height:130px;border-radius:50%;border:0;background:#237566;color:#fff;font:900 18px ' + F + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 0 0 10px rgba(35,117,102,.18);animation:gpulse 1.6s ease-in-out infinite;cursor:pointer}.gstart span{font-size:38px;line-height:1}' +
    '.gstart.sm{width:110px;height:110px;margin:16px auto 0;font-size:15px}@keyframes gpulse{50%{box-shadow:0 0 0 18px rgba(35,117,102,.08)}}' +
    '.gx .gclose{border:0;background:rgba(255,255,255,.92);color:#13324A;border-radius:99px;padding:10px 18px;font:900 15px ' + F + ';cursor:pointer}.gx .gres{background:#fff;border-radius:18px;padding:12px 16px}.gx .gres b{display:block;font-size:20px;font-weight:900;color:#13324A}.gx .gres span{font-weight:800;color:#3B5568}' +
    '.gcd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 110px ' + F + ';color:#fff;text-shadow:0 6px 24px rgba(19,50,74,.45);pointer-events:none}.gcd.pop{animation:gcd .7s ease-out}.gcd.go{font-size:80px;color:#F2A33A}@keyframes gcd{from{transform:scale(1.8);opacity:0}30%{opacity:1}to{transform:scale(1)}}' +
    '.gctl{flex:none;box-sizing:border-box;height:calc(150px + env(safe-area-inset-bottom));padding:0 12px env(safe-area-inset-bottom);display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}.gctl button{width:74px;height:74px;border-radius:50%;border:0;background:#13324A;color:#fff;font:900 26px ' + F + ';touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}.gctl button.on{background:#237566;transform:scale(.94)}' +
    '.gctl.lr button{width:120px;border-radius:40px}.gctl.stk{align-items:center;gap:22px}.gjoy{width:128px;height:128px;border-radius:50%;background:var(--chip,#E3EDF3);box-shadow:inset 0 0 0 2px rgba(19,50,74,.18);display:flex;align-items:center;justify-content:center;touch-action:none;cursor:grab}.gjoy i{width:56px;height:56px;border-radius:50%;background:#13324A;box-shadow:0 4px 10px rgba(19,50,74,.3);pointer-events:none}.gjoy.on i{background:#237566}.gctl button[data-k=honk]{height:72px!important}.gctl,.gctl button,.gx{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.gctl button[data-k="honk"]{width:96px;border-radius:40px;background:#F2A33A;color:#13324A;font-size:18px}' +
    '.qz{font-family:' + F + ';text-align:center}.qz .prof{display:inline-block;animation:pphop 2s ease-in-out infinite}.qz .prof.yay{animation:qyay .6s ease-out 2}.qz .prof.hmm{animation:qhmm .5s ease-in-out 2}@keyframes qyay{50%{transform:translateY(-14px) rotate(-5deg)}}@keyframes qhmm{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}' +
    '.qz .qb{background:var(--card,#fff);border-radius:22px;padding:14px 16px;margin:6px 0 12px;position:relative}.qz .qb:before{content:"";position:absolute;top:-9px;left:50%;margin-left:-9px;border:9px solid transparent;border-top:0;border-bottom-color:var(--card,#fff)}' +
    '.qz .qb small{display:block;font-weight:800;color:var(--muted,#6B7C8A);font-size:12.5px}.qz .qb b{display:block;font-size:19px;font-weight:900;margin-top:4px;line-height:1.3}.qz .qb u{text-decoration:none;border-bottom:3px solid #237566;padding:0 6px}.qz .qmsg{margin:8px 0 0;font-weight:800;color:#237566}.qz .qb p{margin:6px 0 0;font-weight:800}' +
    '.qz .qo{display:flex;flex-direction:column;gap:8px}.qz .qo button{min-height:52px;border:1.5px solid var(--line,#ddd);background:var(--card,#fff);color:inherit;border-radius:16px;font:800 16px ' + F + ';cursor:pointer}.qz .qo button.yes{background:#2E9E6B;color:#fff;border-color:#2E9E6B}.qz .qo button.no{background:#D9534F;color:#fff;border-color:#D9534F}' +
    '.qz .qfill{display:flex;gap:8px}.qz .qfill input{flex:1;min-width:0;font:800 18px ' + F + ';padding:12px 14px;border-radius:16px;border:1.5px solid #237566;background:var(--card,#fff);color:inherit}.qz .qgo{border:0;border-radius:16px;background:#237566;color:#fff;font:900 16px ' + F + ';padding:0 18px}' +
    '.qz .qhint{margin-top:10px;border:0;background:none;color:var(--muted,#6B7C8A);font:800 14px ' + F + ';text-decoration:underline}.qz .qerr{color:#D9534F;font-weight:800;font-size:13px;margin:6px 0 0}' +
    '.sg{font-family:' + F + ';text-align:center}.sg .sgpen{position:relative;display:inline-block}.sg .sgpen .sgm{position:absolute;right:-18px;bottom:8px;font-size:28px;background:none!important;width:auto!important;height:auto!important}.sg .sgpen.on svg{animation:qyay .5s ease-in-out infinite}' +
    '.sg .sglist{display:flex;flex-direction:column;gap:8px;margin:8px 0}.sg .sglist button{border:0;background:var(--card,#fff);color:inherit;border-radius:18px;padding:12px 14px;text-align:left;font:inherit;cursor:pointer}.sg .sglist b{display:block;font-weight:900}.sg .sglist small{color:var(--muted,#6B7C8A);font-weight:700}' +
    '.sg .sglyr{background:#13324A;color:#9FB4C4;border-radius:22px;padding:14px;margin:10px 0}.sg .sglyr b{display:block;color:#fff;margin-bottom:6px}.sg .sglyr p{margin:6px 0;font:900 20px/1.4 ' + F + '}.sg .sglyr span.now{color:#F2A33A}.sg .sglyr span.sung{color:#fff}.sg .sglyr button{margin-top:10px;border:0;border-radius:99px;padding:10px 22px;font:900 15px ' + F + ';background:#F2A33A;color:#13324A;cursor:pointer}' +
    '.lrn{font-family:' + F + '}.lrh{display:flex;align-items:center;gap:8px;margin-bottom:8px}.lrh b{font-size:18px;font-weight:900;flex:1}.lrh small{color:var(--muted,#7A8B99);font-weight:800}.lrx{border:0;background:none;font-size:18px;padding:4px}.lrmsg{background:var(--accentSoft,#E3F3EF);border-radius:14px;padding:10px 12px;font-weight:800;margin:6px 0}.lrlang{display:flex;gap:8px;margin:6px 0 10px}.lrlang button{flex:1;border:1.5px solid #237566;background:none;color:#237566;border-radius:99px;padding:8px;font:800 14px ' + F + '}.lrlang button.on{background:#237566;color:#fff}.lrlist{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lrlist button{border:0;background:var(--card,#fff);color:inherit;border-radius:20px;padding:14px 8px;font:inherit;min-height:110px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.lrlist span{display:block;font-size:34px}.lrlist b{display:block;font-weight:900;margin-top:4px}.lrlist small{color:var(--muted,#7A8B99);font-weight:700}.lrtip{font-size:13px;color:var(--muted,#7A8B99);text-align:center;margin-top:10px}.lrbar{height:8px;border-radius:99px;background:var(--line,#E5E9EC);overflow:hidden;margin-bottom:14px}.lrbar i{display:block;height:100%;background:#F2A33A;border-radius:99px;transition:width .3s}.lrcard{background:var(--card,#fff);border-radius:24px;padding:24px 16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}.lrcard small{display:block;color:var(--muted,#7A8B99);font-weight:800;font-size:15px}.lrcard b{display:block;font-size:28px;font-weight:900;margin:8px 0 14px;color:#237566}.lrcard button{border:1.5px solid var(--line,#E5E9EC);background:none;border-radius:99px;padding:8px 14px;font:800 14px ' + F + ';color:inherit}.lrgo{display:block;width:100%;margin-top:14px;border:0;border-radius:18px;padding:15px;background:#237566;color:#fff;font:900 17px ' + F + '}.lropts{display:flex;flex-direction:column;gap:10px;margin-top:14px}.lropts button{border:1.5px solid var(--line,#E5E9EC);background:var(--card,#fff);color:inherit;border-radius:18px;padding:14px;font:800 17px ' + F + '}.lropts button.ok{background:#DFF3E4;border-color:#3FA55B}.lropts button.no{background:#FBE3E0;border-color:#D9534F}';
  css += '.gx .gopt{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.gx .gopt button{border:0;background:rgba(255,255,255,.88);color:#13324A;border-radius:99px;padding:8px 12px;min-height:36px;font:800 14px ' + F + ';cursor:pointer}.gx .gopt button[aria-pressed="true"]{background:#13324A;color:#fff}';
  css += '.gx .gsnd{width:40px;height:40px;flex:none;border-radius:50%;border:0;background:rgba(255,255,255,.9);font-size:17px;cursor:pointer}';
  css += '.gx .ghelp{width:40px;height:40px;flex:none;border-radius:50%;border:0;background:rgba(255,255,255,.9);color:#13324A;font:900 18px ' + F + ';cursor:pointer}' +
    '.gx .ghow{border:0;background:rgba(255,255,255,.88);color:#13324A;border-radius:99px;padding:8px 14px;min-height:36px;font:800 14px ' + F + ';text-decoration:underline;cursor:pointer}' +
    '.ghd{border:0;border-radius:22px;padding:18px 18px 14px;max-width:min(340px,calc(100vw - 32px));background:#fff;color:#13324A;font:700 15px/1.4 ' + F + ';box-shadow:0 10px 40px rgba(19,50,74,.3)}.ghd::backdrop{background:rgba(19,50,74,.45)}.ghd[open]{position:fixed;inset:0;margin:auto;height:fit-content;max-height:calc(100vh - 32px);overflow:auto;z-index:50}' +
    '.ghd b{display:block;font-size:19px;font-weight:900}.ghd p{margin:6px 0 4px;font-weight:800}.ghd ol{margin:6px 0 12px;padding-left:22px}.ghd li{margin:6px 0}.ghd li b{display:inline;font-size:inherit}.ghd form{margin:0}.ghd form button{width:100%;min-height:48px;border:0;border-radius:16px;background:#237566;color:#fff;font:900 16px ' + F + ';cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.ppGames = {
    list: GAMES,
    open: function (id, host, done) { return shell(host, id, done); }, quiz: quiz, learn: learn, sing: sing, stop: stop, _m: MAKERS
  };
})();
