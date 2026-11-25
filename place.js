/* penpen place: which country this trip is in, and everything that goes with it
   (currency, time zone, map start, emergency numbers, local languages).
   One answer for the whole app, in this order:
     1. the trip's own setting from the server (country picked when the trip was made)
     2. the trip's name, "Where to?" and plan stops ("Tokyo" → Japan)
     3. the phone's time zone
   Money always follows the server's trip currency when we have it, because that's what the totals are counted in.
   Keep the name / currency / time zones here in step with PP_PLACES in server/Code.gs. */
(function () {
  // code: [name, currency, word said out loud, time zones (first = default), map centre [lat, lng, zoom],
  //        [police, ambulance, fire, tourist police], local languages, words in a trip or place name that point here]
  var C = {
    PH: ['Philippines', 'PHP', 'pesos', ['Asia/Manila'], [12.3, 122.9, 5], ['911', '911', '911', ''], ['Bisaya (Cebuano)', 'Tagalog'], 'philippines|cebu|dipolog|manila|bohol|davao|palawan|siargao|dumaguete|iloilo|boracay|moalboal|oslob|el nido|coron|baguio'],
    US: ['United States', 'USD', 'dollars', ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'], [39.5, -98.4, 3], ['911', '911', '911', ''], [], 'united states|usa|hawaii|honolulu|maui|new york|las vegas|los angeles|san francisco|orlando|miami|chicago|seattle|alaska'],
    CA: ['Canada', 'CAD', 'Canadian dollars', ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax'], [56, -96, 3], ['911', '911', '911', ''], ['French'], 'canada|vancouver|toronto|montreal|banff|calgary|quebec'],
    MX: ['Mexico', 'MXN', 'Mexican pesos', ['America/Mexico_City', 'America/Cancun', 'America/Tijuana'], [23.6, -102.5, 4], ['911', '911', '911', ''], ['Spanish'], 'mexico|cancun|tulum|cabo|puerto vallarta|playa del carmen|oaxaca|guadalajara'],
    JP: ['Japan', 'JPY', 'yen', ['Asia/Tokyo'], [36.2, 138.3, 5], ['110', '119', '119', ''], ['Japanese'], 'japan|tokyo|osaka|kyoto|okinawa|hokkaido|sapporo|nara|hiroshima|fukuoka|nagoya|yokohama|hakone'],
    KR: ['South Korea', 'KRW', 'won', ['Asia/Seoul'], [36.4, 127.9, 6], ['112', '119', '119', ''], ['Korean'], 'korea|seoul|busan|jeju|incheon'],
    TW: ['Taiwan', 'TWD', 'NT dollars', ['Asia/Taipei'], [23.7, 121, 7], ['110', '119', '119', ''], ['Mandarin'], 'taiwan|taipei|kaohsiung|taichung|tainan'],
    HK: ['Hong Kong', 'HKD', 'Hong Kong dollars', ['Asia/Hong_Kong'], [22.32, 114.17, 10], ['999', '999', '999', ''], ['Cantonese'], 'hong kong'],
    MO: ['Macau', 'MOP', 'patacas', ['Asia/Macau'], [22.19, 113.54, 12], ['999', '999', '999', ''], ['Cantonese'], 'macau|macao'],
    CN: ['China', 'CNY', 'yuan', ['Asia/Shanghai'], [35.9, 104.2, 3], ['110', '120', '119', ''], ['Mandarin'], 'china|beijing|shanghai|guangzhou|shenzhen|chengdu|xi\'an'],
    SG: ['Singapore', 'SGD', 'Singapore dollars', ['Asia/Singapore'], [1.35, 103.82, 11], ['999', '995', '995', ''], ['Mandarin', 'Malay'], 'singapore'],
    MY: ['Malaysia', 'MYR', 'ringgit', ['Asia/Kuala_Lumpur'], [4.2, 109.5, 5], ['999', '999', '999', ''], ['Malay'], 'malaysia|kuala lumpur|penang|langkawi|sabah|borneo|kota kinabalu|malacca|melaka'],
    TH: ['Thailand', 'THB', 'baht', ['Asia/Bangkok'], [15.9, 101, 5], ['191', '1669', '199', '1155'], ['Thai'], 'thailand|bangkok|phuket|chiang mai|krabi|pattaya|koh samui|ko samui|phi phi|chiang rai'],
    VN: ['Vietnam', 'VND', 'dong', ['Asia/Ho_Chi_Minh'], [16, 107.8, 5], ['113', '115', '114', ''], ['Vietnamese'], 'vietnam|viet nam|hanoi|ho chi minh|saigon|da nang|hoi an|ha long|nha trang|phu quoc'],
    ID: ['Indonesia', 'IDR', 'rupiah', ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura'], [-2.5, 118, 4], ['110', '118', '113', ''], ['Bahasa Indonesia'], 'indonesia|bali|jakarta|lombok|ubud|yogyakarta|komodo|gili'],
    KH: ['Cambodia', 'USD', 'dollars', ['Asia/Phnom_Penh'], [12.6, 105, 6], ['117', '119', '118', ''], ['Khmer'], 'cambodia|siem reap|phnom penh|angkor'],
    IN: ['India', 'INR', 'rupees', ['Asia/Kolkata'], [22.4, 79, 4], ['112', '112', '112', ''], ['Hindi'], 'india|delhi|mumbai|goa|jaipur|agra|bangalore|bengaluru|kerala'],
    AU: ['Australia', 'AUD', 'Australian dollars', ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Darwin', 'Australia/Perth'], [-25.3, 133.8, 4], ['000', '000', '000', ''], [], 'australia|sydney|melbourne|brisbane|perth|cairns|gold coast|adelaide'],
    NZ: ['New Zealand', 'NZD', 'New Zealand dollars', ['Pacific/Auckland'], [-41, 174, 5], ['111', '111', '111', ''], [], 'new zealand|auckland|queenstown|wellington|christchurch'],
    GB: ['United Kingdom', 'GBP', 'pounds', ['Europe/London'], [54.5, -3.4, 5], ['999', '999', '999', ''], [], 'united kingdom|england|scotland|wales|london|edinburgh|manchester|liverpool'],
    IE: ['Ireland', 'EUR', 'euros', ['Europe/Dublin'], [53.4, -8.2, 6], ['112', '112', '112', ''], [], 'ireland|dublin|galway|cork'],
    FR: ['France', 'EUR', 'euros', ['Europe/Paris'], [46.6, 2.4, 5], ['112', '112', '112', ''], ['French'], 'france|paris|lyon|marseille|bordeaux'],
    DE: ['Germany', 'EUR', 'euros', ['Europe/Berlin'], [51.2, 10.4, 5], ['110', '112', '112', ''], ['German'], 'germany|berlin|munich|frankfurt|hamburg|cologne'],
    ES: ['Spain', 'EUR', 'euros', ['Europe/Madrid'], [40.2, -3.7, 5], ['112', '112', '112', ''], ['Spanish'], 'spain|madrid|barcelona|seville|ibiza|mallorca|valencia'],
    IT: ['Italy', 'EUR', 'euros', ['Europe/Rome'], [42.8, 12.6, 5], ['112', '112', '112', ''], ['Italian'], 'italy|rome|milan|venice|florence|naples|amalfi|sicily'],
    PT: ['Portugal', 'EUR', 'euros', ['Europe/Lisbon'], [39.6, -8, 6], ['112', '112', '112', ''], ['Portuguese'], 'portugal|lisbon|porto|algarve|madeira'],
    NL: ['Netherlands', 'EUR', 'euros', ['Europe/Amsterdam'], [52.2, 5.3, 7], ['112', '112', '112', ''], ['Dutch'], 'netherlands|holland|amsterdam|rotterdam'],
    GR: ['Greece', 'EUR', 'euros', ['Europe/Athens'], [38.5, 23.5, 6], ['112', '112', '112', ''], ['Greek'], 'greece|athens|santorini|mykonos|crete'],
    CH: ['Switzerland', 'CHF', 'francs', ['Europe/Zurich'], [46.8, 8.2, 7], ['117', '144', '118', ''], ['German', 'French', 'Italian'], 'switzerland|zurich|geneva|lucerne|interlaken|zermatt'],
    AT: ['Austria', 'EUR', 'euros', ['Europe/Vienna'], [47.6, 14.1, 7], ['133', '144', '122', ''], ['German'], 'austria|vienna|salzburg|innsbruck'],
    TR: ['Turkey', 'TRY', 'lira', ['Europe/Istanbul'], [39, 35.2, 5], ['112', '112', '112', ''], ['Turkish'], 'turkey|türkiye|turkiye|istanbul|cappadocia|antalya'],
    AE: ['United Arab Emirates', 'AED', 'dirhams', ['Asia/Dubai'], [24.3, 54.4, 7], ['999', '998', '997', ''], ['Arabic'], 'united arab emirates|uae|dubai|abu dhabi']
  };
  // the phone's time zone follows you abroad: zone → country (every zone above, plus old names phones still use)
  var TZ = { 'Asia/Saigon': 'VN', 'Asia/Calcutta': 'IN', 'Asia/Kuching': 'MY', 'America/Montreal': 'CA', 'America/Detroit': 'US', 'America/Merida': 'MX', 'America/Monterrey': 'MX',
    'Australia/Hobart': 'AU', 'Asia/Pontianak': 'ID' };
  Object.keys(C).forEach(function (k) { C[k][3].forEach(function (z) { TZ[z] = k; }); });
  // languages for a few places penpen has no country card for yet (translation still suggests them)
  var TZ_LANG = { 'Asia/Vientiane': ['Lao'], 'Asia/Yangon': ['Burmese'], 'Asia/Kathmandu': ['Nepali'], 'America/Sao_Paulo': ['Portuguese'],
    'America/Bogota': ['Spanish'], 'America/Lima': ['Spanish'], 'America/Argentina/Buenos_Aires': ['Spanish'] };

  function json(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function tripId() { return localStorage.getItem('pp_trip_id') || ''; }
  function phoneTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  function saved() {   // what the server said about this trip (cached Today answers are per trip, so they count too)
    var s = json('pp_place'); if (s && s.trip === tripId()) return s;
    var T = json('pp_c_penpenToday:[]'); return (T && T.place) || null;
  }

  // countries the trip's name, "Where to?", plan stops (and `extra`) point to, in the order they appear
  function fromText(txt) {
    var low = ' ' + String(txt || '').toLowerCase() + ' ';
    return Object.keys(C).map(function (k) { return [low.search(new RegExp('[^a-z](' + C[k][7] + ')[^a-z]')), k]; })
      .filter(function (x) { return x[0] >= 0; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  }
  function tripText(extra) {
    var txt = (localStorage.getItem('pp_trip_name') || '') + ' ' + (extra || ''), cur = tripId();
    (json('pp_trips_list') || []).forEach(function (t) { if ((t.id || '') === cur) txt = t.where + ' ' + t.name + ' ' + txt; });
    var P = json('pp_c_penpenPlan:[]');
    ((P && P.days) || []).forEach(function (d) { (d.stops || []).forEach(function (st) { txt += ' ' + (st.place || ''); }); });
    return txt;
  }
  function candidates(extra) {   // best guess first; the server's setting always wins
    var s = saved(), out = fromText(tripText(extra));
    // a country the creator picked beats any guess; one the server only worked out from the currency is a last resort
    if (s && s.cc && C[s.cc]) { if (s.set) { out = out.filter(function (k) { return k !== s.cc; }); out.unshift(s.cc); } else if (out.indexOf(s.cc) < 0) out.push(s.cc); }
    return out;
  }
  function symbolFor(cur) {
    try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).filter(function (p) { return p.type === 'currency'; })[0].value; }
    catch (e) { return cur ? cur + ' ' : ''; }
  }

  function the(name) { return /^(Philippines|United|Netherlands)/.test(name) ? 'the ' + name : name; }   // "in the Philippines"

  function place(extra) {
    var s = saved(), T = json('pp_c_penpenToday:[]') || {}, cc = candidates(extra)[0] || TZ[phoneTz()] || '', c = C[cc];
    // money: the currency the server counts this trip's totals in
    var cur = (s && s.cur) || T.cur || (c && c[1]) || '';
    var sym = (s && s.sym) || (T.cur === cur && T.ls) || symbolFor(cur);
    var word = c && c[1] === cur ? c[2] : (Object.keys(C).map(function (k) { return C[k]; }).filter(function (x) { return x[1] === cur; })[0] || [0, 0, cur])[2];
    return {
      cc: cc, name: c ? c[0] : '', the: c ? the(c[0]) : '', set: !!(s && s.set),
      cur: cur, sym: sym, word: word,
      tz: (s && s.tz) || (c && c[3].indexOf(phoneTz()) >= 0 ? phoneTz() : c && c[3][0]) || phoneTz(),
      centre: c ? c[4] : null, sos: c ? c[5] : null,
      langs: c ? c[6] : (TZ_LANG[phoneTz()] || [])
    };
  }
  // friendly names for zones in countries that have several; other zones show their city ("Tokyo")
  var ZONE = { 'America/New_York': 'Eastern (New York)', 'America/Chicago': 'Central (Chicago)', 'America/Denver': 'Mountain (Denver)', 'America/Phoenix': 'Arizona',
    'America/Los_Angeles': 'Pacific (Los Angeles)', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii', 'America/Toronto': 'Eastern (Toronto)', 'America/Vancouver': 'Pacific (Vancouver)',
    'America/Edmonton': 'Mountain (Calgary, Edmonton)', 'America/Winnipeg': 'Central (Winnipeg)', 'America/Halifax': 'Atlantic (Halifax)', 'America/Mexico_City': 'Central (Mexico City)',
    'America/Cancun': 'Cancún & Tulum', 'America/Tijuana': 'Tijuana & Baja', 'Asia/Makassar': 'Bali (Central Indonesia)', 'Asia/Jakarta': 'Jakarta & Java (Western Indonesia)',
    'Asia/Jayapura': 'Papua (Eastern Indonesia)', 'Australia/Brisbane': 'Brisbane & Queensland' };
  place.zoneName = function (tz) { return ZONE[tz] || String(tz || '').split('/').pop().replace(/_/g, ' '); };
  place.candidates = candidates;
  place.fromText = function (t) { return fromText(t)[0] || ''; };
  place.phone = function () { return TZ[phoneTz()] || ''; };
  place.info = function (cc) { var c = C[cc]; return c ? { cc: cc, name: c[0], the: the(c[0]), cur: c[1], tzs: c[3], sos: c[5] } : null; };
  place.list = function () { return Object.keys(C).map(place.info).sort(function (a, b) { return a.name.localeCompare(b.name); }); };
  place.save = function (p) {   // boot.js calls this with the server's answer for the open trip
    if (p && p.cc !== undefined) try { localStorage.setItem('pp_place', JSON.stringify({ trip: tripId(), cc: p.cc, cur: p.cur, sym: p.sym, tz: p.tz, set: !!p.set })); } catch (e) {}
  };
  // the trip's clock: "what hour is it there", "what's today's date there"
  function parts(tz) {
    var o = {};
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); } catch (e) { return null; }
    return o;
  }
  place.now = function () {   // {hour, minute, day: 'yyyy-mm-dd'} in the trip's time zone (the phone's if that fails)
    var o = parts(place().tz), d = new Date();
    if (!o) return { hour: d.getHours(), minute: d.getMinutes(), day: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    return { hour: +o.hour % 24, minute: +o.minute, day: o.year + '-' + o.month + '-' + o.day };
  };
  window.ppPlace = place;
  // a travel buddy's name for example phrases ("Call Kate"), from this trip's crew; '' if we don't know anyone yet
  window.ppBuddy = function () {
    var T = json('pp_c_penpenToday:[]') || {};
    return ((T.people || []).filter(function (n) { return n && n !== T.me; })[0]) || '';
  };
})();
