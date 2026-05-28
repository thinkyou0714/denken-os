import { problemsBySubject } from "@/data/problems";
import { SUBJECTS, SUBJECT_LABELS } from "@/domain/content/schema";
import { MarkdownMath } from "@/components/MarkdownMath";
import { ProblemNoteEditor } from "@/components/ProblemNoteEditor";
import { ProblemFigure } from "@/components/ProblemFigure";

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
            <h2 className="text-lg font-bold text-slate-900">
              {SUBJECT_LABELS[subject]}
              <span className="ml-2 text-sm font-semibold text-slate-500">
                {list.length} 問
              </span>
            </h2>
            <div className="space-y-3">
              {list.map((p) => (
                <details
                  key={p.id}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-slate-800">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {p.topic}
                          </span>
                          {p.figureSvg && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              📐 図あり
                            </span>
                          )}
                        </div>
                        {p.figureSvg && <ProblemFigure svg={p.figureSvg} />}
                        <MarkdownMath>{p.question}</MarkdownMath>
                      </div>
                      <span className="shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 group-open:hidden">
                        解説を見る →
                      </span>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                    <ol className="space-y-1.5 text-sm">
                      {p.choices.map((c, i) => (
                        <li
                          key={i}
                          className={
                            i === p.answerIndex
                              ? "flex gap-2 font-semibold text-emerald-800"
                              : "flex gap-2 text-slate-700"
                          }
                        >
                          <span className="font-bold">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span className="markdown">
                            <MarkdownMath>{c}</MarkdownMath>
                          </span>
                          {i === p.answerIndex && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">
                              正解
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="mb-1 font-bold text-slate-800">解説</p>
                      <MarkdownMath>{p.explanation}</MarkdownMath>
                    </div>
                    <ProblemNoteEditor problemId={p.id} />
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
