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
    var p = get('pp_prefs') || {}, s = p.scene && p.scene !== 'auto' ? p.scene : localStorage.getItem('pp_trip_theme');
    if (!SC[s]) s = '';
    var h = document.documentElement;
    if ((h.getAttribute('data-sc') || '') !== s) { if (s) h.setAttribute('data-sc', s); else h.removeAttribute('data-sc'); }
    var meta = document.querySelector('meta[name="theme-color"]'), c = SC[s];
    if (meta && c) meta.setAttribute('content', h.classList.contains('ppd') ? c[8] : c[0]);
  }

  /* ---------- bottom bar ---------- */
  var MORE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var pass = false;
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
    // page titles and back buttons follow the new names
    $$('#p-plan *').forEach(function (e) { if (!e.children.length && e.textContent.trim() === 'Plan') e.textContent = 'Itinerary'; });
    $$('#p-audit button, #p-rcpt button').forEach(function (b) { if (b.textContent.trim() === '‹ Money') b.textContent = '‹ Expenses'; });
  }
  function closeMenu() { var m = document.getElementById('pp-moremenu'); if (m) m.remove(); }
  function openMenu(btn) {
    if (document.getElementById('pp-moremenu')) return closeMenu();
    var m = document.createElement('div'); m.id = 'pp-moremenu'; m.setAttribute('role', 'menu');
    m.innerHTML = [
      ['crew', '🛟', 'Crew & safety', 'people · emergency · SOS'],
      ['diary', '📔', 'Diary', 'memories, photos & notes'],
      ['book', '🏨', 'Bookings', 'hotels · tours · transport'],
      ['me', '🐧', 'My profile', 'my penguin · guide · settings']
    ].map(function (x) { return '<button type="button" role="menuitem" data-m="' + x[0] + '"><i>' + x[1] + '</i><span><b>' + x[2] + '</b><small>' + x[3] + '</small></span></button>'; }).join('');
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect();
    m.style.right = Math.max(8, innerWidth - r.right) + 'px';
    m.style.bottom = (innerHeight - r.top + 8) + 'px';
    m.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      closeMenu();
      var k = b.dataset.m;
      if (k === 'crew') { pass = true; btn.click(); pass = false; }
      else if (k === 'diary') { var d = document.getElementById('to-diary'); if (d) d.click(); }
      else if (k === 'book') {
        var tc = document.getElementById('trip-ct'), empty = !tc || !tc.children.length;
        if (empty) window.ppNavGo('p-safety');   // Crew fills in the bookings list the first time
        setTimeout(function () {
          window.ppNavGo('p-plan');
          setTimeout(function () { var t = document.getElementById('trip-ct'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 350);
        }, empty ? 600 : 0);
      }
      else if (k === 'me' && window.ppOpenMe) window.ppOpenMe();
    };
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('nav button[data-p="p-safety"]');
    if (b && !pass) { e.stopPropagation(); e.preventDefault(); return openMenu(b); }
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
