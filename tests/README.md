# Browser Regression Tests

Run the complete dependency-free browser suite from the public repository root:

```bash
node tests/run.mjs
```

The runner requires Node.js 22 or newer and a Chromium-family browser. Set `CHROME_PATH` when the browser is not in a standard location.

Under WSL, the runner automatically re-executes itself with Windows Node when only Windows Chrome or Edge is available. It starts an isolated local server and browser profile, connects through the Chrome DevTools Protocol, and removes both when the run finishes.

The fixtures cover document formats 0–7 and use synthetic import-catalog data only. They are public compatibility contracts and must remain importable when the schema changes. The format-5 fixture includes a synthetic change-history entry, format 6 adds stable built-in-scenario linkage, and format 7 adds the persisted current turn. The runtime suites additionally verify the complete deeply frozen built-in scenario-enemy reference, structured event schedules, no-import rendering, turn/event behavior, semantic turn history, Play-mode visibility, and phone fit.
