/**
 * 共有定数（II-103）。
 *
 * 物理制約チェックや数値比較で使う定数をここに集約し、
 * テンプレートごとのハードコード重複を防ぐ。
 */

/**
 * 力率の物理上限（1.0）との比較に使う数値許容誤差（II-103）。
 * 浮動小数点演算の誤差で cos φ が 1.0 をわずかに超えることがあるため、
 * この値までは正常とみなす。
 *
 * @example
 * if (cosPhi > 1 + POWER_FACTOR_TOLERANCE) return null; // 物理的に不成立
 */
export const POWER_FACTOR_TOLERANCE = 1e-9;
