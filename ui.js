/* penpen UI touches
   - "?" help opens as a little speech bubble next to the button (tap anywhere to close)
   - a friendly "Add to home screen" card (once, dismissible) */
(function () {
  var css =
    '.pp-qt{position:fixed!important;z-index:99980;max-width:260px;background:#2B2A28;color:#fff;padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.35;box-shadow:0 8px 24px rgba(0,0,0,.18);animation:ppPop .16s ease-out;margin:0!important}' +
    '.pp-qt::before{content:"";position:absolute;top:-6px;left:var(--ax,20px);width:12px;height:12px;background:#2B2A28;transform:rotate(45deg);border-radius:2px}' +
    '.pp-qt.up::before{top:auto;bottom:-6px}' +
    '@keyframes ppPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}' +
    '#pp-inst{position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:99970;max-width:480px;margin:0 auto;background:#fff;color:#2B2A28;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.16);display:flex;align-items:center;gap:12px;padding:12px 14px;font:15px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '#pp-inst b{display:block}#pp-inst .g{flex:1}#pp-inst button{font:inherit;border:0;border-radius:12px;padding:9px 14px}' +
    '#pp-inst .add{background:#237566;color:#fff}#pp-inst .x{background:none;color:#7A7468;padding:6px 8px;font-size:18px}' +
    'body.pp-dark #pp-inst{background:#29312E;color:#F1ECE2}';
  function addCss() { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  /* ---------- help bubbles ---------- */
  function place(btn) {
    var host = btn.parentNode, n = host && host.querySelector('.pp-qt');
    if (!n) return;
    var r = btn.getBoundingClientRect(), w = Math.min(260, window.innerWidth - 24);
    n.style.width = 'auto'; n.style.maxWidth = w + 'px';
    var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    var below = r.bottom + 10, h = n.offsetHeight || 60;
    var up = below + h > window.innerHeight - 90;
    n.classList.toggle('up', up);
    n.style.left = left + 'px';
    n.style.top = (up ? r.top - h - 10 : below) + 'px';
    n.style.setProperty('--ax', Math.max(12, Math.min(w - 24, r.left + r.width / 2 - left - 6)) + 'px');
  }
  document.addEventListener('click', function (e) {
    var q = e.target.closest && e.target.closest('.pp-q');
    // close any open bubble that isn't this button's
    document.querySelectorAll('.pp-qt').forEach(function (n) {
      if (!q || n.parentNode !== q.parentNode) { var b = n.parentNode && n.parentNode.querySelector('.pp-q'); n.remove(); if (b) b.setAttribute('aria-expanded', 'false'); }
    });
    if (q) setTimeout(function () { place(q); }, 0);
  }, true);
  window.addEventListener('scroll', function () { document.querySelectorAll('.pp-qt').forEach(function (n) { n.remove(); }); }, true);

  /* ---------- add to home screen ---------- */
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; }
  function installCard() {
    if (standalone() || localStorage.getItem('pp_inst_no') === '1') return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var c = document.createElement('div'); c.id = 'pp-inst';
    c.innerHTML = '<div style="font-size:28px">📲</div><div class="g"><b>Add penpen to your phone</b>' +
      (ios ? 'Tap <b style="display:inline">Share</b> ⬆︎ then <b style="display:inline">Add to Home Screen</b>' : 'Opens like an app, works offline') +
      '</div>' + (ios ? '' : '<button class="add">Add</button>') + '<button class="x" aria-label="Not now">✕</button>';
    document.body.appendChild(c);
    c.querySelector('.x').onclick = function () { localStorage.setItem('pp_inst_no', '1'); c.remove(); };
    var a = c.querySelector('.add'); if (a) a.onclick = function () { if (window.ppInstall) window.ppInstall(); c.remove(); };
  }


  /* ---------- clearer action buttons (Directions, Call…) ---------- */
  var css2 =
    '.acts .act,.ctb .act,.ctb > a,.ctb > button{background:#237566!important;color:#fff!important;border:0!important;font-weight:600!important;box-shadow:0 2px 8px rgba(35,117,102,.25)!important;display:inline-flex!important;align-items:center;gap:6px}' +
    '.acts .act:active,.ctb .act:active,.ctb > a:active{transform:scale(.97)}' +
    '.pp-num{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.pp-num button,.pp-num a{font:inherit;font-size:14px;border-radius:12px;padding:8px 12px;border:1.5px solid #237566;background:none;color:#237566;text-decoration:none;font-weight:600}' +
    '.pp-num input{flex:1;min-width:150px;font:inherit;font-size:15px;padding:8px 10px;border-radius:12px;border:1.5px solid #E8DDC8;background:#fff}' +
    '.pp-num .ok{background:#237566;color:#fff}' +
    '.pp-num .saved{color:#237566;font-weight:600;padding:8px 0}' +
    /* my profile */
    '#pp-mebtn{width:44px;height:44px;border-radius:50%;border:0;background:#fff;display:grid;place-items:center;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:0;margin-left:6px}' +
    '#pp-mebtn svg{width:40px;height:40px}' +
    '#crew > .pp-prof{display:none}' +
    '';

  /* "No number yet…" → 🔎 Find number + ＋ Add */
  function fixMissing(root) {
    (root.querySelectorAll ? root.querySelectorAll('.ct .missing') : []).forEach(function (m) {
      if (m.dataset.pp) return; m.dataset.pp = '1';
      var ct = m.closest('.ct'), name = (ct.querySelector('.n') || {}).textContent || '';
      name = name.trim();
      if (!name || /emergency|’s |'s /i.test(name)) { m.textContent = 'No number yet'; return; }   // people: no web search
      var q = 'https://www.google.com/search?q=' + encodeURIComponent(name + ' phone number');
      var box = document.createElement('div'); box.className = 'pp-num';
      box.innerHTML = '<a href="' + q + '" target="_blank" rel="noopener">🔎 Find number</a><button type="button" class="add">＋ Add</button>';
      m.replaceWith(box);
      box.querySelector('.add').onclick = function () {
        box.innerHTML = '<input type="tel" inputmode="tel" placeholder="Paste or type the number" aria-label="Phone number for ' + name.replace(/"/g, '') + '"><button type="button" class="ok">Save</button>';
        var inp = box.querySelector('input'); inp.focus();
        box.querySelector('.ok').onclick = function () {
          var num = inp.value.trim(); if (num.replace(/\D/g, '').length < 7) { inp.focus(); return; }
          box.innerHTML = '<span class="saved">Saving…</span>';
          window.ppCall('penpenLiveAction', [name + "'s number is " + num]).then(function () {
            box.innerHTML = '<span class="saved">✓ Saved</span><a href="tel:' + num.replace(/[^\d+]/g, '') + '">📞 Call</a>';
          }, function (e) { box.innerHTML = '<span class="saved">Couldn\'t save: ' + e.message + '</span>'; });
        };
      };
    });
  }

  /* ---------- My profile ---------- */
  function myAvatar() {
    var row = [].slice.call(document.querySelectorAll('#crew .pp-list button')).filter(function (b) { return /· you/.test(b.textContent); })[0];
    var svg = row && row.querySelector('svg');
    if (svg) { try { localStorage.setItem('pp_me_av', svg.outerHTML); } catch (e) {} return svg.outerHTML; }
    return localStorage.getItem('pp_me_av') || '<span style="font-size:22px">🙂</span>';
  }
  function meButton() {
    var v = document.getElementById('voice'); if (!v) return;
    var b = document.getElementById('pp-mebtn');
    if (!b) { b = document.createElement('button'); b.id = 'pp-mebtn'; b.setAttribute('aria-label', 'My profile'); b.onclick = function () { (window.ppOpenMe || function () { openMe(0); })(); }; v.parentNode.appendChild(b); }
    var a = myAvatar(); if (b.dataset.a !== a) { b.innerHTML = a; b.dataset.a = a; }
  }
  function navBtn(label) { return [].slice.call(document.querySelectorAll('button[aria-current="page"], nav button, .tabs button, button')).filter(function (b) { return b.textContent.trim() === label && b.className !== 'back'; })[0]; }
  function openMe(tries) {
    var prof = document.querySelector('.pp-prof');
    if (!prof) {
      // the profile lives on the Crew tab: open it behind the scenes, then come back
      if (!tries) { var cur = document.querySelector('button[aria-current="page"]'); openMe.back = cur && cur.textContent.trim(); var c = navBtn('Crew'); if (c) c.click(); }
      var mine = [].slice.call(document.querySelectorAll('#crew .pp-list button')).filter(function (b) { return /· you/.test(b.textContent); })[0];
      if (mine && !openMe.tapped) { openMe.tapped = true; mine.click(); }
      if ((tries || 0) < 25) setTimeout(function () { openMe((tries || 0) + 1); }, 200);
      return;
    }
    openMe.tapped = false;
    var home = prof.parentNode, next = prof.nextSibling;
    var w = document.createElement('div'); w.id = 'pp-me'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'My profile');
    w.innerHTML = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>My profile</h2></div><div class="wrapme"><div class="slot"></div>' +
      '<div class="rows">' +
      '<button data-a="voice"><i>🔊</i>penpen\'s voice<span class="chev">›</span></button>' +
      '<button data-a="install"><i>📲</i>Add penpen to my phone<span class="chev">›</span></button>' +
      '<button data-a="out"><i>↩︎</i>Sign out</button>' +
      '</div><div class="who">' + ((JSON.parse(localStorage.getItem('pp_tok') || '{}') || {}).email || '') + '</div></div>';
    document.body.appendChild(w);
    w.querySelector('.slot').appendChild(prof);
    function close() {
      if (next && next.parentNode === home) home.insertBefore(prof, next); else home.appendChild(prof); w.remove();
      if (openMe.back && openMe.back !== 'Crew') { var b = navBtn(openMe.back); if (b) b.click(); } openMe.back = null;
    }
    w.querySelector('.back').onclick = close;
    w.querySelector('.rows').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'voice' && window.ppVoicePicker) window.ppVoicePicker();
      if (b.dataset.a === 'install' && window.ppInstall) window.ppInstall();
      if (b.dataset.a === 'out' && window.ppSignOut) window.ppSignOut();
    };
  }
  window.ppOpenMe = function () { openMe(0); };

  function watch() {
    var st = document.createElement('style'); st.textContent = css2; document.head.appendChild(st);
    fixMissing(document); meButton();
    new MutationObserver(function (ms) {
      var crewChanged = false;
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { fixMissing(n); if (n.closest && n.closest('#crew')) crewChanged = true; } }); });
      if (crewChanged) meButton();
    }).observe(document.body, { childList: true, subtree: true });
  }

  function start() { addCss(); watch(); setTimeout(installCard, 12000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
