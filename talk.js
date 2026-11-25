/* penpen Talk space: a real-time voice conversation (Gemini Live), like ChatGPT's voice mode.
   - Tap the mic: a calm full screen opens, you just talk, penpen answers right away in your chosen voice
   - You can interrupt penpen any time; it stops and listens
   - "Log lunch 450, I paid" etc. go to penpen's money brain, so numbers stay exact
   - When you close it, the conversation appears as text in the chat */
(function () {
  var MODELS = ['models/gemini-3.8-live', 'models/gemini-2.5-flash-native-audio-latest', 'models/gemini-3.1-flash-live-preview'];
  var WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=';
  var S = null; // current session

  function persona() {
    try { var p = JSON.parse(localStorage.getItem('pp_voice_pick') || 'null'); } catch (e) { p = null; }
    return p || 'bubbly';
  }

  /* ---------- screen ---------- */
  var css = '#pp-talk{position:fixed;inset:0;z-index:99995;background:linear-gradient(180deg,#DCEDE7,#F6EEDF);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(28px + env(safe-area-inset-top)) 20px calc(34px + env(safe-area-inset-bottom));font:17px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2B2A28}' +
    'body.pp-dark #pp-talk{background:linear-gradient(180deg,#1E2422,#2A3330);color:#F1ECE2}' +
    '#pp-talk .st{font:800 19px/1.3 Nunito,-apple-system,sans-serif;color:#13324A;background:rgba(255,255,255,.8);border-radius:99px;padding:10px 20px;min-height:24px;text-align:center;max-width:92%}' +
    'body.pp-dark #pp-talk .st{background:rgba(0,0,0,.28);color:#F1ECE2}#pp-talk.holding .st{background:#C8553D;color:#fff}' +
    '#pp-talk .orb{position:relative;width:220px;height:220px;display:grid;place-items:center}' +
    '#pp-talk .ring{position:absolute;inset:0;border-radius:50%;background:#237566;opacity:.12;transform:scale(var(--lvl,1));transition:transform .08s}' +
    '#pp-talk .ring.b{inset:22px;opacity:.18}' +
    '#pp-talk .pen{position:relative;width:150px;height:150px}' +
    '#pp-talk.speaking .pen{animation:ppbob .5s ease-in-out infinite}' +
    '@keyframes ppbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
    '@media (prefers-reduced-motion:reduce){#pp-talk.speaking .pen{animation:none}}' +
    '#pp-talk .cap{max-width:420px;text-align:center;font-size:19px;min-height:54px;opacity:.85}' +
    '#pp-talk .cap .alt{display:block;margin-top:6px;font-size:16px;opacity:.8}' +
    '#pp-talk .bar{display:flex;gap:28px}' +
    '#pp-talk .bar button{width:68px;height:68px;border-radius:50%;border:0;display:grid;place-items:center;font-size:26px;box-shadow:0 4px 14px rgba(0,0,0,.12)}' +
    '#pp-talk .mute{background:#fff;color:#2B2A28}#pp-talk .mute.on{background:#2B2A28;color:#fff}' +
    '#pp-talk .end{background:#C8553D;color:#fff}' +
    '#pp-talk .ptt{display:flex;gap:12px;width:100%;max-width:440px}#pp-talk .ptt button{flex:1;min-height:96px;border-radius:24px;border:0;font:800 17px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#13324A;box-shadow:0 4px 14px rgba(0,0,0,.1);touch-action:none;user-select:none;-webkit-user-select:none}' +
    '#pp-talk .st:empty{display:none}' +
    '#pp-talk .langs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin-bottom:12px;max-width:440px}#pp-talk .langs span{font-weight:800;opacity:.7;font-size:15px}' +
    '#pp-talk .langs button{border:1.5px solid #237566;background:rgba(255,255,255,.7);color:#13324A;border-radius:99px;padding:7px 13px;font:800 14px Nunito,-apple-system,sans-serif}#pp-talk .langs button.on{background:#237566;color:#fff}#pp-talk .langs button.me{background:#13324A;color:#fff;border-color:#13324A}#pp-talk .langs button.sw{width:38px;height:38px;padding:0;font-size:18px;transition:transform .3s}#pp-talk .langs button.sw.spin{transform:rotate(180deg)}#pp-talk .ptt.swapped{flex-direction:row-reverse}' +
    '#pp-talk .ptt button.solo{min-height:120px;font-size:21px}#pp-talk .ptt button.on{background:#C8553D;color:#fff;transform:scale(.97)}#pp-talk .ptt small{display:block;font-weight:700;font-size:13px;opacity:.75;margin-top:4px}' +
    '@media (max-height:720px){#pp-talk{padding-top:calc(16px + env(safe-area-inset-top));padding-bottom:calc(18px + env(safe-area-inset-bottom))}#pp-talk .orb{width:170px;height:170px}#pp-talk .pen{width:118px;height:118px}#pp-talk .cap{font-size:17px}}';
  var PEN = '<svg class="pen" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/><path d="M60 14c-26 0-40 22-40 50 0 26 16 44 40 44s40-18 40-44c0-28-14-50-40-50z" fill="#2E3A4A"/><ellipse cx="60" cy="76" rx="25" ry="28" fill="#FFF8EE"/><circle cx="48.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="71.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="48.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="71.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="50.3" cy="49" r="1.8" fill="#fff"/><circle cx="73.3" cy="49" r="1.8" fill="#fff"/><path d="M54 60q6 7 12 0q-6 4-12 0z" fill="#F4A62A"/><ellipse cx="40" cy="62" rx="5" ry="3" fill="#F7A9A0" opacity=".6"/><ellipse cx="80" cy="62" rx="5" ry="3" fill="#F7A9A0" opacity=".6"/><ellipse cx="48" cy="106" rx="9" ry="4" fill="#F4A62A"/><ellipse cx="72" cy="106" rx="9" ry="4" fill="#F4A62A"/></svg>';

  function myPenguin() {
    // the guide's front-facing penguin (not a copy of the middle button, which may be mid-animation)
    var g = window.ppGuideNow ? window.ppGuideNow() : 'bubbly', inner = (window.ppLook && window.ppLook.svg(g)) || (window.ppFrontPen && window.ppFrontPen());
    if (inner) return '<svg class="pen" viewBox="-1 -6 122 122" aria-hidden="true">' + inner + '</svg>';
    var nav = document.querySelector('#navpen svg');
    if (!nav) return PEN;
    var c = nav.cloneNode(true); c.setAttribute('class', 'pen'); c.removeAttribute('width'); c.removeAttribute('height');
    return c.outerHTML;
  }

  var LANGS = ['Bisaya (Cebuano)', 'Tagalog', 'Thai', 'Vietnamese', 'Mandarin', 'Cantonese', 'Japanese', 'Korean', 'Bahasa Indonesia', 'Malay', 'Hindi', 'Arabic', 'Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Turkish'];
  // languages of where the trip goes (falls back to the phone's time zone)
  function myLang() { return localStorage.getItem('pp_tr_me') || 'English'; }
  function short(l) { return String(l).replace(/ \(.*\)/, ''); }
  function suggested() { return window.ppPlace().langs.slice(); }   // place.js works out the trip's country
  function open(opts) {
    opts = opts || {};
    if (S) return;
    if (!document.getElementById('pp-talk-css')) { var st = document.createElement('style'); st.id = 'pp-talk-css'; st.textContent = css; document.head.appendChild(st); }
    var w = document.createElement('div'); w.id = 'pp-talk'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Talking with penpen');
    w.innerHTML = '<div class="st" id="pp-t-st">Connecting…</div>' +
      '<div class="orb"><div class="ring"></div><div class="ring b"></div>' + myPenguin() + '</div>' +
      '<div class="cap" id="pp-t-cap"></div>' +
      '<div class="bar"><button class="end" id="pp-t-end" aria-label="End">✕</button></div>';
    document.body.appendChild(w);
    S = { el: w, turns: [], inT: '', outT: '', muted: false, model: 0, nextAt: 0, sources: [], mode: opts.mode || 'talk', lang: opts.lang || '' };
    document.getElementById('pp-t-end').onclick = close;
    try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); S.ctx.resume(); } catch (e) {}
    if (S.mode === 'translate' && !S.lang) S.lang = (Date.now() - (+localStorage.getItem('pp_tr_lang_t') || 0) < 6 * 36e5 && localStorage.getItem('pp_tr_lang')) || suggested()[0] || '';
    if (S.mode === 'translate' && !S.lang) return pickLang();   // no local language we know of (e.g. an English-speaking country): let them choose
    begin();
  }
  function pickLang(forMe) {
    status(forMe ? 'Which language do you speak?' : '');
    var last = localStorage.getItem('pp_tr_lang') || '', here = forMe ? [] : suggested();
    var order = forMe ? ['English'] : here.concat(last && here.indexOf(last) < 0 ? [last] : []);
    LANGS.forEach(function (l) { if (order.indexOf(l) < 0) order.push(l); });
    if (forMe) here = [];
    var cap = document.getElementById('pp-t-cap');
    var chip = function (l, top) { return '<button type="button" data-l="' + l + '" style="font:inherit;font-size:16px;border-radius:14px;padding:10px 14px;border:1.5px solid #237566;background:' + (top ? '#237566;color:#fff' : 'rgba(255,255,255,.7);color:#13324A') + '">' + (here.indexOf(l) >= 0 ? '📍 ' : '') + l + '</button>'; };
    cap.innerHTML = '<div style="max-height:46vh;overflow:auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
      order.map(function (l, i) { return chip(l, forMe ? l === myLang() : i < Math.max(1, here.length)); }).join('') +
      '<button type="button" data-other="1" style="font:inherit;font-size:16px;border-radius:14px;padding:10px 14px;border:1.5px dashed #237566;background:none;color:#237566">Other…</button></div>';
    cap.onclick = function (e) {
      if (!S) return;
      if (e.target.closest('button[data-other]')) {
        cap.innerHTML = '<div style="display:flex;gap:8px;justify-content:center"><input id="pp-t-ol" placeholder="Type a language" style="font:inherit;font-size:17px;padding:10px 12px;border-radius:14px;border:1.5px solid #237566;min-width:0;flex:1;max-width:240px"><button type="button" data-go="1" style="font:inherit;border:0;border-radius:14px;padding:10px 16px;background:#237566;color:#fff">Start</button></div>';
        var inp = document.getElementById('pp-t-ol'); inp.focus(); return;
      }
      var go = e.target.closest('button[data-go]'), b = e.target.closest('button[data-l]');
      var l = go ? (document.getElementById('pp-t-ol').value || '').trim() : b && b.dataset.l;
      if (!l) return;
      cap.onclick = null; cap.textContent = '';
      if (forMe) { localStorage.setItem('pp_tr_me', l); if (l === S.lang) S.lang = l === 'English' ? (suggested()[0] || localStorage.getItem('pp_tr_lang') || 'Spanish') : 'English'; switchLang(S.lang, true); }
      else if (l === myLang()) { pickLang(); status('Pick the language of the person you\'re talking to.'); }   // switching to your own language would do nothing
      else switchLang(l);
    };
  }
  function begin() {
    if (S.mode === 'translate') status('Connecting…');
    startMic().then(connect).catch(function (e) {
      status(e && e.name === 'NotAllowedError' ? 'Allow the microphone for penpen, then try again.' : "Couldn't start — try again.");
    });
  }
  function status(t) { var s = document.getElementById('pp-t-st'); if (s) s.textContent = t; }
  function caption(t) { var c = document.getElementById('pp-t-cap'); if (c) c.textContent = t; }
  // languages not written in English letters: their captions get a second line in the other writing
  var NON_LATIN = /japanese|korean|mandarin|cantonese|chinese|thai|khmer|lao|burmese|hindi|nepali|arabic|greek|russian|hebrew/i;
  function twin(turn, lang) {
    if (!turn || !window.ppCall) return;
    window.ppCall('penpenScript', [turn.t, lang]).then(function (r) {
      if (!r) return;
      var latin = !/[^\u0000-\u024F\u1E00-\u1EFF\s\d.,!?¡¿'"()\-–—…:;]/.test(turn.t);   // the caption is already in English letters?
      var alt = latin ? r.script : r.roman;
      if (!alt || alt === turn.t) return;
      turn.alt = alt;
      var c = document.getElementById('pp-t-cap');   // still showing this sentence: add the twin under it
      if (c && c.textContent.trim() === turn.t) { var d = document.createElement('span'); d.className = 'alt'; d.textContent = alt; c.appendChild(d); }
    }, function () {});   // no twin is fine: the translation itself already worked
  }


  /* ---------- hold-to-talk: press, speak, let go (Talk has one button, Translate has Me / Them) ---------- */
  function idle() { return S && S.mode === 'translate' ? '' : '🎙️ Hold the button and talk'; }
  // change language without leaving: reconnect with the new language
  function switchLang(l, force) {
    if (!S || !l) return;
    if (l === myLang() && !force) return;
    S.lang = l; localStorage.setItem('pp_tr_lang', l); localStorage.setItem('pp_tr_lang_t', String(Date.now()));
    var old = S.ws; S.ws = null; S.ready = false; S.model = 0; try { old && old.close(); } catch (e) {}
    var box = S.el.querySelector('.ptt'); if (box) box.remove();
    var lg = S.el.querySelector('.langs'); if (lg) lg.remove();
    if (!S.stream) begin(); else connect();
  }
  function langRow() {
    var here = suggested().filter(function (l) { return l !== myLang(); }), cur = S.lang, list = here.slice();
    if (list.indexOf(cur) < 0) list.unshift(cur);
    var row = document.createElement('div'); row.className = 'langs';
    row.innerHTML = '<button type="button" class="me" data-me="1" title="Change your language">🙋 ' + short(myLang()) + ' ▾</button><button type="button" class="sw" data-swap="1" aria-label="Swap sides">⇄</button>' + list.map(function (l) { return '<button type="button" data-l="' + l + '" class="' + (l === cur ? 'on' : '') + '">' + l.replace(/ \(.*\)/, '') + '</button>'; }).join('') + '<button type="button" data-more="1">More…</button>';
    row.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.swap) { S.swap = !S.swap; b.classList.toggle('spin'); var bx = S.el.querySelector('.ptt'); if (bx) bx.classList.toggle('swapped', !!S.swap); return; }
      if (b.dataset.me) { row.remove(); var bm = S.el.querySelector('.ptt'); if (bm) bm.style.display = 'none'; return pickLang(true); }
      if (b.dataset.more) { row.remove(); var box = S.el.querySelector('.ptt'); if (box) box.style.display = 'none'; return pickLang(); }
      if (b.dataset.l !== S.lang) switchLang(b.dataset.l);
    };
    return row;
  }
  function showPtt() {
    if (S.el.querySelector('.ptt')) return;
    var bar = S.el.querySelector('.bar');
    var box = document.createElement('div'); box.className = 'ptt';
    if (S.mode === 'translate') {
      var them = S.lang.replace(/ \(.*\)/, '');
      bar.parentNode.insertBefore(langRow(), bar);
      box.innerHTML = '<button type="button" data-who="me">🙋 Me<small>hold · ' + short(myLang()) + '</small></button><button type="button" data-who="them">🧑 Them<small>hold · ' + them + '</small></button>';
    } else box.innerHTML = '<button type="button" class="solo" data-who="me">🎙️ Hold to talk<small>let go when you\'re done</small></button>';
    bar.parentNode.insertBefore(box, bar);
    box.querySelectorAll('button').forEach(function (b) {
      var label = b.innerHTML;
      var down = function (e) {
        e.preventDefault(); if (!S || !S.ready || S.ptt) return;
        stopAudio(); S.ptt = S.lastWho = b.dataset.who; b.classList.add('on'); S.el.classList.add('holding');
        b.innerHTML = '🔴 Listening…<small>let go to send</small>';
        status(S.mode === 'translate' ? (b.dataset.who === 'me' ? '🙋 Listening to you…' : '🧑 Listening to them…') : '🔴 Listening… let go when done');
        try { S.ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } })); } catch (x) {}
      };
      var up = function (e) {
        if (!S || S.ptt !== b.dataset.who) return; e.preventDefault();
        S.ptt = null; b.classList.remove('on'); S.el.classList.remove('holding'); b.innerHTML = label;
        status(S.mode === 'translate' ? '🌐 Translating…' : '💭 penpen is thinking…');
        try { S.ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } })); } catch (x) {}
      };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  /* ---------- connection ---------- */
  function connect() {
    if (!S) return;
    status('Connecting…');
    var me = myLang(), sendLang = S.mode === 'translate' && S.lang === 'English' ? me : S.lang;
    window.ppCall('penpenLiveStart', [persona(), S.mode, sendLang]).then(function (L) {
      if (!S) return;
      if (S.mode === 'translate' && me !== 'English' && S.lang !== 'English' && L && L.system) L.system = L.system.replace(/\bEnglish\b/g, me);
      S.L = L;
      var ws = new WebSocket(WS + encodeURIComponent(L.token)); S.ws = ws;
      ws.onopen = function () {
        ws.send(JSON.stringify({ setup: {
          model: MODELS[S.model],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: L.voice } } } },
          systemInstruction: { parts: [{ text: L.system }] },
          realtimeInputConfig: { automaticActivityDetection: { disabled: true } },   // we say when someone starts and stops talking
          inputAudioTranscription: {}, outputAudioTranscription: {},
          tools: S.mode === 'translate' ? [] : [{ functionDeclarations: [{ name: 'penpen_action',
            description: 'Record or change something on the trip, or calculate money: log an expense or payment, split, settle up, undo, who owes who, totals.',
            parameters: { type: 'OBJECT', properties: { request: { type: 'STRING', description: 'The request in plain words, e.g. "Lunch 450, Kate paid, split with Brad"' } }, required: ['request'] } }] }]
        } }));
      };
      ws.onmessage = function (e) {
        (typeof e.data === 'string' ? Promise.resolve(e.data) : e.data.text()).then(function (t) { onMsg(JSON.parse(t)); });
      };
      ws.onclose = function (e) {
        if (!S || S.ws !== ws) return;
        if (!S.ready && S.model < MODELS.length - 1) { S.model++; return connect(); } // try the next voice model
        if (S.closing) return;
        status(S.ready ? 'Call ended — tap ✕' : "penpen can't talk right now. Try typing instead.");
      };
    }).catch(function (e) { status(String(e && e.message || '').indexOf('offline') >= 0 ? "You're offline — Talk needs internet." : "Couldn't connect — try again."); });
  }

  function onMsg(j) {
    if (!S) return;
    if (j.setupComplete) {
      S.ready = true;
      showPtt(); status(idle());
      if (S.mode === 'translate') return;
      // let penpen open with a short hello
      S.ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: '(The user just opened voice chat. Greet them in a few words.)' }] }], turnComplete: true } }));
      return;
    }
    if (j.toolCall) return doTools(j.toolCall.functionCalls || []);
    var sc = j.serverContent; if (!sc) return;
    if (sc.interrupted) { stopAudio(); S.el.classList.remove('speaking'); }
    if (sc.inputTranscription && sc.inputTranscription.text) { S.inT += sc.inputTranscription.text; caption(S.inT); }
    if (sc.modelTurn) sc.modelTurn.parts.forEach(function (p) { if (p.inlineData && p.inlineData.data) play(p.inlineData.data, p.inlineData.mimeType); });
    if (sc.outputTranscription && sc.outputTranscription.text) { S.outT += sc.outputTranscription.text; caption(S.outT); }
    if (sc.turnComplete) {
      var tIn = null, tOut = null;
      if (S.inT.trim() && S.inT.indexOf('(The user just opened') < 0) S.turns.push(tIn = { who: 'me', t: S.inT.trim() });
      if (S.outT.trim()) S.turns.push(tOut = { who: 'pp', t: S.outT.trim() });
      // Translate: the local-language half also gets its script / English-letters twin (ありがとう + arigatou)
      if (S.mode === 'translate' && NON_LATIN.test(S.lang)) twin(S.lastWho === 'them' ? tIn : tOut, S.lang);
      S.inT = ''; S.outT = '';
      setTimeout(function () { if (S && !S.sources.length) { S.el.classList.remove('speaking'); status(idle()); } }, 300);
    }
  }

  function doTools(calls) {
    status('On it…');
    Promise.all(calls.map(function (c) {
      var req = (c.args && c.args.request) || '';
      return window.ppCall('penpenLiveAction', [req]).then(function (r) { return { id: c.id, name: c.name, response: { result: r.result } }; },
        function (e) { return { id: c.id, name: c.name, response: { result: 'That did not work: ' + e.message } }; });
    })).then(function (responses) {
      if (S && S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    });
  }

  /* ---------- microphone → 16 kHz PCM ---------- */
  function startMic() {
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }).then(function (stream) {
      if (!S) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      S.stream = stream;
      var ctx = S.ctx, src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1);
      var ratio = ctx.sampleRate / 16000, ring = document.querySelector('#pp-talk .ring');
      proc.onaudioprocess = function (ev) {
        if (!S) return;
        var input = ev.inputBuffer.getChannelData(0), n = Math.floor(input.length / ratio), out = new Int16Array(n), sum = 0;
        for (var i = 0; i < n; i++) { var s = input[Math.floor(i * ratio)]; sum += s * s; s = Math.max(-1, Math.min(1, s)); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
        var lvl = Math.sqrt(sum / n);
        if (ring && !S.el.classList.contains('speaking')) ring.style.setProperty('--lvl', String(1 + Math.min(lvl * 6, 0.35)));
        if (!S.ready || !S.ws || S.ws.readyState !== 1) return;
        if (!S.ptt) return;   // hold-to-talk: only listen while the button is held
        var bytes = new Uint8Array(out.buffer), bin = '';
        for (var k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
        S.ws.send(JSON.stringify({ realtimeInput: { audio: { data: btoa(bin), mimeType: 'audio/pcm;rate=16000' } } }));
      };
      var mute = ctx.createGain(); mute.gain.value = 0;
      src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
      S.proc = proc; S.src = src;
    });
  }

  /* ---------- penpen's voice ---------- */
  function play(b64, mime) {
    var ctx = S.ctx; if (!ctx) return;
    var rate = +((mime || '').match(/rate=(\d+)/) || [0, 24000])[1];
    var bin = atob(b64), n = bin.length >> 1, buf = ctx.createBuffer(1, n, rate), ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) { var v = (bin.charCodeAt(2 * i + 1) << 8) | bin.charCodeAt(2 * i); if (v & 0x8000) v -= 0x10000; ch[i] = v / 32768; }
    var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
    var at = Math.max(ctx.currentTime + 0.02, S.nextAt); src.start(at); S.nextAt = at + buf.duration;
    S.sources.push(src); S.el.classList.add('speaking'); status(S.mode === 'translate' ? '🔊 Translation' : '🔊 penpen is talking…');
    src.onended = function () {
      if (!S) return;
      S.sources = S.sources.filter(function (x) { return x !== src; });
      if (!S.sources.length) { S.el.classList.remove('speaking'); status(idle()); }
    };
  }
  function stopAudio() {
    if (!S) return;
    S.sources.forEach(function (s) { try { s.stop(); } catch (e) {} });
    S.sources = []; S.nextAt = 0;
  }

  /* ---------- close: put the conversation into the chat ---------- */
  function close() {
    if (!S) return;
    var s = S; s.closing = true;
    if (s.inT.trim()) s.turns.push({ who: 'me', t: s.inT.trim() });
    if (s.outT.trim()) s.turns.push({ who: 'pp', t: s.outT.trim() });
    try { s.ws && s.ws.close(); } catch (e) {}
    try { s.proc && s.proc.disconnect(); s.src && s.src.disconnect(); } catch (e) {}
    try { s.stream && s.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    stopAudio(); try { s.ctx && s.ctx.close(); } catch (e) {}
    s.el.remove(); S = null;
    var log = document.getElementById('log');
    if (log && s.turns.length) {
      if (s.mode === 'translate') { var hd = document.createElement('div'); hd.className = 'msg pp'; hd.textContent = '🌐 Translation (' + myLang() + ' ⇄ ' + s.lang + ')'; log.appendChild(hd); }
      s.turns.forEach(function (t) { var d = document.createElement('div'); d.className = 'msg ' + t.who; d.textContent = t.t + (t.alt ? '\n' + t.alt : ''); if (t.alt) d.style.whiteSpace = 'pre-line'; log.appendChild(d); });
      log.scrollTop = log.scrollHeight;
    }
    if (s.mode !== 'translate') try {
      var h = JSON.parse(localStorage.getItem('pp_hist') || '[]').concat(s.turns.map(function (t) { return { who: t.who, t: t.t.slice(0, 600) }; }));
      localStorage.setItem('pp_hist', JSON.stringify(h.slice(-16)));
    } catch (e) {}
  }
  window.ppTalk = open;
  window.ppTranslate = function () { open({ mode: 'translate' }); };

  /* ---------- the mic button in the penpen chat opens Talk ---------- */
  function hook() {
    var m = document.getElementById('mic');
    if (!m) return setTimeout(hook, 300);
    m.addEventListener('click', function (e) {
      if (!navigator.onLine || !window.WebSocket || !navigator.mediaDevices) return; // offline: fall back to the old mic
      e.stopImmediatePropagation(); e.preventDefault(); open();
    }, true);
    addChip();
  }
  // a 🌐 Translate chip at the front of the quick-ask chips
  function addChip() {
    if (!addChip.t) addChip.t = setInterval(addChip, 1500);   // the app redraws its chips, so keep ours in place
    var any = [].slice.call(document.querySelectorAll('button')).filter(function (b) { return b.textContent.trim() === 'Who owes who?'; })[0];
    if (!any || document.getElementById('pp-tr-chip')) return;
    var c = document.createElement('button'); c.type = 'button'; c.id = 'pp-tr-chip'; c.className = any.className; c.textContent = '🌐 Translate';
    c.style.fontWeight = '800';
    c.onclick = function (e) { e.preventDefault(); e.stopPropagation(); window.ppTranslate(); };
    any.parentNode.insertBefore(c, any.parentNode.firstChild);
  }
  /* ---------- 📷 send a booking screenshot: penpen reads it and asks to save ---------- */
  function addCam() {
    var form = document.getElementById('sayf'), say = document.getElementById('say');
    if (!form || !say) return setTimeout(addCam, 500);
    if (document.getElementById('pp-cam')) return;
    var lab = document.createElement('label'); lab.id = 'pp-cam'; lab.setAttribute('aria-label', 'Send a photo of a booking or receipt');
    lab.style.cssText = 'flex:0 0 auto;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;cursor:pointer;background:rgba(255,255,255,.75);margin-right:6px';
    lab.innerHTML = '📷<input type="file" accept="image/*" style="display:none">';
    form.insertBefore(lab, form.firstChild);
    lab.querySelector('input').onchange = function () {
      var f = this.files && this.files[0]; this.value = ''; if (!f) return;
      var log = document.getElementById('log');
      var note = function (t) { var d = document.createElement('div'); d.className = 'msg pp'; d.textContent = t; if (log) { log.appendChild(d); log.scrollTop = log.scrollHeight; } return d; };
      var n = note('📷 Reading your screenshot…');
      shrink(f).then(function (url) { return window.ppCall('penpenReadBooking', [url]); }).then(function (r) {
        if (!r || !r.text) { n.textContent = "I couldn't read that one. Try a clearer screenshot of the booking, or just type the details."; return; }
        n.remove();
        say.value = r.text;                       // goes through the normal chat, so penpen asks Yes / No before saving
        var btn = form.querySelector('.send'); if (btn) btn.click(); else form.requestSubmit ? form.requestSubmit() : form.submit();
      }, function (e) { n.textContent = /offline/i.test(e.message) ? "You're offline — send the photo when you're back online." : "Couldn't read the photo right now — try again in a moment."; });
    };
  }
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        ok(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { bad(new Error('badimage')); };
      img.src = u;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { hook(); addCam(); }); else { hook(); addCam(); }
})();
