import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      // 純ロジック（正しさの核）を計測対象に。CLI/ナレーション/外部I/Oは閾値対象外。
      include: ["lib/engine/**", "lib/study/**", "lib/audio/**", "lib/scheduler/**"],
      exclude: ["lib/engine/cli.ts", "lib/engine/narrate.ts", "lib/**/*.test.ts"],
      reporter: ["text-summary"],
      // 回帰でカバレッジが落ちたら CI を赤にする安全網（資格問題の正しさを守る）。
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});
