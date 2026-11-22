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
  window.ppGoTab = function (label) {
    if (label === 'Play' && window.ppOpenPlay) { window.ppOpenPlay(); return true; }
    if (label === 'Diary') { var dd = document.getElementById('to-diary'); if (dd) dd.click(); return true; }
    if (label === 'Settings' && window.ppOpenSettings) { window.ppOpenSettings(); return true; }
    var id = TABS[label]; if (!id) return false; if (id === 'p-safety') view('crew'); window.ppNavGo(id); return true; };
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
    var m = document.createElement('div'); m.id = 'pp-moremenu'; m.className = 'pp-page'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'More');
    var OFF = '<em class="off">Works offline</em>';
    m.innerHTML = '<div class="top"><button class="back" type="button" aria-label="Back">‹</button><h2>More</h2></div><div class="wrap">' +
      '<button type="button" class="newtrip" data-m="newtrip"><i>＋</i><span><b>Start a new trip</b><small>Plan it with penpen and invite your crew</small></span></button>' +
      [
        ['crew', '👥', 'Crew', 'Who’s on the trip · Invite', OFF],
        ['safety', '🛟', 'Safety', 'SOS · Nearby help · Emergency contacts', ''],
        ['book', '🏨', 'Bookings', 'Hotels · Tours · Transport', OFF],
        ['diary', '📔', 'Diary', 'Memories · Photos · Notes', ''],
        ['play', '🎮', 'Play', 'Feed penpen · Games · Quiz', OFF],
        ['set', '⚙️', 'Settings', 'Guide · Voice · Scene · Trip sheet', ''],
        ['priv', '🔒', 'Privacy and account', 'Location · Microphone · Clear this phone', '']
      ].map(function (x) { return '<button type="button" role="menuitem" data-m="' + x[0] + '"><i>' + x[1] + '</i><span><b>' + x[2] + '</b><small>' + x[3] + '</small>' + x[4] + '</span><u>›</u></button>'; }).join('') + '</div>';
    document.body.appendChild(m);
    m.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      closeMenu();
      var k = b.dataset.m; if (!k) return;
      if (k === 'newtrip') { if (window.ppOpenTrips) window.ppOpenTrips(); return; }
      if (k === 'priv') { if (window.ppOpenPrivacy) window.ppOpenPrivacy(); return; }
      window.ppFromMore = true;
      if (VIEWS[k]) { view(k); window.ppNavGo('p-safety'); var sc = $('#p-safety .scroll'); if (sc) sc.scrollTop = 0; }
      else if (k === 'diary') { var d = document.getElementById('to-diary'); if (d) d.click(); }
      else if (k === 'set' && window.ppOpenSettings) window.ppOpenSettings();
      else if (k === 'play' && window.ppOpenPlay) window.ppOpenPlay();
    };
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('nav button[data-p="p-safety"]');
    if (b && !pass) { e.stopPropagation(); e.preventDefault(); return openMenu(b); }
    if (b && pass && !document.body.getAttribute('data-ppv')) view('crew');
    if (!e.target.closest || !e.target.closest('#pp-moremenu')) closeMenu();
  }, true);

  /* ---------- How to use penpen (ready for the final version) ---------- */
  var HELP = [
    ['🐧', 'Talk to penpen', 'Tap the middle penpen and just talk or type, like texting a friend. He knows your whole trip.', ['“What’s the plan today?”', '“Where can we eat lechon near our hotel?”', '“Give me the top 5 stops for Dec 7 along the way”', '“Call Brad”']],
    ['💸', 'Log expenses', 'Say what you paid — penpen writes it down and splits it.', ['“Lunch 450, I paid”', '“Brad paid 1,200 for the van, shared”', '“Dinner 3,200, my treat”', '“Who owes who?”', '“Undo”']],
    ['🌐', 'Translate', 'On penpen’s chat, tap the big Translate bar. Hold your button to speak English, hold theirs for Bisaya or Tagalog.', []],
    ['🗺️', 'Itinerary', 'Every day of the trip with times, places and directions. Tell penpen to change it.', ['“Move canyoneering to 9 am”', '“Add dinner at Larsian on Dec 5 at 7 pm”']],
    ['👥', 'Crew, Safety & Bookings', 'In More: who’s on the trip and the invite QR, SOS and nearby help, and your hotels, tours and transport.', []],
    ['📔', 'Diary', 'Write, talk or add photos. Group diary is shared with everyone; Just me is only for you.', ['“Dear diary, today we swam with whale sharks…”']],
    ['🎮', 'Play', 'Look after penpen and play Belly Slide — even with no signal. Every expense you log earns a 🐟.', []],
    ['⚙️', 'Settings', 'Pick your guide, voice, scene and light/dark, and open the trip’s Google Sheet.', []]
  ];
  window.ppHelpHtml = function () {
    return HELP.map(function (h) { return '<details class="hc"><summary><i>' + h[0] + '</i><b>' + h[1] + '</b></summary><p>' + h[2] + '</p>' + (h[3].length ? '<div class="ex">' + h[3].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</details>'; }).join('');
  };

  /* ---------- 🔔 feed: app updates + what the crew logged (kept for a week) ---------- */
  var CHANGELOG = [
    ['u1122-play', '🎮', 'New: Play', 'Look after penpen, Belly Slide down a snowy hill, exercise and trivia — works offline', 'Play'],
    ['u1122-voice', '🛠️', 'Fixed: logging by voice', 'Telling penpen an expense works again', 'Money'],
    ['u1122-diary', '🔒', 'Diary: Just me is private', 'Your own Google Doc, with a link to open it', 'Diary'],
    ['u1122-more', '🧭', 'More menu', 'Crew, Safety, Bookings, Diary, Play and Settings each have their own page', 'More']
  ];
  window.ppFeed = function () {
    var out = [], first = get('pp_feed_first') || {}, nowT = Date.now(), WEEK = 7 * 864e5, changed = false;
    CHANGELOG.forEach(function (c) { if (!first[c[0]]) { first[c[0]] = nowT; changed = true; } if (nowT - first[c[0]] < WEEK) out.push({ id: c[0], ic: c[1], t: c[2], s: c[3], go: c[4] }); });
    if (changed) { try { localStorage.setItem('pp_feed_first', JSON.stringify(first)); } catch (e) {} }
    var T = get('pp_trip'), E = T && T.tabs && T.tabs.Expenses, meName = ((get('pp_c_penpenToday:[]') || {}).hello || {}).name || '';
    if (E && E.rows && E.rows.length) {
      var H = E.rows[0].map(function (x) { return String(x).trim().toLowerCase(); }), cw = H.indexOf('what / place'), ca = H.indexOf('amount'), cc = H.indexOf('currency'), cb = H.indexOf('added by'), cl = H.indexOf('logged at');
      E.rows.slice(1).forEach(function (r, i) {
        var who = String(r[cb] || '').trim(), at = Date.parse(r[cl]);
        if (!r[cw] || !who || (meName && who.toLowerCase().indexOf(meName.toLowerCase()) === 0) || !(at > nowT - WEEK)) return;
        out.push({ id: 'x:' + i + ':' + r[cw], ic: '💸', t: who + ' logged ' + r[cw], s: (r[cc] === 'PHP' ? '₱' + r[ca] : r[ca] + ' ' + r[cc]) + ' · ' + new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), go: 'Money' });
      });
    }
    return out;
  };

  /* ---------- going back: the ‹ buttons, plus swipe from the left edge ---------- */
  var hist = [];
  function activePane() { var p = $('.pane.on'); return p && p.id; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('nav button[data-p]');
    if (!b) return;
    if (!pass) window.ppFromMore = false;
    // tapping the bottom bar always closes whatever is open on top
    ['pp-me', 'pp-help'].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    $$('.pp-sheet').forEach(function (x) { x.remove(); });
    var cur = activePane(); if (cur && cur !== b.dataset.p) hist.push({ p: cur, v: document.body.getAttribute('data-ppv') });
    if (hist.length > 20) hist.shift();
  }, true);
  window.ppBack = function () {
    if (window.ppPlayBack && window.ppPlayBack()) return true;
    var sh = $$('.pp-sheet'); if (sh.length) { sh.forEach(function (x) { x.remove(); }); return true; }
    var mm = document.getElementById('pp-moremenu'); if (mm) { mm.remove(); return true; }
    var ov = document.getElementById('pp-help') || document.getElementById('pp-me') || document.getElementById('pp-talk');
    if (ov) { var bk = ov.querySelector('.back, [aria-label="Close"], .x'); if (bk) bk.click(); else ov.remove(); return true; }
    if (window.ppFromMore && /^p-(safety|diary)$/.test(activePane() || '')) { window.ppFromMore = false; var nb = $('nav button[data-p="p-safety"]'); if (nb) openMenu(nb); return true; }
    var pane = $('.pane.on'), pb = pane && [].slice.call(pane.querySelectorAll('button')).filter(function (x) { return x.offsetParent && /^‹/.test(x.textContent.trim()); })[0];
    if (pb) { pb.click(); return true; }
    var h = hist.pop(); if (h) { if (h.v) view(h.v); window.ppNavGo(h.p); hist.pop(); return true; }
    if (activePane() !== 'p-today') { window.ppNavGo('p-today'); return true; }
    return false;
  };
  var sw = null;
  document.addEventListener('touchstart', function (e) { var t = e.touches[0]; sw = t && t.clientX < 30 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!sw) return; var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = Math.abs(t.clientY - sw.y); sw = null;
    if (dx > 70 && dy < 70) window.ppBack();
  }, { passive: true });

  /* ---------- a big crew: the penguin box grows into rows ---------- */
  function crewBox() {
    var sc = document.getElementById('pp-scene'); if (!sc) return;
    var n = sc.querySelectorAll('.pp-who').length, big = n > 5 ? (n > 10 ? '2' : '1') : '';
    if ((sc.getAttribute('data-big') || '') !== big) { if (big) sc.setAttribute('data-big', big); else sc.removeAttribute('data-big'); }
  }

  function help() {
    if (document.getElementById('pp-help')) return;
    var w = document.createElement('div'); w.id = 'pp-help'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'How to use penpen');
    w.innerHTML = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>How to use penpen</h2></div><div class="wrap">' +
      HELP.map(function (h) { return '<div class="hc"><div class="hh"><i>' + h[0] + '</i><b>' + h[1] + '</b></div><p>' + h[2] + '</p>' + (h[3].length ? '<div class="ex">' + h[3].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div>'; }).join('') +
      '<p class="ft">More guides and videos coming soon.</p></div>';
    document.body.appendChild(w);
    w.onclick = function (e) { if (e.target.closest('.back')) w.remove(); };
  }

  /* ---------- Diary: say where each entry is saved, with a link to open it ---------- */
  function diaryNote() {
    var seg = $('#p-diary .seg'); if (!seg) return;
    var tip = $('#p-diary .card.tip'); if (tip) tip.style.display = 'none';
    var me = document.getElementById('d-me'), gp = document.getElementById('d-group');
    var mine = me && (me.classList.contains('on') || me.getAttribute('aria-pressed') === 'true' || me.getAttribute('aria-selected') === 'true');
    if (gp && (gp.classList.contains('on') || gp.getAttribute('aria-pressed') === 'true')) mine = false;
    var I = get('pp_c_penpenDiaryInfo:[]') || {}, url = mine ? I.me : I.group;
    var h = mine
      ? '<b>🔒 Just me</b>Only you can read this. It’s saved to your own private Google Doc — nobody else on the trip gets the link.'
      : '<b>👥 Group diary</b>Everyone on this trip can read it. It’s saved to one shared Google Doc for the whole crew.';
    h += url ? '<a href="' + url + '" target="_blank" rel="noopener">Open the doc ↗</a>' : '<em>The doc is made with your first entry — the link shows up here after that.</em>';
    var n = document.getElementById('pp-dnote');
    if (!n) { n = document.createElement('div'); n.id = 'pp-dnote'; seg.parentNode.insertBefore(n, seg.nextSibling); }
    if (n.dataset.h !== h) { n.innerHTML = h; n.dataset.h = h; }
  }

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
  var SAY = ['I’m your trouble buddy… I mean travel buddy 😇', 'Log it or lose it! exPENPENses 💸', 'What do you call a penguin who tracks money? An exPENPENse report 🐧', 'Why don’t penguins get lost? They always ice-plore with a map 🗺️', 'I’m not lazy, I’m in penguin power-saving mode 🔋', 'Chill-axing… penguin style 🧊', 'Ice to meet you! 🧊', 'Who’s the coolest travel buddy? Me. Literally. 🥶', 'Use me to translate! 🌐', 'Drop your expenses here 💸', '"Lunch 450, I paid" — just tell me!', 'Where to next? 🗺️', 'I\'m not lost, I\'m exploring 🐧',
    'Ask me where to eat 🍜', 'Got sunscreen? ☀️', 'Tap me, I\'m bored 🥱', 'Need a route? I\'ve got 5 🗺️', 'I know a guy… for lechon 🐷', 'Fish tacos? No? OK 🐟',
    'Hydrate, hooman 💧', 'I can call Brad for you 📞', 'Psst… tap me 👀', '✨', '🐟', '🥥', '🧊', '💭', '🎶'];
  var FACTS = ['Penguins can’t fly, but they “fly” underwater at up to 35 km/h 🐧', 'The Philippines has about 7,641 islands 🏝️', 'A group of penguins on land is called a waddle 🐧🐧', 'Whale sharks are the biggest fish in the world 🐋', 'Penguins slide on their bellies to save energy — like me! 🛷', 'Cebu’s Magellan’s Cross dates back to 1521 ✝️', '“Salamat” means thank you 🙏', 'Emperor penguins can dive over 500 m deep 🌊', 'Mango is the national fruit of the Philippines 🥭', 'Penguins have a gland that filters salt from seawater 🧂', 'Puso — rice cooked in woven palm leaves — is a Cebu classic 🍚', 'Gentoo penguins give pebbles as gifts 💎'];
  var navBusy = false;
  function navPen() { var b = document.getElementById('navpen'); return b && b.querySelector('svg'); }
  function bodyColor(svg) {
    var o = svg.getAttribute('data-orig'), d = document.createElement('div');
    if (o) { d.innerHTML = '<svg>' + o + '</svg>'; var e = d.querySelector('ellipse[rx="36"]'); if (e) return e.getAttribute('fill'); }
    var e2 = svg.querySelector('ellipse[rx="36"]'); return e2 ? e2.getAttribute('fill') : null;
  }
  var popUntil = 0;
  function pop(text) {
    var b = document.getElementById('navpen'); if (!b) return;
    if (Date.now() < popUntil) return;
    var hold = Math.max(3800, 1600 + text.length * 75) + (/^Fun fact/.test(text) ? 2500 : 0);
    popUntil = Date.now() + hold + 3000;
    var old = document.getElementById('pp-navsay'); if (old) old.remove();
    var t = document.createElement('div'); t.id = 'pp-navsay'; t.textContent = text; document.body.appendChild(t);
    var r = b.getBoundingClientRect();
    t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
    t.style.top = (r.top - t.offsetHeight - 10) + 'px';
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, hold);
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function anim(svg, kf, ms, cb, ease) { var a = svg.animate(kf, { duration: ms, easing: ease || 'ease-in-out' }); a.onfinish = cb; return a; }
  function play() {
    var svg = navPen(), next = function (ms) { navBusy = false; setTimeout(play, ms == null ? 250 + Math.random() * 900 : ms); };
    if (navBusy) return;
    if (!svg || document.hidden || document.getElementById('pp-talk') || document.getElementById('pp-me') || matchMedia('(prefers-reduced-motion: reduce)').matches) return next(1500);
    navBusy = true;
    var talk = Math.random() < .45, k = pick(['bob', 'bob', 'bob', 'walk', 'walk', 'peek', 'peek', 'jump', 'think', 'spin', 'dance', 'wave', 'sleep', 'shiver', 'munch', 'sneeze', 'love', 'cool', 'sing', 'swim', 'swim', 'spin']);
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
    if (k === 'swim') {
      // the water rises and penpen paddles about
      var NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g');
      g.innerHTML = '<path d="M-20 82 Q0 74 20 82 T60 82 T100 82 T140 82 L140 140 L-20 140 Z" fill="#7CC7DB" opacity=".9"><animate attributeName="d" dur="1.2s" repeatCount="indefinite" values="M-20 82 Q0 74 20 82 T60 82 T100 82 T140 82 L140 140 L-20 140 Z;M-20 82 Q0 90 20 82 T60 82 T100 82 T140 82 L140 140 L-20 140 Z;M-20 82 Q0 74 20 82 T60 82 T100 82 T140 82 L140 140 L-20 140 Z"/></path><circle cx="20" cy="70" r="3" fill="#fff" opacity=".8"/><circle cx="98" cy="66" r="2.5" fill="#fff" opacity=".8"/>';
      svg.appendChild(g);
      if (talk) pop(pick(['Splash! 💦', 'Swimming to Bohol 🏊', 'Water’s nice! 🌊']));
      anim(svg, [{ transform: 'translate(0,10%) rotate(0)' }, { transform: 'translate(-8%,12%) rotate(-6deg)' }, { transform: 'translate(8%,8%) rotate(6deg)' }, { transform: 'translate(-6%,12%) rotate(-4deg)' }, { transform: 'translate(0,10%) rotate(0)' }], 2600, function () { g.remove(); next(); });
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
    if (K[2] && talk) pop(Math.random() < .2 ? 'Fun fact: ' + pick(FACTS) : Math.random() < .35 ? pick(SAY) : pick(K[2]));
    else if (!K[2] && Math.random() < .12) pop('Fun fact: ' + pick(FACTS));
    anim(svg, K[0], K[1], function () { next(); });
  }
  setTimeout(play, 1500);

  /* ---------- styles ---------- */
  var css = sceneCss() +
    '#pp-moremenu .wrap > button{display:flex;align-items:center;gap:14px;width:100%;border:0;background:var(--card);color:inherit;text-align:left;padding:14px 16px;border-radius:20px;margin-bottom:10px;font:inherit;cursor:pointer;min-height:64px}' +
    '#pp-moremenu .wrap > button:active{transform:scale(.98)}#pp-moremenu i{font-style:normal;font-size:26px;width:34px;text-align:center}#pp-moremenu span{flex:1}#pp-moremenu u{text-decoration:none;font-size:24px;color:var(--muted)}' +
    '#pp-moremenu b{display:block;font-weight:900;font-size:16px}#pp-moremenu small{display:block;color:var(--muted);font-size:13px;font-weight:700}' +
    '#pp-moremenu em.off{display:inline-block;font-style:normal;font-size:11px;font-weight:900;color:#237566;background:rgba(35,117,102,.12);border-radius:99px;padding:2px 8px;margin-top:5px}' +
    '#pp-moremenu .newtrip{background:#237566!important;color:#fff!important}#pp-moremenu .newtrip i{background:rgba(255,255,255,.2);border-radius:50%;height:34px;line-height:34px;font-size:22px}#pp-moremenu .newtrip small{color:rgba(255,255,255,.85)}' +
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
    '#pp-help{position:fixed;inset:0;z-index:99960;background:var(--bg);color:var(--ink);overflow:auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:16px/1.45 ' + F + '}' +
    '#pp-help .top{display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto 10px}#pp-help h2{margin:0;font:900 24px ' + F + '}#pp-help .back{border:0;background:var(--card);color:var(--ink);border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer}' +
    '#pp-help .wrap{max-width:560px;margin:0 auto}#pp-help .hc{background:var(--card);border-radius:20px;padding:14px 16px;margin-bottom:10px}#pp-help .hh{display:flex;align-items:center;gap:10px;font-size:17px}#pp-help .hh i{font-style:normal;font-size:24px}#pp-help p{margin:6px 0 0;color:var(--muted)}' +
    '#pp-help .ex{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}#pp-help .ex span{background:var(--chip);border-radius:99px;padding:6px 11px;font-weight:700;font-size:13.5px}#pp-help .ft{text-align:center;color:var(--muted);font-size:13px}' +
    '#pp-me,#pp-help{bottom:calc(70px + env(safe-area-inset-bottom))!important}' +
    '#pp-scene[data-big]{height:auto!important}#pp-scene[data-big] .pp-stage{flex-wrap:wrap;height:auto!important;padding:10px 6px 8px;row-gap:2px}#pp-scene[data-big] .pp-who{margin-left:-4px!important}#pp-scene[data-big] .pp-who svg{width:72px!important;height:72px!important}#pp-scene[data-big="2"] .pp-who svg{width:56px!important;height:56px!important}' +
    '#pp-me details.hc{background:var(--bg);border-radius:14px;padding:10px 12px;margin:6px 0;width:100%;box-sizing:border-box}#pp-me details.hc summary{display:flex;align-items:center;gap:10px;font-weight:800;cursor:pointer;list-style:none}#pp-me details.hc summary::-webkit-details-marker{display:none}#pp-me details.hc i{font-style:normal;font-size:20px}#pp-me details.hc p{margin:8px 0 0;color:var(--muted);font-size:14.5px}#pp-me details.hc .ex{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#pp-me details.hc .ex span{background:var(--chip);border-radius:99px;padding:5px 10px;font-weight:700;font-size:13px}' +
    '#pp-dnote{background:var(--card);border-radius:16px;padding:12px 14px;margin:10px 0;color:var(--muted);font-size:14.5px}#pp-dnote b{display:block;color:var(--ink);font-size:15px;margin-bottom:2px}#pp-dnote a{display:inline-block;margin-top:8px;font-weight:800;color:var(--accentText)}#pp-dnote em{display:block;margin-top:6px;font-size:13px}' +
    '#pp-tr-chip{display:none!important}#pp-trbig{display:flex;align-items:center;gap:12px;width:calc(100% - 20px);margin:10px 10px 6px;border:0;border-radius:20px;padding:14px 16px;background:linear-gradient(135deg,var(--accent),var(--accentText));color:#fff;text-align:left;font:800 18px ' + F + ';box-shadow:0 8px 20px rgba(0,0,0,.15);cursor:pointer}' +
    '#pp-trbig span{font-size:30px}#pp-trbig b{flex:1}#pp-trbig small{display:block;font-weight:700;font-size:13px;opacity:.9}#pp-trbig i{font-style:normal;font-size:24px}' +
    '#pp-navsay{position:fixed;z-index:55;max-width:220px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:7px 12px;font:800 13.5px ' + F + ';box-shadow:0 6px 18px rgba(0,0,0,.14);pointer-events:none;animation:ppns .25s cubic-bezier(.2,1.4,.4,1)}' +
    '#pp-navsay.out{opacity:0;transform:translateY(4px);transition:.35s}@keyframes ppns{from{opacity:0;transform:translateY(8px) scale(.8)}}' +
    '#pp-me .chips button.gd{display:inline-flex;align-items:center;gap:4px;padding:4px 12px 4px 6px}#pp-me .chips button.gd svg{flex:none}';

  function tick() { try { scene(); nav(); dash(); editor(); diaryNote(); crewBox(); } catch (e) {} }
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    tick();
    var busy = false;
    new MutationObserver(function () { if (busy) return; busy = true; requestAnimationFrame(function () { tick(); busy = false; }); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(function () { try { scene(); nav(); diaryNote(); } catch (e) {} }, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
