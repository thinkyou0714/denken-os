/**
 * bridge-config.ts — 橋渡し収益（アフィリエイト・note・応援）の設定。
 *
 * 設計はフリーミアム基盤（monetization-config.ts）と同一原則:
 * **全フィールドが既定で空 ＝ 対応する導線は一切描画されない（fail-open）**。
 * ユーザー（販売者）が ID/URL を設定した項目だけが発火する。
 * カタログは docs/strategy/ideas/17-bridge-revenue-100.md、
 * 運用手順は docs/strategy/monetization-setup.md、
 * 方針（開示・返金・無料保護原則）は docs/strategy/monetization-policy.md を参照。
 */

/** 科目別 note 記事のマップ（B19）。キーは問題データの subject と同じ文字列。 */
export type SubjectUrlMap = Partial<Record<string, string>>;

export interface BridgeConfig {
  /** アプリの公開 URL。シェア/招待リンクの UTM 付与先（C9/C10/C11）。空=従来どおり本文のみ。 */
  appUrl: string;
  /** Amazon アソシエイトのトラッキング ID（A6-A13）。空=教材リンクはタグなし素リンク。 */
  amazonTag: string;
  /** 寄付・応援ページ（Ko-fi/OFUSE 等。D3）。空=応援導線非表示。 */
  supportUrl: string;
  /** note のトップ/マガジン URL（B17/B18/B20）。空=note 導線非表示。 */
  noteUrl: string;
  /** BOOTH の商品/ショップ URL（B25）。空=非表示。 */
  boothUrl: string;
  /** 科目→攻略 note 記事 URL（B19/A18）。設定済み科目のみ表示。 */
  subjectNoteUrls: SubjectUrlMap;
  /** 通信講座など提携リンクのスロット（A15）。空=非表示。 */
  courseUrl: string;
  /** 講座スロットの表示名（courseUrl とセットで使用）。 */
  courseLabel: string;
  /** 価格アンカー文言（C17。例:「参考書1冊分で、試験日まで無制限」）。空=非表示。 */
  priceNote: string;
  /** 特商法テンプレ用: 販売者名（D17）。空=法的情報テンプレに記入案内を表示。 */
  sellerName: string;
  /** 特商法テンプレ用: 連絡先（メール等）。 */
  sellerContact: string;
}

export const BRIDGE: BridgeConfig = {
  appUrl: "",
  amazonTag: "",
  supportUrl: "",
  noteUrl: "",
  boothUrl: "",
  subjectNoteUrls: {},
  courseUrl: "",
  courseLabel: "",
  priceNote: "",
  sellerName: "",
  sellerContact: "",
};

/** アフィリエイトリンクが有効か（＝開示バッジの表示が必要か）。 */
export function affiliateActive(cfg: BridgeConfig = BRIDGE): boolean {
  return cfg.amazonTag !== "" || cfg.courseUrl !== "";
}
