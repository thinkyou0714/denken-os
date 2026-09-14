import { ApiError, api, records, saveRecord, setApiIdentity } from "./client.js";

export interface Identity {
  id: string;
  role: string;
  externalAI: boolean;
  imageStorage: boolean;
}
export let identity: Identity | null = null;
export let syncStatus = "接続確認中";
const DEVICE_KEYS = new Set([
  "denken:theme",
  "denken:sound",
  "denken:mascot",
  "denken:focus",
  "denken:apiKey",
  "denken:license",
]);
const forbidden = (key: string) => /apiKey|secret|token|license/i.test(key);
class CloudStorage implements Storage {
  private values: Record<string, string> = {};
  private pending: Record<string, string | null> = {};
  private base: Record<string, string> = {};
  private revision = 0;
  private owner = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active: Promise<void> | null = null;
  private ready = false;
  get length() {
    return Object.keys(this.values).length;
  }
  key(index: number) {
    return Object.keys(this.values)[index] ?? null;
  }
  getItem(key: string): string | null {
    return DEVICE_KEYS.has(key) ? window.localStorage.getItem(key) : (this.values[key] ?? null);
  }
  setItem(key: string, value: string) {
    if (DEVICE_KEYS.has(key)) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (!key.startsWith("denken:") || forbidden(key)) throw new Error("このキーは保存できません");
    this.values[key] = String(value);
    this.pending[key] = String(value);
    this.schedule();
  }
  removeItem(key: string) {
    if (DEVICE_KEYS.has(key)) {
      window.localStorage.removeItem(key);
      return;
    }
    delete this.values[key];
    this.pending[key] = null;
    this.schedule();
  }
  clear() {
    for (const key of Object.keys(this.values)) this.removeItem(key);
  }
  private announce(text: string) {
    syncStatus = text;
    window.dispatchEvent(new CustomEvent("denken-sync", { detail: text }));
  }
  private queueKey() {
    return `denken:pending:${this.owner}`;
  }
  private persistQueue() {
    if (!this.owner) return;
    window.localStorage.setItem(
      this.queueKey(),
      JSON.stringify({ base: this.base, pending: this.pending, revision: this.revision }),
    );
  }
  private schedule() {
    this.persistQueue();
    this.announce("保存待ち");
    if (this.timer) clearTimeout(this.timer);
    if (this.ready)
      this.timer = setTimeout(() => {
        void this.flush().catch(() => {});
      }, 500);
  }
  async initialize() {
    const wasReady = this.ready;
    this.ready = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.active) await this.active.catch(() => {});
    if (wasReady) this.persistQueue();
    try {
      identity = await api<Identity>("me");
      this.owner = identity.id;
      this.pending = {};
      this.values = {};
      this.base = {};
      this.revision = 0;
      setApiIdentity(this.owner);
      const response = await records<{ data: Record<string, string> }>("legacy");
      const current = response.items.find((r) => r.id === "current");
      this.revision = current?.revision ?? 0;
      this.values = { ...(current?.body.data ?? {}) };
      this.base = { ...this.values };
      const queued = window.localStorage.getItem(this.queueKey());
      if (queued) {
        const q = JSON.parse(queued) as {
          base: Record<string, string>;
          pending: Record<string, string | null>;
          revision: number;
        };
        this.pending = q.pending;
        for (const [key, value] of Object.entries(this.pending)) {
          if (forbidden(key)) continue;
          if (value === null) delete this.values[key];
          else this.values[key] = value;
        }
        // Preserve the base used to author queued changes; CAS merge detects conflicts.
        this.base = q.base;
        this.revision = q.revision;
      }
      this.ready = true;
      this.persistQueue();
      window.localStorage.setItem("denken:lastSiteIdentity", JSON.stringify(identity));
      this.announce("同期済み");
      if (Object.keys(this.pending).length) void this.flush().catch(() => {});
    } catch (error) {
      if (!navigator.onLine && !(error instanceof ApiError && [401, 403, 409].includes(error.status))) {
        const cached = window.localStorage.getItem("denken:lastSiteIdentity");
        if (cached) {
          const person = JSON.parse(cached) as Identity;
          const raw = window.localStorage.getItem(`denken:pending:${person.id}`);
          if (raw) {
            const q = JSON.parse(raw) as {
              base: Record<string, string>;
              pending: Record<string, string | null>;
              revision: number;
            };
            identity = person;
            this.owner = person.id;
            setApiIdentity(this.owner);
            this.base = q.base;
            this.pending = q.pending;
            this.revision = q.revision;
            this.values = { ...q.base };
            for (const [k, v] of Object.entries(q.pending)) {
              if (v === null) delete this.values[k];
              else this.values[k] = v;
            }
            this.ready = true;
            this.announce("オフライン：この端末の前回の学習記録。再接続後に本人を確認して同期");
            return;
          }
        }
      }
      identity = null;
      setApiIdentity(null);
      this.announce(
        error instanceof ApiError && error.status === 401 ? "サインインが必要" : "接続待ち・入力は端末に保持",
      );
      throw error;
    }
  }
  async flush(): Promise<void> {
    if (this.active) {
      await this.active;
      if (Object.keys(this.pending).length) return this.flush();
      return;
    }
    if (!this.ready || !Object.keys(this.pending).length) return;
    const changed = { ...this.pending },
      sent = { ...this.values },
      base = { ...this.base },
      owner = this.owner;
    this.active = (async () => {
      try {
        const me = await api<Identity>("me");
        if (me.id !== owner || this.owner !== owner)
          throw new Error("利用者が変わっています。保存待ちの内容を保管し、再読み込みしてください。");
        let result: { id: string; revision: number };
        try {
          result = await saveRecord("legacy", "current", { data: sent }, this.revision, owner);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;
          const current = (await records<{ data: Record<string, string> }>("legacy")).items.find(
            (r) => r.id === "current",
          );
          const remote = current?.body.data ?? {};
          const conflicts = Object.keys(changed).filter(
            (k) => (remote[k] ?? null) !== (base[k] ?? null) && (remote[k] ?? null) !== changed[k],
          );
          if (conflicts.length)
            throw new Error(
              "他の端末の記録と競合しています。データ管理から保存待ちの内容を書き出して比較してください。",
            );
          Object.assign(sent, remote);
          for (const [k, v] of Object.entries(changed)) {
            if (v === null) delete sent[k];
            else sent[k] = v;
          }
          result = await saveRecord("legacy", "current", { data: sent }, current?.revision ?? 0, owner);
        }
        this.revision = result.revision;
        this.base = { ...sent };
        for (const [k, v] of Object.entries(changed)) if (this.pending[k] === v) delete this.pending[k];
        this.values = { ...sent };
        for (const [k, v] of Object.entries(this.pending)) {
          if (v === null) delete this.values[k];
          else this.values[k] = v;
        }
        this.persistQueue();
        this.announce(Object.keys(this.pending).length ? "保存待ち" : "同期済み");
      } catch (error) {
        this.persistQueue();
        this.announce(error instanceof Error ? error.message : "保存待ち・再試行が必要");
        throw error;
      }
    })();
    try {
      await this.active;
    } finally {
      this.active = null;
    }
    if (Object.keys(this.pending).length) await this.flush();
  }
  pendingExport() {
    return { owner: this.owner, revision: this.revision, data: this.values, pending: this.pending };
  }
  reset() {
    this.values = {};
    this.base = {};
    this.pending = {};
    this.revision = 0;
    if (this.owner) window.localStorage.removeItem(this.queueKey());
  }
}
export const cloudStorage = new CloudStorage();
window.addEventListener("online", () => {
  void cloudStorage.flush().catch(() => {});
});
