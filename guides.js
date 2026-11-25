/* penpen's guides: each one is its own penguin with its own look and name.
   window.ppLook.svg(id) returns the inside of an <svg viewBox="-7 -14 134 134">.
   'bubbly' is the classic penpen, drawn by the app itself. */
(function () {
  var INK = '#13324A', CREAM = '#FFF8EE', BEAK = '#F4A62A';
  var G = {
    bubbly:   { name: 'penpen', tag: 'the original' },
    sweet:    { name: 'Sweet P', tag: 'gentle & caring', body: '#7C6BB8', eyes: 'lashes', blush: 'rosy', hair: 'bow' },
    hyper:    { name: 'Double Shot', tag: 'way too much coffee', body: '#E46F5A', eyes: 'shine', hair: 'spiky', hairC: INK, cup: 1 },
    buddy:    { name: 'Captain Buddy', tag: 'knows every route', body: '#2C6E8F', eyes: 'dots', bag: 1, map: 1, cap: '#F4F1EA' },
    sunny:    { name: 'Sunny Side', tag: 'bright & cheerful', body: '#F4A62A', eyes: 'dots', blush: 'freckles', flower: 1, lei: 1 },
    coolcat:  { name: 'Mr. Frosty', tag: 'smooth, unbothered', body: '#17181C', shades: 1, bowtie: '#E46F5A' },
    goofydad: { name: 'Goofy Dad', tag: 'dad jokes on tap', body: '#3D7A4B', eyes: 'happy', mustache: '#5A3B2E', phones: 1 },
    trailer:  { name: 'Narrator Noir', tag: '"In a world…"', body: '#3A2F45', eyes: 'dots', detective: 1, coat: '#8B6B4A' },
    surfer:   { name: 'Surfer Bro', tag: 'totally chill', body: '#1F8FA6', eyes: 'wink', hair: 'wavy', hairC: '#E3B23C', lei: 1 },
    grandma:  { name: 'Lola Nena', tag: '"have you eaten, dear?"', body: '#5B6B7A', eyes: 'happy', glasses: 1, scarf: '#B86B8B', hair: 'bun', hairC: '#D9D4CC' }
  };
  function arc(x) { return '<path d="M' + (x - 4) + ' 51 Q' + x + ' 45.5 ' + (x + 4) + ' 51" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>'; }
  function dot(x, r) { return '<circle cx="' + x + '" cy="49" r="' + (r || 3.4) + '" fill="' + INK + '"/><circle cx="' + (x + 1.3) + '" cy="47.7" r="' + (r ? 1.6 : 1.1) + '" fill="#fff"/>'; }
  function eyes(k) {
    if (k === 'happy') return arc(51) + arc(69);
    if (k === 'lashes') return arc(51) + arc(69) + '<path d="M46 49 l-2.4 -1.6 M74 49 l2.4 -1.6 M47.5 47 l-1.8 -2 M72.5 47 l1.8 -2" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>';
    if (k === 'shine') return dot(51, 4.4) + dot(69, 4.4) + '<circle cx="49.8" cy="50.8" r=".7" fill="#fff"/><circle cx="67.8" cy="50.8" r=".7" fill="#fff"/>';
    if (k === 'wink') return arc(51) + dot(69);
    return dot(51) + dot(69);
  }
  function blush(k) {
    if (k === 'rosy') return '<ellipse cx="45" cy="58.5" rx="6.5" ry="3.8" fill="#F59C9A"/><ellipse cx="75" cy="58.5" rx="6.5" ry="3.8" fill="#F59C9A"/>';
    if (k === 'freckles') return '<g fill="#C9805F"><circle cx="43" cy="57" r=".9"/><circle cx="46" cy="58.6" r=".9"/><circle cx="44.2" cy="60" r=".9"/><circle cx="77" cy="57" r=".9"/><circle cx="74" cy="58.6" r=".9"/><circle cx="75.8" cy="60" r=".9"/></g>';
    return '<ellipse cx="46" cy="58" rx="4.5" ry="2.8" fill="#F7A3A0"/><ellipse cx="74" cy="58" rx="4.5" ry="2.8" fill="#F7A3A0"/>';
  }
  function hair(k, c) {
    var cap = '<path d="M36 40 Q38 18 60 17 Q82 18 84 40 Q72 32 60 34 Q48 32 36 40 Z" fill="' + c + '"/>';
    if (k === 'spiky') return '<path d="M36 40 L38 26 L44 32 L47 18 L53 28 L58 14 L63 27 L69 16 L73 29 L79 20 L80 32 L84 28 L84 40 Q72 32 60 34 Q48 32 36 40 Z" fill="' + c + '"/>';
    if (k === 'wavy') return '<path d="M36 42 Q37 18 60 17 Q83 18 84 42 Q80 36 75 40 Q70 34 65 39 Q60 33 55 39 Q50 34 45 40 Q40 36 36 42 Z" fill="' + c + '"/>';
    if (k === 'bun') return cap + '<circle cx="60" cy="13" r="9" fill="' + c + '"/>';
    if (k === 'bow') return '<path d="M70 26 L81 19 L81 33 Z" fill="#F28AA5"/><path d="M70 26 L59 19 L59 33 Z" fill="#F28AA5"/><circle cx="70" cy="26" r="3.4" fill="#E46F8F"/>';
    return '';
  }
  function svg(id) {
    var g = G[id]; if (!g || !g.body) return '';
    var b = g.body, h = [];
    h.push('<ellipse cx="60" cy="112" rx="30" ry="4" fill="' + INK + '" opacity=".12"/>');
    if (g.bag) h.push('<rect x="82" y="54" width="20" height="36" rx="8" fill="#C8874A"/><rect x="86" y="70" width="12" height="10" rx="3" fill="#A86B37"/>');
    h.push('<ellipse cx="48" cy="106" rx="10" ry="5" fill="' + BEAK + '"/><ellipse cx="72" cy="106" rx="10" ry="5" fill="' + BEAK + '"/>');
    h.push('<g class="fl-l"><ellipse cx="25" cy="70" rx="8" ry="20" fill="' + b + '" transform="rotate(22 25 70)"/></g><g class="fl-r"><ellipse cx="95" cy="70" rx="8" ry="20" fill="' + b + '" transform="rotate(-22 95 70)"/></g>');
    h.push('<ellipse cx="60" cy="64" rx="36" ry="44" fill="' + b + '"/><ellipse cx="44" cy="38" rx="9" ry="15" fill="#fff" opacity=".1" transform="rotate(-20 44 38)"/>');
    h.push('<ellipse cx="60" cy="77" rx="25" ry="29" fill="' + CREAM + '"/><ellipse cx="60" cy="51" rx="21" ry="16" fill="' + CREAM + '"/><ellipse cx="66" cy="94" rx="17" ry="8" fill="#E9DAC0" opacity=".6"/>');
    if (g.coat) h.push('<path d="M35 68 Q33 96 40 105 L80 105 Q87 96 85 68 Q76 75 68 73 L60 96 L52 73 Q44 75 35 68 Z" fill="' + g.coat + '"/><circle cx="55" cy="92" r="1.8" fill="' + INK + '"/><circle cx="55" cy="99" r="1.8" fill="' + INK + '"/>');
    if (g.blush || g.eyes === 'happy') h.push(blush(g.blush));
    if (!g.shades) h.push('<g class="pp-eyes">' + eyes(g.eyes) + '</g>');
    else h.push('<path d="M41 44 H79 L77 53 Q72 57 64 53 L62 48 H58 L56 53 Q48 57 43 53 Z" fill="#0E0F12"/><path d="M45 46.5 L50 46.5 M66 46.5 L71 46.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>');
    if (g.glasses) h.push('<g fill="none" stroke="' + INK + '" stroke-width="2"><circle cx="51" cy="49" r="7"/><circle cx="69" cy="49" r="7"/><path d="M58 48 Q60 46.5 62 48"/></g>');
    h.push('<path d="M56.5 57.5 Q60 62 63.5 57.5 Q60 56 56.5 57.5 Z" fill="' + BEAK + '"/>');
    if (g.mustache) h.push('<path d="M60 61 Q55 58 50 61 Q47 63 45 61 Q47 66 52 65 Q57 64 60 62 Q63 64 68 65 Q73 66 75 61 Q73 63 70 61 Q65 58 60 61 Z" fill="' + g.mustache + '"/>');
    if (g.scarf) h.push('<rect x="36" y="64" width="48" height="9" rx="4.5" fill="' + g.scarf + '"/><rect x="67" y="68" width="9" height="20" rx="3.5" fill="' + g.scarf + '"/>');
    if (g.bowtie) h.push('<path d="M60 69 L50 64 L50 74 Z" fill="' + g.bowtie + '"/><path d="M60 69 L70 64 L70 74 Z" fill="' + g.bowtie + '"/><circle cx="60" cy="69" r="2.6" fill="' + g.bowtie + '"/>');
    if (g.lei) h.push('<circle cx="40" cy="80" r="5" fill="#E46F5A"/><circle cx="48" cy="85" r="5" fill="#F4A62A"/><circle cx="56" cy="88" r="5" fill="#fff" stroke="#F0D9B5"/><circle cx="64" cy="88" r="5" fill="#E46F5A"/><circle cx="72" cy="85" r="5" fill="#F4A62A"/><circle cx="80" cy="80" r="5" fill="#fff" stroke="#F0D9B5"/>');
    if (g.map) h.push('<path d="M42 79 L53 75 L67 79 L78 75 L78 97 L67 101 L53 97 L42 101 Z" fill="#F4E3B5" stroke="#C9B999"/><path d="M46 94 Q55 82 62 90 T74 82" fill="none" stroke="#E46F5A" stroke-width="2" stroke-dasharray="3 2"/>');
    if (g.hair) h.push(hair(g.hair, g.hairC || INK));
    if (g.cap) h.push('<path d="M37 36 Q38 18 60 17 Q82 18 83 36 Z" fill="' + g.cap + '"/><path d="M36 36 H84 V40 H36 Z" fill="#1E2B4A"/><circle cx="60" cy="27" r="4" fill="#F4A62A"/>');
    if (g.flower) h.push('<circle cx="76" cy="31" r="4" fill="#F28AA5"/><circle cx="82" cy="29" r="4" fill="#F28AA5"/><circle cx="80" cy="35" r="4" fill="#F28AA5"/><circle cx="74" cy="37" r="4" fill="#F28AA5"/><circle cx="78" cy="33" r="2.6" fill="#F4A62A"/>');
    if (g.phones) h.push('<path d="M35 50 Q35 18 60 18 Q85 18 85 50" fill="none" stroke="' + INK + '" stroke-width="4"/><rect x="30" y="43" width="10" height="16" rx="4" fill="#E46F5A"/><rect x="80" y="43" width="10" height="16" rx="4" fill="#E46F5A"/>');
    if (g.detective) h.push('<path d="M36 37 Q60 8 84 37 Z" fill="#8B6B4A"/><path d="M38 35 Q60 28 82 35 Q60 42 38 35 Z" fill="#6E5236"/><circle cx="99" cy="72" r="9" fill="#CFE6DF" fill-opacity=".6" stroke="' + INK + '" stroke-width="3"/><path d="M92 79 L84 89" stroke="#8B5A33" stroke-width="4" stroke-linecap="round"/>');
    if (g.cup) h.push('<g><rect x="92" y="74" width="16" height="18" rx="3" fill="#fff" stroke="' + INK + '" stroke-width="2"/><rect x="92" y="80" width="16" height="6" fill="#8B5A33"/><path d="M108 78 q6 0 6 5 q0 5 -6 5" fill="none" stroke="' + INK + '" stroke-width="2"/><path d="M97 70 q-2 -4 1 -7 M103 70 q-2 -4 1 -7" stroke="#9AA7B4" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>');
    return h.join('');
  }
  // the back of a penguin, for turning around
  function back(color, hairC) {
    var b = color || INK;
    return '<ellipse cx="60" cy="112" rx="30" ry="4" fill="' + INK + '" opacity=".12"/>' +
      '<ellipse cx="48" cy="106" rx="10" ry="5" fill="' + BEAK + '"/><ellipse cx="72" cy="106" rx="10" ry="5" fill="' + BEAK + '"/>' +
      '<ellipse cx="25" cy="70" rx="8" ry="20" fill="' + b + '" transform="rotate(22 25 70)"/><ellipse cx="95" cy="70" rx="8" ry="20" fill="' + b + '" transform="rotate(-22 95 70)"/>' +
      '<ellipse cx="60" cy="64" rx="36" ry="44" fill="' + b + '"/><ellipse cx="72" cy="40" rx="9" ry="16" fill="#fff" opacity=".12" transform="rotate(20 72 40)"/>' +
      '<path d="M52 100 Q60 112 68 100 Z" fill="' + b + '" stroke="#000" stroke-opacity=".15"/>' +
      (hairC ? '<path d="M36 40 Q38 18 60 17 Q82 18 84 40 Q72 46 60 46 Q48 46 36 40 Z" fill="' + hairC + '"/>' : '');
  }
  // side view, for walking; hairC: hair colour for a penguin whose look isn't in G (your own penpen)
  function side(id, fallback, hairC) {
    var g = G[id] || {}, b = g.body || fallback || '#1E2B4A', hc = g.hairC || hairC, h = [];
    h.push('<ellipse cx="60" cy="112" rx="26" ry="4" fill="' + INK + '" opacity=".12"/>');
    h.push('<g class="ft"><ellipse class="f1" cx="56" cy="107" rx="12" ry="4.5" fill="' + BEAK + '"/><ellipse class="f2" cx="68" cy="107" rx="12" ry="4.5" fill="' + BEAK + '"/></g>');
    h.push('<path d="M34 98 L22 106 L38 104 Z" fill="' + b + '"/>');
    h.push('<ellipse cx="58" cy="64" rx="29" ry="44" fill="' + b + '"/>');
    h.push('<ellipse cx="72" cy="74" rx="14" ry="31" fill="' + CREAM + '"/><ellipse cx="70" cy="48" rx="14" ry="14" fill="' + CREAM + '"/>');
    if (g.coat) h.push('<path d="M36 70 Q34 98 40 106 L74 106 Q80 96 82 72 Q70 76 60 72 Z" fill="' + g.coat + '"/>');
    if (g.scarf) h.push('<rect x="34" y="64" width="52" height="9" rx="4.5" fill="' + g.scarf + '"/><rect x="38" y="68" width="9" height="18" rx="3.5" fill="' + g.scarf + '"/>');
    if (g.lei) h.push('<circle cx="66" cy="80" r="4.5" fill="#E46F5A"/><circle cx="74" cy="84" r="4.5" fill="#F4A62A"/><circle cx="82" cy="80" r="4.5" fill="#fff" stroke="#F0D9B5"/>');
    h.push('<ellipse class="fl" cx="52" cy="70" rx="8" ry="21" fill="' + b + '" stroke="#000" stroke-opacity=".12" transform="rotate(14 52 70)"/>');
    if (g.shades) h.push('<path d="M64 42 H86 L84 50 Q78 54 70 50 Z" fill="#0E0F12"/>');
    else if (g.eyes === 'happy' || g.eyes === 'lashes') h.push('<path d="M70 47 Q74 42 78 47" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>');
    else h.push('<circle cx="75" cy="46" r="3.6" fill="' + INK + '"/><circle cx="76.3" cy="44.7" r="1.2" fill="#fff"/>');
    if (g.glasses) h.push('<circle cx="75" cy="46" r="6.5" fill="none" stroke="' + INK + '" stroke-width="2"/>');
    h.push('<ellipse cx="72" cy="56" rx="4.5" ry="2.8" fill="#F7A3A0"/>');
    h.push('<path d="M83 50 Q98 53 83 58 Z" fill="' + BEAK + '"/>');
    if (g.mustache) h.push('<path d="M80 59 Q74 57 70 60 Q75 63 80 61 Z" fill="' + g.mustache + '"/>');
    if (g.hair || hc) h.push('<path d="M32 40 Q34 18 58 17 Q80 18 84 38 Q72 30 58 32 Q44 32 32 40 Z" fill="' + (g.hair === 'bow' ? b : (hc || INK)) + '"/>' + (g.hair === 'bow' ? '<path d="M50 22 L60 16 L60 28 Z M50 22 L40 16 L40 28 Z" fill="#F28AA5"/>' : g.hair === 'bun' ? '<circle cx="44" cy="18" r="8" fill="' + g.hairC + '"/>' : ''));
    if (g.cap) h.push('<path d="M34 36 Q36 18 58 17 Q80 18 82 36 Z" fill="' + g.cap + '"/><path d="M78 34 H96 V38 H78 Z" fill="#1E2B4A"/>');
    if (g.detective) h.push('<path d="M32 37 Q58 8 84 37 Z" fill="#8B6B4A"/><path d="M30 36 Q58 30 92 36 Q58 42 30 36 Z" fill="#6E5236"/>');
    if (g.phones) h.push('<path d="M40 30 Q56 10 74 26" fill="none" stroke="' + INK + '" stroke-width="4"/><rect x="50" y="30" width="12" height="17" rx="5" fill="#E46F5A"/>');
    if (g.flower) h.push('<circle cx="50" cy="26" r="4" fill="#F28AA5"/><circle cx="56" cy="24" r="4" fill="#F28AA5"/><circle cx="53" cy="30" r="4" fill="#F28AA5"/><circle cx="53" cy="27" r="2.4" fill="#F4A62A"/>');
    if (g.cup) h.push('<rect x="86" y="70" width="13" height="15" rx="3" fill="#fff" stroke="' + INK + '" stroke-width="2"/><rect x="86" y="75" width="13" height="5" fill="#8B5A33"/>');
    return h.join('');
  }
  window.ppLook = {
    list: function () { return Object.keys(G).map(function (k) { return { id: k, name: G[k].name, tag: G[k].tag }; }); },
    name: function (id) { return (G[id] || G.bubbly).name; },
    tag: function (id) { return (G[id] || G.bubbly).tag; },
    svg: svg, back: back, side: side
  };
})();
