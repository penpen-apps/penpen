/* penpen: bottom bar (Today · Itinerary · penpen · Expenses · More), scene colours,
   the expenses-by-category dashboard, trip role in the penguin editor, and fun moves when you tap yourself. */
(function () {
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  /* ---------- scene colours: the whole app follows the scene ---------- */
  var SC = {
    beach:    ['#F3EBDA', '#FFFCF5', '#1F8FA6', '#136F82', '#DDF1F4', '#EADFC8', '#E6D9BF', 'linear-gradient(135deg,#1F8FA6,#33A9B8 55%,#F4C25A 140%)',
               '#0A1F26', '#123039', '#11707F', '#5FD8E2', '#123F48', '#183A44', '#1F4A55'],
    mountain: ['#EEF1E6', '#FCFDF8', '#3D7A4B', '#2F6640', '#E1EEDF', '#DFE6D3', '#D9E0CC', 'linear-gradient(135deg,#3D7A4B,#5E9A5A 55%,#B9D27A 140%)',
               '#0F1A12', '#172A1C', '#2F6B3E', '#8FD6A0', '#1A3A22', '#1E3524', '#284530'],
    city:     ['#ECEEF3', '#FFFFFF', '#4A5BC2', '#3A49A3', '#E4E7F7', '#DDE1EC', '#D8DCE6', 'linear-gradient(135deg,#3A49A3,#5C6BD0 55%,#E39BB6 140%)',
               '#10131F', '#1A1F33', '#3F4FB0', '#A9B5FF', '#232A4A', '#22283F', '#2C3350'],
    desert:   ['#F7E9DA', '#FFFBF6', '#C8553D', '#A8432E', '#F8E1D9', '#EED8C4', '#EBD5BF', 'linear-gradient(135deg,#B8452F,#D86A45 55%,#F4A62A 140%)',
               '#1F140F', '#2D1E17', '#9E3F2C', '#FFB199', '#3E2419', '#36251C', '#45302A'],
    snow:     ['#EAF2F8', '#FFFFFF', '#2C6E8F', '#22597A', '#DCEBF4', '#DAE6EF', '#D3E1EC', 'linear-gradient(135deg,#22597A,#4D8DB0 55%,#BFE3F2 140%)',
               '#0D1A24', '#162836', '#2A6A8C', '#9CD3F0', '#183448', '#1B3142', '#23405A']
  };
  function sceneCss() {
    return Object.keys(SC).map(function (k) {
      var c = SC[k];
      return 'html.ppl[data-sc=' + k + ']{--bg:' + c[0] + ';--card:' + c[1] + ';--accent:' + c[2] + ';--accentText:' + c[3] + ';--accentSoft:' + c[4] + ';--chip:' + c[5] + ';--line:' + c[6] + ';--accent2:' + c[2] + '}' +
        'html.ppd[data-sc=' + k + ']{--bg:' + c[8] + ';--card:' + c[9] + ';--accent:' + c[10] + ';--accentText:' + c[11] + ';--accentSoft:' + c[12] + ';--chip:' + c[13] + ';--line:' + c[14] + ';--accent2:' + c[10] + '}' +
        'html[data-sc=' + k + '] #pp-story-hero{background:' + c[7] + '}' +
        'html[data-sc=' + k + '] body,html[data-sc=' + k + '] #v-app{background:var(--bg)}';
    }).join('');
  }
  function scene() {
    // follow the scene picture that's actually on Today (works for "Auto" too)
    var FILL = { '#DCEDE7': 'beach', '#E2ECF3': 'mountain', '#E6E3F0': 'city', '#F7E6C8': 'desert', '#E7F0F7': 'snow' };
    var r = document.querySelector('#pp-scene svg.pp-bg rect'), s = r && FILL[String(r.getAttribute('fill')).toUpperCase()];
    if (s) { try { localStorage.setItem('pp_sc_seen', s); } catch (e) {} }
    else { var p = get('pp_prefs') || {}; s = p.scene && p.scene !== 'auto' ? p.scene : localStorage.getItem('pp_sc_seen'); }
    if (!SC[s]) s = '';
    var h = document.documentElement;
    if ((h.getAttribute('data-sc') || '') !== s) { if (s) h.setAttribute('data-sc', s); else h.removeAttribute('data-sc'); }
    var meta = document.querySelector('meta[name="theme-color"]'), c = SC[s];
    if (meta && c) meta.setAttribute('content', h.classList.contains('ppd') ? c[8] : c[0]);
  }

  /* ---------- bottom bar ---------- */
  var MORE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var pass = false;
  var TABS = { Today: 'p-today', Plan: 'p-plan', Itinerary: 'p-plan', Money: 'p-money', Expenses: 'p-money', Crew: 'p-safety', More: 'p-safety' };
  window.ppGoTab = function (label) { var id = TABS[label]; if (!id) return false; if (id === 'p-safety') view('crew'); window.ppNavGo(id); return true; };
  // Crew, Safety and Bookings share one page in the app; each gets its own view
  var VIEWS = { crew: 'Crew', safety: 'Safety', book: 'Bookings' };
  function view(v) { document.body.setAttribute('data-ppv', v); var f = $('#p-safety .fred'); if (f && !f.children.length && f.textContent !== VIEWS[v]) f.textContent = VIEWS[v]; }
  window.ppNavGo = function (id) { var b = $('nav button[data-p="' + id + '"]'); if (!b) return; pass = true; try { b.click(); } finally { pass = false; } };
  function label(btn, txt) {
    if (!btn) return;
    var n = [].slice.call(btn.childNodes).filter(function (x) { return x.nodeType === 3 && x.textContent.trim(); })[0];
    if (n && n.textContent.trim() !== txt) n.textContent = txt;
  }
  function nav() {
    var plan = $('nav button[data-p="p-plan"]'), money = $('nav button[data-p="p-money"]'), crew = $('nav button[data-p="p-safety"]');
    label(plan, 'Itinerary'); label(money, 'Expenses');
    if (crew && !crew.dataset.more) {
      crew.dataset.more = '1'; crew.setAttribute('aria-label', 'More');
      var s = crew.querySelector('svg'); if (s) s.outerHTML = MORE_ICON;
    }
    label(crew, 'More');
    // "More" lights up while you're on one of its pages
    var onMore = ['p-safety', 'p-diary'].some(function (id) { var p = document.getElementById(id); return p && p.classList.contains('on'); });
    if (crew) crew.classList.toggle('on', onMore);
    var v = document.body.getAttribute('data-ppv') || 'crew'; if (!document.body.getAttribute('data-ppv')) view('crew'); else view(v);
    // translate, front and centre on penpen's chat page
    var ch = document.getElementById('p-chat'), tb = document.getElementById('pp-tr-chip'), dock = ch && ch.querySelector('.dock');
    if (tb && dock && !document.getElementById('pp-trbig')) { var big = document.createElement('button'); big.type = 'button'; big.id = 'pp-trbig'; big.innerHTML = '<span>🌐</span><b>Translate<small>Bisaya · Tagalog ⇄ English — hold & talk</small></b><i>›</i>'; big.onclick = function () { tb.click(); }; dock.insertBefore(big, dock.firstChild); }
    // page titles and back buttons follow the new names
    $$('#p-plan *').forEach(function (e) { if (!e.children.length && e.textContent.trim() === 'Plan') e.textContent = 'Itinerary'; });
    $$('#p-audit button, #p-rcpt button').forEach(function (b) { if (b.textContent.trim() === '‹ Money') b.textContent = '‹ Expenses'; });
  }
  function closeMenu() { var m = document.getElementById('pp-moremenu'); if (m) m.remove(); }
  function openMenu(btn) {
    if (document.getElementById('pp-moremenu')) return closeMenu();
    var m = document.createElement('div'); m.id = 'pp-moremenu'; m.setAttribute('role', 'menu');
    m.innerHTML = [
      ['crew', '👥', 'Crew', 'who’s on the trip · invite'],
      ['safety', '🛟', 'Safety', 'SOS · nearby help · emergency contacts'],
      ['book', '🏨', 'Bookings', 'hotels · tours · transport'],
      ['diary', '📔', 'Diary', 'memories, photos & notes'],
      ['set', '⚙️', 'Settings', 'guide · voice · scene · trip sheet']
    ].map(function (x) { return '<button type="button" role="menuitem" data-m="' + x[0] + '"><i>' + x[1] + '</i><span><b>' + x[2] + '</b><small>' + x[3] + '</small></span></button>'; }).join('');
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect();
    m.style.right = Math.max(8, innerWidth - r.right) + 'px';
    m.style.bottom = (innerHeight - r.top + 8) + 'px';
    m.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      closeMenu();
      var k = b.dataset.m;
      if (VIEWS[k]) { view(k); window.ppNavGo('p-safety'); var sc = $('#p-safety .scroll'); if (sc) sc.scrollTop = 0; }
      else if (k === 'diary') { var d = document.getElementById('to-diary'); if (d) d.click(); }
      else if (k === 'set' && window.ppOpenSettings) window.ppOpenSettings();
    };
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('nav button[data-p="p-safety"]');
    if (b && !pass) { e.stopPropagation(); e.preventDefault(); return openMenu(b); }
    if (b && pass && !document.body.getAttribute('data-ppv')) view('crew');
    if (!e.target.closest || !e.target.closest('#pp-moremenu')) closeMenu();
  }, true);

  /* ---------- Expenses: tap "Where the money went" for every category ---------- */
  var ICON = { accommodation: '🏨', activities: '🎟️', tours: '🎟️', food: '🍜', transport: '🚐', transportation: '🚐', shopping: '🛍️', fees: '🧾', other: '📦' };
  function icon(c) { var k = Object.keys(ICON).filter(function (x) { return c.toLowerCase().indexOf(x) >= 0; })[0]; return ICON[k] || '📦'; }
  function num(v) { var n = parseFloat(String(v || '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; }
  function peso(n) { return '₱' + Math.round(n).toLocaleString('en-US'); }
  function expenses() {
    var T = get('pp_trip'), E = T && T.tabs && T.tabs.Expenses; if (!E || !E.rows) return null;
    var H = E.rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var col = function (n) { return H.indexOf(n); };
    var c = { date: col('date'), what: col('what / place'), cat: col('category'), amt: col('amount'), cur: col('currency'), by: col('paid by'), st: col('status'), php: col('total php'), counts: col('counts') };
    return E.rows.slice(1).filter(function (r) { return r[c.what]; }).map(function (r) {
      var st = String(r[c.st] || '');
      return { date: r[c.date], what: r[c.what], cat: r[c.cat] || 'Other', by: r[c.by], amt: r[c.amt], cur: r[c.cur], php: num(r[c.php]),
        counts: num(r[c.counts]) > 0, later: /not paid/i.test(st), personal: /personal/i.test(st) };
    });
  }
  var openCat = null;
  function dash() {
    var card = document.getElementById('pp-cats'); if (!card) return;
    card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
    var open = document.body.classList.contains('pp-dash-on'), panel = document.getElementById('pp-dash');
    card.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) { if (panel) panel.remove(); return; }
    var X = expenses(); if (!X) return;
    var colors = {}; $$('.pp-cat-leg span', card).forEach(function (s) { var b = s.querySelector('b'), nm = s.textContent.replace(/₱.*/, '').trim(); if (b) colors[nm] = b.style.background; });
    var cats = {}, total = 0;
    X.forEach(function (x) {
      var k = x.cat; cats[k] = cats[k] || { spent: 0, later: 0, items: [] };
      if (x.counts) { cats[k].spent += x.php; total += x.php; }
      if (x.later) cats[k].later += x.cur === 'PHP' ? num(x.amt) : 0;
      cats[k].items.push(x);
    });
    var keys = Object.keys(cats).sort(function (a, b) { return cats[b].spent - cats[a].spent || cats[b].items.length - cats[a].items.length; });
    var h = keys.map(function (k) {
      var c = cats[k], pct = total ? Math.round(c.spent / total * 100) : 0, col = colors[k] || colors[k.replace(' · ', ' & ')] || 'var(--accent)';
      var row = '<button type="button" class="dc' + (openCat === k ? ' open' : '') + '" data-c="' + esc(k) + '"><i>' + icon(k) + '</i><span class="nm"><b>' + esc(k) + '</b><small>' + c.items.length + ' item' + (c.items.length === 1 ? '' : 's') + (c.later ? ' · ' + peso(c.later) + ' still to pay' : '') + '</small><em class="bar"><u style="width:' + Math.max(pct, c.spent ? 3 : 0) + '%;background:' + col + '"></u></em></span><span class="amt">' + peso(c.spent) + '<small>' + pct + '%</small></span></button>';
      if (openCat === k) row += '<div class="items">' + c.items.map(function (x) {
        var tag = x.later ? '<em class="t later">not paid yet</em>' : x.personal ? '<em class="t">personal</em>' : '';
        var amt = x.cur === 'PHP' ? '₱' + x.amt : x.amt + ' ' + x.cur;
        return '<div class="it"><span><b>' + esc(x.what) + '</b><small>' + esc(x.date) + ' · ' + esc(x.by) + (x.later ? ' pays ' : ' paid ') + tag + '</small></span><span class="a">' + esc(amt) + '</span></div>';
      }).join('') + '</div>';
      return row;
    }).join('');
    if (!panel) { panel = document.createElement('div'); panel.id = 'pp-dash'; panel.className = 'card'; card.parentNode.insertBefore(panel, card.nextSibling); }
    if (panel.dataset.h !== h) { panel.innerHTML = h || '<p class="muted">No expenses yet.</p>'; panel.dataset.h = h; }
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    if (e.target.closest('#pp-cats')) { document.body.classList.toggle('pp-dash-on'); openCat = null; return dash(); }
    var c = e.target.closest('#pp-dash .dc'); if (c) { openCat = openCat === c.dataset.c ? null : c.dataset.c; dash(); }
  });

  /* ---------- penguin editor: your role on the trip; no setup dots when you're just editing ---------- */
  var ROLES = ['Partner', 'Friend', 'Mom', 'Dad', 'Kid', 'Lolo / Lola', 'Tito / Tita', 'Solo traveler'];
  function editor() {
    var box = document.getElementById('start'); if (!box) return;
    var kick = $$('.kick', box).filter(function (k) { return /job in the crew/i.test(k.textContent); })[0];
    if (!kick) return;
    if (localStorage.getItem('pp_start') === 'done') { var d = $('.pp-dots', box); if (d) d.style.display = 'none'; }
    if (document.getElementById('pp-rolechips')) return;
    var sub = $('.pp-prev .pp-sub', box), cur = sub ? sub.textContent.split(' · ')[0].trim() : '';
    var k = document.createElement('div'); k.className = 'kick'; k.textContent = 'YOUR ROLE ON THE TRIP';
    var row = document.createElement('div'); row.className = 'pp-chips'; row.id = 'pp-rolechips';
    row.innerHTML = ROLES.map(function (r) { return '<button type="button" data-role="' + r + '" class="pp-chip' + (r === cur ? ' on' : '') + '" aria-pressed="' + (r === cur) + '">' + r + '</button>'; }).join('');
    kick.parentNode.insertBefore(k, kick); kick.parentNode.insertBefore(row, kick);
  }

  /* ---------- tap yourself: spin around (front and back), jump, dance ---------- */
  function me() { var P = get('pp_c_penpenProfiles:[]'); return P && P.people ? P.people.filter(function (p) { return p.isMe; })[0] : null; }
  window.ppMove = function (svg) {
    if (!svg || svg.dataset.moving) return;
    svg.dataset.moving = '1';
    var done = function () { delete svg.dataset.moving; };
    var kinds = ['spin', 'spin', 'jump', 'dance', 'peek'], k = kinds[Math.floor(Math.random() * kinds.length)];
    svg.style.transformOrigin = '50% 90%';
    if (k === 'jump') return svg.animate([
      { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.15,.85)', offset: .15 },
      { transform: 'translateY(-38%) scale(.92,1.1)', offset: .45 }, { transform: 'translateY(0) scale(1.12,.88)', offset: .8 }, { transform: 'translateY(0) scale(1,1)' }
    ], { duration: 800, easing: 'ease-out' }).onfinish = done;
    if (k === 'dance') return svg.animate([
      { transform: 'rotate(0) translateX(0)' }, { transform: 'rotate(-14deg) translateX(-8%)' }, { transform: 'rotate(14deg) translateX(8%)' },
      { transform: 'rotate(-14deg) translateX(-8%)' }, { transform: 'rotate(14deg) translateX(8%)' }, { transform: 'rotate(0) translateX(0)' }
    ], { duration: 1100, easing: 'ease-in-out' }).onfinish = done;
    // 3D turn: rotate to the side, show the back, rotate back to the front
    var front = svg.innerHTML, m = me(), av = (m && m.avatar) || {};
    var body = av.body || (svg.querySelector('ellipse[rx="36"]') || {}).getAttribute && svg.querySelector('ellipse[rx="36"]').getAttribute('fill');
    var backSide = window.ppLook ? window.ppLook.back(body, av.hair && av.hair !== 'none' && av.hair !== 'tuft' ? av.hairColor : null) : front;
    var q = 'perspective(500px) rotateY(', T = 170;
    function turn(a, b, cb) { var an = svg.animate([{ transform: q + a + 'deg)' }, { transform: q + b + 'deg)' }], { duration: T, easing: 'linear' }); an.onfinish = cb; }
    turn(0, 90, function () {
      svg.innerHTML = backSide;
      turn(-90, 0, function () {
        setTimeout(function () {
          if (k === 'peek') svg.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 600 });
          setTimeout(function () {
            turn(0, 90, function () { svg.innerHTML = front; turn(-90, 0, done); });
          }, k === 'peek' ? 650 : 120);
        }, 200);
      });
    });
  };

  /* ---------- the middle penpen has a life of his own ---------- */
  var SAY = ['Use me to translate! 🌐', 'Drop your expenses here 💸', '"Lunch 450, I paid" — just tell me!', 'Where to next? 🗺️', 'I\'m not lost, I\'m exploring 🐧',
    'Ask me where to eat 🍜', 'Got sunscreen? ☀️', 'Tap me, I\'m bored 🥱', 'Need a route? I\'ve got 5 🗺️', 'I know a guy… for lechon 🐷', 'Fish tacos? No? OK 🐟',
    'Hydrate, hooman 💧', 'I can call Brad for you 📞', 'Psst… tap me 👀', '✨', '🐟', '🥥', '🧊', '💭', '🎶'];
  var navBusy = false;
  function navPen() { var b = document.getElementById('navpen'); return b && b.querySelector('svg'); }
  function bodyColor(svg) {
    var o = svg.getAttribute('data-orig'), d = document.createElement('div');
    if (o) { d.innerHTML = '<svg>' + o + '</svg>'; var e = d.querySelector('ellipse[rx="36"]'); if (e) return e.getAttribute('fill'); }
    var e2 = svg.querySelector('ellipse[rx="36"]'); return e2 ? e2.getAttribute('fill') : null;
  }
  function pop(text) {
    var b = document.getElementById('navpen'); if (!b) return;
    var old = document.getElementById('pp-navsay'); if (old) old.remove();
    var t = document.createElement('div'); t.id = 'pp-navsay'; t.textContent = text; document.body.appendChild(t);
    var r = b.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = (r.top - t.offsetHeight - 10) + 'px';
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 2600);
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function anim(svg, kf, ms, cb, ease) { var a = svg.animate(kf, { duration: ms, easing: ease || 'ease-in-out' }); a.onfinish = cb; return a; }
  function play() {
    var svg = navPen(), next = function (ms) { navBusy = false; setTimeout(play, ms == null ? 250 + Math.random() * 900 : ms); };
    if (navBusy) return;
    if (!svg || document.hidden || document.getElementById('pp-talk') || document.getElementById('pp-me') || matchMedia('(prefers-reduced-motion: reduce)').matches) return next(1500);
    navBusy = true;
    var talk = Math.random() < .45, k = pick(['bob', 'bob', 'bob', 'walk', 'walk', 'peek', 'peek', 'jump', 'think', 'spin', 'dance', 'wave', 'sleep', 'shiver', 'munch', 'sneeze', 'love', 'cool', 'sing']);
    svg.style.transformOrigin = '50% 90%';
    var guideId = window.ppGuideNow ? window.ppGuideNow() : 'bubbly';
    if (k === 'walk' && window.ppLook) {
      var front = svg.innerHTML, dir = Math.random() < .5 ? 1 : -1, sideV = window.ppLook.side(guideId, bodyColor(svg));
      svg.innerHTML = sideV; if (dir < 0) svg.style.scale = '-1 1';
      var wob = []; for (var i = 0; i <= 8; i++) wob.push({ transform: 'translateX(' + (dir * i * 15) + '%) rotate(' + (i % 2 ? 7 : -7) + 'deg)' });
      var out = svg.animate(wob, { duration: 1300, easing: 'linear', fill: 'forwards' });
      out.onfinish = function () {
        if (talk) pop(pick(['💭 …', '🤔', 'brb 💭', 'Hmm… 🤔', 'Where did they go? 👀']));
        setTimeout(function () {
          var back = []; for (var j = 0; j <= 8; j++) back.push({ transform: 'translateX(' + (dir * (-120 + j * 15)) + '%) rotate(' + (j % 2 ? 7 : -7) + 'deg)' });
          out.cancel();
          anim(svg, back, 1300, function () { svg.innerHTML = front; svg.style.scale = ''; anim(svg, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(1,1)' }], 260, function () { next(); }); }, 'linear');
        }, 600);
      };
      return;
    }
    if (k === 'peek') {
      var down = svg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(110%)' }], { duration: 350, easing: 'ease-in', fill: 'forwards' });
      down.onfinish = function () { setTimeout(function () { down.cancel(); pop(pick(['Peekaboo! 👀', 'Boo! 🐧', 'Found you! 👀'])); anim(svg, [{ transform: 'translateY(110%)' }, { transform: 'translateY(-12%)', offset: .7 }, { transform: 'translateY(0)' }], 420, function () { next(); }, 'ease-out'); }, 700); };
      return;
    }
    if (k === 'spin' && window.ppLook) {
      var f2 = svg.innerHTML, bk = window.ppLook.back(bodyColor(svg) || (window.ppLook && null)), q = 'perspective(300px) rotateY(';
      anim(svg, [{ transform: q + '0deg)' }, { transform: q + '90deg)' }], 160, function () { svg.innerHTML = bk;
        anim(svg, [{ transform: q + '-90deg)' }, { transform: q + '90deg)' }], 320, function () { svg.innerHTML = f2;
          anim(svg, [{ transform: q + '-90deg)' }, { transform: q + '0deg)' }], 160, function () { next(); }, 'linear'); }, 'linear'); }, 'linear');
      if (talk) pop(pick(['Wheee 🌀', 'Twirl! ✨']));
      return;
    }
    var K = {
      bob: [[{ transform: 'translateY(0)' }, { transform: 'translateY(-6%)' }, { transform: 'translateY(0)' }], 700, null],
      jump: [[{ transform: 'translateY(0) scale(1,1)' }, { transform: 'scale(1.15,.85)', offset: .2 }, { transform: 'translateY(-30%) scale(.95,1.08)', offset: .5 }, { transform: 'scale(1.1,.9)', offset: .85 }, { transform: 'translateY(0) scale(1,1)' }], 650, ['Wheee! ✨', '🎉', 'Boing! 🐧']],
      think: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(-10deg)', offset: .8 }, { transform: 'rotate(0)' }], 1400, ['💭 …', '🤔 Hmm…', '💭 thinking about lechon']],
      dance: [[{ transform: 'rotate(0) translateX(0)' }, { transform: 'rotate(-12deg) translateX(-8%)' }, { transform: 'rotate(12deg) translateX(8%)' }, { transform: 'rotate(-12deg) translateX(-8%)' }, { transform: 'rotate(0) translateX(0)' }], 1000, ['🎶', '💃', 'Budots time! 🕺']],
      wave: [[{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 700, ['Hi hi! 👋', 'Kumusta! 👋', 'Maayong buntag! ☀️']],
      sleep: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(3%)' }, { transform: 'rotate(-6deg) translateY(3%)', offset: .85 }, { transform: 'rotate(0)' }], 2000, ['💤', 'Zzz… 😴', '5 more minutes 💤']],
      shiver: [[{ transform: 'translateX(0)' }, { transform: 'translateX(-3%)' }, { transform: 'translateX(3%)' }, { transform: 'translateX(-3%)' }, { transform: 'translateX(3%)' }, { transform: 'translateX(0)' }], 500, ['Brrr 🥶', 'Aircon too cold 🧊']],
      munch: [[{ transform: 'scale(1,1)' }, { transform: 'scale(1.05,.95)' }, { transform: 'scale(1,1)' }, { transform: 'scale(1.05,.95)' }, { transform: 'scale(1,1)' }], 800, ['🐟 nom nom', 'Snack break 🍡', 'Is that lechon? 🐷']],
      sneeze: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: .6 }, { transform: 'rotate(10deg) translateY(4%)', offset: .7 }, { transform: 'rotate(0)' }], 900, ['Achoo! 🤧', '…bless me 🙏']],
      love: [[{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 900, ['💕', 'Love this trip already 💖']],
      cool: [[{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg) translateX(-4%)' }, { transform: 'rotate(-5deg) translateX(-4%)', offset: .8 }, { transform: 'rotate(0)' }], 1200, ['😎', 'Too cool for the cold 😎']],
      sing: [[{ transform: 'rotate(0)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], 1300, ['🎶 la la la', '🎤 waddle waddle ♪']]
    }[k] || [[{ transform: 'rotate(0)' }], 300, null];
    if (K[2] && talk) pop(Math.random() < .35 ? pick(SAY) : pick(K[2]));
    anim(svg, K[0], K[1], function () { next(); });
  }
  setTimeout(play, 1500);

  /* ---------- styles ---------- */
  var css = sceneCss() +
    '#pp-moremenu{position:fixed;z-index:60;min-width:250px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.18);padding:6px;font-family:' + F + ';animation:ppmm .14s ease-out}' +
    '@keyframes ppmm{from{opacity:0;transform:translateY(6px)}}' +
    '#pp-moremenu button{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;color:inherit;text-align:left;padding:11px 12px;border-radius:12px;font:inherit;cursor:pointer}' +
    '#pp-moremenu button:hover,#pp-moremenu button:focus-visible{background:var(--chip)}#pp-moremenu i{font-style:normal;font-size:22px}' +
    '#pp-moremenu b{display:block;font-weight:800;font-size:15px}#pp-moremenu small{display:block;color:var(--muted);font-size:12.5px;font-weight:600}' +
    '#trip-ct:empty{display:none}#pp-cats{cursor:pointer}#pp-cats .pp-cat-t::after{content:" ▾";opacity:.6}body.pp-dash-on #pp-cats .pp-cat-t::after{content:" ▴"}' +
    '#pp-dash{padding:6px!important;margin-top:8px;font-family:' + F + '}' +
    '#pp-dash .dc{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;color:var(--ink);font:inherit;text-align:left;padding:10px;border-radius:14px;cursor:pointer}' +
    '#pp-dash .dc:hover,#pp-dash .dc.open{background:var(--chip)}#pp-dash .dc i{font-style:normal;font-size:22px;width:30px;text-align:center}' +
    '#pp-dash .nm{flex:1;min-width:0}#pp-dash .nm b{display:block;font-weight:800;font-size:15px}#pp-dash small{display:block;color:var(--muted);font-weight:600;font-size:12.5px}' +
    '#pp-dash .bar{display:block;height:7px;border-radius:6px;background:var(--line);margin-top:6px;overflow:hidden}#pp-dash .bar u{display:block;height:100%;border-radius:6px}' +
    '#pp-dash .amt{font-weight:900;font-size:15px;text-align:right}#pp-dash .amt small{font-weight:700}' +
    '#pp-dash .items{padding:2px 10px 8px 50px}#pp-dash .it{display:flex;gap:10px;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line)}#pp-dash .it:last-child{border:0}' +
    '#pp-dash .it b{font-weight:700;font-size:14px}#pp-dash .it .a{font-weight:800;white-space:nowrap;font-size:14px}' +
    '#pp-dash .t{font-style:normal;font-size:11px;font-weight:800;background:var(--accentSoft);color:var(--accentText);border-radius:99px;padding:1px 7px;margin-left:4px}#pp-dash .t.later{background:var(--warnSoft);color:var(--warn)}' +
    '#pp-rolechips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}#pp-rolechips button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:8px 13px;font:800 14px ' + F + ';cursor:pointer}' +
    '#pp-rolechips button.on{background:var(--accent);border-color:var(--accent);color:#fff}' +
    '#navpen{overflow:hidden!important;border-radius:50%}' +
    'body[data-ppv=crew] #p-safety .scroll > :not(.fred):not(#crew){display:none!important}' +
    'body[data-ppv=safety] #p-safety #crew,body[data-ppv=safety] #p-safety #trip-ct{display:none!important}' +
    'body[data-ppv=book] #p-safety .scroll > :not(.fred):not(#trip-ct){display:none!important}' +
    'html[data-sc] header.hero{background-color:var(--accentSoft)!important}' +
    '#pp-tr-chip{display:none!important}#pp-trbig{display:flex;align-items:center;gap:12px;width:calc(100% - 20px);margin:10px 10px 6px;border:0;border-radius:20px;padding:14px 16px;background:linear-gradient(135deg,var(--accent),var(--accentText));color:#fff;text-align:left;font:800 18px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);cursor:pointer}' +
    '#pp-trbig span{font-size:30px}#pp-trbig b{flex:1}#pp-trbig small{display:block;font-weight:700;font-size:13px;opacity:.9}#pp-trbig i{font-style:normal;font-size:24px}' +
    '#pp-navsay{position:fixed;z-index:55;max-width:220px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:7px 12px;font:800 13.5px ' + F + ';box-shadow:0 6px 18px rgba(0,0,0,.14);pointer-events:none;animation:ppns .25s cubic-bezier(.2,1.4,.4,1)}' +
    '#pp-navsay.out{opacity:0;transform:translateY(4px);transition:.35s}@keyframes ppns{from{opacity:0;transform:translateY(8px) scale(.8)}}' +
    '#pp-me .chips button.gd{display:inline-flex;align-items:center;gap:4px;padding:4px 12px 4px 6px}#pp-me .chips button.gd svg{flex:none}';

  function tick() { try { scene(); nav(); dash(); editor(); } catch (e) {} }
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    tick();
    var busy = false;
    new MutationObserver(function () { if (busy) return; busy = true; requestAnimationFrame(function () { tick(); busy = false; }); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(function () { try { scene(); nav(); } catch (e) {} }, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
