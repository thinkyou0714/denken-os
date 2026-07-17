# AGENTS.md — denken-os

電験 (電気主任技術者試験) 学習 OS。学習コンテンツ + Web アプリ (静的オフライン PWA) + データパイプラインで
「電験合格までのアルゴリズム化」を目指す。**pre-alpha**。

- **Stack**: TypeScript / 静的オフライン PWA (`web/`, esbuild バンドル・フレームワークなし), Node `>=20`, Vitest, Supabase, Biome (lint/format).
- **Layout**: `web/` app · `lib/` shared logic · `data/` learning content · `scripts/` tooling · `supabase/` schema · `tests/`.
- **Setup**: deps auto-install via `.claude/bootstrap.sh` on SessionStart (local + web/cloud). Manual: `npm ci`.
- **Test**: `npm test` (→ `vitest run`). **Build**: `npm run build:web` (repo root; `scripts/build-web.ts` → `web/dist/app.js`).
- **Lint/format**: Biome (`biome.json`). **Conventions**: see `CONTRIBUTING.md` + the org `CONVENTIONS.md`.
- **Data licensing**: content under `data/` may carry a separate license — see `LICENSE-DATA` / `LICENSES.md`.

## Claude Code on the web
A cloud session auto-installs deps (SessionStart hook) and loads this `AGENTS.md` + `.claude/skills/`.
MCP is local-only for this repo (no hosted server configured) — see
`thinkyou0714/.github` → `docs/claude-code-web-readiness.md`.
