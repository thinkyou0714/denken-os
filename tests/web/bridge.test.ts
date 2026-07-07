/**
 * tests/web/bridge.test.ts — 橋渡し収益の共通機構（bridge.ts / bridge-config.ts /
 * gear-guide.ts / lib/bridge/links.ts / weekly-review 拡張）。
 *
 * 最重要の不変条件: **既定 config（全フィールド空）では導線が一切発火しない**こと。
 */
import { describe, expect, it } from "vitest";
import { renderBridgeFunnel } from "../../lib/analytics/weekly-review.js";
import { amazonSearchUrl, rakutenSearchUrl } from "../../lib/bridge/links.js";
import {
  ACQ_STORAGE_KEY,
  canShowNudge,
  captureFirstTouch,
  exportLedgerJson,
  LEDGER_STORAGE_KEY,
  loadAcquisition,
  loadLedger,
  markNudgeShown,
  nudgeOptedOut,
  recordClick,
  recordShown,
  setNudgeOptOut,
} from "../../web/src/bridge.js";
import { affiliateActive, BRIDGE } from "../../web/src/bridge-config.js";
import { CALCULATOR_RULE_NOTE, GEAR_SECTIONS, gearItemUrl } from "../../web/src/gear-guide.js";
import { MemoryStorage, ThrowingStorage } from "../helpers/storage.js";

/** 2026-07-06T03:00:00Z（JST 正午）。 */
const NOW = Date.UTC(2026, 6, 6, 3, 0, 0);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("既定 config の不変条件（fail-open）", () => {
  it("出荷時の BRIDGE は全フィールド空＝アフィリエイト非アクティブ", () => {
    expect(BRIDGE.appUrl).toBe("");
    expect(BRIDGE.amazonTag).toBe("");
    expect(BRIDGE.supportUrl).toBe("");
    expect(BRIDGE.noteUrl).toBe("");
    expect(BRIDGE.boothUrl).toBe("");
    expect(BRIDGE.courseUrl).toBe("");
    expect(Object.keys(BRIDGE.subjectNoteUrls)).toHaveLength(0);
    expect(affiliateActive()).toBe(false);
  });

  it("タグ未設定の教材リンクは素の検索リンク（tag パラメータなし）", () => {
    for (const sec of GEAR_SECTIONS) {
      for (const item of sec.items) {
        const url = gearItemUrl(item);
        expect(url).toContain("amazon.co.jp");
        expect(url).not.toContain("tag=");
      }
    }
  });
});

describe("検索リンク生成（lib/bridge/links）", () => {
  it("タグ付き Amazon 検索リンクを生成し、日本語キーワードをエンコードする", () => {
    const url = amazonSearchUrl("電験二種 これだけ", "denken-22");
    const u = new URL(url);
    expect(u.hostname).toBe("www.amazon.co.jp");
    expect(u.searchParams.get("k")).toBe("電験二種 これだけ");
    expect(u.searchParams.get("tag")).toBe("denken-22");
  });

  it("楽天検索リンクはパスにキーワードを持つ", () => {
    const url = rakutenSearchUrl("電験二種");
    expect(url).toContain("search.rakuten.co.jp");
    expect(url).toContain(encodeURIComponent("電験二種"));
  });
});

describe("教材ガイドの正確性ガード", () => {
  it("電卓セクションは規定解説（一般電卓のみ・関数電卓不可）を必ず持つ", () => {
    const calc = GEAR_SECTIONS.find((s) => s.id === "calculator");
    expect(calc).toBeDefined();
    expect(calc?.intro).toBe(CALCULATOR_RULE_NOTE);
    expect(CALCULATOR_RULE_NOTE).toContain("一般電卓");
    expect(CALCULATOR_RULE_NOTE).toContain("関数電卓");
    // 紹介アイテム側にも関数電卓を含めない（キーワード検査）。
    for (const item of calc?.items ?? []) {
      expect(item.keyword).not.toContain("関数");
      expect(item.title).not.toContain("関数");
    }
  });
});

describe("ローカル計測台帳", () => {
  it("表示/クリックを placement:campaign キーで整数カウントする", () => {
    const storage = new MemoryStorage();
    recordShown(storage, "gear", "primary");
    recordShown(storage, "gear", "primary");
    recordClick(storage, "gear", "primary");
    recordClick(storage, "settings", "support");
    const ledger = loadLedger(storage);
    expect(ledger["gear:primary"]).toEqual({ shown: 2, clicked: 1 });
    expect(ledger["settings:support"]).toEqual({ shown: 0, clicked: 1 });
  });

  it("壊れた保存値・quota 失敗でも throw しない", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEDGER_STORAGE_KEY, "{{{broken");
    expect(loadLedger(storage)).toEqual({});
    expect(() => recordClick(new ThrowingStorage(), "a", "b")).not.toThrow();
  });

  it("エクスポートは台帳と流入記録を含む JSON を返す", () => {
    const storage = new MemoryStorage();
    recordClick(storage, "share", "badge");
    const parsed = JSON.parse(exportLedgerJson(storage)) as { ledger: unknown; acquisition: unknown };
    expect(parsed.ledger).toEqual({ "share:badge": { shown: 0, clicked: 1 } });
    expect(parsed.acquisition).toBeNull();
  });
});

describe("頻度制御（1日1件＋種類別クールダウン＋オプトアウト）", () => {
  it("同じ日に2件目のナッジは出ない（グローバル予算）", () => {
    const storage = new MemoryStorage();
    expect(canShowNudge(storage, "summary", {}, NOW)).toBe(true);
    markNudgeShown(storage, "summary", NOW);
    expect(canShowNudge(storage, "summary", {}, NOW)).toBe(false);
    expect(canShowNudge(storage, "other-kind", {}, NOW)).toBe(false); // 種類が違っても同日は不可
    expect(canShowNudge(storage, "other-kind", {}, NOW + ONE_DAY_MS)).toBe(true); // 翌日は別種類OK
  });

  it("同じ種類はクールダウン日数(既定7日)あける", () => {
    const storage = new MemoryStorage();
    markNudgeShown(storage, "summary", NOW);
    expect(canShowNudge(storage, "summary", {}, NOW + 3 * ONE_DAY_MS)).toBe(false);
    expect(canShowNudge(storage, "summary", {}, NOW + 7 * ONE_DAY_MS)).toBe(true);
    expect(canShowNudge(storage, "summary", { cooldownDays: 2 }, NOW + 2 * ONE_DAY_MS)).toBe(true);
  });

  it("学習中ガードとオプトアウトはすべてに優先する", () => {
    const storage = new MemoryStorage();
    expect(canShowNudge(storage, "summary", { inFocusFlow: true }, NOW)).toBe(false);
    expect(setNudgeOptOut(storage, true)).toBe(true);
    expect(nudgeOptedOut(storage)).toBe(true);
    expect(canShowNudge(storage, "summary", {}, NOW)).toBe(false);
    expect(setNudgeOptOut(storage, false)).toBe(true);
    expect(canShowNudge(storage, "summary", {}, NOW)).toBe(true);
  });

  it("オプトアウトの保存失敗は false を返す（黙って消えない＝呼び出し側が通知できる）", () => {
    expect(setNudgeOptOut(new ThrowingStorage(), true)).toBe(false);
  });
});

describe("流入ファーストタッチ", () => {
  it("UTM 付き URL を1回だけ記録し、2回目以降は上書きしない", () => {
    const storage = new MemoryStorage();
    expect(captureFirstTouch(storage, "https://ex.com/?utm_source=x&utm_campaign=badge&utm_content=b-01", NOW)).toBe(
      true,
    );
    expect(loadAcquisition(storage)).toMatchObject({ source: "x", campaign: "badge", content: "b-01" });
    expect(captureFirstTouch(storage, "https://ex.com/?utm_source=other&utm_campaign=zzz", NOW)).toBe(false);
    expect(loadAcquisition(storage)?.source).toBe("x");
  });

  it("UTM なし・不正 URL は記録しない", () => {
    const storage = new MemoryStorage();
    expect(captureFirstTouch(storage, "https://ex.com/#practice", NOW)).toBe(false);
    expect(captureFirstTouch(storage, "not a url", NOW)).toBe(false);
    expect(storage.getItem(ACQ_STORAGE_KEY)).toBeNull();
  });
});

describe("週次レビューのファネル節（lib/analytics 拡張）", () => {
  it("台帳をクリック降順の markdown 表に整形する", () => {
    const md = renderBridgeFunnel({
      "gear:primary": { shown: 10, clicked: 2 },
      "settings:support": { shown: 4, clicked: 3 },
    });
    expect(md).toContain("| settings:support | 4 | 3 | 75% |");
    expect(md).toContain("| gear:primary | 10 | 2 | 20% |");
    expect(md.indexOf("settings:support")).toBeLessThan(md.indexOf("gear:primary"));
  });

  it("空台帳は（データなし）", () => {
    expect(renderBridgeFunnel({})).toContain("データなし");
  });
});
