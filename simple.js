/* penpen Simple screens (on by default; switch off in My profile → "Simple screens")
   Today: the story (story.js), the crew scene and two tiles (who owes · diary).
   Money: one big total, who owes, what's left to pay. Everything else sits under "More". */
// the story, the 🔔 bell and My trips live in story.js
['guides.js', 'me.js', 'story.js', 'more.js'].forEach(function (f) { var s = document.createElement('script'); s.src = f; document.head.appendChild(s); });
(function () {
  var KEY = 'pp_simple';
  function on() { return true; }   // always simple
  var css =
    /* Today */
    'body.pp-simple #line{display:none!important}' +
    'body.pp-simple #today > .pp-hide{display:none!important}' +
    'body.pp-simple #today .acts .pp-ask{display:none!important}body.pp-simple #today .acts{display:flex}body.pp-simple #today .acts > *{flex:1}' +
    '#pp-tiles{display:flex;gap:12px;margin:14px 0 0}' +
    '#pp-tiles button{flex:1;min-height:104px;border:0;border-radius:20px;background:var(--card);box-shadow:0 1px 0 var(--line),0 8px 20px rgba(19,50,74,.07);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:800 15px Nunito,-apple-system,sans-serif;color:var(--ink);cursor:pointer;padding:8px 4px}' +
    '#pp-tiles .ic{font-size:30px;line-height:1}#pp-tiles small{font-weight:700;font-size:12.5px;color:var(--muted)}' +
    '#pp-talkbig{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;min-height:62px;margin:14px 0 8px;border:0;border-radius:20px;background:#237566;color:#fff;font:800 18px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    /* Money */
    'body.pp-simple #money .stats{display:block!important}' +
    'body.pp-simple #money .stats > .card:not(:first-child){display:none!important}' +
    'body.pp-simple #money .stats > .card:first-child{text-align:center;padding:18px!important}' +
    'body.pp-simple #money .stats > .card:first-child *{font-size:inherit}' +
    'body.pp-simple #money .pp-big{font-size:44px!important;font-weight:700;line-height:1.1;display:block}' +
    'body.pp-simple:not(.pp-more-on) .pp-more{display:none!important}' +
    'header #to-diary{display:none!important}' +   /* the Diary tile on Today does this */
    '#pp-morebtn{display:block;width:100%;min-height:58px;margin:12px 0;border:0;border-radius:18px;background:var(--chip);color:var(--ink);font:800 16px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    '#pp-morebtn small{display:block;font-weight:700;font-size:12px;opacity:.7}' +
    '.pp-badge{display:inline-block;background:#C8553D;color:#fff;border-radius:99px;padding:2px 9px;font-size:13px;margin-left:6px;vertical-align:1px}' +
    '.pp-cats{padding:14px 16px!important}.pp-cat-t{font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase;opacity:.75;margin-bottom:8px}' +
    '.pp-cat-bar{display:flex;height:14px;border-radius:8px;overflow:hidden;background:var(--chip)}.pp-cat-bar i{display:block;height:100%}' +
    '.pp-cat-leg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:9px;font-size:13px;font-weight:700}.pp-cat-leg b{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.pp-cat-leg em{font-style:normal;opacity:.7;font-weight:600}' +
    '#money .pp-big{color:var(--ink)!important}';

  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function click(sel) { var b = typeof sel === 'string' ? document.querySelector(sel) : sel; if (b) b.click(); }
  function nav(label) { var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === label && x.className !== 'back'; })[0]; if (b) b.click(); }

  function today() {
    var t = document.getElementById('today'); if (!t) return;
    var kids = [].slice.call(t.children), owe = '', oweWho = '';
    kids.forEach(function (k) {
      if (k.id === 'pp-tiles' || k.id === 'pp-talkbig' || /^pp-story/.test(k.id)) return;
      // the story (story.js) replaces the Next card and Directions; flights become 🔔 reminders
      var keep = k.id === 'pp-scene';
      if (/\bacts\b/.test(k.className)) [].slice.call(k.children).forEach(function (b) { if (/ask penpen/i.test(txt(b))) b.classList.add('pp-ask'); });
      k.classList.toggle('pp-hide', !keep);
      if (/WHO OWES WHO/i.test(txt(k))) {
        var m = txt(k).match(/WHO OWES WHO\s*(₱[\d,.]+)\s*(.+?)(?=POCKET|$)/i);
        if (m) { owe = m[1]; oweWho = m[2].replace(/\s+owes\s+/i, ' → '); }
      }
    });
    if (!on()) { var a = document.getElementById('pp-tiles'), b = document.getElementById('pp-talkbig'); if (a) a.remove(); if (b) b.remove(); return; }
    var tiles = document.getElementById('pp-tiles');
    if (!tiles) {
      tiles = document.createElement('div'); tiles.id = 'pp-tiles';
      var sc = document.getElementById('pp-scene');
      if (sc && sc.nextSibling) t.insertBefore(tiles, sc.nextSibling); else t.appendChild(tiles);
    }
    // total spent so far; tap for who owes who and the details
    var T = null; try { T = JSON.parse(localStorage.getItem('pp_c_penpenToday:[]') || 'null'); } catch (e) {}
    var g = T && T.budget && T.budget.group, spent = g ? Math.round(g.spent || 0) : null;
    var html = '<button type="button" data-a="money"><span class="ic">💸</span>' + (spent !== null ? '₱' + spent.toLocaleString('en-US') : 'Money') + '<small>' + (spent !== null ? 'spent so far · details ›' : 'tap to see') + '</small></button>' +
      '<button type="button" data-a="diary"><span class="ic">📔</span>Diary<small>add a memory</small></button>';
    if (tiles.dataset.h !== html) { tiles.innerHTML = html; tiles.dataset.h = html; }
    tiles.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'money') nav('Money');
      if (b.dataset.a === 'plan') nav('Plan');
      if (b.dataset.a === 'diary') click('#to-diary');
    };
  }

  function money() {
    var m = document.getElementById('money'); if (!m || !m.querySelector('.stats')) return;
    var total = m.querySelector('.stats > .card');
    if (total && !total.dataset.pp) {
      // make the peso total the big number, the dollar amount small
      total.dataset.pp = '1';
      var peso = [].slice.call(total.querySelectorAll('*')).filter(function (e) { return !e.children.length && /^₱/.test(txt(e)); })[0];
      if (peso) peso.classList.add('pp-big');
    }
    var needs = 0;
    [].slice.call(m.children).forEach(function (c) {
      var t = txt(c);
      if (/Who paid what/i.test(t)) c.classList.add('pp-more');
      var nl = t.match(/^Needs a look \((\d+)\)/i); if (nl) { c.classList.add('pp-more'); needs = +nl[1]; }
      if (/where the (group )?money went/i.test(t)) compactCats(c);
    });
    // "group money" reads oddly on a solo trip
    [].slice.call(m.querySelectorAll('*')).forEach(function (e) { if (!e.children.length && /group money/i.test(e.textContent)) e.textContent = e.textContent.replace(/group money/i, 'money'); });
    m.dataset.needs = needs;
    var top = document.querySelector('#p-money .moneybtns'); if (top) top.classList.add('pp-more');
    if (!document.getElementById('pp-morebtn')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'pp-morebtn';
      b.onclick = function () { document.body.classList.toggle('pp-more-on'); paintMore(); };
      m.parentNode.insertBefore(b, m.nextSibling);
    }
    paintMore();
    document.getElementById('pp-morebtn').style.display = on() ? '' : 'none';
  }

  function paintMore() {
    var b = document.getElementById('pp-morebtn'), m = document.getElementById('money'); if (!b || !m) return;
    var n = +(m.dataset.needs || 0), open = document.body.classList.contains('pp-more-on');
    var h = open ? 'Less ‹' : 'Details ›' + (n ? ' <span class="pp-badge">' + n + ' to check</span>' : '') + ' <small>who paid what · audit · receipt</small>';
    if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; }
  }
  var PAL = ['#237566', '#F4A62A', '#4A90C2', '#C8553D', '#8E7CC3', '#6BAF5C', '#E39BB6', '#7A8B99'];
  function compactCats(card) {
    if (card.dataset.pp === txt(card)) return;
    var rows = [], re = /([A-Za-z&'\/ ]+?)\s*₱([\d,]+)\s*·\s*(\d+)%/g, t = txt(card).replace(/where the (group )?money went/i, ''), r;
    while ((r = re.exec(t))) rows.push({ n: r[1].trim(), v: r[2], p: +r[3] });
    if (!rows.length) return;
    var bar = rows.map(function (x, i) { return '<i style="width:' + Math.max(x.p, 2) + '%;background:' + PAL[i % PAL.length] + '"></i>'; }).join('');
    var leg = rows.map(function (x, i) { return '<span><b style="background:' + PAL[i % PAL.length] + '"></b>' + x.n + ' <em>₱' + x.v + '</em></span>'; }).join('');
    card.classList.add('pp-cats');
    card.innerHTML = '<div class="pp-cat-t">Where the money went</div><div class="pp-cat-bar">' + bar + '</div><div class="pp-cat-leg">' + leg + '</div>';
    card.dataset.pp = txt(card);
  }

  function apply() { document.body.classList.toggle('pp-simple', on()); today(); money(); }
  window.ppSimple = function (v) { localStorage.setItem(KEY, v ? '1' : '0'); apply(); };

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    apply();
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { apply(); busy = false; });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
