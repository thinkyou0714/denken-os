import type { GradingPolicy } from "./assessment.js";

const UNITS: Record<string, [string, number]> = {
  "": ["scalar", 1],
  "%": ["ratio", 0.01],
  V: ["voltage", 1],
  kV: ["voltage", 1e3],
  mV: ["voltage", 1e-3],
  A: ["current", 1],
  mA: ["current", 1e-3],
  μA: ["current", 1e-6],
  uA: ["current", 1e-6],
  W: ["power", 1],
  kW: ["power", 1e3],
  MW: ["power", 1e6],
  VA: ["apparent", 1],
  kVA: ["apparent", 1e3],
  MVA: ["apparent", 1e6],
  var: ["reactive", 1],
  kvar: ["reactive", 1e3],
  Mvar: ["reactive", 1e6],
  Ω: ["resistance", 1],
  kΩ: ["resistance", 1e3],
  MΩ: ["resistance", 1e6],
  F: ["capacitance", 1],
  μF: ["capacitance", 1e-6],
  uF: ["capacitance", 1e-6],
  nF: ["capacitance", 1e-9],
  H: ["inductance", 1],
  mH: ["inductance", 1e-3],
  Hz: ["frequency", 1],
  kHz: ["frequency", 1e3],
  s: ["time", 1],
  ms: ["time", 1e-3],
  min: ["time", 60],
  h: ["time", 3600],
  J: ["energy", 1],
  kJ: ["energy", 1e3],
  Wh: ["energy", 3600],
  kWh: ["energy", 3.6e6],
  MWh: ["energy", 3.6e9],
};
export function parseQuantity(raw: string) {
  const normalized = raw.normalize("NFKC").replace(/[,，]/g, "").replace(/Ω/g, "Ω").trim();
  const m = normalized.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([^\s]*)$/i);
  if (!m) return null;
  const unit = m[2] ?? "",
    def = UNITS[unit];
  const value = Number(m[1]);
  if (!def || !Number.isFinite(value)) return null;
  return { value, unit, dimension: def[0], si: value * def[1] };
}
export function gradeQuantity(raw: string, expected: string, policy: GradingPolicy) {
  if (policy.accepted.includes(raw.trim())) return { correct: true, reason: "許容表現と一致" };
  const got = parseQuantity(raw),
    want = parseQuantity(`${expected} ${policy.unit}`);
  if (!got || !want) return { correct: null, reason: "数値と単位を確認してください" };
  if (!got.unit && policy.requireUnit) return { correct: false, reason: "指定された単位を付けてください" };
  const normalized = got.unit ? got : parseQuantity(`${got.value} ${policy.unit}`);
  if (!normalized || normalized.dimension !== want.dimension)
    return { correct: false, reason: "物理量の次元が一致しません" };
  const scale = UNITS[policy.unit]?.[1] ?? 1;
  const tolerance = Math.max(policy.absolute * scale, Math.abs(want.si) * policy.relative);
  return {
    correct: Math.abs(normalized.si - want.si) <= tolerance,
    reason: `学習用許容差：絶対 ${policy.absolute} ${policy.unit}／相対 ${policy.relative * 100}%`,
  };
}

/** Arithmetic parser: no eval, Function, property access, or user-defined code. */
export function calculate(expression: string): number {
  const input = expression
    .normalize("NFKC")
    .replace(/×/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/\s/g, "");
  if (input.length > 300) throw new Error("式が長すぎます");
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|pi|[()+\-*/^]/g) ?? [];
  if (tokens.join("") !== input || !tokens.length) throw new Error("四則・べき・sqrt・piだけを使用できます");
  let i = 0,
    depth = 0;
  function primary(): number {
    if (++depth > 40) throw new Error("括弧が深すぎます");
    const token = tokens[i++];
    let value: number;
    if (token === "sqrt") value = Math.sqrt(primary());
    else if (token === "pi") value = Math.PI;
    else if (token === "(") {
      value = sum();
      if (tokens[i++] !== ")") throw new Error("括弧を確認してください");
    } else if (token && /^\d|^\./.test(token)) value = Number(token);
    else throw new Error("式を確認してください");
    depth--;
    return value;
  }
  function unary(): number {
    if (tokens[i] === "+") {
      i++;
      return unary();
    }
    if (tokens[i] === "-") {
      i++;
      return -unary();
    }
    return power();
  }
  function power(): number {
    const a = primary();
    if (tokens[i] === "^") {
      i++;
      return a ** unary();
    }
    return a;
  }
  function product(): number {
    let a = unary();
    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++],
        b = unary();
      a = op === "*" ? a * b : a / b;
    }
    return a;
  }
  function sum(): number {
    let a = product();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++],
        b = product();
      a = op === "+" ? a + b : a - b;
    }
    return a;
  }
  const answer = sum();
  if (i !== tokens.length || !Number.isFinite(answer)) throw new Error("未定義の演算または不完全な式です");
  return answer;
}
export function inspectSteps(lines: string) {
  return lines.split(/\n/).map((line, index) => {
    const parts = line.split("=");
    if (parts.length !== 2) return { line: index + 1, status: "保留", reason: "数値式 = 数値式 の形で確認できます" };
    try {
      const left = calculate(parts[0] ?? ""),
        right = calculate(parts[1] ?? "");
      const ok = Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 0.005);
      return { line: index + 1, status: ok ? "一致" : "不一致", reason: `左辺 ${left} ／ 右辺 ${right}` };
    } catch {
      return { line: index + 1, status: "保留", reason: "記号の意味や単位を確認してください" };
    }
  });
}
export function electricalModel(kind: string, a: number, b: number, c: number) {
  if (![a, b, c].every(Number.isFinite)) throw new Error("有限の数値を入力してください");
  if (kind === "phasor") {
    if (a <= 0 || b < 0) throw new Error("電圧>0、抵抗≥0が必要です");
    const z = Math.hypot(b, c);
    if (!z) throw new Error("インピーダンスを0にできません");
    return {
      current: a / z,
      phase: (Math.atan2(c, b) * 180) / Math.PI,
      power: (a * a * b) / (z * z),
      reactive: (a * a * c) / (z * z),
    };
  }
  if (kind === "loss") {
    if (a <= 0 || b < 0 || c < 0 || b + c > a) throw new Error("入力と損失の条件を確認してください");
    return { input: a, output: a - b - c, loss: b + c, efficiency: (a - b - c) / a };
  }
  if (kind === "rc") {
    if (a <= 0 || b < 0 || c < 0) throw new Error("時定数>0、時間≥0が必要です");
    return { tau: a, initial: 0, final: c, atTime: c * (1 - Math.exp(-b / a)), initialSlope: c / a };
  }
  if (kind === "control") {
    if (a <= 0 || b <= 0 || c < 0) throw new Error("固有角周波数・減衰係数>0、時間≥0が必要です");
    const decay = Math.exp(-b * a * c);
    let output: number;
    if (Math.abs(b - 1) < 1e-6) output = 1 - decay * (1 + a * c);
    else if (b < 1) {
      const w = a * Math.sqrt(1 - b * b);
      output = 1 - decay * (Math.cos(w * c) + (b * a * Math.sin(w * c)) / w);
    } else {
      const s = Math.sqrt(b * b - 1),
        r1 = -a * (b - s),
        r2 = -a * (b + s);
      output = 1 + (r2 * Math.exp(r1 * c) - r1 * Math.exp(r2 * c)) / (r1 - r2);
    }
    return { output, steady: 1, damping: b };
  }
  if (kind === "percentZ") {
    if (a <= 0 || b <= 0 || c <= 0) throw new Error("基準容量・%Zは正にしてください");
    return { newPercentZ: (a * c) / b, oldBaseMVA: b, newBaseMVA: c };
  }
  throw new Error("モデルが不明です");
}
