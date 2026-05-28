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
];
