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
  {
    id: "theory-005",
    subject: "theory",
    topic: "静電容量",
    difficulty: 2,
    source: "オリジナル",
    question:
      "$C = 100\\,\\mu\\mathrm{F}$ のコンデンサに $V = 200\\,\\mathrm{V}$ を加えたとき、蓄えられる静電エネルギー $W$ はいくらか。",
    choices: ["1 J", "2 J", "4 J", "20 J", "40 J"],
    answerIndex: 1,
    explanation:
      "コンデンサに蓄えられる静電エネルギーは\n\n$$W = \\frac{1}{2} C V^2 = \\frac{1}{2} \\times 100 \\times 10^{-6} \\times 200^2 = 2\\,\\mathrm{J}$$",
    tags: ["コンデンサ", "静電エネルギー"],
  },
  {
    id: "theory-006",
    subject: "theory",
    topic: "三相交流",
    difficulty: 2,
    source: "オリジナル",
    question:
      "対称三相平衡負荷を Y(スター)結線で接続したとき、線間電圧 $V_l$ と相電圧 $V_p$ の関係として正しいものはどれか。",
    choices: [
      "$V_l = V_p$",
      "$V_l = \\sqrt{3}\\,V_p$",
      "$V_l = 3\\,V_p$",
      "$V_l = \\dfrac{V_p}{\\sqrt{3}}$",
      "$V_l = \\dfrac{V_p}{3}$",
    ],
    answerIndex: 1,
    explanation:
      "Y 結線では、線間電圧は隣接する 2 つの相電圧のベクトル差となり、その大きさは相電圧の $\\sqrt{3}$ 倍。一方で線電流は相電流に等しい($I_l = I_p$)。",
    tags: ["Y結線", "三相"],
  },
  {
    id: "theory-007",
    subject: "theory",
    topic: "電磁誘導",
    difficulty: 2,
    source: "オリジナル",
    question:
      "巻数 $N = 100$ のコイルで、磁束 $\\Phi$ が $0.01\\,\\mathrm{s}$ の間に $2 \\times 10^{-3}\\,\\mathrm{Wb}$ 変化した。誘導起電力 $e$ の大きさは。",
    choices: ["2 V", "10 V", "20 V", "100 V", "200 V"],
    answerIndex: 2,
    explanation:
      "ファラデーの電磁誘導の法則より\n\n$$|e| = N\\,\\frac{\\Delta \\Phi}{\\Delta t} = 100 \\times \\frac{2 \\times 10^{-3}}{0.01} = 20\\,\\mathrm{V}$$",
    tags: ["ファラデー", "誘導起電力"],
  },
  {
    id: "theory-008",
    subject: "theory",
    topic: "共振回路",
    difficulty: 3,
    source: "オリジナル",
    question:
      "$L = 10\\,\\mathrm{mH}$ と $C = 1\\,\\mu\\mathrm{F}$ の直列共振回路の共振周波数 $f_0$ に最も近い値は。",
    choices: ["50 Hz", "500 Hz", "1.6 kHz", "16 kHz", "160 kHz"],
    answerIndex: 2,
    explanation:
      "直列 LC 共振の共振周波数は\n\n$$f_0 = \\frac{1}{2\\pi\\sqrt{LC}} = \\frac{1}{2\\pi\\sqrt{10^{-2} \\times 10^{-6}}} = \\frac{1}{2\\pi \\times 10^{-4}} \\approx 1.59\\,\\mathrm{kHz}$$",
    tags: ["LC共振", "共振周波数"],
  },
  {
    id: "theory-009",
    subject: "theory",
    topic: "回路法則",
    difficulty: 1,
    source: "オリジナル",
    question:
      "ある節点に $I_1 = 2\\,\\mathrm{A}$ と $I_2 = 3\\,\\mathrm{A}$ が流れ込み、$I_3$ が流れ出している。$I_3$ はいくらか。",
    choices: ["1 A", "2 A", "3 A", "5 A", "6 A"],
    answerIndex: 3,
    explanation:
      "キルヒホッフの電流則(KCL)より、節点に流入する電流の総和は流出する電流の総和に等しい。\n\n$$I_3 = I_1 + I_2 = 2 + 3 = 5\\,\\mathrm{A}$$",
    tags: ["キルヒホッフ", "KCL"],
  },
];
