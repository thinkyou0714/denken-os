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
  {
    id: "power-004",
    subject: "power",
    topic: "変圧器効率",
    difficulty: 2,
    question:
      "ある変圧器が出力 $9.5\\,\\mathrm{kW}$ で運転しているとき、内部損失の合計が $0.5\\,\\mathrm{kW}$ であった。このときの効率はいくらか。",
    choices: ["90 %", "95 %", "99 %", "105 %"],
    answerIndex: 1,
    explanation:
      "効率は出力を入力(出力 + 損失)で割る。\n\n$$\\eta = \\frac{P_\\text{out}}{P_\\text{out} + P_\\text{loss}} = \\frac{9.5}{9.5 + 0.5} = 0.95 = 95\\,\\%$$",
    tags: ["効率", "損失"],
  },
  {
    id: "power-005",
    subject: "power",
    topic: "皮相・有効電力",
    difficulty: 1,
    source: "オリジナル",
    question:
      "皮相電力 $S = 100\\,\\mathrm{kVA}$、力率 $\\cos\\theta = 0.6$(遅れ)の負荷がある。有効電力 $P$ はいくらか。",
    choices: ["40 kW", "60 kW", "80 kW", "100 kW", "166 kW"],
    answerIndex: 1,
    explanation:
      "有効電力は皮相電力に力率を乗じたもの。\n\n$$P = S \\cos\\theta = 100 \\times 0.6 = 60\\,\\mathrm{kW}$$",
    tags: ["力率", "皮相電力"],
  },
  {
    id: "power-006",
    subject: "power",
    topic: "中性点接地方式",
    difficulty: 2,
    source: "オリジナル",
    question:
      "日本の高圧配電線路(6.6 kV)で広く採用されている中性点接地方式はどれか。",
    choices: [
      "非接地方式",
      "直接接地方式",
      "低抵抗接地方式",
      "消弧リアクトル接地方式",
      "電圧変成器接地方式",
    ],
    answerIndex: 0,
    explanation:
      "国内の 6.6 kV 配電線路は **非接地方式** が広く用いられている。地絡電流が小さく機器への影響が少ない一方、地絡検出にはやや工夫を要する(地絡継電器、零相変流器)。",
    tags: ["中性点接地", "配電"],
  },
  {
    id: "power-007",
    subject: "power",
    topic: "水力発電",
    difficulty: 2,
    source: "オリジナル",
    question:
      "有効落差 $H = 80\\,\\mathrm{m}$、使用水量 $Q = 5\\,\\mathrm{m^3/s}$、総合効率 $\\eta = 0.85$ の水力発電所の発電端出力 $P$ に最も近い値は。重力加速度 $g = 9.8\\,\\mathrm{m/s^2}$。",
    choices: ["1.5 MW", "3.3 MW", "3.9 MW", "4.5 MW", "5.6 MW"],
    answerIndex: 1,
    explanation:
      "水力の発電端出力は\n\n$$P = g\\,Q\\,H\\,\\eta = 9.8 \\times 5 \\times 80 \\times 0.85 \\approx 3.33 \\times 10^{3}\\,\\mathrm{kW} \\approx 3.3\\,\\mathrm{MW}$$",
    tags: ["水力", "発電出力"],
  },
  {
    id: "power-008",
    subject: "power",
    topic: "送電損失",
    difficulty: 3,
    source: "オリジナル",
    question:
      "送電線の抵抗を一定とする。同じ電力を送電するとき、送電電圧を 2 倍に上げると送電損失は何倍になるか。",
    choices: ["4 倍", "2 倍", "1/2 倍", "1/4 倍", "変わらない"],
    answerIndex: 3,
    explanation:
      "送電電力 $P = \\sqrt{3} V I \\cos\\theta$ を一定に保ったまま電圧を $n$ 倍にすると電流は $1/n$ 倍。送電損失は $P_\\text{loss} = I^2 R \\propto I^2$ なので $1/n^2$ 倍。$n = 2$ で **1/4 倍**。これが昇圧送電のメリット。",
    tags: ["送電", "損失"],
  },
  {
    id: "power-009",
    subject: "power",
    topic: "変圧器の損失",
    difficulty: 2,
    source: "オリジナル",
    question:
      "変圧器の鉄損(無負荷損)と銅損(負荷損)の負荷電流に対する性質の組合せとして正しいのはどれか。",
    choices: [
      "鉄損は負荷電流の 2 乗に比例、銅損はほぼ一定",
      "鉄損はほぼ一定、銅損は負荷電流の 2 乗に比例",
      "両方とも負荷電流に比例",
      "両方とも周波数に反比例",
      "両方ともほぼ一定",
    ],
    answerIndex: 1,
    explanation:
      "鉄損(ヒステリシス損 + 渦電流損)は印加電圧と周波数で決まり、無負荷でも発生し負荷電流にはほぼ依存しない。銅損(巻線抵抗による損失)は $P = I^2 R$ で **負荷電流の 2 乗に比例**。最大効率は両者が等しくなる負荷で得られる。",
    tags: ["鉄損", "銅損", "変圧器"],
  },
];
