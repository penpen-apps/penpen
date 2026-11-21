/* penpen look & feel, My profile and Settings
   - Light / Dark / Match my phone: one place decides, and every screen switches at once
   - My profile: shows what you saved; tap Edit to change it. Settings hold penpen's voice, scene and appearance
   - penpen is always the guide
   - Crew keeps people + safety; hotels, tours & transport move to Plan as "Bookings"
   - The penguins on Today move around on their own */
(function () {
  var LIGHT = '--bg:#F6EEDF;--card:#FFFDF8;--ink:#13324A;--muted:#4F6475;--line:#E8DCC6;--accent:#237566;--accentText:#1D5E52;--accentInk:#FFFFFF;--accentSoft:#E2EFEA;--sun:#F4A62A;--sunInk:#3D2A00;--chip:#EDE2CC;--leaf:#2E8B57;--warn:#A44A00;--warnSoft:#FFE9CC;--danger:#B3261E';
  var DARK = '--bg:#0B1E2D;--card:#13293B;--ink:#EAF4F7;--muted:#A7BCC9;--line:#21405A;--accent:#11606B;--accentText:#5FD8E2;--accentInk:#FFFFFF;--accentSoft:#123C48;--sun:#FFC93C;--sunInk:#3A2700;--chip:#1A3348;--leaf:#5BD39A;--warn:#FFB25C;--warnSoft:#3A2812;--danger:#FF8A80';
  var F = 'Nunito,-apple-system,BlinkMacSystemFont,sans-serif';
  var css =
    'html.ppl{' + LIGHT + '}html.ppd{' + DARK + '}html.ppd{color-scheme:dark}html.ppl{color-scheme:light}' +
    /* My profile */
    '#pp-me{position:fixed;inset:0;z-index:99960;background:var(--bg);color:var(--ink);overflow:auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:16px/1.4 ' + F + '}' +
    '#pp-me .top{display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto 6px}#pp-me .top h2{flex:1;margin:0;font:900 24px ' + F + '}' +
    '#pp-me .back{border:0;background:var(--card);color:var(--ink);border-radius:50%;width:40px;height:40px;font-size:24px;line-height:1;padding:0 0 3px;display:grid;place-items:center;cursor:pointer}' +
    '#pp-me .wrapme{max-width:560px;margin:0 auto}' +
    '#pp-me .mecard{display:flex;align-items:center;gap:14px;background:var(--card);border-radius:20px;padding:16px;margin-top:12px}' +
    '#pp-me .mecard .av{width:72px;height:72px;flex:0 0 72px;display:grid;place-items:center}#pp-me .mecard .av svg{width:72px;height:72px}' +
    '#pp-me .mecard .nm{font:900 22px ' + F + ';color:var(--ink)}#pp-me .mecard .ph{color:var(--muted);font-size:15px;margin-top:2px}' +
    '#pp-me .mecard .ed{margin-left:auto;border:1.5px solid var(--accent);background:none;color:var(--accentText);border-radius:14px;padding:9px 14px;font:800 15px ' + F + ';cursor:pointer}' +
    '#pp-me .edit{background:var(--card);border-radius:20px;padding:16px;margin-top:10px}' +
    '#pp-me .edit label{display:block;font:800 13px ' + F + ';color:var(--muted);margin:0 2px 6px}' +
    '#pp-me .edit input{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:14px;padding:12px;font:17px ' + F + ';background:var(--bg);color:var(--ink)}' +
    '#pp-me .edit .btns{display:flex;gap:10px;margin-top:12px}#pp-me .edit .btns button{flex:1;min-height:50px;border-radius:14px;font:800 16px ' + F + ';cursor:pointer;border:1.5px solid var(--accent);background:none;color:var(--accentText)}' +
    '#pp-me .edit .btns .save{background:var(--accent);color:#fff;border-color:var(--accent)}#pp-me .edit .msg{text-align:center;color:var(--muted);font-size:14px;margin-top:8px;min-height:18px}' +
    '#pp-me h3{font:900 13px ' + F + ';letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:22px 4px 8px}' +
    '#pp-me .rows{background:var(--card);border-radius:20px;overflow:hidden}' +
    '#pp-me .rows > button,#pp-me .rows > div{display:flex;width:100%;align-items:center;gap:12px;border:0;background:none;font:16px ' + F + ';color:var(--ink);padding:15px 16px;border-top:1px solid var(--line);text-align:left;box-sizing:border-box}' +
    '#pp-me .rows > :first-child{border-top:0}#pp-me .rows i{font-style:normal;font-size:20px;width:26px;text-align:center}#pp-me .rows .chev{margin-left:auto;color:var(--muted)}' +
    '#pp-me .rows > div{flex-wrap:wrap}#pp-me .rows > div > span{flex:1 0 auto}' +
    '#pp-me .chips{display:flex;flex-wrap:wrap;gap:8px;width:100%;padding-left:38px;box-sizing:border-box}' +
    '#pp-me .chips button{border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:99px;padding:9px 14px;font:800 15px ' + F + ';cursor:pointer}' +
    '#pp-me .chips button.on{background:var(--accent);border-color:var(--accent);color:#fff}' +
    '#pp-me .who{color:var(--muted);font-size:14px;text-align:center;margin:16px 0 4px}' +
    /* the profile card on Crew: flight, guide, scene and appearance now live elsewhere */
    '.pp-hidex{display:none!important}' +
    /* penguins with a mind of their own */
    '#pp-scene .pp-who > svg,#pp-scene .pp-guide > svg{transform-origin:50% 92%;transform-box:fill-box}' +
    '.pp-a-hop{animation:ppHop .8s ease}.pp-a-wig{animation:ppWig2 .9s ease}.pp-a-look{animation:ppLook 1.6s ease}.pp-a-wad{animation:ppWad 1.8s ease}.pp-a-spin{animation:ppSpin 1s ease}.pp-a-dance{animation:ppDance 1.4s ease}' +
    '@keyframes ppHop{0%,100%{transform:translateY(0)}25%{transform:translateY(-20px) scale(1.03,.97)}50%{transform:translateY(0) scale(1.06,.92)}70%{transform:translateY(-7px)}}' +
    '@keyframes ppWig2{0%,100%{transform:rotate(0)}20%{transform:rotate(-9deg)}40%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}}' +
    '@keyframes ppLook{0%,100%{transform:scaleX(1)}20%,45%{transform:scaleX(-1)}55%,85%{transform:scaleX(1) rotate(4deg)}}' +
    '@keyframes ppWad{0%,100%{transform:translateX(0) rotate(0)}15%{transform:translateX(-6px) rotate(-6deg)}35%{transform:translateX(-12px) rotate(6deg)}55%{transform:translateX(-6px) rotate(-6deg)}75%{transform:translateX(0) rotate(5deg)}}' +
    '@keyframes ppSpin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}' +
    '@keyframes ppDance{0%,100%{transform:rotate(0) translateY(0)}20%{transform:rotate(-10deg) translateY(-6px)}40%{transform:rotate(10deg) translateY(0)}60%{transform:rotate(-10deg) translateY(-6px)}80%{transform:rotate(10deg) translateY(0)}}' +
    '.pp-emo{position:absolute;font-size:20px;pointer-events:none;animation:ppEmo 1.6s ease-out forwards;z-index:3}' +
    '@keyframes ppEmo{0%{opacity:0;transform:translateY(6px) scale(.6)}20%{opacity:1;transform:translateY(-4px) scale(1)}100%{opacity:0;transform:translateY(-34px) scale(1)}}' +
    '@media (prefers-reduced-motion:reduce){[class*=pp-a-],.pp-emo{animation:none!important}}';

  function prefs() { try { return JSON.parse(localStorage.getItem('pp_prefs') || '{}'); } catch (e) { return {}; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function navBtn(label) { return [].slice.call(document.querySelectorAll('button')).filter(function (b) { return b.textContent.trim() === label && b.className !== 'back'; })[0]; }

  /* ---------- light / dark ---------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function mode() { return prefs().mode || 'auto'; }
  function theme() {
    var m = mode(), d = m === 'dark' || (m !== 'light' && mq.matches), h = document.documentElement;
    h.classList.toggle('ppd', d); h.classList.toggle('ppl', !d);
    if (document.body) document.body.classList.toggle('pp-dark', d);
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', d ? '#0B1E2D' : '#F6EEDF');
  }
  try { mq.addEventListener('change', theme); } catch (e) { mq.addListener(theme); }
  window.ppTheme = theme;

  /* the app's own settings buttons only work inside Crew, so we press them there */
  function pref(v) {
    var host = document.getElementById('crew'); if (!host) return false;
    var b = document.createElement('button'); b.type = 'button'; b.dataset.pref = v; b.style.display = 'none';
    host.appendChild(b); b.click(); b.remove(); setTimeout(theme, 30); return true;
  }

  /* ---------- me ---------- */
  function meData() {
    var r = null; try { r = JSON.parse(localStorage.getItem('pp_c_penpenProfiles:[]') || 'null'); } catch (e) {}
    var p = r && (r.people || []).filter(function (x) { return x.isMe; })[0];
    var tok = {}; try { tok = JSON.parse(localStorage.getItem('pp_tok') || '{}') || {}; } catch (e) {}
    return { name: (p && p.name) || tok.name || 'Me', phone: (p && p.phone) || '', email: tok.email || '' };
  }
  function avatar() {
    var s = document.querySelector('#pp-scene .pp-me > svg');
    if (s) { try { localStorage.setItem('pp_me_av', s.outerHTML); } catch (e) {} return s.outerHTML; }
    return localStorage.getItem('pp_me_av') || '<span style="font-size:40px">🐧</span>';
  }
  /* the original profile card lives on Crew: open it out of sight, use it, come back */
  function withProf(fn, stay) {
    var cur = document.querySelector('button[aria-current="page"]'), back = cur && cur.textContent.trim();
    var c = navBtn('Crew'); if (c) c.click();
    var tries = 0, tapped = false;
    (function wait() {
      var p = document.querySelector('#crew .pp-prof');
      if (p) { fn(p); if (!stay && back && back !== 'Crew') setTimeout(function () { var b = navBtn(back); if (b) b.click(); }, 400); return; }
      var mine = [].slice.call(document.querySelectorAll('#crew .pp-list button')).filter(function (b) { return /· you/.test(b.textContent); })[0];
      if (mine && !tapped) { tapped = true; mine.click(); }
      if (++tries < 40) setTimeout(wait, 150); else fn(null);
    })();
  }

  var SCENES = [['auto', 'Auto'], ['beach', 'Beach'], ['mountain', 'Mountain'], ['city', 'City'], ['desert', 'Desert'], ['snow', 'Snow']];
  var MODES = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match my phone']];
  function chips(list, cur, kind) { return list.map(function (x) { return '<button type="button" data-k="' + kind + '" data-v="' + x[0] + '" class="' + (x[0] === cur ? 'on' : '') + '">' + x[1] + '</button>'; }).join(''); }

  function openMe() {
    if (document.getElementById('pp-me')) return;
    var cur = document.querySelector('button[aria-current="page"]'), back = cur && cur.textContent.trim();
    var w = document.createElement('div'); w.id = 'pp-me'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'My profile');
    document.body.appendChild(w);
    function paint(editing, msg) {
      var m = meData(), P = prefs();
      w.innerHTML = '<div class="top"><button class="back" aria-label="Back">‹</button><h2>My profile</h2></div><div class="wrapme">' +
        '<div class="mecard"><div class="av">' + avatar() + '</div><div><div class="nm">' + esc(m.name) + '</div><div class="ph">' + (m.phone ? '📞 ' + esc(m.phone) : 'No phone number yet') + '</div></div>' +
        (editing ? '' : '<button type="button" class="ed" data-a="edit">✏️ Edit</button>') + '</div>' +
        (editing ? '<div class="edit"><label for="pp-me-ph">My phone</label><input id="pp-me-ph" type="tel" inputmode="tel" placeholder="e.g. 0917 123 4567" value="' + esc(m.phone) + '">' +
          '<div class="btns"><button type="button" data-a="cancel">Cancel</button><button type="button" class="save" data-a="save">Save</button></div>' +
          '<div class="btns"><button type="button" data-a="penguin">🐧 Change my penguin</button></div><div class="msg">' + (msg || '') + '</div></div>' : '') +
        '<h3>Settings</h3><div class="rows">' +
        '<button type="button" data-a="voice"><i>🔊</i>penpen\'s voice<span class="chev">›</span></button>' +
        '<div><i>🏝️</i><span>Scene</span><div class="chips">' + chips(SCENES, P.scene || 'auto', 'scene') + '</div></div>' +
        '<div><i>🌗</i><span>Appearance</span><div class="chips">' + chips(MODES, P.mode || 'auto', 'mode') + '</div></div>' +
        '<button type="button" data-a="install"><i>📲</i>Add penpen to my phone<span class="chev">›</span></button>' +
        '<button type="button" data-a="out"><i>↩︎</i>Sign out</button>' +
        '</div><div class="who">' + esc(m.email) + '</div></div>';
      if (editing) setTimeout(function () { var i = document.getElementById('pp-me-ph'); if (i) i.focus(); }, 50);
    }
    paint(false);
    function close() { w.remove(); if (back && back !== 'Crew' && !document.querySelector('button[aria-current="page"]')) { var b = navBtn(back); if (b) b.click(); } }
    w.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('back')) return close();
      if (b.dataset.k) {
        if (pref(b.dataset.k + ':' + b.dataset.v)) { [].slice.call(b.parentNode.children).forEach(function (x) { x.classList.toggle('on', x === b); }); }
        return;
      }
      var a = b.dataset.a;
      if (a === 'edit') return paint(true);
      if (a === 'cancel') return paint(false);
      if (a === 'save') {
        var v = document.getElementById('pp-me-ph').value.trim();
        b.disabled = true; b.textContent = 'Saving…';
        withProf(function (p) {
          var ins = p ? p.querySelectorAll('input') : [], ph = ins[ins.length - 1], sv = p && p.querySelector('[data-pfsave]');
          if (!ph || !sv) return paint(true, "Couldn't save — try again.");
          ph.value = v; ph.dispatchEvent(new Event('input', { bubbles: true })); sv.click();
          setTimeout(function () {
            var done = function () { paint(false); };
            if (window.ppCall) window.ppCall('penpenProfiles', []).then(done, done); else done();
          }, 1200);
        });
        return;
      }
      if (a === 'penguin') { w.remove(); withProf(function (p) { var ed = p && p.querySelector('[data-edit]'); if (ed) ed.click(); }, true); return; }
      if (a === 'voice' && window.ppVoicePicker) window.ppVoicePicker();
      if (a === 'install' && window.ppInstall) window.ppInstall();
      if (a === 'out' && window.ppSignOut) window.ppSignOut();
    };
  }
  window.ppOpenMe = openMe;

  /* ---------- Crew & Plan tidy-up ---------- */
  function tidy() {
    // penpen is always the guide
    if (prefs().guide && prefs().guide !== 'penpen') pref('guide:penpen');
    // profile card on Crew: hide flight + the settings that moved to My profile
    var p = document.querySelector('#crew .pp-prof');
    if (p && !p.dataset.tidy) {
      p.dataset.tidy = '1';
      [].slice.call(p.children).forEach(function (k, i, all) {
        var t = (k.textContent || '').trim().toUpperCase();
        if (/^MY FLIGHT$/.test(t)) { k.classList.add('pp-hidex'); if (all[i + 1] && all[i + 1].tagName === 'INPUT') all[i + 1].classList.add('pp-hidex'); }
        if (/^(WHO GUIDES YOU|SCENE|APPEARANCE)$/.test(t)) { k.classList.add('pp-hidex'); if (all[i + 1]) all[i + 1].classList.add('pp-hidex'); }
        if (k.matches && k.matches('[data-tour]')) k.classList.add('pp-hidex');
      });
    }
    // hotels, tours & transport belong with the plan
    var tc = document.getElementById('trip-ct'), plan = document.querySelector('#p-plan .scroll') || document.getElementById('p-plan');
    if (tc && plan && !plan.contains(tc)) {
      var tip = plan.querySelector('.card.tip');
      if (tip && tip.parentNode === plan) plan.insertBefore(tc, tip); else plan.appendChild(tc);
    }
    var fr = document.querySelector('#p-safety .fred');
    if (fr && /Crew & contacts/.test(fr.textContent)) fr.childNodes.forEach(function (n) { if (n.nodeType === 3 && /Crew & contacts/.test(n.textContent)) n.textContent = n.textContent.replace('Crew & contacts', 'Crew & safety'); });
    if (fr && fr.firstElementChild && /Crew & contacts/.test(fr.firstElementChild.textContent) && !fr.firstElementChild.children.length) fr.firstElementChild.textContent = 'Crew & safety';
  }

  /* ---------- penguins with a mind of their own ---------- */
  var MOVES = ['pp-a-hop', 'pp-a-wig', 'pp-a-look', 'pp-a-wad', 'pp-a-spin', 'pp-a-dance'];
  var EMO = ['♪', '❤️', '✨', '😆', '🐟', '💦', '❗', '😴'];
  function wiggle() {
    setTimeout(wiggle, 2200 + Math.random() * 2600);
    if (document.hidden) return;
    var sc = document.getElementById('pp-scene'); if (!sc || !sc.offsetParent) return;
    var ps = sc.querySelectorAll('.pp-who > svg, .pp-guide > svg'); if (!ps.length) return;
    var s = ps[Math.floor(Math.random() * ps.length)], mv = MOVES[Math.floor(Math.random() * MOVES.length)];
    MOVES.forEach(function (x) { s.classList.remove(x); }); void s.getBoundingClientRect(); s.classList.add(mv);
    setTimeout(function () { s.classList.remove(mv); }, 2000);
    if (Math.random() < 0.35) {
      var e = document.createElement('span'); e.className = 'pp-emo'; e.textContent = EMO[Math.floor(Math.random() * EMO.length)];
      var r = s.getBoundingClientRect(), R = sc.getBoundingClientRect();
      if (getComputedStyle(sc).position === 'static') sc.style.position = 'relative';
      e.style.left = (r.left - R.left + r.width * 0.62) + 'px'; e.style.top = (r.top - R.top - 6) + 'px';
      sc.appendChild(e); setTimeout(function () { e.remove(); }, 1700);
    }
  }

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    theme();
    new MutationObserver(theme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setInterval(theme, 1500);
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { try { tidy(); } catch (e) {} busy = false; });
    }).observe(document.body, { childList: true, subtree: true });
    tidy();
    setTimeout(wiggle, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
