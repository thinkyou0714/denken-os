---
name: run-tests
description: Run the denken-os test suite and summarize failures. Use when asked to test, verify, or check that a change works.
---

Run the test suite and report results concisely.

1. Ensure deps are installed (the SessionStart bootstrap handles this; if `node_modules` is missing, run `npm ci`).
2. Run `npm test` (which invokes `vitest run`). For a single file: `npx vitest run <path>`.
3. Summarize: total pass/fail count, and for each failure the test name + the first failing assertion/error line.
4. Do not modify source code unless the user explicitly asks for a fix.
