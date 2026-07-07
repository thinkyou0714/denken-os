# 収益化（フリーミアム）セットアップガイド

戦略の全体像は [`../x-strategy/07-monetization-failure-hedge.md`](../x-strategy/07-monetization-failure-hedge.md)
（収益ブリッジ: アフィリエイト → note → **アプリ フリーミアム** → 会員制）。
本書はそのフェーズ3「アプリ フリーミアム」の**実装済み基盤を販売開始状態にする手順**。

## 仕組みの概要

- **ライセンスキー方式（サーバ不要・オフライン検証）**
  販売者が秘密鍵で署名したキーを購入者に渡し、アプリは埋め込まれた**公開鍵**で
  端末内（WebCrypto / ECDSA P-256）検証する。バックエンド・アカウント登録は不要。
- **既定では何も起きない**: `web/src/monetization-config.ts` の `publicKeyJwk` が
  `null` の間、ゲートは一切作動せず全機能無料のまま（テストで不変条件として保証）。
- **無料/Pro の線引き**（`docs/x-strategy/07` の表に準拠しつつ成長ループを守る緩め設定）:

  | 無料 | Pro |
  |---|---|
  | 学習タブの**新しい問題** 1日10問（`freeDailyLimit` で調整可。`0`=演習もPro専用） | 演習**無制限** |
  | 復習（FSRS）・**復習ドリル・間違いノート・再出題**・進捗・公式集・質問タブ | 模試（本番再現・年度別・科目別判定） |
  | 答えと解説（無料枠内の問題） | スキルドリル（公式導出・電卓速算） |

  無料枠が数えるのは「学習タブで新しく引いた問題」だけ。復習タブ発のドリルと
  間違えた問題の再出題（requeue）は、FSRS の継続ループを守るため常に無料で通る。

- **honor system である点に注意**: コードは OSS・データは localStorage のため、
  技術的にはゲートを回避できる。これは「応援課金」の設計であり、ライセンスの
  **真正性（偽造不可）だけ**を暗号で担保する。厳密な防御が必要になったら
  Supabase Auth + サーバ側エンタイトルメント（フェーズ4）へ進む。

## 販売開始 3 ステップ

```bash
# 1. 署名鍵ペアを生成（secrets/ は .gitignore 済み。秘密鍵は必ずバックアップ）
npm run license:keygen

# 2. 出力された公開鍵 JWK を web/src/monetization-config.ts へ貼る
#    - publicKeyJwk: {"kty":"EC","crv":"P-256","x":"...","y":"..."}
#    - purchaseUrl: 決済ページの URL（下記「決済手段」参照）
#    - freeDailyLimit: 無料枠（既定 10問/日）を必要なら調整

# 3. コミット → main へマージ（GitHub Pages へ自動デプロイ）
npm run verify && git commit ...
```

## 販売のたびにやること（キー発行）

```bash
npm run license:issue -- --email buyer@example.com                 # 買い切り
npm run license:issue -- --email buyer@example.com --exp 2027-08-31 # 期限付き（年額運用）
```

出力されたキー（`DENKEN1.xxx.yyy`）を購入者にメール等で送付。
購入者は **設定タブ → Pro ライセンス → キーを適用** で有効化する
（キーはバックアップ書き出しに含まれるため機種変更でも失われない）。

## 決済手段の選択肢（purchaseUrl に設定する先）

| 手段 | 手数料目安 | 特徴 |
|---|---|---|
| **BOOTH / Gumroad** | 5〜10% | 個人でも即開始。デジタルコンテンツとしてキーを自動送付できる |
| **Stripe Payment Link** | 3.6% | 要 Stripe アカウント。将来の Webhook 自動発行に発展しやすい |
| **note 有料記事** | 10〜15% | 記事内にキー請求方法を書く。既存の note 戦略（フェーズ2）と一体化 |

いずれも当面は**手動発行**（購入通知 → `license:issue` → メール送付）で十分。
販売が月数十件を超えたら Stripe Webhook + Supabase Edge Function での自動発行を検討する
（`supabase/migrations` に RLS 付き基盤が既にある）。

## 橋渡し収益（アフィリエイト・note・応援）のセットアップ — 17系

フェーズ1〜2（アフィリエイト・note）の導線は `web/src/bridge-config.ts` に集約されている。
**全フィールドが既定で空＝導線は一切表示されない**。設定した項目だけが発火する。

| フィールド | 発火する導線 |
|---|---|
| `appUrl` | シェア/招待リンクに UTM 付き URL を添付（流入計測） |
| `amazonTag` | 教材ガイド（公式タブ）のリンクがアフィリエイト化＋開示バッジ表示 |
| `supportUrl` | 設定タブ「開発を応援する」＋達成時の応援1行（Ko-fi/OFUSE 等） |
| `noteUrl` | 設定タブ「作者の攻略コンテンツ」＋模試判定後の攻略記事カード |
| `boothUrl` | 公式集タブの印刷用PDF導線＋設定タブ |
| `subjectNoteUrls` | 進捗タブの「要強化」科目→科目別攻略 note |
| `courseUrl`/`courseLabel` | 教材ガイドの通信講座スロット（ASP提携承認後） |
| `priceNote` | ペイウォールの価格アンカー（例:「参考書1冊分で試験日まで無制限」） |
| `sellerName`/`sellerContact` | 設定タブの特商法テンプレに反映 |

運用ルール:
- **非侵襲原則**（1日1件・学習中は出さない・オプトアウト可）はコードが強制する。
- アフィリエイトの ASP 登録（楽天→もしも→Amazon本審査の順が現実的）は
  [`ideas/17-bridge-revenue-100.md`](ideas/17-bridge-revenue-100.md) の A22〜A24 を参照。
- 開示・返金・無料保護の約束は [`monetization-policy.md`](monetization-policy.md) が正本。
- GitHub の Sponsor ボタンは `.github/FUNDING.yml` のコメントを外して ID を記入。
- 導線の効き目は 設定タブ →「集計JSONをコピー」→ 週次レビュー（`renderBridgeFunnel`）で確認。

## 運用メモ

- **キルスイッチ**: `MONETIZATION.enabled = false` で全ゲート即時解除（鍵はそのまま）。
- **鍵の再生成**（`--force`）は既発行キーを全て無効化する。原則やらない。
  やむを得ない場合は購入者へ新キーを再発行すること。
- **秘密鍵の保管**: `secrets/license-signing-key.json` はパスワードマネージャ等へ
  必ず複製。漏えいした場合は誰でもキーを発行できるようになる（＝鍵の再生成が必要）。
- **価格の目安**: 戦略 doc の「合格後に値上げ」原則に従い、pre-alpha 期は
  応援価格（例: 買い切り ¥1,480〜2,980）から開始 → 合格実績・監修完了後に改定。
- **返金・問い合わせ**: キーの `--email` / `--note` が照合子になる（キー本文に埋め込まれ、
  設定画面にも表示される）。

## 実装ファイル

| ファイル | 役割 |
|---|---|
| `lib/license/license.ts` | キーの形式・署名検証・発行・鍵生成（純ロジック・DOM 非依存） |
| `web/src/entitlements.ts` | プラン判定・無料枠カウンタ（JST 日次リセット） |
| `web/src/monetization-config.ts` | **販売者が編集する設定**（公開鍵・URL・無料枠） |
| `web/src/views/paywall.ts` | ロックカード UI・購入ボタン |
| `scripts/license-keygen.ts` / `license-issue.ts` | 鍵生成・キー発行 CLI |
| `tests/web/license.test.ts` / `entitlements.test.ts` | ラウンドトリップ・改ざん・期限・不変条件 |

補足（安全設計）:
- 貼り付けた公開鍵 JWK は形状検証される（EC/P-256/x/y 必須・秘密鍵 `d` 入りは拒否）。
  不正な鍵は「未設定」として扱われ全機能無料のまま＝正規購入キーが全滅する事故を防ぐ。
- ライセンスはバックアップに含まれる（機種変更対応）。削除済み（空）のライセンスは
  書き出されず、復元でも有効なキーを上書きしない。
- 進行中の模試はロック状態が変わっても最後まで完了できる。
