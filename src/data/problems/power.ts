import type { Problem } from "@/domain/content/schema";
import {
  svg,
  wire,
  node,
  label,
  annotation,
  currentArrow,
} from "@/lib/svg/primitives";

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
  {
    id: "power-010",
    subject: "power",
    topic: "三相Y結線",
    difficulty: 2,
    source: "オリジナル",
    figureSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" role="img" aria-labelledby="p10-title" style="max-width:100%;height:auto"><title id="p10-title">対称三相 Y(スター)結線の回路図</title><style>.w{stroke:#0f172a;stroke-width:2;fill:none}.t{font-family:system-ui,sans-serif;font-size:14px;fill:#111}.l{font-family:system-ui,sans-serif;font-size:14px;font-weight:600;fill:#1d4ed8}.z{font-family:system-ui,sans-serif;font-size:13px;fill:#047857;font-weight:600}</style><circle cx="150" cy="140" r="4" fill="#0f172a"/><text class="t" x="158" y="156">N (中性点)</text><line class="w" x1="150" y1="140" x2="150" y2="40"/><rect x="135" y="70" width="30" height="20" fill="#fff" stroke="#0f172a" stroke-width="2"/><text class="z" x="143" y="85">Z</text><circle cx="150" cy="40" r="3" fill="#0f172a"/><text class="l" x="142" y="28">a</text><line class="w" x1="150" y1="140" x2="240" y2="220"/><rect x="184" y="170" width="30" height="20" fill="#fff" stroke="#0f172a" stroke-width="2" transform="rotate(41 199 180)"/><text class="z" x="215" y="170">Z</text><circle cx="240" cy="220" r="3" fill="#0f172a"/><text class="l" x="246" y="230">b</text><line class="w" x1="150" y1="140" x2="60" y2="220"/><rect x="86" y="170" width="30" height="20" fill="#fff" stroke="#0f172a" stroke-width="2" transform="rotate(-41 101 180)"/><text class="z" x="60" y="170">Z</text><circle cx="60" cy="220" r="3" fill="#0f172a"/><text class="l" x="42" y="230">c</text><text class="t" x="100" y="60" style="font-size:12px;fill:#6b7280">V_p = 100 V</text></svg>`,
    question:
      "下図のような対称三相 Y(スター)結線において、各相のインピーダンス $Z = 10\\,\\Omega$、相電圧 $V_p = 100\\,\\mathrm{V}$ である。線電流 $I_l$ はいくらか。",
    choices: ["5 A", "10 A", "17.3 A", "20 A", "30 A"],
    answerIndex: 1,
    explanation:
      "Y 結線では **線電流 = 相電流**($I_l = I_p$)。相電流は\n\n$$I_p = \\frac{V_p}{Z} = \\frac{100}{10} = 10\\,\\mathrm{A}$$\n\nなお線間電圧と相電圧の関係は $V_l = \\sqrt{3}\\,V_p$。",
    tags: ["Y結線", "三相", "結線図"],
  },
  {
    id: "power-011",
    subject: "power",
    topic: "力率改善コンデンサ",
    difficulty: 4,
    source: "オリジナル(本試験レベル)",
    question:
      "皮相電力 $S = 10\\,\\mathrm{kVA}$、力率 $\\cos\\theta_1 = 0.8$(遅れ)の単相負荷がある。これを力率 $1.0$ に改善するために並列接続する進相コンデンサの容量 $Q_C$ [kvar] はいくらか。",
    choices: ["2 kvar", "4 kvar", "6 kvar", "8 kvar", "10 kvar"],
    answerIndex: 2,
    explanation:
      "改善前の有効電力と無効電力は\n\n$$P = S \\cos\\theta_1 = 10 \\times 0.8 = 8\\,\\mathrm{kW}$$\n\n$$Q_1 = S \\sin\\theta_1 = 10 \\times 0.6 = 6\\,\\mathrm{kvar}$$\n\n力率 1.0 に改善するには無効電力をゼロにする必要があるため、コンデンサで負荷の遅れ無効電力をちょうど打ち消す。\n\n$$Q_C = Q_1 = 6\\,\\mathrm{kvar}$$",
    tags: ["力率改善", "進相コンデンサ", "無効電力"],
  },
  {
    id: "power-012",
    subject: "power",
    topic: "単相3線式配電",
    difficulty: 3,
    source: "オリジナル(本試験レベル)",
    figureSvg: svg(
      480,
      260,
      "単相 3 線式配電線路",
      // 3 horizontal rails (L1, N, L2) from source (left) to loads (right)
      wire([60, 60], [400, 60]), // L1
      wire([60, 130], [400, 130]), // N (中性線)
      wire([60, 200], [400, 200]), // L2
      // Source markers (left): small circles
      `<circle cx="50" cy="60" r="5" fill="#fff" stroke="#0f172a" stroke-width="2"/>`,
      `<circle cx="50" cy="130" r="5" fill="#fff" stroke="#0f172a" stroke-width="2"/>`,
      `<circle cx="50" cy="200" r="5" fill="#fff" stroke="#0f172a" stroke-width="2"/>`,
      label(34, 64, "L₁", { anchor: "end", size: 12, color: "#475569" }),
      label(34, 134, "N", { anchor: "end", size: 12, color: "#475569" }),
      label(34, 204, "L₂", { anchor: "end", size: 12, color: "#475569" }),
      // Load 1: between L1 and N (vertical resistor box)
      wire([300, 60], [300, 130]),
      `<rect x="280" y="78" width="40" height="34" fill="#fff" stroke="#0f172a" stroke-width="2"/>`,
      label(300, 100, "30 A 負荷"),
      // Load 2: between N and L2
      wire([400, 130], [400, 200]),
      `<rect x="380" y="148" width="40" height="34" fill="#fff" stroke="#0f172a" stroke-width="2"/>`,
      label(400, 170, "20 A 負荷"),
      // Current arrows on rails
      currentArrow(160, 60, "I₁=30A", { dir: "right" }),
      currentArrow(160, 200, "I₂=20A", { dir: "right", labelDy: 18 }),
      currentArrow(200, 130, "I_N=?", { dir: "right" }),
      // 中性線 annotation
      annotation(340, 122, "中性線", { anchor: "middle" }),
    ),
    question:
      "図の単相 3 線式配電線路において、L₁-N 間の負荷電流 $I_1 = 30\\,\\mathrm{A}$、N-L₂ 間の負荷電流 $I_2 = 20\\,\\mathrm{A}$(いずれも力率 1.0)である。中性線に流れる電流 $I_N$ の大きさはいくらか。",
    choices: ["0 A", "5 A", "10 A", "20 A", "50 A"],
    answerIndex: 2,
    explanation:
      "単相 3 線式では、上下の負荷電流が中性線で打ち消される。\n\n$$I_N = |I_1 - I_2| = |30 - 20| = 10\\,\\mathrm{A}$$\n\n両負荷が平衡している(=等しい)とき中性線電流はゼロになるのが理想。負荷の不平衡があるほど中性線に大きな電流が流れる点は重要。",
    tags: ["単相3線式", "中性線", "配電", "不平衡"],
  },
];
