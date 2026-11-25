# Screen check (fake server)

Opens penpen in a test browser with a made-up trip and saves a screenshot of each screen, so a change can be checked without touching the real server or any trip Sheet.

```bash
node test/check.js
```

- `--signed-out`: the sign-in screen instead (the Google button won't show, because Google is blocked in the test)
- `--dark`: dark mode

Screenshots land in `test/out/` (ignored by git). The command lists any page errors and ends with "No page errors." when all is well.

**What's fake:** every request to `script.google.com` is answered from `fake-trip.js`. Every other outside address (Google sign-in, maps, fonts, weather) is blocked, so the map shows "couldn't load". That's expected.

**When a screen looks empty:** the check prints which server functions had no fake answer. Add them to `fake-trip.js`, copying the shape that function returns in `server/Code.gs`.

Needs Node and Playwright (already installed in Claude Code cloud sessions).
