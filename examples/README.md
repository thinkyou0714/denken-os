# 生成例(サンプル出力)

`denken gen` で生成した実際の出力例(stub バックエンド、決定論的)。
通常の生成物は `.gitignore` 済みだが、これらは新規閲覧者が出力像を掴めるよう意図的にコミットしている。

| 例 | 種別 | 内容 |
|---|---|---|
| `th_rlc_series_3.md` | calc(理論) | RLC直列回路の電流 + インピーダンス三角形 |
| `pm_vdrop_3ph_1.md` | calc(二次) | 三相送電線の電圧降下 + 単線図 + フェーザ図 |
| `pm_loss_reduction_1.md` | essay(二次) | 配電損失低減の論説(rubric 採点) |

再生成:

```bash
denken gen --template th_rlc_series --seed 3 --out examples
```
