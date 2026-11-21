/* penpen UI touches
   - "?" help opens as a little speech bubble next to the button (tap anywhere to close)
   - a friendly "Add to home screen" card (once, dismissible) */
(function () {
  var css =
    '.pp-qt{position:fixed!important;z-index:99980;max-width:260px;background:#2B2A28;color:#fff;padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.35;box-shadow:0 8px 24px rgba(0,0,0,.18);animation:ppPop .16s ease-out;margin:0!important}' +
    '.pp-qt::before{content:"";position:absolute;top:-6px;left:var(--ax,20px);width:12px;height:12px;background:#2B2A28;transform:rotate(45deg);border-radius:2px}' +
    '.pp-qt.up::before{top:auto;bottom:-6px}' +
    '@keyframes ppPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}' +
    '#pp-inst{position:fixed;left:12px;right:12px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:99970;max-width:480px;margin:0 auto;background:#fff;color:#2B2A28;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.16);display:flex;align-items:center;gap:12px;padding:12px 14px;font:15px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
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

  function start() { addCss(); setTimeout(installCard, 12000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
