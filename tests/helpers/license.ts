/**
 * tests/helpers/license.ts — ライセンス署名鍵ペア生成の共有ヘルパー。
 *
 * license.test.ts / entitlements.test.ts に重複していた鍵生成を一元化し、
 * 実装（lib/license の販売者用 API）と同じ経路で鍵を作る＝テストが実際の
 * 鍵形状（公開鍵の最小化を含む）を検証するようにする。
 */
import { generateLicenseKeyPair, type LicenseJwk } from "../../lib/license/license.js";

export type { LicenseJwk };

/** ECDSA P-256 の鍵ペアを生成する（pub は config へ貼る最小形・priv は署名用）。 */
export async function genKeypair(): Promise<{ pub: LicenseJwk; priv: LicenseJwk }> {
  const { privateJwk, publicJwk } = await generateLicenseKeyPair();
  return { pub: publicJwk, priv: privateJwk };
}
