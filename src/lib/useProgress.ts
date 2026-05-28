"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressStore } from "@/domain/progress/store";
import {
  localStorageBackend,
  memoryBackend,
} from "@/domain/storage/backend";
import type { Grade4 } from "@/domain/srs/scheduler";

const STORAGE_KEY = "denken-os/progress/v1";

/**
 * クライアント側で ProgressStore を保持するフック。
 * localStorage は client でのみ参照できるため、`mounted` が true になってから
 * 実データを描画する(SSR とのハイドレーション不一致を防ぐ)。
 */
export function useProgress() {
  const storeRef = useRef<ProgressStore | null>(null);
  if (storeRef.current === null) {
    const backend =
      typeof window !== "undefined"
        ? localStorageBackend(STORAGE_KEY)
        : memoryBackend();
    storeRef.current = new ProgressStore(backend);
  }
  const store = storeRef.current;

  const [, setVersion] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const record = useCallback(
    (problemId: string, grade: Grade4, correct: boolean) => {
      store.recordReview(problemId, grade, correct);
      bump();
    },
    [store, bump],
  );

  const reset = useCallback(() => {
    store.reset();
    bump();
  }, [store, bump]);

  return { store, record, reset, mounted };
}
