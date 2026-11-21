/* penpen Simple screens (on by default; switch off in My profile → "Simple screens")
   Today: one Next card, three big tiles (who owes · plan · diary) and one Talk button.
   Money: one big total, who owes, what's left to pay. Everything else sits under "More". */
(function () {
  var KEY = 'pp_simple';
  function on() { return localStorage.getItem(KEY) !== '0'; }
  var css =
    /* Today */
    'body.pp-simple #line{display:none!important}' +
    'body.pp-simple #today > .pp-hide{display:none!important}' +
    '#pp-tiles{display:flex;gap:12px;margin:14px 0 0}' +
    '#pp-tiles button{flex:1;min-height:104px;border:0;border-radius:20px;background:#FFFDF8;box-shadow:0 1px 0 #E8DCC6,0 8px 20px rgba(19,50,74,.07);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:800 15px Nunito,-apple-system,sans-serif;color:#13324A;cursor:pointer;padding:8px 4px}' +
    '#pp-tiles .ic{font-size:30px;line-height:1}#pp-tiles small{font-weight:700;font-size:12.5px;color:#4F6475}' +
    '#pp-talkbig{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;min-height:62px;margin:14px 0 8px;border:0;border-radius:20px;background:#237566;color:#fff;font:800 18px Nunito,-apple-system,sans-serif;cursor:pointer}' +
    'body.pp-dark #pp-tiles button{background:#29312E;color:#F1ECE2}' +
    /* Money */
    'body.pp-simple #money .stats{display:block!important}' +
    'body.pp-simple #money .stats > .card:not(:first-child){display:none!important}' +
    'body.pp-simple #money .stats > .card:first-child{text-align:center;padding:18px!important}' +
    'body.pp-simple #money .stats > .card:first-child *{font-size:inherit}' +
    'body.pp-simple #money .pp-big{font-size:44px!important;font-weight:700;line-height:1.1;display:block}' +
    'body.pp-simple:not(.pp-more-on) .pp-more{display:none!important}' +
    '#pp-morebtn{display:block;width:100%;min-height:54px;margin:12px 0;border:0;border-radius:18px;background:#EDE2CC;color:#13324A;font:800 16px Nunito,-apple-system,sans-serif;cursor:pointer}';

  function txt(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function click(sel) { var b = typeof sel === 'string' ? document.querySelector(sel) : sel; if (b) b.click(); }
  function nav(label) { var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === label && x.className !== 'back'; })[0]; if (b) b.click(); }

  function today() {
    var t = document.getElementById('today'); if (!t) return;
    var kids = [].slice.call(t.children), owe = '', oweWho = '';
    kids.forEach(function (k) {
      if (k.id === 'pp-tiles' || k.id === 'pp-talkbig') return;
      var keep = k.id === 'pp-scene' || /\bnext\b/.test(k.className) || /\bacts\b/.test(k.className);
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
      var acts = t.querySelector('.acts') || t.querySelector('.next');
      if (acts && acts.nextSibling) t.insertBefore(tiles, acts.nextSibling); else t.appendChild(tiles);
      var talk = document.createElement('button'); talk.type = 'button'; talk.id = 'pp-talkbig'; talk.innerHTML = '🎙️ Talk to penpen';
      talk.onclick = function () { if (window.ppTalk) window.ppTalk(); };
      t.insertBefore(talk, tiles.nextSibling);
    }
    var html = '<button type="button" data-a="money"><span class="ic">💸</span>' + (owe ? owe.replace(/\.\d\d$/, '') : 'Money') + '<small>' + (oweWho || 'all settled') + '</small></button>' +
      '<button type="button" data-a="plan"><span class="ic">🗓️</span>Plan<small>day by day</small></button>' +
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
    [].slice.call(m.children).forEach(function (c) { if (/Who paid what/i.test(txt(c))) c.classList.add('pp-more'); });
    var top = document.querySelector('#p-money .moneybtns'); if (top) top.classList.add('pp-more');
    if (!document.getElementById('pp-morebtn')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'pp-morebtn';
      b.onclick = function () { document.body.classList.toggle('pp-more-on'); b.textContent = document.body.classList.contains('pp-more-on') ? 'Less ‹' : 'More › (who paid what, audit, receipt)'; };
      b.textContent = 'More › (who paid what, audit, receipt)';
      m.parentNode.insertBefore(b, m.nextSibling);
    }
    document.getElementById('pp-morebtn').style.display = on() ? '' : 'none';
  }

  function apply() { document.body.classList.toggle('pp-simple', on()); today(); money(); }
  window.ppSimple = function (v) { localStorage.setItem(KEY, v ? '1' : '0'); apply(); };

  // a switch in My profile
  function profileSwitch() {
    var rows = document.querySelector('#pp-me .rows'); if (!rows || rows.querySelector('[data-a="simple"]')) return;
    var b = document.createElement('button'); b.dataset.a = 'simple';
    var paint = function () { b.innerHTML = '<i>✨</i>Simple screens<span class="chev">' + (on() ? 'On' : 'Off') + '</span>'; };
    paint(); b.onclick = function (e) { e.stopPropagation(); window.ppSimple(!on()); paint(); };
    rows.insertBefore(b, rows.firstChild);
  }

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    apply();
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { apply(); profileSwitch(); busy = false; });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
