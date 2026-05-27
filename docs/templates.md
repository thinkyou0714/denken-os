# テンプレート作成ガイド

問題雛形は `data/templates/*.yaml` に置く(`id` がファイル名と一致するのが慣例)。
分野は `data/fields.json` に定義し、テンプレの `field_id` がそれを参照する。

作成後は必ず検証する:

```bash
denken check                       # 全テンプレを複数 seed で検証(次元・グラウンディング・誤り)
denken gen --template <id> --seed 1 --out /tmp/preview   # 実際の出力を確認
```

## 共通フィールド

| フィールド | 必須 | 説明 |
|---|---|---|
| `id` | ✓ | 一意な識別子(ファイル名と一致) |
| `field_id` | ✓ | `fields.json` のノード id |
| `type` | ✓ | `calc`(計算)または `essay`(論説) |
| `title` | ✓ | 問題タイトル |
| `difficulty` | | `basic` / `applied`(既定) / `exam` |
| `statement_template` | ✓ | 問題文。`{param}` を埋め込む(Python `str.format`) |
| `prompt_hint` | | LLM への追加指示 |

## calc(計算問題)

| フィールド | 必須 | 説明 |
|---|---|---|
| `params` | ✓ | パラメータ定義(下記) |
| `expressions` | ✓ | `name: SymPy式`。上から順に評価し、前の name を参照可 |
| `answer` | ✓ | `{expr, unit, sig_figs, sane_min, sane_max}` |
| `explanation_template` | | 解説。`{answer}` で答えの表示を埋め込める |
| `solution_template` | | 整形済み解答ステップ(無ければ expressions から自動生成) |
| `hidden_exprs` | | 自動ステップから除外する式名(図補助・単位換算用) |
| `figures` | | 図の指定(下記) |
| `scoring` | 推奨 | 採点基準 `{criterion, points}`(記述式の部分点) |
| `pitfalls` | | よくある誤り `{label, expr, note, unit?}` |
| `variants` | | 難易度別パラメータ範囲(下記) |

### params(パラメータ)

```yaml
params:
  - {name: V, kind: choice, choices: [100, 200], unit: V}
  - {name: R, kind: uniform_int, low: 1, high: 10, step: 1, unit: ohm}
  - {name: X, kind: uniform_float, low: 1.0, high: 5.0, step: 0.5, unit: ohm}
```

- `kind`: `choice` / `uniform_int` / `uniform_float`
- `unit` は表示と**次元検証**に使う(例: `V`, `A`, `ohm`, `Hz`, `kVA`, `uF`, `mH`, `kohm`, `%`)

### expressions(SymPy 式)の注意

- **予約名**: SymPy では `I`(虚数単位)・`E`(自然対数の底)・`Eq`(等式)・`N` 等が予約済み。
  電流などに使う場合は `Icur` のような別名にする(`parse_expr` が変数名を Symbol として優先解釈する)。
- **単位換算は式に直書きしない方がよい**: `2*pi*f*L*1e-3`(mH→H)のように換算定数を式に入れると、
  自動生成ステップで `0.002πLf` のような汚い係数になる。その場合は `solution_template` で
  記号式を手書きするか、`hidden_exprs` で中間式を隠す。

### answer と妥当範囲

```yaml
answer:
  expr: Icur
  unit: A
  sig_figs: 3
  sane_min: 0        # 物理的に妥当な下限(任意)
  sane_max: 1000     # 上限。範囲外は denken check で失敗
```

### figures(図)

`role: technical`(既定)は数値正確性が必須でコード生成のみ。`decorative` は装飾用途。
`options` の値は中間値のキー名(`X` など)かリテラル数値、`-key` で符号反転も可。

利用可能な kind:

| kind | 用途 | 主な options |
|---|---|---|
| `single_line` | 送電単線図 | `source_label`, `load_label` |
| `phasor` | フェーザ図 | `vectors: [{label, mag, angle_deg, color}]` |
| `impedance_triangle` | R-X-Z 三角形 | `r`, `x` |
| `power_triangle` | P-Q-S 三角形 | `p`, `q` |
| `waveform` | 時間波形 | `wave`(sine/three_phase/rectified/halfwave), `amp`, `avg` |
| `bode` | 一次遅れボード線図 | `tau` |
| `resonance_curve` | RLC 電流-周波数 | `l_h`, `c_f`, `r_ohm`, `f0` |
| `transient_curve` | RC 充電曲線 | `tau_s`, `e` |
| `transformer_efficiency` | 負荷率-効率 | `sn_w`, `pf`, `pi`, `pc`, `alpha` |

### solution_template(整形済みステップ)

`str.format` で評価するため、**LaTeX のリテラル波括弧は `{{` `}}` と二重化**する。
最終値は `{answer}` を参照すると採点・本文と一致する。

```yaml
solution_template:
  - '$X_L = 2\pi f L = {XL:.2f}$ Ω'
  - '$Z = \sqrt{{R^2 + X^2}} = {Z:.2f}$ Ω'
  - '$I = \dfrac{{V}}{{Z}} =$ {answer}'
```

### pitfalls(よくある誤り)

誤答値も solver で算出する。`unit` を省くと answer の単位を使う。
誤答値が正答と一致すると `denken check` が失敗する(=ちゃんと誤りになっているか保証)。

```yaml
pitfalls:
  - {label: "√3 を掛け忘れる", expr: "I*(R*pf + X*sinphi)", note: "三相は √3 倍が必要"}
  - {label: "秒のまま答える", expr: "R*1e3*C*1e-6", unit: "s", note: "本問は ms 表示"}
```

### variants(難易度別パラメータ)

base(`params`)を完全置換する。**パラメータ名集合は base と一致**させる(式が参照するため)。

```yaml
variants:
  basic:
    - {name: V, kind: choice, choices: [100], unit: V}
    # ... 全 param を列挙
  exam:
    - {name: V, kind: choice, choices: [200, 400], unit: V}
    # ...
```

`denken gen --difficulty exam` で適用される。

## essay(論説問題)

```yaml
type: essay
statement_template: >-
  ... 設問 ...
explanation_template: >-
  ... 模範解答の骨子(stub はこれをそのまま使う)...
rubric:
  - {point: 力率改善, keywords: [力率, 進相コンデンサ, 無効電力], weight: 1}
```

`rubric` は必須。`keywords` のいずれかが本文に出現すれば充足とみなし、充足率で採点する。

## 最小例(calc)

```yaml
id: th_ohm
field_id: th-ac-rlc
type: calc
title: オームの法則
params:
  - {name: V, kind: choice, choices: [10, 20], unit: V}
  - {name: R, kind: choice, choices: [2, 5], unit: ohm}
expressions:
  Icur: "V/R"
answer: {expr: Icur, unit: A, sig_figs: 3, sane_min: 0, sane_max: 100}
statement_template: "抵抗 {R} Ω に電圧 {V} V を加えた。電流 I[A] を求めよ。"
explanation_template: "オームの法則より I = V/R = {answer}。"
scoring:
  - {criterion: "I = V/R の立式と計算", points: 8}
  - {criterion: "単位(A)", points: 2}
```
