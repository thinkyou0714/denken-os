# DENKEN-OS — Improvement Backlog

Scored best-practice backlog from a read-only deep-research sweep (value × effort × risk).
Tiers: **T1** = high-value / low-risk · **T2** = behavior-preserving code-quality · **T3** = higher-leverage
or behavior-changing (needs design). Invariants that any refactor MUST preserve: deterministic in-code
answers (no LLM in grading), schema-as-lingua-franca (zod ↔ problem-schema.json parity), store-interface
contracts + RLS `auth.uid()` isolation, and the `web/sw.js` `__BUILD_HASH__` placeholder (committed as a
placeholder; stamped only at build).

## Already present (verified) / not needed
- CodeQL, Dependabot, secrets-scan (gitleaks), dependency-review, `.editorconfig`, `.gitattributes`,
  `SECURITY.md`, `CONTRIBUTING.md`, `vitest.config.ts` all exist. The build-guard placeholder test is a
  documented invariant, not a bug. **No Dependabot/CodeQL to add.**

## T1 — scaffolding (this PR)
- **`CLAUDE.md`** — layered, code-accurate guide that documents the invariants above + architecture (engine / scheduler / store / web / audit) + commands + testing (vitest, playwright e2e, RLS/schema-drift/build-guard).
- **`.claude/settings.json`** — read-only Claude Code permission allowlist (the real npm scripts + read-only git) + destructive-command deny.

## T2 — behavior-preserving code-quality / tests
- **Deduplicate `pick()`** — all 10 templates (`lib/engine/templates/*.ts`) define an identical `pick<T>(arr, rng)`; extract to `lib/engine/templates/common.ts` and import. (M/S/low)
- **`audit:status` CI gate** — run `npm run audit:status` (or `:strict`) in `validate.yml` so low validated-count can't merge silently. (M/S/low)
- **RLS policy strictness test** — assert `answer_logs`/`review_states` policies carry matching `USING` **and** `WITH CHECK` `auth.uid()` clauses (not just presence). (`tests/store/rls-policies.test.ts`) (M/S/low)
- **Migration ↔ zod schema-drift test** — parse `supabase/migrations/*.sql` table/columns and assert parity with the store shapes. (M/M/low)
- **Web app error surfacing** — when IndexedDB is unavailable and it falls back to localStorage/in-memory, log + show a small "LocalStorage mode" indicator instead of silent degradation. (`web/src/app.ts`, `web/src/idb.ts`) (M/S/low)

## T3 — higher-leverage / behavior-changing (separate PRs, design first)
- **Offline-PWA e2e test** — mock Service Worker runtime, simulate offline (`caches` add/match), verify app-shell load + fetch fallback + cache-version persistence. (`tests/web/e2e.test.ts`) (high/M/low)
- **RLS guard test** — `SupabaseStore` against a stubbed RLS-enforcing fake that rejects `auth.uid() != user_id`, verifying every query applies the uid filter. (high/M/low)
- **Template base/factory** — common RX-pairs/sampling/distractor/clean-answer hooks to cut ~15–20% duplication across templates. (M/M/low)
- **Scheduler perf regression test** — bench `fsrsSchedule`/`sm2Schedule` over 1000+ histories (<100ms). (M/M/low)
- **Store pagination** (`limit`/`offset` on `list()`/`byUser()`) — design RFC before implementing; needed before Supabase scale. (low/L/medium)

> Part of an ecosystem-wide best-practice sweep; companion backlogs live in the sibling repos
> (ccmux, fugu, engineer-tenshoku-navi).
