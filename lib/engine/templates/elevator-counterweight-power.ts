/**
 * テンプレート: 釣合いおもり付き巻上機の電動機出力（二種一次・機械・numeric）。
 *   かご質量 W〔kg〕・釣合いおもり Wc〔kg〕・上昇速度 v〔m/s〕・機械効率 η のとき
 *     P = (W−Wc)·g·v / η 〔W〕（g=9.8m/s²）
 *   過去問頻出の「巻上機の所要出力」を、釣合いおもりで有効荷重が減る形にひねった改作。
 */
import { formatClean, isCleanAnswer } from "../clean.js";
import { defineTemplate, pick } from "./helpers.js";

const W_SET: ReadonlyArray<number> = [800, 1000, 1200, 1500, 2000, 2500];
const WC_SET: ReadonlyArray<number> = [400, 500, 600, 750, 1000, 1250];
const V_SET: ReadonlyArray<number> = [1, 1.5, 2];
const ETA_SET: ReadonlyArray<number> = [0.7, 0.8, 0.875];
const GRAVITY = 9.8;

type Params = {
  cage_mass: number;
  counter_mass: number;
  speed: number;
  efficiency: number;
};

export const elevatorCounterweightPower = defineTemplate<Params>({
  topic: "釣合いおもり付き巻上機の出力",
  subject: "機械",
  exam: "denken2_primary",
  difficulty: 3,
  pastExam: { area: "電動機応用", frequency: "mid", years: [2009, 2015, 2020] },
  paramSpecs: {
    cage_mass: { unit: "kg", realistic_range: [500, 3000] },
    counter_mass: { unit: "kg", realistic_range: [200, 2000] },
    speed: { unit: "m/s", realistic_range: [0.5, 3] },
    efficiency: { unit: "", realistic_range: [0.5, 1] },
  },
  paramOrder: ["cage_mass", "counter_mass", "speed", "efficiency"],
  draw(rng) {
    return {
      cage_mass: pick(W_SET, rng),
      counter_mass: pick(WC_SET, rng),
      speed: pick(V_SET, rng),
      efficiency: pick(ETA_SET, rng),
    };
  },
  buildFrom({ cage_mass: w, counter_mass: wc, speed: v, efficiency: eta }) {
    if (w <= 0 || wc <= 0 || v <= 0) return null;
    if (eta <= 0 || eta > 1) return null;
    if (wc >= w) return null; // 実荷重（かご＋積載）がおもりを上回る運転条件のみ
    const powerW = ((w - wc) * GRAVITY * v) / eta;
    const powerKw = powerW / 1000;
    if (powerKw <= 0 || !isCleanAnswer(powerKw)) return null;
    const answerText = formatClean(powerKw);
    return {
      format: "numeric",
      params: {
        cage_mass: { value: w, unit: "kg", realistic_range: [500, 3000] },
        counter_mass: { value: wc, unit: "kg", realistic_range: [200, 2000] },
        speed: { value: v, unit: "m/s", realistic_range: [0.5, 3] },
        efficiency: { value: eta, unit: "", realistic_range: [0.5, 1] },
      },
      answerValue: powerKw,
      answerUnit: "kW",
      answerText,
      facts: { w, wc, v, eta, powerKw },
      defaultStatement:
        `積載時の全質量 ${w}kg のかごと、質量 ${wc}kg の釣合いおもりをもつ巻上機で、` +
        `かごを速度 ${v}m/s で上昇させる。機械効率を ${eta}、重力加速度を 9.8m/s² として、` +
        `電動機の所要出力〔kW〕を求めよ。`,
      defaultSolution: [
        `着眼点: 釣合いおもりが荷重の一部を打ち消すため、有効荷重は W−Wc になる。`,
        `P=(W−Wc)·g·v/η=(${w}−${wc})×9.8×${formatClean(v)}/${formatClean(eta)}`,
        `P=${answerText}kW`,
        `ポイント: おもりを引かずに全質量で計算すると数倍大きな誤答になる。`,
      ],
      physicallyValid: true,
    };
  },
});
