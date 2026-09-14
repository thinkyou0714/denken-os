import { saveRecord } from "./client.js";
import { area, button, h, input, notice, panel, select, table } from "./ui.js";

const TERMS = [
  ["P", "有効電力", "W", "仕事や熱として使われる電力。三相の式では線間量か相量かを確認する。"],
  ["Q", "無効電力", "var", "電界・磁界と電源の間で往復する成分。符号の定義を問題に合わせる。"],
  ["S", "皮相電力", "VA", "交流の電圧と電流の実効値から表す大きさ。PやQと区別する。"],
  ["V・E", "電圧・起電力", "V", "記号は教材ごとに異なる。添字、線間値・相値、最大値・実効値を先に確認。"],
  ["I", "電流", "A", "向きと基準を決める。交流では実効値か瞬時値かを確認する。"],
  ["R", "抵抗", "Ω", "電流によって熱を生じる成分。温度条件も確認する。"],
  ["X", "リアクタンス", "Ω", "交流での誘導性・容量性の成分。インピーダンスの虚部として符号を持つ。"],
  ["Z", "インピーダンス", "Ω", "交流の電圧と電流の関係を表す複素数。R+jX。"],
  ["τ", "時定数", "s", "変化の速さを表す時間。一次系ではRCやL/Rなど、回路条件から決まる。"],
  ["η", "効率", "% または比", "出力/入力。損失の範囲と基準をそろえる。"],
];
export function renderFoundations(root: HTMLElement) {
  const glossary = panel(
    "記号を条件と結びつける",
    "記号の対応は問題文の定義を優先してください。独自の補助教材で、監修待ちです。",
  );
  const search = input("記号・用語・単位を探す"),
    output = h("div", {});
  const show = () => {
    output.replaceChildren(
      table(
        ["記号", "意味", "単位", "平易な説明と確認点"],
        TERMS.filter((row) => row.join(" ").includes(search.input.value)),
      ),
    );
  };
  search.input.oninput = show;
  glossary.append(search.field, output);
  show();
  root.append(glossary);
  const derive = panel(
    "導出の支援を少しずつ外す",
    "同じ式を、穴埋めから自力説明へ進めます。新しい補助演習は検証記録として保存し、通常成績に加算しません。",
  );
  const level = select("支援の量", ["式の骨組み", "出発点のみ", "ヒントなし"]),
    answer = area("式の導出と成立条件"),
    hint = h("p", {}),
    result = h("div", {});
  const draw = () => {
    hint.textContent =
      level.input.value === "式の骨組み"
        ? "抵抗Rに電流Iが流れる直流回路。V=IR、P=VIから、P=(____)×I=____。"
        : level.input.value === "出発点のみ"
          ? "V=IRとP=VIから、抵抗の消費電力をIとRで表す。"
          : "抵抗の消費電力を、電流と抵抗から表せる理由を説明してください。";
  };
  level.input.onchange = draw;
  draw();
  derive.append(
    level.field,
    hint,
    answer.field,
    button("自分の説明を保存して参照を開く", async () => {
      if (!answer.input.value.trim()) throw new Error("式と条件を入力してください");
      await saveRecord("experiment", crypto.randomUUID(), {
        type: "derivation",
        level: level.input.value,
        answer: answer.input.value,
        mode: "validation",
        createdAt: Date.now(),
      });
      result.replaceChildren();
      notice(
        result,
        "参照：V=IRをP=VIへ代入するとP=(IR)I=I²R。抵抗の直流定常回路が前提。交流では純抵抗か、実効値を使っているかを確認します。自分の説明の条件・式・単位を照合してください。",
      );
    }),
    result,
  );
  root.append(derive);
}
