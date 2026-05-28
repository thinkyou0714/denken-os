import type { Problem } from "@/domain/content/schema";
import {
  svg,
  wire,
  node,
  resistor,
  label,
  annotation,
} from "@/lib/svg/primitives";

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
  {
    id: "theory-010",
    subject: "theory",
    topic: "直列並列混合回路",
    difficulty: 2,
    source: "オリジナル",
    figureSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" role="img" aria-labelledby="t10-title" style="max-width:100%;height:auto"><title id="t10-title">R1 直列 + R2 と R3 の並列回路</title><style>.w{stroke:#0f172a;stroke-width:2;fill:none}.r{fill:#fff;stroke:#0f172a;stroke-width:2}.t{font-family:system-ui,sans-serif;font-size:13px;fill:#111}.l{font-family:system-ui,sans-serif;font-size:13px;font-weight:600;fill:#1d4ed8}</style><line class="w" x1="40" y1="60" x2="40" y2="160"/><line class="w" x1="28" y1="105" x2="52" y2="105"/><line class="w" x1="34" y1="115" x2="46" y2="115"/><text class="l" x="4" y="92">E=12V</text><line class="w" x1="40" y1="60" x2="90" y2="60"/><rect class="r" x="90" y="50" width="60" height="20"/><text class="t" x="103" y="65">R₁=2Ω</text><line class="w" x1="150" y1="60" x2="200" y2="60"/><circle cx="200" cy="60" r="3" fill="#0f172a"/><line class="w" x1="200" y1="60" x2="200" y2="30"/><line class="w" x1="200" y1="30" x2="220" y2="30"/><rect class="r" x="220" y="20" width="60" height="20"/><text class="t" x="233" y="35">R₂=6Ω</text><line class="w" x1="280" y1="30" x2="340" y2="30"/><line class="w" x1="340" y1="30" x2="340" y2="60"/><line class="w" x1="200" y1="60" x2="200" y2="90"/><line class="w" x1="200" y1="90" x2="220" y2="90"/><rect class="r" x="220" y="80" width="60" height="20"/><text class="t" x="233" y="95">R₃=3Ω</text><line class="w" x1="280" y1="90" x2="340" y2="90"/><line class="w" x1="340" y1="60" x2="340" y2="90"/><circle cx="340" cy="60" r="3" fill="#0f172a"/><line class="w" x1="340" y1="60" x2="340" y2="160"/><line class="w" x1="40" y1="160" x2="340" y2="160"/><path d="M 70 52 L 80 60 L 70 68 Z" fill="#1d4ed8"/><text class="l" x="55" y="48">I</text><text class="t" x="195" y="78" style="font-size:11px;fill:#6b7280">A</text><text class="t" x="345" y="78" style="font-size:11px;fill:#6b7280">B</text></svg>`,
    question:
      "下図の回路において、回路全体に流れる電流 $I$ はいくらか。",
    choices: ["1.5 A", "2 A", "3 A", "4 A", "6 A"],
    answerIndex: 2,
    explanation:
      "$R_2$ と $R_3$ の並列合成抵抗は\n\n$$R_{23} = \\frac{R_2 R_3}{R_2 + R_3} = \\frac{6 \\times 3}{6 + 3} = 2\\,\\Omega$$\n\nこれが $R_1$ と直列なので全体は\n\n$$R = R_1 + R_{23} = 2 + 2 = 4\\,\\Omega$$\n\nしたがって $I = E/R = 12/4 = 3\\,\\mathrm{A}$。",
    tags: ["直列並列", "合成抵抗", "回路図"],
  },
  {
    id: "theory-011",
    subject: "theory",
    topic: "インピーダンス三角形",
    difficulty: 2,
    source: "オリジナル",
    figureSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 220" role="img" aria-labelledby="t11-title" style="max-width:100%;height:auto"><title id="t11-title">インピーダンス三角形 R=3, X_L=4, Z=5</title><style>.w{stroke:#0f172a;stroke-width:2;fill:none}.h{stroke:#1d4ed8;stroke-width:2.5;fill:none}.t{font-family:system-ui,sans-serif;font-size:14px;fill:#111}.a{font-family:system-ui,sans-serif;font-size:14px;font-weight:600;fill:#dc2626}</style><line class="w" x1="40" y1="170" x2="230" y2="170" marker-end="url(#a)"/><line class="w" x1="230" y1="170" x2="230" y2="50" marker-end="url(#a)"/><line class="h" x1="40" y1="170" x2="230" y2="50" marker-end="url(#b)"/><polyline class="w" points="218,170 218,158 230,158"/><path class="w" d="M 80 170 A 40 40 0 0 0 65 142"/><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="#0f172a"/></marker><marker id="b" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L9,3 L0,6 z" fill="#1d4ed8"/></marker></defs><text class="t" x="120" y="190">R = 3 Ω</text><text class="t" x="240" y="115">X_L = 4 Ω</text><text class="t" x="95" y="105" fill="#1d4ed8" font-weight="600">Z = 5 Ω</text><text class="a" x="68" y="158">θ</text></svg>`,
    question:
      "下図のインピーダンス三角形(抵抗 $R$、誘導性リアクタンス $X_L$、合成インピーダンス $Z$)から、力率 $\\cos\\theta$ を求めよ。",
    choices: ["0.4", "0.6", "0.75", "0.8", "1.33"],
    answerIndex: 1,
    explanation:
      "インピーダンス三角形において、力率は隣辺/斜辺。\n\n$$\\cos\\theta = \\frac{R}{Z} = \\frac{3}{5} = 0.6$$",
    tags: ["力率", "インピーダンス三角形", "ベクトル図"],
  },
  {
    id: "theory-012",
    subject: "theory",
    topic: "ホイートストンブリッジ",
    difficulty: 3,
    source: "オリジナル(本試験レベル)",
    figureSvg: svg(
      460,
      290,
      "ホイートストンブリッジ回路",
      // 上辺: A(60,80) → R1 → B(230,80) → R2 → C(400,80)
      wire([60, 80], [110, 80]),
      resistor(140, 80, "R₁=100Ω"),
      wire([170, 80], [230, 80]),
      node(230, 80),
      wire([230, 80], [290, 80]),
      resistor(320, 80, "R₂=200Ω"),
      wire([350, 80], [400, 80]),
      // 右辺: 縦線
      wire([400, 80], [400, 220]),
      // 下辺: A'(60,220) → R3 → D(230,220) → R4 → C'(400,220)
      wire([60, 220], [110, 220]),
      resistor(140, 220, "R₃=150Ω"),
      wire([170, 220], [230, 220]),
      node(230, 220),
      wire([230, 220], [290, 220]),
      resistor(320, 220, "R₄=?", { labelOffset: 6 }),
      wire([350, 220], [400, 220]),
      // 左辺: A → A' (電源 E を表示)
      wire([60, 80], [60, 220]),
      // 検流計ブリッジ: B → G → D
      wire([230, 80], [230, 124]),
      `<circle cx="230" cy="148" r="18" fill="#fff" stroke="#0f172a" stroke-width="2"/><text class="lbl" x="230" y="153" text-anchor="middle" font-size="14" fill="#0f172a">G</text>`,
      wire([230, 172], [230, 220]),
      // 電源 E の表示(左の外側)
      wire([60, 150], [30, 150]),
      `<circle cx="20" cy="150" r="10" fill="#fff" stroke="#0f172a" stroke-width="2"/><text class="lbl" x="20" y="155" text-anchor="middle" font-size="14" fill="#1d4ed8" font-weight="600">E</text>`,
      // ノードラベル
      label(60, 70, "A", { anchor: "start", size: 12, color: "#475569" }),
      label(404, 70, "C", { anchor: "start", size: 12, color: "#475569" }),
      label(214, 76, "B", { anchor: "end", size: 12, color: "#475569" }),
      label(214, 232, "D", { anchor: "end", size: 12, color: "#475569" }),
    ),
    question:
      "図のホイートストンブリッジ回路で、検流計 $G$ が振れない(平衡状態)とき、抵抗 $R_4$ の値はいくらか。ただし $R_1=100\\,\\Omega$、$R_2=200\\,\\Omega$、$R_3=150\\,\\Omega$ とする。",
    choices: ["100 Ω", "200 Ω", "300 Ω", "450 Ω", "600 Ω"],
    answerIndex: 2,
    explanation:
      "ブリッジの平衡条件は対辺の積が等しいこと:\n\n$$R_1 R_4 = R_2 R_3$$\n\nしたがって\n\n$$R_4 = \\frac{R_2 R_3}{R_1} = \\frac{200 \\times 150}{100} = 300\\,\\Omega$$\n\n平衡状態では検流計 $G$ には電流が流れず、4 つの抵抗値の比だけで決まる。",
    tags: ["ホイートストンブリッジ", "平衡条件", "回路図"],
  },
  {
    id: "theory-013",
    subject: "theory",
    topic: "平行平板コンデンサ",
    difficulty: 3,
    source: "オリジナル(本試験レベル)",
    question:
      "極板面積 $S = 100\\,\\mathrm{cm}^2$、極板間隔 $d = 1\\,\\mathrm{mm}$ の平行平板コンデンサに比誘電率 $\\varepsilon_r = 4$ の誘電体を満たした。真空の誘電率を $\\varepsilon_0 = 8.85 \\times 10^{-12}\\,\\mathrm{F/m}$ とする。静電容量 $C$ に最も近い値はどれか。",
    choices: ["88.5 pF", "177 pF", "354 pF", "708 pF", "1416 pF"],
    answerIndex: 2,
    explanation:
      "平行平板コンデンサの静電容量は\n\n$$C = \\varepsilon_0 \\varepsilon_r \\frac{S}{d}$$\n\n$S = 100\\,\\mathrm{cm}^2 = 1.0 \\times 10^{-2}\\,\\mathrm{m}^2$、$d = 1.0 \\times 10^{-3}\\,\\mathrm{m}$ を代入すると\n\n$$C = 8.85 \\times 10^{-12} \\times 4 \\times \\frac{10^{-2}}{10^{-3}} = 3.54 \\times 10^{-10}\\,\\mathrm{F} \\approx 354\\,\\mathrm{pF}$$\n\n単位換算と桁の取り扱いに注意。",
    tags: ["コンデンサ", "誘電体", "静電容量"],
  },
];
