/* penpen voice + chat memory (loads after boot.js)
   - Ask penpen keeps the conversation, so penpen remembers what you just said
   - penpen speaks with a natural AI voice (Gemini), falling back to the phone's voice offline
   - Hold the 🔊 button (or turn voice on the first time) to pick penpen's voice */
(function () {
  var VOICES = [
    { id: 'classic', label: 'Classic penpen', note: 'the original penpen · cheerful' },
    { id: 'bubbly', label: 'Bubbly', note: 'upbeat and playful' },
    { id: 'sweet', label: 'Sweet', note: 'young and gentle' },
    { id: 'hyper', label: 'Hyper', note: 'lots of energy!' },
    { id: 'buddy', label: 'Buddy', note: 'friendly and relaxed' },
    { id: 'sunny', label: 'Sunny', note: 'bright and clear' },
    { id: 'coolcat', label: 'Cool Cat', note: 'deep, smooth, unbothered swagger' },
    { id: 'goofydad', label: 'Goofy Dad', note: 'dad jokes, laughs at himself' },
    { id: 'trailer', label: 'Movie Trailer', note: '"In a world…" epic narrator' },
    { id: 'surfer', label: 'Surfer Bro', note: 'totally chill, dude' },
    { id: 'grandma', label: 'Grandma', note: 'sweet and caring, "have you eaten, dear?"' },
    { id: 'phone', label: 'Phone voice', note: 'works offline, more robotic' }
  ];
  var LINES = {
    classic: "Hi! I'm penpen, your trip buddy. Ready to waddle?",
    bubbly: "Hi hi! I'm penpen. Let's make this trip fun!",
    sweet: "Hi there! I'm penpen. I'll take good care of your trip.",
    hyper: "Hi hi hi! I'm penpen and this trip is gonna be AMAZING!",
    buddy: "Hey! penpen here. I've got your back this trip.",
    sunny: "Good day! I'm penpen, ready when you are.",
    coolcat: "penpen. Your trip. Handled. Relax, my friend.",
    goofydad: "Hi, I'm penpen! Why don't penguins get lost? They always ice-plore! Heh heh.",
    trailer: "In a world... where one penguin keeps track of every peso... this is penpen.",
    surfer: "Duuude, penpen here. This trip is gonna be so gnarly.",
    grandma: "Hello, dear! It's penpen. Have you eaten? Don't forget your jacket.",
    phone: "Hi! I'm penpen, your trip buddy."
  };
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var OLD = { lola: 'grandma', Puck: 'bubbly', Leda: 'sweet', Fenrir: 'hyper', Achird: 'buddy', Zephyr: 'sunny' };
  var sayId = 0;
  var pick = get('pp_voice_pick', null); if (OLD[pick]) pick = OLD[pick];

  /* ---------- chat memory: penpenAsk → penpenChat(text, history) ---------- */
  window.ppChatHook = function (fn, args) {
    if (fn !== 'penpenAsk') return null;
    var hist = get('pp_hist', []);
    return { fn: 'penpenChat', args: [args[0], hist, pick || 'classic'], after: function (r) {
      var said = r && r.replies ? r.replies.map(function (x) { return typeof x === 'string' ? x : (x.text || x.t || ''); }).join(' ') : '';
      hist.push({ who: 'me', t: String(args[0]).slice(0, 600) });
      if (said) hist.push({ who: 'pp', t: said.slice(0, 600) });
      set('pp_hist', hist.slice(-16));
    } };
  };

  /* ---------- audio ---------- */
  var ctx = null, playing = null;
  function unlock() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, { passive: true }); });

  function playPcm(b64, mime) {
    unlock();
    if (!ctx) return Promise.reject(new Error('noaudio'));
    var rate = +((mime || '').match(/rate=(\d+)/) || [0, 24000])[1];
    var bin = atob(b64), n = bin.length >> 1, buf = ctx.createBuffer(1, n, rate), ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) { var lo = bin.charCodeAt(2 * i), hi = bin.charCodeAt(2 * i + 1); var v = (hi << 8) | lo; if (v & 0x8000) v -= 0x10000; ch[i] = v / 32768; }
    stop();
    var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(); playing = src;
    return Promise.resolve();
  }
  function stop() { try { if (playing) playing.stop(); } catch (e) {} playing = null; }

  /* ---------- route the app's speech through penpen's AI voice ---------- */
  var synth = window.speechSynthesis;
  if (synth) {
    var nativeSpeak = synth.speak.bind(synth), nativeCancel = synth.cancel.bind(synth);
    synth.cancel = function () { stop(); nativeCancel(); };
    synth.speak = function (u) {
      var v = pick || 'classic';
      if (v === 'phone' || !navigator.onLine || !window.ppCall) { u.pitch = 1.35; u.rate = 1.05; return nativeSpeak(u); }
      var text = u.text, my = ++sayId;
      window.ppCall('penpenVoice', [text, v]).then(function (a) { if (my === sayId) return playPcm(a.audio, a.mime); })
        .catch(function () { if (my === sayId) nativeSpeak(u); });
    };
  }

  /* ---------- voice picker ---------- */
  var css = '#pp-vp{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center}' +
    '#pp-vp .p{background:#FFFDF8;color:#2B2A28;width:100%;max-width:520px;max-height:86vh;overflow:auto;border-radius:22px 22px 0 0;padding:18px 16px 22px;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    'body.pp-dark #pp-vp .p{background:#29312E;color:#F1ECE2}' +
    '#pp-vp h3{margin:0 0 4px;font-size:19px}#pp-vp .s{color:#7A7468;font-size:14px;margin-bottom:10px}' +
    '#pp-vp .r{display:flex!important;width:100%;text-align:left;align-items:center;gap:10px;padding:11px 12px!important;margin:4px 0;border:1.5px solid #E8DDC8!important;border-radius:14px!important;background:none!important;color:inherit!important}' +
    '#pp-vp .r.on{border-color:#237566!important;background:rgba(35,117,102,.08)!important}#pp-vp .ck{font-style:normal;color:#237566;font-weight:700;width:18px;text-align:center}' +
    '#pp-vp .r b{display:block}#pp-vp .r span{color:#7A7468;font-size:13px}#pp-vp .g{flex:1}' +
    '#pp-vp button{font:inherit;border-radius:12px;padding:7px 12px;border:1.5px solid #237566;background:none;color:#237566}' +
    '#pp-vp button.on{background:#237566;color:#fff}#pp-vp .done{width:100%;margin-top:12px;background:#237566;color:#fff;border:0;padding:12px}';
  function picker() {
    if (!document.getElementById('pp-vp-css')) { var st = document.createElement('style'); st.id = 'pp-vp-css'; st.textContent = css; document.head.appendChild(st); }
    var w = document.createElement('div'); w.id = 'pp-vp';
    w.innerHTML = '<div class="p"><h3>penpen\'s voice</h3><div class="s">Tap one to hear it. That\'s the one penpen will use.</div>' +
      VOICES.map(function (v) {
        return '<button class="r" data-v="' + v.id + '"><div class="g"><b>' + v.label + '</b><span>' + v.note + '</span></div><i class="ck">' + ((pick || 'classic') === v.id ? '✓' : '') + '</i></button>';
      }).join('') + '<button class="done">Done</button></div>';
    document.body.appendChild(w);
    function mark() { w.querySelectorAll('.r').forEach(function (r) { var on = r.dataset.v === (pick || 'classic'); r.classList.toggle('on', on); r.querySelector('.ck').textContent = on ? (r.classList.contains('busy') ? '…' : '✓') : ''; }); }
    mark();
    w.addEventListener('click', function (e) {
      var t = e.target;
      if (t === w || (t.classList && t.classList.contains('done'))) return w.remove();
      var r = t.closest && t.closest('.r'); if (!r) return;
      pick = r.dataset.v; set('pp_voice_pick', pick);
      w.querySelectorAll('.r').forEach(function (x) { x.classList.remove('busy'); });
      r.classList.add('busy'); mark();
      stop(); try { SpeechSynthesis.prototype.cancel.call(window.speechSynthesis); } catch (x) {}
      sayNow(LINES[pick] || LINES.classic, function () { r.classList.remove('busy'); mark(); });
    });
  }
  function sayNow(text, done) {
    var v = pick || 'classic', my = ++sayId;
    if (v === 'phone' || !navigator.onLine) {
      var u = new SpeechSynthesisUtterance(text); u.pitch = 1.35; u.rate = 1.05; nativeSpeakSafe(u); if (done) done(); return;
    }
    window.ppCall('penpenVoice', [text, v]).then(function (a) { if (my === sayId) return playPcm(a.audio, a.mime); })   // only the latest tap plays
      .catch(function () { if (my !== sayId) return; var u = new SpeechSynthesisUtterance(text); nativeSpeakSafe(u); })
      .then(function () { if (done) done(); });
  }
  function nativeSpeakSafe(u) { try { window.speechSynthesis.cancel(); } catch (e) {} try { SpeechSynthesis.prototype.speak.call(window.speechSynthesis, u); } catch (e) {} }
  window.ppVoicePicker = picker;

  // Hold the 🔊 button to choose a voice; the first time voice is turned on, offer the picker.
  function hook() {
    var b = document.getElementById('voice');
    if (!b) return setTimeout(hook, 300);
    var t = null;
    b.addEventListener('pointerdown', function () { t = setTimeout(function () { t = 'fired'; picker(); }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { if (t && t !== 'fired') clearTimeout(t); }); });
    b.addEventListener('click', function (e) {
      if (t === 'fired') { e.stopImmediatePropagation(); e.preventDefault(); t = null; return; }
      setTimeout(function () { if (!pick && localStorage.getItem('pp_voice') === 'on') picker(); }, 50);
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})();
