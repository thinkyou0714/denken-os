import { describe, expect, it } from "vitest";
import { DraftExportClient } from "../../lib/clients/x-client.js";

describe("DraftExportClient（既定=実投稿しない下書き）", () => {
  it("schedule は exported=true の受領証を返し、下書きを貯める", async () => {
    const c = new DraftExportClient();
    const at = new Date("2026-06-05T07:00:00.000Z");
    const r1 = await c.schedule({ text: "朝の一問", scheduledAt: at });
    const r2 = await c.schedule({ text: "夜の解答", scheduledAt: at, quoteOfId: r1.id });
    expect(r1.exported).toBe(true);
    expect(r1.id).not.toBe(r2.id); // 連番で一意
    expect(c.drafts.length).toBe(2);
  });

  it("export は人手投稿用に時刻見出し付きで連結する", async () => {
    const c = new DraftExportClient();
    await c.schedule({ text: "本文A", scheduledAt: new Date("2026-06-05T07:00:00.000Z") });
    const out = c.export();
    expect(out).toContain("2026-06-05T07:00:00.000Z");
    expect(out).toContain("本文A");
    expect(out).toContain("draft-1");
  });
});
