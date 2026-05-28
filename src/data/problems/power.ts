import type { Problem } from "@/domain/content/schema";

export const powerProblems: Problem[] = [
  {
    id: "power-001",
    subject: "power",
    topic: "三相交流電力",
    difficulty: 2,
    question:
      "線間電圧 $200\\,\\mathrm{V}$、線電流 $10\\,\\mathrm{A}$、力率 $0.8$ の平衡三相負荷がある。有効電力 $P$ に最も近い値はどれか。",
    choices: ["1.6 kW", "2.0 kW", "2.77 kW", "4.0 kW"],
    answerIndex: 2,
    explanation:
      "平衡三相負荷の有効電力は\n\n$$P = \\sqrt{3}\\,V_l I_l \\cos\\theta = \\sqrt{3} \\times 200 \\times 10 \\times 0.8 \\approx 2.77\\,\\mathrm{kW}$$",
    tags: ["三相電力", "力率"],
  },
  {
    id: "power-002",
    subject: "power",
    topic: "短絡電流",
    difficulty: 3,
    question:
      "定格電流 $I_n = 50\\,\\mathrm{A}$、その点までの百分率インピーダンス $\\%Z = 5\\,\\%$ である。三相短絡電流 $I_s$ はいくらか。",
    choices: ["250 A", "500 A", "1000 A", "2500 A"],
    answerIndex: 2,
    explanation:
      "短絡電流は百分率インピーダンスの逆数倍となる。\n\n$$I_s = I_n \\times \\frac{100}{\\%Z} = 50 \\times \\frac{100}{5} = 1000\\,\\mathrm{A}$$",
    tags: ["%インピーダンス", "故障計算"],
  },
  {
    id: "power-003",
    subject: "power",
    topic: "電圧降下",
    difficulty: 2,
    question:
      "単相 2 線式線路で、電線 1 線あたりの抵抗 $r = 0.1\\,\\Omega$、負荷電流 $I = 20\\,\\mathrm{A}$ である。リアクタンスを無視するとき、線路の電圧降下 $v$(往復)はいくらか。",
    choices: ["2 V", "4 V", "8 V", "40 V"],
    answerIndex: 1,
    explanation:
      "単相 2 線式は往復 2 線分の抵抗を考慮する。\n\n$$v = 2 I r = 2 \\times 20 \\times 0.1 = 4\\,\\mathrm{V}$$",
    tags: ["配電", "電圧降下"],
  },
];
