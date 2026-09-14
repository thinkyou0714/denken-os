import type { Attempt } from "../../../lib/service/assessment.js";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = "GET", value?: unknown): Promise<T> {
  const cachedOwner = typeof localStorage === "undefined" ? null : localStorage.getItem("denken:lastSiteIdentity");
  let owner = "";
  try {
    owner = cachedOwner ? (JSON.parse(cachedOwner) as { id: string }).id : "";
  } catch {
    /* An invalid local replica is not used. */
  }
  const canCache = method === "GET" && owner && /^(attempts|skills|records\/|catalog$)/.test(path);
  const cacheKey = `denken:readReplica:${owner}:${path}`;
  const options: RequestInit = {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(25000),
  };
  if (value !== undefined) options.body = JSON.stringify(value);
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, options);
  } catch (error) {
    if (canCache && !navigator.onLine) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as T;
    }
    throw error;
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiError("応答を読み取れません。入力を残したまま再試行してください。", response.status);
  }
  if (!response.ok) throw new ApiError((result as { error?: string }).error ?? "処理に失敗しました", response.status);
  if (canCache) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      /* Read replicas are optional; pending writes have their own durable queue. */
    }
  }
  return result as T;
}
export async function allAttempts(): Promise<{ items: Attempt[] }> {
  const items: Attempt[] = [];
  let path = "attempts";
  for (let page = 0; page < 100; page++) {
    const result = await api<{ items: Attempt[]; nextBefore: number | null; nextId: string | null }>(path);
    items.push(...result.items);
    if (!result.nextBefore || !result.nextId) return { items };
    path = `attempts?before=${result.nextBefore}&beforeId=${encodeURIComponent(result.nextId)}`;
  }
  throw new Error("履歴が大きいため、この画面の集計上限を超えました。全件書き出しから確認してください。");
}
export interface StoredRecord<T = Record<string, unknown>> {
  id: string;
  revision: number;
  body: T;
  updated_at: number;
}
export const records = <T = Record<string, unknown>>(kind: string) =>
  api<{ items: StoredRecord<T>[] }>(`records/${kind}`);
export const saveRecord = (kind: string, id: string, body: unknown, expectedRevision = 0) =>
  api<{ id: string; revision: number }>(`records/${kind}`, "POST", { id, body, expectedRevision });
export function download(name: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
