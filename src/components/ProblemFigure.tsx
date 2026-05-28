/**
 * 問題に付随する図(回路図/ベクトル図/結線図等)を描画する。
 * SVG はリポジトリにコミットされた信頼できる文字列のみを想定しているため
 * dangerouslySetInnerHTML で挿入する(ユーザ入力ではない)。
 */
export function ProblemFigure({ svg }: { svg: string }) {
  return (
    <figure
      className="mb-4 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-3"
      aria-label="図"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
