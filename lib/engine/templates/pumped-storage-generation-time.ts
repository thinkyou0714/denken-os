/**
 * テンプレート: 揚水電力量から発電可能時間を求める（二種二次・電力管理・descriptive）。
 *   夜間に入力 Pp〔MW〕で tp〔h〕揚水し、総合効率（発電電力量/揚水電力量）が η のとき
 *     発電可能電力量 E = Pp·tp·η〔MW·h〕、出力 Pg での発電可能時間 tg = E/Pg〔h〕
 *   過去問頻出の「揚水発電の総合効率」を、運用計画（何時間ピークを賄えるか）に
 *   ひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const PP_SET: ReadonlyArray<number> = [100, 200, 250, 300];
const TP_SET: ReadonlyArray<number> = [4, 5, 6, 8];
const ETA_SET: ReadonlyArray<number> = [0.7, 0.75, 0.8];
const PG_SET: ReadonlyArray<number> = [150, 200, 210, 280, 300];

type Params = {
  pumping_power: number;
  pumping_hours: number;
  overall_efficiency: number;
  generating_power: number;
};

export const pumpedStorageGenerationTime = defineTemplate<Params>({
  topic: "揚水発電の発電可能時間",
  subject: "電力管理",
  exam: "denken2_secondary",
  difficulty: 4,
  pastExam: { area: "発電（水力・汽力）", frequency: "high", years: [2007, 2013, 2019, 2023] },
  paramSpecs: {
    pumping_power: { unit: "MW", realistic_range: [50, 500] },
    pumping_hours: { unit: "h", realistic_range: [2, 10] },
    overall_efficiency: { unit: "", realistic_range: [0.6, 0.85] },
    generating_power: { unit: "MW", realistic_range: [100, 500] },
  },
  paramOrder: ["pumping_power", "pumping_hours", "overall_efficiency", "generating_power"],
  draw(rng) {
    return {
      pumping_power: pick(PP_SET, rng),
      pumping_hours: pick(TP_SET, rng),
      overall_efficiency: pick(ETA_SET, rng),
      generating_power: pick(PG_SET, rng),
    };
  },
  buildFrom({ pumping_power: pp, pumping_hours: tp, overall_efficiency: eta, generating_power: pg }) {
    if (pp <= 0 || tp <= 0 || pg <= 0) return null;
    if (eta <= 0 || eta >= 1) return null;
    const pumpedEnergy = pp * tp;
    const genEnergy = pumpedEnergy * eta;
    const genHours = genEnergy / pg;
    // ピーク運用として現実的な時間帯（1〜10h）の綺麗な値のみ採用。
    if (genHours < 1 || genHours > 10) return null;
    if (!isCleanAnswer(genEnergy) || !isCleanAnswer(genHours)) return null;
    const answerText = formatClean(genHours);
    const pe = formatClean(pumpedEnergy);
    const ge = formatClean(genEnergy);
    return {
      format: "descriptive",
      params: {
        pumping_power: { value: pp, unit: "MW", realistic_range: [50, 500] },
        pumping_hours: { value: tp, unit: "h", realistic_range: [2, 10] },
        overall_efficiency: { value: eta, unit: "", realistic_range: [0.6, 0.85] },
        generating_power: { value: pg, unit: "MW", realistic_range: [100, 500] },
      },
      answerValue: genHours,
      answerUnit: "h",
      answerText,
      facts: { pp, tp, eta, pg, pumpedEnergy, genEnergy, genHours },
      defaultStatement:
        `揚水発電所が夜間の余剰電力により入力 ${pp}MW で ${tp}時間 揚水した。` +
        `揚水電力量に対する発電電力量の比（総合効率）を ${eta} とするとき、` +
        `翌日ピーク時に出力 ${pg}MW で発電を続けられる時間〔h〕を求めよ。`,
      defaultSolution: [
        `着眼点: 揚水電力量に総合効率を掛けたものが発電側で取り出せる電力量。`,
        `揚水電力量: ${pp}×${tp}=${pe}MW·h`,
        `発電可能電力量: E=${pe}×${formatClean(eta)}=${ge}MW·h`,
        `tg=E/Pg=${ge}/${pg}=${answerText}h`,
        `ポイント: 総合効率はポンプ・水車・電動発電機・水路損失を往復で含んだ値（おおむね0.7前後）。`,
      ],
      physicallyValid: true,
    };
  },
});
