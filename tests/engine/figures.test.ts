/**
 * 図ビルダーのスモークテスト。
 * インライン SVG が「整形として妥当・a11y タイトル付き・座標に NaN/undefined を含まない」ことを
 * 全ビルダーで横断検証する（座標計算のバグ＝NaN混入を回帰防止）。
 */
import { describe, expect, it } from "vitest";
import {
  firstOrderBlockFigure,
  maxPowerFigure,
  powerTriangleFigure,
  resistorLadderFigure,
  seriesRCFigure,
  singleLineDropFigure,
  syncPhasorFigure,
  threePhaseYFigure,
  torqueSlipFigure,
  transformerFigure,
  wheatstoneFigure,
} from "../../lib/engine/figures/index.js";

const figures: Array<[string, string]> = [
  ["threePhaseY", threePhaseYFigure(200, 8, 6)],
  ["maxPower", maxPowerFigure(100, 5)],
  ["seriesRC", seriesRCFigure(10, 4)],
  ["wheatstone", wheatstoneFigure(100, 200, 150, 300)],
  ["powerTriangle", powerTriangleFigure(240, 180, 0, "kvar")],
  ["singleLineDrop", singleLineDropFigure(10, 0.3, 0.4, 0.8)],
  ["transformer", transformerFigure(6600, 200, 33)],
  ["syncPhasor", syncPhasorFigure(200, 300, 90)],
  ["firstOrderBlock", firstOrderBlockFigure(5, 1)],
  ["torqueSlip", torqueSlipFigure(0.05, 0.15)],
  ["resistorLadder", resistorLadderFigure(10, 30, 60)],
];

describe("図ビルダー（インラインSVG）", () => {
  for (const [name, fig] of figures) {
    it(`${name}: 妥当なSVG・<title>付き・NaN/undefined無し`, () => {
      expect(fig.startsWith("<svg")).toBe(true);
      expect(fig.trim().endsWith("</svg>")).toBe(true);
      expect(fig).toContain('role="img"');
      expect(fig).toContain("<title>");
      // 座標計算のバグ（NaN/undefined/Infinity）が文字列に混入していないこと。
      expect(fig).not.toMatch(/NaN|undefined|Infinity/);
      // 開き<svgと閉じ</svgが1対。
      expect((fig.match(/<svg/g) ?? []).length).toBe(1);
      expect((fig.match(/<\/svg>/g) ?? []).length).toBe(1);
    });
  }

  it("syncPhasor: 角度0でも有限座標（境界）", () => {
    const f = syncPhasorFigure(200, 200, 0);
    expect(f).not.toMatch(/NaN|undefined/);
  });
});
