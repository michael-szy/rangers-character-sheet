# Browser Regression Tests

Run the complete dependency-free browser suite from the public repository root:

```bash
node tests/run.mjs
```

The runner requires Node.js 22 or newer and a Chromium-family browser. Set `CHROME_PATH` when the browser is not in a standard location.

Under WSL, the runner automatically re-executes itself with Windows Node when only Windows Chrome or Edge is available. It starts an isolated local server and browser profile, connects through the Chrome DevTools Protocol, and removes both when the run finishes.

The fixtures cover document formats 0–7. They are public compatibility contracts and must remain importable when the schema changes; format 3 preserves historical catalog-linked kill snapshots, format 5 includes synthetic change history, format 6 adds stable built-in-scenario linkage, and format 7 adds the persisted current turn. The runtime suites additionally verify all 21 built-in scenarios, the deeply frozen 42-profile enemy picker/reference, all 126 encounter mappings, structured event schedules, direct select-to-add mission entry, objective and bonus/token presets, the compact character-header Condition dock, the optional Homebrew v0.5 reference, single-mode compatibility, semantic turn history, and responsive phone/tablet fit.
