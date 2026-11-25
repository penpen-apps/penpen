/* A made-up trip for testing penpen without the real server.
   Nobody here is real, and nothing is read from or written to any Google Sheet.
   The shapes copy what server/Code.gs returns for each function.
   Dates are worked out from today, so the trip is always "happening now":
   it started 2 days ago and ends in 5 days. */

const DAY = 864e5;
function ymd(d) { return d.toISOString().slice(0, 10); }
function label(d, opts) { return d.toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, opts)); }

function makeTrip(now = new Date()) {
  // the browser in check.js runs on UTC (timezoneId), so "today" here matches the app's own today
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const at = (offset) => new Date(today.getTime() + offset * DAY);
  const start = at(-2), end = at(5);
  const people = ['Alex', 'Sam', 'Jo'];
  const me = 'Alex';
  const place = { cc: 'PH', name: 'Philippines', cur: 'PHP', sym: '₱', tz: 'Asia/Manila', set: true };
  const tripCard = { name: 'Test trip (fake)', dates: label(start, { month: 'short', day: 'numeric' }) + ' – ' + label(end, { month: 'short', day: 'numeric', year: 'numeric' }) };

  const stopsFor = (offset) => ({
    '-2': [{ time: '14:00', what: 'Land in Cebu', place: 'Mactan-Cebu International Airport', notes: 'Flight PR 1845' },
           { time: '17:00', what: 'Check in', place: 'Harbor View Hotel, Cebu City', notes: '' }],
    '-1': [{ time: '09:00', what: 'Island hopping', place: 'Nalusuan Island, Cordova', notes: 'Bring sunscreen' }],
    '0':  [{ time: '08:30', what: 'Breakfast', place: 'Café Laguna, Cebu City', notes: '' },
           { time: '13:00', what: 'Ferry to Bohol', place: 'Pier 1, Cebu City', notes: 'Tickets in Bookings' },
           { time: '18:00', what: 'Dinner by the beach', place: 'Alona Beach, Panglao', notes: '' }],
    '1':  [{ time: '10:00', what: 'Chocolate Hills', place: 'Carmen, Bohol', notes: '' }],
    '3':  [{ time: '', what: 'Free day', place: 'Panglao, Bohol', notes: '' }],
    '5':  [{ time: '11:00', what: 'Fly home', place: 'Bohol-Panglao International Airport', notes: '' }],
  })[String(offset)] || [];

  let row = 2;
  const days = [-2, -1, 0, 1, 3, 5].map((o) => {
    const d = at(o);
    return { day: ymd(d), label: label(d, { weekday: 'short', month: 'short', day: 'numeric' }), short: label(d, { month: 'short', day: 'numeric' }),
      stops: stopsFor(o).map((s, i) => Object.assign({ row: row++, lat: 10.3 - o * 0.1 + i * 0.01, lng: 123.9 + o * 0.05 }, s)) };
  });
  const todayStops = days.find((d) => d.day === ymd(today)).stops;
  const hm = (t) => t ? { t: (Number(t.slice(0, 2)) % 12 || 12) + ':' + t.slice(3), ap: Number(t.slice(0, 2)) < 12 ? 'AM' : 'PM' } : { t: '', ap: '' };

  const contacts = [
    { row: 2, type: 'Emergency', name: 'Philippine emergency line', forr: 'Everyone', person: '', phone: '911', msg: '', email: '', place: 'Philippines', notes: '' },
    { row: 3, type: 'Hotel', name: 'Harbor View Hotel', forr: 'Everyone', person: 'Front desk', phone: '+63 32 555 0100', msg: '', email: 'stay@example.com', place: 'Cebu City', notes: '' },
    { row: 4, type: 'Driver', name: 'Rico (driver)', forr: 'Everyone', person: 'Rico', phone: '+63 917 555 0199', msg: '', email: '', place: 'Cebu', notes: 'Airport pickups' },
  ];

  const profiles = people.map((n, i) => ({ name: n, role: ['Partner', 'Partner', 'Friend'][i], job: ['Planner', 'Money', 'Photos'][i], avatar: null,
    flight: i === 0 ? 'PR 1845' : '', phone: '+1 555 010' + i, saved: true, isMe: n === me }));

  const look = [{ row: 7, what: 'Taxi from airport', date: ymd(start), status: '⚠ Who paid?', entry: '', amt: 650, cur: 'PHP', by: '', forr: 'Shared', kind: 'payer' }];

  const settleHtml =
    '<div class="card hero"><div class="lbl">WHO OWES WHO</div><div class="v">Sam pays Alex ₱1,200<br>Jo pays Alex ₱800</div></div>' +
    '<div class="stats"><div class="card"><div class="muted">Total spent</div><div class="v">₱18,400</div><div class="muted">$320</div></div>' +
    '<div class="card"><div class="muted">Not paid yet</div><div class="v">₱4,000</div><div class="muted">$70</div></div>' +
    '<div class="card"><div class="muted">👛 Pocket money</div><div class="v">₱2,350</div><div class="muted">left</div></div></div>' +
    '<div class="card"><b>Who paid what</b><table><tr><th>Person</th><th>Paid</th><th>Fair share</th><th>Balance</th></tr>' +
    '<tr><td><b>Alex</b></td><td>₱8,100</td><td>₱6,100</td><td class="pos">+₱2,000</td></tr>' +
    '<tr><td><b>Sam</b></td><td>₱4,900</td><td>₱6,100</td><td class="neg">−₱1,200</td></tr>' +
    '<tr><td><b>Jo</b></td><td>₱5,400</td><td>₱6,200</td><td class="neg">−₱800</td></tr></table>' +
    '<div class="muted small">+ gets money back · − owes</div></div>';

  const fns = {
    penpenToday: () => ({
      setup: null,
      hello: { name: me, hi: 'Good morning, ' + me + '!', line: 'Ferry to Bohol at 1 PM today.', label: 'Day 3 of 8', mood: 'sunny',
        weather: { place: 'Cebu City', temp: 30, label: 'Sunny' }, trip: tripCard.name,
        chips: ['Who owes who?', 'What’s the plan today?', 'Lunch 450 pesos, I paid', 'Undo'] },
      me, people, ls: '₱', cur: 'PHP', home: 'USD', place, rate: 57.5,
      next: { title: 'Ferry to Bohol', sub: 'Pier 1, Cebu City', day: label(today, { weekday: 'short', month: 'short', day: 'numeric' }),
        time: '1:00', ap: 'PM', at: today.getTime() + 13 * 36e5, dir: '', place: 'Pier 1, Cebu City' },
      timelineDay: label(today, { weekday: 'short', month: 'short', day: 'numeric' }),
      timeline: todayStops.map((s) => { const l = hm(s.time); return { time: l.t ? l.t + ' ' + l.ap : '', title: s.what, done: false, dir: '' }; }),
      look, settle: 'Sam pays Alex ₱1,200\nJo pays Alex ₱800',
      balances: [{ name: 'Alex', bal: 2000 }, { name: 'Sam', bal: -1200 }, { name: 'Jo', bal: -800 }],
      pocket: { left: 2350, put: 6000, out: 3650 },
      budget: { group: { budget: 60000, spent: 18400, todo: 4000, pct: 0.31, pace: 'On track — day 3 of 8', dayPct: 3 / 8 },
        mine: { budget: 20000, spent: 6100, pct: 0.305, pace: 'On track — day 3 of 8' } },
      mine: { total: 6100, personal: 900, share: 5200, covered: 0, cats: [{ cat: 'Food & Drinks', amt: 2600 }, { cat: 'Transportation', amt: 1900 }, { cat: 'Activities & Tours', amt: 1600 }], hidden: false },
    }),
    penpenPlan: () => ({ days, today: ymd(today), start: ymd(start), end: ymd(end), open: ymd(today), country: place.name, place }),
    penpenDayExtras: () => ({ start: null, end: { name: 'Harbor View Hotel', place: 'Cebu City', moving: false, back: false }, legs: [] }),
    penpenSafety: () => ({ me, here: 'Cebu City', during: true, contacts, live: people.map((n) => ({ name: n, link: '', me: n === me })) }),
    penpenProfiles: () => ({ me, tripType: 'friends', people: profiles, url: '', trip: tripCard }),
    penpenFormData: () => ({ people, curs: ['PHP', 'USD'], defCur: 'PHP', cats: ['Accommodation', 'Activities & Tours', 'Transportation', 'Food & Drinks', 'Shopping & Other'], today: ymd(today), me }),
    penpenMoneyCats: () => ({ cats: { 'Accommodation': { PHP: 9000 }, 'Food & Drinks': { PHP: 4200 }, 'Transportation': { PHP: 3100 }, 'Activities & Tours': { PHP: 2100 } }, rate: 57.5 }),
    settleWeb: () => settleHtml,
    penpenDiaryInfo: () => ({ group: '', me: '' }),
    penpenDiaryVideos: () => [],
  };

  /* top-level actions (not "call") */
  const actions = {
    whoami: () => ({ user: { email: 'alex@example.com', name: me, picture: '' }, member: { email: 'alex@example.com', name: me, role: 'creator' },
      can: ['read', 'write', 'admin'], session: 'fake-session' }),
    trips: () => ({ trips: [{ id: '', name: tripCard.name, role: 'creator' }] }),
    theme: () => ({ theme: '' }),
    setTheme: (a) => ({ theme: a.theme || '' }),
    invite: () => ({ code: 'FAKECODE01' }),
    members: () => ({ members: [{ email: 'alex@example.com', name: 'Alex', role: 'creator' }, { email: 'sam@example.com', name: 'Sam', role: 'crew' }] }),
  };

  return { fns, actions };
}

module.exports = { makeTrip };
