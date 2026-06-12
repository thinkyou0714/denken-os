import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      // 現状(2026-06)の実測(stmts88/branch79/funcs94/lines91, lib全体)を下回らない
      // ための回帰防止フロア。値を上げるのは歓迎、下げる場合は理由をPRに記すこと。
      // G7(I-073): 実測 stmts86/branch78/funcs97/lines95 に基づき funcs/lines を引き上げ。
      // stmts/branches は実測-3pt が現行床を下回るため変更なし。
      thresholds: {
        statements: 85,
        branches: 76,
        functions: 94,
        lines: 92,
      },
    },
  },
});
