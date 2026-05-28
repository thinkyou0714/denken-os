import { problemsBySubject } from "@/data/problems";
import { SUBJECTS, SUBJECT_LABELS } from "@/domain/content/schema";
import { MarkdownMath } from "@/components/MarkdownMath";

export const metadata = {
  title: "問題一覧 — DNKN-OS",
};

export default function ProblemsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">問題一覧</h1>
        <p className="mt-1 text-sm text-slate-500">
          収録されている全問題と解説の一覧です(学習リファレンス)。
        </p>
      </div>

      {SUBJECTS.map((subject) => {
        const list = problemsBySubject(subject);
        return (
          <section key={subject} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {SUBJECT_LABELS[subject]}
              <span className="ml-2 text-sm font-normal text-slate-400">
                {list.length} 問
              </span>
            </h2>
            <div className="space-y-3">
              {list.map((p) => (
                <details
                  key={p.id}
                  className="group rounded-xl border border-slate-200 bg-white p-4"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-slate-700">
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {p.topic}
                        </span>
                        <MarkdownMath>{p.question}</MarkdownMath>
                      </div>
                      <span className="shrink-0 text-xs text-indigo-600 group-open:hidden">
                        解説を見る
                      </span>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <ol className="space-y-1 text-sm">
                      {p.choices.map((c, i) => (
                        <li
                          key={i}
                          className={
                            i === p.answerIndex
                              ? "flex gap-2 font-medium text-emerald-700"
                              : "flex gap-2 text-slate-600"
                          }
                        >
                          <span>{String.fromCharCode(65 + i)}.</span>
                          <span className="markdown">
                            <MarkdownMath>{c}</MarkdownMath>
                          </span>
                          {i === p.answerIndex && (
                            <span className="text-xs">(正解)</span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="rounded-lg bg-slate-50 p-4 text-sm">
                      <p className="mb-1 font-semibold text-slate-700">解説</p>
                      <MarkdownMath>{p.explanation}</MarkdownMath>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
