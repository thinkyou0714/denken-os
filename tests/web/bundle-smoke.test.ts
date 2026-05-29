/**
 * web バンドルのスモークテスト。
 * jsdom を増やさず（依存最小・オフライン方針）、ビルド成果物が壊れていないこと、
 * 主要機能の配線が消えていないことを軽量に検知する。
 * build:web は gen:web→esbuild を実行するので、ここでは生成済みバンドルを検査する。
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BUNDLE = join(ROOT, "web/dist/app.js");
const INDEX = join(ROOT, "web/index.html");

// バンドルは dist/（gitignore）で、CI ではテスト後に build:web される。
// 生成済みのときだけバンドル内容を検査する（test 単独実行でも落とさない）。
const bundleExists = existsSync(BUNDLE);

describe("web バンドル・スモーク", () => {
  it.runIf(bundleExists)("バンドルが存在するとき、空でなく主要機能の配線が残る", () => {
    const js = readFileSync(BUNDLE, "utf8");
    expect(js.length).toBeGreaterThan(1000);
    // esbuild は日本語を \uXXXX へ最小化するため、安定な英字シンボルで配線を確認。
    // app shell の登録・主要要素IDがバンドルに含まれること（消滅＝壊れ検知）。
    expect(js).toContain("serviceWorker");
    for (const id of ["audio-lesson", "exam-plan", "aspects"]) {
      expect(js.includes(id), `バンドルに ${id} の配線が無い`).toBe(true);
    }
  });

  it("index.html に主要モードの操作要素IDが揃っている", () => {
    const html = readFileSync(INDEX, "utf8");
    // 出題・記述採点・音声・レッスン・合格到達度・試験日の各 UI フック。
    for (const id of [
      "answers",
      "feedback",
      "solution",
      "audio-lesson",
      "audio-play",
      "exam-date",
      "exam-plan",
      "readiness",
      "aspects",
    ]) {
      expect(html.includes(`id="${id}"`), `index.html に #${id} が無い`).toBe(true);
    }
  });
});
