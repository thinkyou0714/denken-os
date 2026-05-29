# ライセンス構成（デュアルライセンス）

DENKEN-OS は **コード** と **データ/ドキュメント** で異なるライセンスを採用しています。
README の方針（アプリ部分 = MIT ／ 問題集データ = CC-BY-SA）を実体化したものです。

| 対象 | パス | ライセンス | ファイル |
|---|---|---|---|
| ソースコード | `lib/`, `scripts/`, ルートの設定ファイル | MIT | [`LICENSE`](LICENSE) |
| 問題データ | `data/**` | CC-BY-SA-4.0 | [`LICENSE-DATA`](LICENSE-DATA) |
| ドキュメント | `docs/**` | CC-BY-SA-4.0 | [`LICENSE-DATA`](LICENSE-DATA) |

## なぜ分けるか
- **コード(MIT)**: エンジン・検証ロジック・CLI は誰でも自由に再利用・改変・商用利用できるようにし、エコシステムを広げる。
- **データ/ドキュメント(CC-BY-SA)**: 問題や戦略ドキュメントは「帰属表示＋同一ライセンス継承」を課し、改変版もオープンに保つ（フォークしても知見が閉じない）。

## 過去問の出自に関する注意（最重要）
`data/` 内の問題は `source.type` で出自を区別します。

- `original` … DENKEN-OS が一から作問。**CC-BY-SA-4.0 で配布**。
- `past_exam_modified` / `past_exam_quoted` … 公表過去問に由来。**`citation` 必須**で、
  原著作（試験センター等）の利用条件に従う。本リポジトリの CC-BY-SA は原著作者の権利を上書きしない。

詳細は [`docs/x-strategy/04-compliance.md`](docs/x-strategy/04-compliance.md) を参照。
