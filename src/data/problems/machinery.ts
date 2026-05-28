import type { Problem } from "@/domain/content/schema";

export const machineryProblems: Problem[] = [
  {
    id: "machinery-001",
    subject: "machinery",
    topic: "誘導電動機",
    difficulty: 2,
    question:
      "4 極、周波数 $60\\,\\mathrm{Hz}$ の三相誘導電動機が、回転速度 $1710\\,\\mathrm{min^{-1}}$ で運転している。滑り $s$ はいくらか。",
    choices: ["3 %", "5 %", "10 %", "95 %"],
    answerIndex: 1,
    explanation:
      "同期速度は\n\n$$N_s = \\frac{120 f}{p} = \\frac{120 \\times 60}{4} = 1800\\,\\mathrm{min^{-1}}$$\n\n滑りは\n\n$$s = \\frac{N_s - N}{N_s} = \\frac{1800 - 1710}{1800} = 0.05 = 5\\,\\%$$",
    tags: ["同期速度", "滑り"],
  },
  {
    id: "machinery-002",
    subject: "machinery",
    topic: "変圧器",
    difficulty: 1,
    question:
      "一次巻数 $N_1 = 1000$、二次巻数 $N_2 = 50$ の理想変圧器の一次側に $6600\\,\\mathrm{V}$ を加えた。二次電圧 $V_2$ はいくらか。",
    choices: ["110 V", "330 V", "660 V", "3300 V"],
    answerIndex: 1,
    explanation:
      "巻数比は $a = \\dfrac{N_1}{N_2} = \\dfrac{1000}{50} = 20$。理想変圧器では電圧は巻数比に比例するので\n\n$$V_2 = \\frac{V_1}{a} = \\frac{6600}{20} = 330\\,\\mathrm{V}$$",
    tags: ["巻数比", "変圧比"],
  },
  {
    id: "machinery-003",
    subject: "machinery",
    topic: "直流機",
    difficulty: 3,
    question:
      "直流分巻電動機で、端子電圧 $V = 100\\,\\mathrm{V}$、電機子電流 $I_a = 10\\,\\mathrm{A}$、電機子抵抗 $R_a = 0.5\\,\\Omega$ である。逆起電力 $E$ はいくらか。",
    choices: ["90 V", "95 V", "100 V", "105 V"],
    answerIndex: 1,
    explanation:
      "電動機の逆起電力は端子電圧から電機子抵抗による電圧降下を引いたもの。\n\n$$E = V - I_a R_a = 100 - 10 \\times 0.5 = 95\\,\\mathrm{V}$$",
    tags: ["逆起電力", "電機子"],
  },
  {
    id: "machinery-004",
    subject: "machinery",
    topic: "同期機",
    difficulty: 2,
    source: "オリジナル",
    question:
      "周波数 $f = 50\\,\\mathrm{Hz}$、極数 $p = 6$ の三相同期電動機の同期速度 $N_s$ はいくらか。",
    choices: ["500 min⁻¹", "750 min⁻¹", "1000 min⁻¹", "1500 min⁻¹", "3000 min⁻¹"],
    answerIndex: 2,
    explanation:
      "同期速度は\n\n$$N_s = \\frac{120 f}{p} = \\frac{120 \\times 50}{6} = 1000\\,\\mathrm{min^{-1}}$$",
    tags: ["同期速度", "同期機"],
  },
  {
    id: "machinery-005",
    subject: "machinery",
    topic: "直流機",
    difficulty: 2,
    source: "オリジナル",
    question:
      "端子電圧 $V = 110\\,\\mathrm{V}$、電機子電流 $I_a = 50\\,\\mathrm{A}$、電機子抵抗 $R_a = 0.1\\,\\Omega$ で運転する直流分巻発電機の誘導起電力 $E$ は。",
    choices: ["105 V", "115 V", "120 V", "150 V", "200 V"],
    answerIndex: 1,
    explanation:
      "発電機では端子電圧に電機子抵抗による降下を **加える**(電動機の逆起電力と符号が反対)。\n\n$$E = V + I_a R_a = 110 + 50 \\times 0.1 = 115\\,\\mathrm{V}$$",
    tags: ["直流発電機", "起電力"],
  },
  {
    id: "machinery-006",
    subject: "machinery",
    topic: "整流回路",
    difficulty: 3,
    source: "オリジナル",
    question:
      "単相全波整流回路に交流電圧 $V = 100\\,\\mathrm{V}$(実効値)を加えた。抵抗負荷両端の **平均** 電圧 $V_d$ に最も近い値は。",
    choices: ["45 V", "63 V", "90 V", "100 V", "141 V"],
    answerIndex: 2,
    explanation:
      "全波整流の平均電圧は\n\n$$V_d = \\frac{2\\sqrt{2}}{\\pi} V \\approx 0.9 \\times 100 = 90\\,\\mathrm{V}$$\n\n半波整流ならこの 1/2 ≈ 45 V となる。",
    tags: ["整流", "全波"],
  },
  {
    id: "machinery-007",
    subject: "machinery",
    topic: "トルク",
    difficulty: 2,
    source: "オリジナル",
    question:
      "機械的出力 $P_m = 3.7\\,\\mathrm{kW}$、回転速度 $N = 1500\\,\\mathrm{min^{-1}}$ の電動機のトルク $T$ に最も近い値は。",
    choices: ["12 N·m", "16 N·m", "24 N·m", "36 N·m", "48 N·m"],
    answerIndex: 2,
    explanation:
      "角速度 $\\omega = 2\\pi \\dfrac{N}{60} = 2\\pi \\times \\dfrac{1500}{60} \\approx 157\\,\\mathrm{rad/s}$。\n\n$$T = \\frac{P_m}{\\omega} = \\frac{3700}{157} \\approx 23.6\\,\\mathrm{N \\cdot m}$$",
    tags: ["トルク", "出力"],
  },
  {
    id: "machinery-008",
    subject: "machinery",
    topic: "照明",
    difficulty: 1,
    source: "オリジナル",
    question:
      "スターター式蛍光灯回路に用いられる「安定器(チョークコイル)」の主な役割として、最も適切なものはどれか。",
    choices: [
      "ランプの寿命を 2 倍に延ばす",
      "始動時に高電圧を発生させ、点灯後は電流を制限する",
      "交流を直流に変換する",
      "周波数を 2 倍に上げる",
      "電圧を時間とともに上げ続ける",
    ],
    answerIndex: 1,
    explanation:
      "蛍光灯は負性抵抗特性を持つため安定器が必須。スターター式では、回路遮断時にチョークコイルが誘導起電力(キック電圧)を発生させ放電を開始させ、点灯後はリアクタンスとして電流を制限する。",
    tags: ["蛍光灯", "安定器"],
  },
  {
    id: "machinery-009",
    subject: "machinery",
    topic: "誘導電動機の出力計算",
    difficulty: 3,
    source: "オリジナル(本試験レベル)",
    question:
      "三相誘導電動機の二次入力(回転子入力)が $P_2 = 5.0\\,\\mathrm{kW}$、滑り $s = 0.04$ で運転している。機械的出力 $P_m$ [kW] と二次銅損 $P_{c2}$ [kW] の組合せとして最も近いのはどれか。",
    choices: [
      "$P_m = 5.0$, $P_{c2} = 0.0$",
      "$P_m = 4.8$, $P_{c2} = 0.2$",
      "$P_m = 4.5$, $P_{c2} = 0.5$",
      "$P_m = 4.0$, $P_{c2} = 1.0$",
      "$P_m = 0.2$, $P_{c2} = 4.8$",
    ],
    answerIndex: 1,
    explanation:
      "二次入力 $P_2$ は機械的出力 $P_m$ と二次銅損 $P_{c2}$ に分配され、その配分は滑りで決まる。\n\n$$P_{c2} = s \\cdot P_2 = 0.04 \\times 5.0 = 0.2\\,\\mathrm{kW}$$\n\n$$P_m = (1 - s) P_2 = 0.96 \\times 5.0 = 4.8\\,\\mathrm{kW}$$\n\n滑りが小さいほど効率が高く、入力のほとんどが機械的出力になる。",
    tags: ["誘導電動機", "滑り", "出力配分"],
  },
  {
    id: "machinery-010",
    subject: "machinery",
    topic: "直流分巻電動機の速度",
    difficulty: 4,
    source: "オリジナル(本試験レベル)",
    question:
      "直流分巻電動機において、端子電圧 $V = 220\\,\\mathrm{V}$、電機子抵抗 $R_a = 0.5\\,\\Omega$、界磁磁束は一定とする。無負荷時(電機子電流 $\\approx 0$)の回転速度が $1500\\,\\mathrm{min^{-1}}$ のとき、電機子電流が $I_a = 30\\,\\mathrm{A}$ となる負荷をかけたときの回転速度に最も近い値はどれか。",
    choices: [
      "1300 min⁻¹",
      "1400 min⁻¹",
      "1450 min⁻¹",
      "1480 min⁻¹",
      "1500 min⁻¹",
    ],
    answerIndex: 1,
    explanation:
      "界磁磁束が一定のとき、回転速度は逆起電力 $E$ に比例する($N \\propto E$)。\n\n無負荷: $E_0 \\approx V = 220\\,\\mathrm{V}$\n\n負荷時: $E = V - I_a R_a = 220 - 30 \\times 0.5 = 205\\,\\mathrm{V}$\n\nしたがって\n\n$$N = N_0 \\times \\frac{E}{E_0} = 1500 \\times \\frac{205}{220} \\approx 1398\\,\\mathrm{min^{-1}} \\approx 1400\\,\\mathrm{min^{-1}}$$",
    tags: ["直流分巻電動機", "逆起電力", "回転速度"],
  },
];
