"use client";

import { useMemo } from "react";
import { useProgress } from "@/lib/useProgress";
import { problems } from "@/data/problems";
import { buildQueue } from "@/domain/srs/diagnosis";
import { StudySession } from "@/components/StudySession";

export default function StudyPage() {
  const { store, record, mounted } = useProgress();

  // セッション開始時点のキューを固定(解答で再計算されて順序が乱れないように)。
  const queue = useMemo(() => {
    if (!mounted) return [];
    return buildQueue(problems, store, new Date(), 20);
  }, [mounted, store]);

  if (!mounted) return <p className="text-slate-500">読み込み中…</p>;

  return <StudySession queue={queue} onGrade={record} />;
}
