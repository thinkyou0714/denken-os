import type { Problem } from "@/domain/content/schema";

export const theoryProblems: Problem[] = [
  {
    id: "theory-001",
    subject: "theory",
    topic: "直流回路",
    difficulty: 1,
    question:
      "抵抗 $R_1 = 2\\,\\Omega$ と $R_2 = 3\\,\\Omega$ を直列に接続し、直流電圧 $V = 10\\,\\mathrm{V}$ を加えた。回路に流れる電流 $I$ はいくらか。",
    choices: ["1 A", "2 A", "5 A", "10 A"],
    answerIndex: 1,
    explanation:
      "直列回路の合成抵抗は $R = R_1 + R_2 = 5\\,\\Omega$。オームの法則より\n\n$$I = \\frac{V}{R} = \\frac{10}{5} = 2\\,\\mathrm{A}$$",
    tags: ["オームの法則", "直列"],
  },
  {
    id: "theory-002",
    subject: "theory",
    topic: "交流回路",
    difficulty: 2,
    question:
      "抵抗 $R = 3\\,\\Omega$ と誘導性リアクタンス $X_L = 4\\,\\Omega$ を直列に接続した回路に、交流電圧 $V = 100\\,\\mathrm{V}$ を加えた。流れる電流 $I$ はいくらか。",
    choices: ["10 A", "20 A", "25 A", "33 A"],
    answerIndex: 1,
    explanation:
      "インピーダンスは\n\n$$Z = \\sqrt{R^2 + X_L^2} = \\sqrt{3^2 + 4^2} = 5\\,\\Omega$$\n\nしたがって $I = \\dfrac{V}{Z} = \\dfrac{100}{5} = 20\\,\\mathrm{A}$。",
    tags: ["インピーダンス", "RL直列"],
  },
  {
    id: "theory-003",
    subject: "theory",
    topic: "電力",
    difficulty: 1,
    question:
      "抵抗 $R = 10\\,\\Omega$ に電流 $I = 2\\,\\mathrm{A}$ が流れている。この抵抗で消費される電力 $P$ はいくらか。",
    choices: ["20 W", "40 W", "80 W", "100 W"],
    answerIndex: 1,
    explanation:
      "抵抗の消費電力は\n\n$$P = I^2 R = 2^2 \\times 10 = 40\\,\\mathrm{W}$$",
    tags: ["消費電力", "ジュール熱"],
  },
  {
    id: "theory-004",
    subject: "theory",
    topic: "直流回路",
    difficulty: 2,
    question:
      "抵抗 $R_1 = 6\\,\\Omega$ と $R_2 = 3\\,\\Omega$ を並列に接続したときの合成抵抗 $R$ はいくらか。",
    choices: ["1.5 Ω", "2 Ω", "4.5 Ω", "9 Ω"],
    answerIndex: 1,
    explanation:
      "並列合成抵抗は\n\n$$\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2} = \\frac{1}{6} + \\frac{1}{3} = \\frac{1}{2}$$\n\nよって $R = 2\\,\\Omega$。",
    tags: ["合成抵抗", "並列"],
  },
];
