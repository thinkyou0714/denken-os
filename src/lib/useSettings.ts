"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { SettingsStore } from "@/domain/settings/store";
import {
  localStorageBackend,
  memoryBackend,
} from "@/domain/storage/backend";

const STORAGE_KEY = "denken-os/settings/v1";

function createSettingsStore(): SettingsStore {
  const backend =
    typeof window !== "undefined"
      ? localStorageBackend(STORAGE_KEY)
      : memoryBackend();
  return new SettingsStore(backend);
}

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useSettings() {
  const [store] = useState(createSettingsStore);
  const [, setVersion] = useState(0);
  const mounted = useIsHydrated();

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setExamDate = useCallback(
    (date: string | null) => {
      store.setExamDate(date);
      bump();
    },
    [store, bump],
  );

  const setMinimalUI = useCallback(
    (value: boolean) => {
      store.setMinimalUI(value);
      bump();
    },
    [store, bump],
  );

  const setConfidenceTracking = useCallback(
    (value: boolean) => {
      store.setConfidenceTracking(value);
      bump();
    },
    [store, bump],
  );

  return {
    store,
    setExamDate,
    setMinimalUI,
    setConfidenceTracking,
    mounted,
  };
}
