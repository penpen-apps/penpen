/* penpen screen check: opens the app in a test browser against a FAKE server and takes a screenshot of each screen.
   Never talks to the real penpen server or any Google Sheet: every request to script.google.com is answered from
   test/fake-trip.js, and every other outside address is blocked.

   Run from the repo folder:   node test/check.js
   Options:  --signed-out   show the sign-in screen instead of a signed-in phone
             --dark         dark mode
   Screenshots go to test/out/ (not saved in git). Exits with code 1 if any page error happened. */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { makeTrip } = require('./fake-trip');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const args = new Set(process.argv.slice(2));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

/* a tiny local web server for the app's own files */
function serve() {
  const srv = http.createServer((req, res) => {
    let p; try { p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch (e) { res.writeHead(400); return res.end(); }
    const file = p.endsWith(path.sep) ? path.join(p, 'index.html') : p;
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/';
  const { fns, actions } = makeTrip();
  const problems = [], unknown = new Set(), blocked = new Set();

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', timezoneId: 'UTC',
    colorScheme: args.has('--dark') ? 'dark' : 'light' });

  await ctx.route('**/*', (route) => {
    const req = route.request(), url = req.url();
    if (url.startsWith(base)) return route.continue();
    if (url.startsWith('https://script.google.com/')) {
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
      let data = null;
      if (body.action === 'call') {
        const fn = body.args && body.args.fn;
        if (Object.hasOwn(fns, fn)) data = fns[fn](...((body.args && body.args.args) || [])); else unknown.add(fn);
      } else if (Object.hasOwn(actions, body.action)) data = actions[body.action](body.args || {});
      else unknown.add('action:' + body.action);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
    }
    blocked.add(new URL(url).host);
    return route.abort();
  });

  if (!args.has('--signed-out')) {
    await ctx.addInitScript(() => {   // a phone that already signed in once
      if (!localStorage.getItem('pp_sess')) { localStorage.setItem('pp_sess', 'fake-session'); localStorage.setItem('pp_role', '"creator"'); localStorage.setItem('pp_tour', '1'); }   // tour already seen
    });
  }

  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  // "failed to load" from blocked outside addresses is expected; a missing file of the app's own is not
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.push('missing app file (' + r.status() + '): ' + r.url().slice(base.length - 1)); });

  await page.goto(base);
  await page.waitForTimeout(2500);
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  saved test/out/' + name + '.png'); };

  if (args.has('--signed-out')) {
    await shot('signin');
  } else {
    for (const [name, tab] of [['today', 'Today'], ['plan', 'Plan'], ['money', 'Money'], ['travel-buddies', 'Crew']]) {
      const went = await page.evaluate((t) => typeof window.ppGoTab === 'function' && window.ppGoTab(t), tab);
      if (!went) problems.push('could not switch to the ' + tab + ' tab (window.ppGoTab missing or said no)');
      await page.waitForTimeout(1500);
      await shot(name);
    }
    await page.click('nav button[data-p="p-chat"]').catch((e) => problems.push('chat button: ' + e.message));
    await page.waitForTimeout(1000);
    await shot('chat');
  }

  await browser.close(); srv.close();
  if (unknown.size) console.log('\nThe app asked the fake server for things it has no fake answer for (add them to test/fake-trip.js if a screen looks empty):\n  ' + [...unknown].join(', '));
  if (blocked.size) console.log('\nBlocked outside addresses (normal; the test stays offline):\n  ' + [...blocked].join(', '));
  if (problems.length) { console.log('\nPROBLEMS (' + problems.length + '):\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('\nNo page errors.');
}

main().catch((e) => { console.error(e); process.exit(1); });
