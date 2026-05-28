"use client";

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";

/**
 * 問題ごとの個人メモエディタ(/problems で各 details 内に配置)。
 * 入力途中の保存は短いデバウンスで自動 persist、blur でも persist。
 */
export function ProblemNoteEditor({ problemId }: { problemId: string }) {
  const { store, setNote, mounted } = useProgress();
  const [value, setValue] = useState("");
  const initialized = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mounted || initialized.current) return;
    setValue(store.getNote(problemId));
    initialized.current = true;
  }, [mounted, store, problemId]);

  function commit(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setNote(problemId, next), 500);
  }

  function flush() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setNote(problemId, value);
  }

  if (!mounted) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <label className="mb-1 block text-xs font-medium text-slate-500">
        個人メモ {value && <span className="text-slate-400">(保存済)</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => commit(e.target.value)}
        onBlur={flush}
        placeholder="気づき・公式・つまずきポイントなど…"
        rows={3}
        className="w-full resize-y rounded border border-slate-200 bg-slate-50 p-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
      />
    </div>
  );
}
