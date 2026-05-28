import type { Problem } from "@/domain/content/schema";

export const lawProblems: Problem[] = [
  {
    id: "law-001",
    subject: "law",
    topic: "電圧の区分",
    difficulty: 1,
    question:
      "電気設備技術基準において「低圧」に区分される電圧の範囲として正しいものはどれか。",
    choices: [
      "交流 600 V 以下、直流 750 V 以下",
      "交流 750 V 以下、直流 600 V 以下",
      "交流 600 V 以下、直流 600 V 以下",
      "交流 7000 V 以下、直流 7000 V 以下",
    ],
    answerIndex: 0,
    explanation:
      "電気設備技術基準では、低圧は **交流 600 V 以下・直流 750 V 以下** と定義される。これを超え 7000 V 以下が高圧、7000 V を超えるものが特別高圧となる。",
    tags: ["電技", "電圧区分"],
  },
  {
    id: "law-002",
    subject: "law",
    topic: "需要率",
    difficulty: 2,
    question:
      "設備容量 $200\\,\\mathrm{kW}$ の需要家で、最大需要電力が $140\\,\\mathrm{kW}$ であった。需要率はいくらか。",
    choices: ["50 %", "70 %", "140 %", "200 %"],
    answerIndex: 1,
    explanation:
      "需要率は設備容量に対する最大需要電力の割合。\n\n$$\\text{需要率} = \\frac{\\text{最大需要電力}}{\\text{設備容量}} \\times 100 = \\frac{140}{200} \\times 100 = 70\\,\\%$$",
    tags: ["需要率", "電力管理"],
  },
];
