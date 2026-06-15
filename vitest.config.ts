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
      // 第3ラウンド(2026-06-15): 実測 stmts86.8/branch76.7/funcs96.2/lines93.4 に追従して床上げ。
      // branches は実測 76.7 のため 76 を維持（77 は余裕不足）。下げる場合は理由をPRに記すこと。
      thresholds: {
        statements: 86,
        branches: 76,
        functions: 96,
        lines: 93,
      },
    },
  },
});
