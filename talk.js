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
    '#pp-talk .st{font-size:15px;color:#5E7A70;min-height:22px;text-align:center}' +
    '#pp-talk .orb{position:relative;width:220px;height:220px;display:grid;place-items:center}' +
    '#pp-talk .ring{position:absolute;inset:0;border-radius:50%;background:#237566;opacity:.12;transform:scale(var(--lvl,1));transition:transform .08s}' +
    '#pp-talk .ring.b{inset:22px;opacity:.18}' +
    '#pp-talk .pen{position:relative;width:150px;height:150px}' +
    '#pp-talk.speaking .pen{animation:ppbob .5s ease-in-out infinite}' +
    '@keyframes ppbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
    '@media (prefers-reduced-motion:reduce){#pp-talk.speaking .pen{animation:none}}' +
    '#pp-talk .cap{max-width:420px;text-align:center;font-size:19px;min-height:54px;opacity:.85}' +
    '#pp-talk .bar{display:flex;gap:28px}' +
    '#pp-talk .bar button{width:68px;height:68px;border-radius:50%;border:0;display:grid;place-items:center;font-size:26px;box-shadow:0 4px 14px rgba(0,0,0,.12)}' +
    '#pp-talk .mute{background:#fff;color:#2B2A28}#pp-talk .mute.on{background:#2B2A28;color:#fff}' +
    '#pp-talk .end{background:#C8553D;color:#fff}';
  var PEN = '<svg class="pen" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/><path d="M60 14c-26 0-40 22-40 50 0 26 16 44 40 44s40-18 40-44c0-28-14-50-40-50z" fill="#2E3A4A"/><ellipse cx="60" cy="76" rx="25" ry="28" fill="#FFF8EE"/><circle cx="48.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="71.5" cy="50" r="13" fill="#FFF8EE"/><circle cx="48.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="71.5" cy="51" r="5.2" fill="#1E1E1E"/><circle cx="50.3" cy="49" r="1.8" fill="#fff"/><circle cx="73.3" cy="49" r="1.8" fill="#fff"/><path d="M54 60q6 7 12 0q-6 4-12 0z" fill="#F4A62A"/><ellipse cx="40" cy="62" rx="5" ry="3" fill="#F7A9A0" opacity=".6"/><ellipse cx="80" cy="62" rx="5" ry="3" fill="#F7A9A0" opacity=".6"/><ellipse cx="48" cy="106" rx="9" ry="4" fill="#F4A62A"/><ellipse cx="72" cy="106" rx="9" ry="4" fill="#F4A62A"/></svg>';

  function myPenguin() {
    // use the person's own penguin from the nav button if there is one
    var nav = document.querySelector('#navpen svg');
    if (!nav) return PEN;
    var c = nav.cloneNode(true); c.setAttribute('class', 'pen'); c.removeAttribute('width'); c.removeAttribute('height');
    return c.outerHTML;
  }

  function open() {
    if (S) return;
    if (!document.getElementById('pp-talk-css')) { var st = document.createElement('style'); st.id = 'pp-talk-css'; st.textContent = css; document.head.appendChild(st); }
    var w = document.createElement('div'); w.id = 'pp-talk'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Talking with penpen');
    w.innerHTML = '<div class="st" id="pp-t-st">Connecting…</div>' +
      '<div class="orb"><div class="ring"></div><div class="ring b"></div>' + myPenguin() + '</div>' +
      '<div class="cap" id="pp-t-cap"></div>' +
      '<div class="bar"><button class="mute" id="pp-t-mute" aria-label="Mute microphone">🎙️</button><button class="end" id="pp-t-end" aria-label="End">✕</button></div>';
    document.body.appendChild(w);
    S = { el: w, turns: [], inT: '', outT: '', muted: false, model: 0, nextAt: 0, sources: [] };
    document.getElementById('pp-t-end').onclick = close;
    document.getElementById('pp-t-mute').onclick = function () {
      S.muted = !S.muted; this.classList.toggle('on', S.muted); this.textContent = S.muted ? '🔇' : '🎙️';
      status(S.muted ? 'Muted' : 'Listening…');
    };
    try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); S.ctx.resume(); } catch (e) {}
    startMic().then(connect).catch(function (e) {
      status(e && e.name === 'NotAllowedError' ? 'Allow the microphone for penpen, then try again.' : "Couldn't start — try again.");
    });
  }
  function status(t) { var s = document.getElementById('pp-t-st'); if (s) s.textContent = t; }
  function caption(t) { var c = document.getElementById('pp-t-cap'); if (c) c.textContent = t; }

  /* ---------- connection ---------- */
  function connect() {
    if (!S) return;
    status('Connecting…');
    window.ppCall('penpenLiveStart', [persona()]).then(function (L) {
      if (!S) return;
      S.L = L;
      var ws = new WebSocket(WS + encodeURIComponent(L.token)); S.ws = ws;
      ws.onopen = function () {
        ws.send(JSON.stringify({ setup: {
          model: MODELS[S.model],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: L.voice } } } },
          systemInstruction: { parts: [{ text: L.system }] },
          inputAudioTranscription: {}, outputAudioTranscription: {},
          tools: [{ functionDeclarations: [{ name: 'penpen_action',
            description: 'Record or change something on the trip, or calculate money: log an expense or payment, split, settle up, undo, who owes who, totals.',
            parameters: { type: 'OBJECT', properties: { request: { type: 'STRING', description: 'The request in plain words, e.g. "Lunch 450 pesos, Kate paid, split with Brad"' } }, required: ['request'] } }] }]
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
      S.ready = true; status('Listening…');
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
      if (S.inT.trim() && S.inT.indexOf('(The user just opened') < 0) S.turns.push({ who: 'me', t: S.inT.trim() });
      if (S.outT.trim()) S.turns.push({ who: 'pp', t: S.outT.trim() });
      S.inT = ''; S.outT = '';
      setTimeout(function () { if (S && !S.sources.length) { S.el.classList.remove('speaking'); status(S.muted ? 'Muted' : 'Listening…'); } }, 300);
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
        if (S.muted || !S.ready || !S.ws || S.ws.readyState !== 1) return;
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
    S.sources.push(src); S.el.classList.add('speaking'); status('penpen is talking…');
    src.onended = function () {
      if (!S) return;
      S.sources = S.sources.filter(function (x) { return x !== src; });
      if (!S.sources.length) { S.el.classList.remove('speaking'); status(S.muted ? 'Muted' : 'Listening…'); }
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
      s.turns.forEach(function (t) { var d = document.createElement('div'); d.className = 'msg ' + t.who; d.textContent = t.t; log.appendChild(d); });
      log.scrollTop = log.scrollHeight;
    }
    try {
      var h = JSON.parse(localStorage.getItem('pp_hist') || '[]').concat(s.turns.map(function (t) { return { who: t.who, t: t.t.slice(0, 600) }; }));
      localStorage.setItem('pp_hist', JSON.stringify(h.slice(-16)));
    } catch (e) {}
  }
  window.ppTalk = open;

  /* ---------- the mic button in the penpen chat opens Talk ---------- */
  function hook() {
    var m = document.getElementById('mic');
    if (!m) return setTimeout(hook, 300);
    m.addEventListener('click', function (e) {
      if (!navigator.onLine || !window.WebSocket || !navigator.mediaDevices) return; // offline: fall back to the old mic
      e.stopImmediatePropagation(); e.preventDefault(); open();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})();
