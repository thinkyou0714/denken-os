"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProgress } from "@/lib/useProgress";
import { problems, problemsBySubject } from "@/data/problems";
import { buildQueue } from "@/domain/srs/diagnosis";
import { StudySession } from "@/components/StudySession";
import { isSubject, SUBJECT_LABELS } from "@/domain/content/schema";

export default function StudyPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <StudyInner />
    </Suspense>
  );
}

function StudyInner() {
  const params = useSearchParams();
  const subjectParam = params.get("subject");
  const subject = isSubject(subjectParam) ? subjectParam : null;

  const { store, record, mounted } = useProgress();
  const pool = subject ? problemsBySubject(subject) : problems;

  // セッション開始時点のキューを固定(解答で再計算されて順序が乱れないように)。
  const queue = useMemo(() => {
    if (!mounted) return [];
    return buildQueue(pool, store, new Date(), 20);
  }, [mounted, store, pool]);

  if (!mounted) return <p className="text-slate-500">読み込み中…</p>;

  return (
    <div className="space-y-4">
      {subject ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="font-medium text-amber-800">
            {SUBJECT_LABELS[subject]} の重点学習(科目集中)
          </span>
          <Link href="/study" className="text-indigo-600 hover:underline">
            全科目ミックスに切り替え
          </Link>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          全科目をミックスして出題します(インターリーブ学習は長期定着に有効です)。
        </p>
      )}
      <StudySession
        queue={queue}
        onGrade={record}
        getCard={(id) => store.getCard(id)}
      />
    </div>
  );
}
