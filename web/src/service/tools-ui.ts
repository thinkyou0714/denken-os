import { calculate, electricalModel, gradeQuantity, inspectSteps } from "../../../lib/service/quantities.js";
import { DRILLS } from "../../../lib/service/study-tools.js";
import { catalogue } from "./catalog.js";
import { saveRecord } from "./client.js";
import { renderFoundations } from "./foundations-ui.js";
import { area, button, check, h, input, notice, panel, select, table } from "./ui.js";

export function renderTools(root: HTMLElement) {
  renderFoundations(root);
  const calc = panel(
    "四則・√と途中式の検算",
    "数値演算を確認します。式を適用する前提、次元、機器の動作条件は別に確認してください。",
  );
  const expression = input("計算式", "sqrt(3)*400*10*0.8");
  const answer = h("output", { "aria-live": "polite" });
  calc.append(
    expression.field,
    button("計算する", () => {
      answer.textContent = String(calculate(expression.input.value));
    }),
    answer,
  );
  const steps = area("途中式を1行ずつ入力（数値式 = 数値式）", "400/5 = 80\n80*80*3 = 19200");
  const result = h("div", {});
  calc.append(
    steps.field,
    button("最初の不整合を確認", () => {
      const rows = inspectSteps(steps.input.value);
      result.replaceChildren(
        table(
          ["行", "判定", "確認内容"],
          rows.map((r) => [r.line, r.status, r.reason]),
        ),
      );
      const first = rows.find((r) => r.status === "不一致");
      notice(
        result,
        first
          ? `最初の不整合は${first.line}行目です。`
          : "比較できた数値式に不整合はありません。保留した行や物理的な前提は別途確認してください。",
      );
    }),
    result,
  );
  root.append(calc);
  modelPanel(root);
  drillPanel(root);
  drawingPanel(root);
  audioPanel(root);
  const panels = [...root.querySelectorAll<HTMLElement>(":scope > .lab-panel")];
  const chooser = select(
    "使う学習ツール",
    panels.map((p) => p.querySelector("h3")?.textContent ?? "学習ツール"),
    "図と式を操作する",
  );
  const show = () => {
    for (const p of panels) p.hidden = p.querySelector("h3")?.textContent !== chooser.input.value;
  };
  chooser.input.onchange = show;
  root.prepend(chooser.field);
  show();
}

const MODELS: Record<string, { key: string; labels: string[]; values: number[] }> = {
  フェーザとインピーダンス: {
    key: "phasor",
    labels: ["相電圧 [V]", "抵抗 R [Ω]", "リアクタンス X [Ω]"],
    values: [100, 3, 4],
  },
  "入力・出力・損失": { key: "loss", labels: ["入力 [W]", "損失1 [W]", "損失2 [W]"], values: [10000, 400, 300] },
  RCのステップ応答: { key: "rc", labels: ["時定数 [s]", "確認する時刻 [s]", "最終電圧 [V]"], values: [1, 1, 5] },
  標準二次系の応答: {
    key: "control",
    labels: ["固有角周波数 [rad/s]", "減衰係数", "確認する時刻 [s]"],
    values: [1, 0.5, 3],
  },
  "基準容量と％Z": {
    key: "percentZ",
    labels: ["旧％Z [%]", "旧基準容量 [MVA]", "新基準容量 [MVA]"],
    values: [5, 10, 20],
  },
};
function modelPanel(root: HTMLElement) {
  const wrap = panel(
    "図と式を操作する",
    "変える前に結果を予想し、変えた後の数値と比較します。ここで扱うモデルの前提を実機全般へ広げないでください。",
  );
  const kind = select("モデル", Object.keys(MODELS));
  const fields = h("div", { class: "lab-grid" }),
    output = h("div", {}),
    plot = h("div", { class: "lab-plot" });
  const prediction = input("値を変える前の予想");
  let inputs: HTMLInputElement[] = [];
  const update = () => {
    const def = MODELS[kind.input.value];
    if (!def) return;
    const [a, b, c] = inputs.map((i) => Number(i.value));
    if (a === undefined || b === undefined || c === undefined) return;
    try {
      const result = electricalModel(def.key, a, b, c);
      output.replaceChildren(
        table(
          ["量", "結果"],
          Object.entries(result).map(([k, v]) => [
            modelLabel(k),
            typeof v === "number" ? Number(v.toPrecision(6)) : String(v),
          ]),
        ),
      );
      plot.replaceChildren(drawModel(def.key, a, b, c));
    } catch (error) {
      output.replaceChildren();
      plot.replaceChildren();
      notice(output, error instanceof Error ? error.message : "値を確認してください", true);
    }
  };
  const change = () => {
    const def = MODELS[kind.input.value];
    if (!def) return;
    fields.replaceChildren();
    inputs = def.labels.map((label, i) => {
      const f = input(label, String(def.values[i] ?? 0), "number");
      f.input.step = "any";
      f.input.oninput = update;
      fields.append(f.field);
      return f.input;
    });
    update();
  };
  kind.input.onchange = change;
  wrap.append(
    kind.field,
    prediction.field,
    fields,
    plot,
    output,
    button("予想と結果を保存", async () => {
      const def = MODELS[kind.input.value];
      if (!def) return;
      const [a, b, c] = inputs.map((i) => Number(i.value));
      const result = electricalModel(def.key, a ?? 0, b ?? 0, c ?? 0);
      await saveRecord("experiment", crypto.randomUUID(), {
        type: "prediction",
        model: kind.input.value,
        inputs: inputs.map((i) => i.value),
        prediction: prediction.input.value,
        result,
        createdAt: Date.now(),
      });
      notice(wrap, "予想と結果を保存しました");
    }),
  );
  root.append(wrap);
  change();
}
function modelLabel(key: string) {
  const labels: Record<string, string> = {
    current: "電流 [A]",
    phase: "インピーダンスの偏角 [°]",
    power: "有効電力 [W]",
    reactive: "無効電力 [var]",
    input: "入力",
    output: "出力",
    loss: "損失",
    efficiency: "効率（比）",
    tau: "時定数 [s]",
    initial: "初期値",
    final: "最終値",
    atTime: "指定時刻の値",
    initialSlope: "初期の傾き",
    steady: "定常値",
    damping: "減衰係数",
    newPercentZ: "新しい％Z [%]",
    oldBaseMVA: "旧基準容量 [MVA]",
    newBaseMVA: "新基準容量 [MVA]",
  };
  return labels[key] ?? key;
}
function drawModel(kind: string, a: number, b: number, c: number): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 560 280");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    kind === "phasor" ? "実軸Rと虚軸Xによるインピーダンスの三角形" : "計算モデルの変化を示す図",
  );
  const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text) n.textContent = text;
    svg.append(n);
    return n;
  };
  if (kind === "phasor") {
    const scale = 180 / Math.max(1, Math.abs(b), Math.abs(c)),
      x = 80 + b * scale,
      y = 180 - (c * scale) / 1.7;
    add("line", { x1: 60, y1: 180, x2: 510, y2: 180, stroke: "#64748b" });
    add("line", { x1: 80, y1: 250, x2: 80, y2: 20, stroke: "#64748b" });
    add("path", { d: `M80 180 L${x} 180 L${x} ${y} Z`, fill: "#1d4ed815", stroke: "#1d4ed8", "stroke-width": 3 });
    add("text", { x: 90, y: 265, "font-size": 16 }, `R = ${b} Ω、X = ${c} Ω、|Z| = ${Math.hypot(b, c).toFixed(3)} Ω`);
    add("text", { x: 470, y: 200, "font-size": 16 }, "実軸 R");
    add("text", { x: 90, y: 30, "font-size": 16 }, "虚軸 X");
  } else if (kind === "rc" || kind === "control") {
    const maxTime = kind === "rc" ? Math.max(b, a * 5) : Math.max(c, 8 / (a * Math.min(1, b)));
    const values = Array.from({ length: 100 }, (_, i) => {
      const t = (i / 99) * maxTime;
      const value = kind === "rc" ? electricalModel(kind, a, t, c).atTime : electricalModel(kind, a, b, t).output;
      return Number(value);
    });
    const ymax = Math.max(1, ...values) * 1.15;
    const points = values.map((v, i) => `${55 + (i / 99) * 470},${235 - (v / ymax) * 200}`).join(" ");
    add("path", { d: "M55 20 V235 H535", fill: "none", stroke: "#64748b" });
    add("polyline", { points, fill: "none", stroke: "#1d4ed8", "stroke-width": 3 });
    add("text", { x: 260, y: 273, "font-size": 16 }, `時刻 0〜${maxTime.toFixed(2)} s`);
    add("text", { x: 55, y: 18, "font-size": 16 }, kind === "rc" ? "電圧 [V]" : "正規化した出力");
  } else if (kind === "loss") {
    const parts = [
      { value: a - b - c, label: "出力", color: "#1d4ed8" },
      { value: b, label: "損失1", color: "#b45309" },
      { value: c, label: "損失2", color: "#be123c" },
    ];
    let x = 30;
    for (const part of parts) {
      const w = (part.value / a) * 500;
      add("rect", { x, y: 90, width: w, height: 60, fill: part.color });
      x += w;
    }
    parts.forEach((p, i) => {
      add("text", { x: 30, y: 180 + i * 28, "font-size": 16 }, `${p.label} ${p.value} W`);
    });
    add("text", { x: 30, y: 60, "font-size": 18 }, `入力 ${a} W = 出力 + 損失`);
  } else {
    const v = electricalModel(kind, a, b, c);
    add("text", { x: 30, y: 100, "font-size": 22 }, `${a}% × ${c}/${b} = ${v.newPercentZ}%`);
    add("text", { x: 30, y: 155, "font-size": 16 }, "基準電圧が同じときの基準容量の変更");
  }
  return svg;
}

function drillPanel(root: HTMLElement) {
  const wrap = panel(
    "短い確認ドリル",
    "単位・係数・基準量を切り出して確認します。独自の追加ドリルは監修待ちで、通常成績には混ぜません。",
  );
  const kind = select(
    "ドリル",
    DRILLS.map((d) => d.prompt),
  );
  const answer = input("自分の答え・式"),
    output = h("div", {});
  wrap.append(
    kind.field,
    answer.field,
    button("解説と照合", () => {
      const d = DRILLS.find((d) => d.prompt === kind.input.value);
      if (!d) return;
      output.replaceChildren();
      if (d.answer) {
        try {
          const expected = String(calculate(d.answer));
          const parsed = gradeQuantity(answer.input.value, expected, {
            unit: d.unit,
            relative: 0.005,
            absolute: 1e-9,
            requireUnit: false,
            accepted: [],
          });
          notice(
            output,
            parsed.correct === null
              ? "入力の表記を確認してください"
              : parsed.correct
                ? "数値が一致しました"
                : "解説と計算を比較してください",
          );
        } catch {
          notice(output, "式を数値へ計算して比較してください");
        }
      }
      output.append(h("p", {}, d.reason), h("p", { class: "muted" }, `戻る前提：${d.prerequisite}`));
    }),
    output,
  );
  root.append(wrap);
}
function drawingPanel(root: HTMLElement) {
  const wrap = panel(
    "図を自分で再構成する",
    "フェーザ・過渡応答・特性の軸、向き、初期値、定常値を自分で描いて確認します。描画の上手さは成績に含めません。",
  );
  const canvas = h("canvas", {
    width: "560",
    height: "280",
    class: "lab-canvas",
    "aria-label": "図を再構成する描画領域",
  }) as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  let drawing = false;
  const reset = () => {
    if (!context) return;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 560, 280);
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(50, 20);
    context.lineTo(50, 235);
    context.lineTo(530, 235);
    context.stroke();
    context.strokeStyle = "#1d4ed8";
    context.lineWidth = 3;
  };
  const point = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: ((e.clientX - box.left) * 560) / box.width, y: ((e.clientY - box.top) * 280) / box.height };
  };
  canvas.onpointerdown = (e) => {
    if (!context) return;
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const p = point(e);
    context.beginPath();
    context.moveTo(p.x, p.y);
  };
  canvas.onpointermove = (e) => {
    if (!drawing || !context) return;
    const p = point(e);
    context.lineTo(p.x, p.y);
    context.stroke();
  };
  canvas.onpointerup = () => {
    drawing = false;
  };
  canvas.onpointercancel = () => {
    drawing = false;
  };
  const description = area("軸・単位・向き・初期値・定常値を言葉で説明（描画の代替にも使えます）");
  wrap.append(
    canvas,
    button("描き直す", reset),
    description.field,
    button("説明をノートへ保存", async () => {
      await saveRecord("note", crypto.randomUUID(), {
        type: "diagram-reconstruction",
        text: description.input.value,
        createdAt: Date.now(),
      });
      notice(wrap, "説明を保存しました");
    }),
  );
  root.append(wrap);
  reset();
}

function audioPanel(root: HTMLElement) {
  const wrap = panel(
    "説明を聞く・自分の言葉で話す",
    "確認済み解説を段階ごとに読み上げます。録音ファイルは作成せず、必要な文字起こしだけを本人が確認して保存します。",
  );
  const chooser = select(
    "教材",
    catalogue.map((p) => `${p.id} ${p.topic}`),
  );
  const transcript = area("自分の説明・文字起こし"),
    text = h("div", {});
  const pause = check("次の段階へ進む前に自分で答える", true);
  let step = 0;
  const speak = () => {
    const p = catalogue.find((p) => `${p.id} ${p.topic}` === chooser.input.value);
    if (!p) return;
    if (step >= p.solution.length) step = 0;
    const line = p.solution[step] ?? "";
    text.replaceChildren(h("p", {}, `${step + 1}/${p.solution.length}：${line}`));
    if (!("speechSynthesis" in window)) {
      notice(text, "この環境では読み上げを利用できません。文章で確認できます。");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = "ja-JP";
    utterance.onend = () => {
      step++;
      if (!pause.input.checked && step < p.solution.length && wrap.isConnected) speak();
    };
    speechSynthesis.speak(utterance);
  };
  chooser.input.onchange = () => {
    step = 0;
    window.speechSynthesis?.cancel();
  };
  const beginVoice = () => {
    type VoiceResult = { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } };
    interface Recognition {
      lang: string;
      interimResults: boolean;
      onresult: ((e: VoiceResult) => void) | null;
      onerror: (() => void) | null;
      start(): void;
      stop(): void;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructor) {
      notice(wrap, "この環境では音声入力を利用できません。説明を文字で入力できます。");
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      transcript.input.value += Array.from(
        { length: e.results.length },
        (_, i) => e.results[i]?.[0]?.transcript ?? "",
      ).join("\n");
    };
    recognition.onerror = () =>
      notice(wrap, "音声入力を完了できませんでした。端末の許可と接続を確認してください。", true);
    recognition.start();
  };
  const confirmed = check("文字起こしの式・単位・記号を確認した");
  wrap.append(
    chooser.field,
    pause.field,
    button("次の説明を聞く", speak),
    button("読み上げを止める", () => window.window.speechSynthesis?.cancel()),
    text,
    button("自分の説明を音声入力", beginVoice),
    transcript.field,
    confirmed.field,
    button("確認した説明を保存", async () => {
      if (!confirmed.input.checked) throw new Error("文字起こしを確認してください");
      await saveRecord("voice", crypto.randomUUID(), {
        problem: chooser.input.value,
        text: transcript.input.value,
        confirmed: true,
        createdAt: Date.now(),
      });
      notice(wrap, "文字の説明を保存しました");
    }),
  );
  root.append(wrap);
}
