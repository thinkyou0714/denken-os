/**
 * tests/web/entitlements.test.ts — プラン判定と無料枠カウンタ（entitlements.ts）。
 *
 * 既定（収益化未設定）で一切の挙動変化がないこと＝「publicKeyJwk が null なら
 * ゲートは絶対に作動しない」ことを最重要の不変条件として検証する。
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEntitlementsForTest,
  applyLicenseKey,
  clearLicense,
  DAILY_USE_STORAGE_KEY,
  featureLocked,
  initEntitlements,
  LICENSE_STORAGE_KEY,
  practiceGateAllows,
  proUnlocked,
  recordPracticeAnswer,
  remainingFreeToday,
  usedToday,
} from "../../web/src/entitlements.js";
import { type LicenseJwk, signLicense } from "../../web/src/license.js";
import { MONETIZATION, type MonetizationConfig, monetizationConfigured } from "../../web/src/monetization-config.js";
import { MemoryStorage, ThrowingStorage } from "../helpers/storage.js";

/** 2026-07-06T03:00:00Z（JST 正午）。 */
const NOW = Date.UTC(2026, 6, 6, 3, 0, 0);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function genKeypair(): Promise<{ pub: LicenseJwk; priv: LicenseJwk }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as unknown as LicenseJwk;
  const pub = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as unknown as LicenseJwk;
  return { pub, priv };
}

function activeCfg(pub: LicenseJwk, limit = 3): MonetizationConfig {
  return { enabled: true, freeDailyLimit: limit, purchaseUrl: "", publicKeyJwk: pub };
}

beforeEach(() => {
  __resetEntitlementsForTest();
});

describe("既定（収益化未設定）の不変条件", () => {
  it("出荷時の MONETIZATION は publicKeyJwk=null で未設定＝ゲート非作動", () => {
    expect(MONETIZATION.publicKeyJwk).toBeNull();
    expect(monetizationConfigured()).toBe(false);
    expect(featureLocked()).toBe(false);
  });

  it("未設定ではゲートは常に許可・残数は無限・カウンタは書き込まれない", () => {
    const storage = new MemoryStorage();
    expect(practiceGateAllows(storage, NOW)).toBe(true);
    expect(remainingFreeToday(storage, NOW)).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < 100; i++) recordPracticeAnswer(storage, NOW);
    expect(storage.getItem(DAILY_USE_STORAGE_KEY)).toBeNull();
    expect(practiceGateAllows(storage, NOW)).toBe(true);
  });

  it("キルスイッチ enabled=false は鍵設定済みでもゲートを解除する", async () => {
    const { pub } = await genKeypair();
    const cfg: MonetizationConfig = { ...activeCfg(pub), enabled: false };
    expect(featureLocked(cfg)).toBe(false);
    expect(remainingFreeToday(new MemoryStorage(), NOW, cfg)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("無料枠カウンタ（収益化作動中）", () => {
  it("上限までカウントし、使い切ると出題を止める", async () => {
    const { pub } = await genKeypair();
    const cfg = activeCfg(pub, 3);
    const storage = new MemoryStorage();
    expect(featureLocked(cfg)).toBe(true);
    expect(remainingFreeToday(storage, NOW, cfg)).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(practiceGateAllows(storage, NOW, cfg)).toBe(true);
      recordPracticeAnswer(storage, NOW, cfg);
    }
    expect(usedToday(storage, NOW)).toBe(3);
    expect(remainingFreeToday(storage, NOW, cfg)).toBe(0);
    expect(practiceGateAllows(storage, NOW, cfg)).toBe(false);
  });

  it("日をまたぐと（JST）カウンタは自動リセットされる", async () => {
    const { pub } = await genKeypair();
    const cfg = activeCfg(pub, 2);
    const storage = new MemoryStorage();
    recordPracticeAnswer(storage, NOW, cfg);
    recordPracticeAnswer(storage, NOW, cfg);
    expect(practiceGateAllows(storage, NOW, cfg)).toBe(false);
    expect(practiceGateAllows(storage, NOW + ONE_DAY_MS, cfg)).toBe(true);
    expect(remainingFreeToday(storage, NOW + ONE_DAY_MS, cfg)).toBe(2);
  });

  it("壊れた保存値は当日0件として扱う（throw しない）", async () => {
    const { pub } = await genKeypair();
    const cfg = activeCfg(pub, 5);
    const storage = new MemoryStorage();
    storage.setItem(DAILY_USE_STORAGE_KEY, "{{{not json");
    expect(usedToday(storage, NOW)).toBe(0);
    storage.setItem(DAILY_USE_STORAGE_KEY, '{"day":"x","count":-3}');
    expect(usedToday(storage, NOW)).toBe(0);
    expect(remainingFreeToday(storage, NOW, cfg)).toBe(5);
  });

  it("カウンタの保存失敗（quota）でも throw しない", async () => {
    const { pub } = await genKeypair();
    const cfg = activeCfg(pub, 5);
    expect(() => recordPracticeAnswer(new ThrowingStorage(), NOW, cfg)).not.toThrow();
  });
});

describe("ライセンスの適用・起動時再検証・解除", () => {
  it("有効なキーで Pro が解錠され、カウンタ制限が消える", async () => {
    const { pub, priv } = await genKeypair();
    const cfg = activeCfg(pub, 1);
    const storage = new MemoryStorage();
    recordPracticeAnswer(storage, NOW, cfg);
    expect(practiceGateAllows(storage, NOW, cfg)).toBe(false);

    const key = await signLicense({ sku: "pro", sub: "buyer@example.com" }, priv);
    const res = await applyLicenseKey(storage, `  ${key}  `, NOW, cfg);
    expect(res.ok).toBe(true);
    expect(proUnlocked()).toBe(true);
    expect(featureLocked(cfg)).toBe(false);
    expect(storage.getItem(LICENSE_STORAGE_KEY)).toBe(key);
    expect(practiceGateAllows(storage, NOW, cfg)).toBe(true);
    expect(remainingFreeToday(storage, NOW, cfg)).toBe(Number.POSITIVE_INFINITY);
  });

  it("不正・空・期限切れキーの適用は理由つきで失敗し、解錠しない", async () => {
    const { pub, priv } = await genKeypair();
    const cfg = activeCfg(pub);
    const storage = new MemoryStorage();
    expect((await applyLicenseKey(storage, "", NOW, cfg)).ok).toBe(false);
    expect((await applyLicenseKey(storage, "DENKEN1.junk.junk", NOW, cfg)).ok).toBe(false);
    const expired = await signLicense({ sku: "pro", exp: "2026-07-05" }, priv);
    expect((await applyLicenseKey(storage, expired, NOW, cfg)).ok).toBe(false);
    expect(proUnlocked()).toBe(false);
    expect(storage.getItem(LICENSE_STORAGE_KEY)).toBeNull();
  });

  it("収益化未設定のときは適用自体を断る", async () => {
    const res = await applyLicenseKey(new MemoryStorage(), "DENKEN1.a.b", NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("準備中");
  });

  it("initEntitlements: 保存済みの有効キーで解錠・無効/期限切れ/未保存では解錠しない", async () => {
    const { pub, priv } = await genKeypair();
    const cfg = activeCfg(pub);
    const storage = new MemoryStorage();
    expect(await initEntitlements(storage, NOW, cfg)).toBe(false);

    storage.setItem(LICENSE_STORAGE_KEY, await signLicense({ sku: "pro" }, priv));
    expect(await initEntitlements(storage, NOW, cfg)).toBe(true);
    expect(proUnlocked()).toBe(true);

    storage.setItem(LICENSE_STORAGE_KEY, await signLicense({ sku: "pro", exp: "2026-07-05" }, priv));
    expect(await initEntitlements(storage, NOW, cfg)).toBe(false);
    expect(proUnlocked()).toBe(false);
    // 期限切れでも保存値は消さない（端末時計ずれの可能性があるため）。
    expect(storage.getItem(LICENSE_STORAGE_KEY)).not.toBe("");

    storage.setItem(LICENSE_STORAGE_KEY, "tampered");
    expect(await initEntitlements(storage, NOW, cfg)).toBe(false);
  });

  it("clearLicense で無料プランに戻る", async () => {
    const { pub, priv } = await genKeypair();
    const cfg = activeCfg(pub);
    const storage = new MemoryStorage();
    await applyLicenseKey(storage, await signLicense({ sku: "pro" }, priv), NOW, cfg);
    expect(featureLocked(cfg)).toBe(false);
    clearLicense(storage);
    expect(proUnlocked()).toBe(false);
    expect(featureLocked(cfg)).toBe(true);
    expect(storage.getItem(LICENSE_STORAGE_KEY)).toBe("");
    expect(await initEntitlements(storage, NOW, cfg)).toBe(false);
  });
});
