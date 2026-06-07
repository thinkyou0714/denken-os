import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // CI-2: 出荷される web ロジック(grade/select/store)も閾値で保護する。
      // app.ts は DOM 配線で単体テスト対象外のため除外。結線は tests/web/app-wiring.test.ts の
      // 静的スモーク（$() 参照 id ⊆ index.html / バンドル・SW 結線 / CSP）で依存なしに担保する。
      include: ["lib/**/*.ts", "web/src/**/*.ts"],
      exclude: ["web/src/app.ts"],
      // 現状(2026-06)の実測(stmts88/branch79/funcs94/lines91, lib全体)を下回らない
      // ための回帰防止フロア。値を上げるのは歓迎、下げる場合は理由をPRに記すこと。
      thresholds: {
        statements: 85,
        branches: 76,
        functions: 92,
        lines: 89,
      },
    },
  },
});
