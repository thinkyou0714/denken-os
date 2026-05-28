"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ProgressStore } from "@/domain/progress/store";
import {
  localStorageBackend,
  memoryBackend,
} from "@/domain/storage/backend";
import type { Grade4 } from "@/domain/srs/scheduler";
import type { Confidence } from "@/domain/progress/store";

const STORAGE_KEY = "denken-os/progress/v1";

function createStore(): ProgressStore {
  const backend =
    typeof window !== "undefined"
      ? localStorageBackend(STORAGE_KEY)
      : memoryBackend();
  return new ProgressStore(backend);
}

/**
 * SSR ではなくクライアントで描画が確定したか(ハイドレーション完了)を返す。
 * サーバーと初回クライアント描画の不一致を避けるための定番パターン。
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * クライアント側で ProgressStore を保持するフック。
 * localStorage は client でのみ参照できるため、`mounted` が true になってから
 * 実データを描画する。
 */
export function useProgress() {
  const [store] = useState(createStore);
  const [, setVersion] = useState(0);
  const mounted = useIsHydrated();

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const record = useCallback(
    (
      problemId: string,
      grade: Grade4,
      correct: boolean,
      confidence?: Confidence,
    ) => {
      store.recordReview(problemId, grade, correct, undefined, confidence);
      bump();
    },
    [store, bump],
  );

  const reset = useCallback(() => {
    store.reset();
    bump();
  }, [store, bump]);

  const importJson = useCallback(
    (json: string) => {
      const ok = store.restore(json);
      if (ok) bump();
      return ok;
    },
    [store, bump],
  );

  const setNote = useCallback(
    (problemId: string, note: string) => {
      store.setNote(problemId, note);
      bump();
    },
    [store, bump],
  );

  return { store, record, reset, importJson, setNote, mounted };
}
