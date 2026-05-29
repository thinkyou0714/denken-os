# 図解: 音声学習システムの全体像（コスパ × 品質保証）

> DENKEN-OS の「法規 聞き流し」を、**コスト最小**かつ**品質を多層で担保**する形に組んだ全体像。
> 図は Mermaid（GitHub でそのまま描画）。実装ファイルと対応づけてある。
>
> 二大原則:
> 1. **正解はコードで算出**（LLM/外部APIに数値を作らせない）＝ ハルシネーション源を断つ。
> 2. **無料・オフライン部品を主軸**（Web Speech API / GitHub Pages / localStorage）＝ ランニングコストほぼ0。

---

## 1. 全体アーキテクチャ（レイヤと依存）

```mermaid
flowchart TB
    subgraph BUILD["🛠 ビルド時（CI / 開発機・コスト0）"]
        TPL["テンプレート群<br/>lib/engine/templates/*<br/><i>決定論ソルバ=正解の真値</i>"]
        GEN["generate.ts<br/>生成・誤答合成・難易度"]
        NAR["narrate.ts (Narrator I/F)<br/><i>既定=Stub(無料) / 任意=Claude Haiku</i>"]
        VAL["validate.ts + schema.ts(zod)<br/>+ ajv(problem-schema.json)"]
        BP["scripts/build-problems.ts<br/>→ web/problems.json"]
        TPL --> GEN --> NAR --> VAL --> BP
    end

    subgraph SHIP["📦 配信（GitHub Pages・無料）"]
        PJSON["problems.json<br/><i>検証済み静的データ</i>"]
        APPJS["dist/app.js (esbuild)"]
        SW["sw.js (Service Worker / SWR)"]
    end
    BP --> PJSON

    subgraph PURE["🎧 音声・純ロジック（lib/audio・DOM非依存=テスト可能）"]
        NORM["speech-text.ts<br/>読み上げ正規化 + 用語辞書"]
        SCRIPT["script.ts<br/>toAudioScript / buildPlaylist<br/>sessionSummary / transcript"]
        NORM --> SCRIPT
    end

    subgraph RUNTIME["📱 端末（ブラウザ・ランニングコスト0）"]
        APP["app.ts (UI配線)"]
        PLAYER["audio-player.ts<br/>AudioPlayer + Speaker I/F"]
        TTS["browser-speaker.ts<br/><b>Web Speech API（無料・オフライン）</b>"]
        STORE["store.ts<br/>LocalProgress(SM-2)<br/>localStorage"]
        APP --> PLAYER --> TTS
        APP --> STORE
    end

    PJSON --> APP
    APPJS --> APP
    SW -. キャッシュ即返し+裏で更新 .-> APP
    SCRIPT --> PLAYER
    STORE -. 弱点/復習/間違い topic .-> SCRIPT

    style TPL fill:#e8f5e9,stroke:#2e7d32
    style TTS fill:#e3f2fd,stroke:#1565c0
    style VAL fill:#fff3e0,stroke:#e65100
    style PJSON fill:#e3f2fd,stroke:#1565c0
```

ポイント: **コストが発生しうるのはビルド時の任意LLM言い回しのみ**（しかも Haiku＋既定はStubで0）。実行時は完全に無料部品。

---

## 2. データフロー（1問が耳に届くまで）

```mermaid
flowchart LR
    A["係数を振る<br/>(realistic_range)"] --> B["コードで正解算出<br/>P=V²R/(R²+X²) 等"]
    B --> C{"綺麗な値?<br/>物理的に成立?"}
    C -- いいえ --> A
    C -- はい --> D["誤答=典型ミスから合成<br/>難易度を係数から決定"]
    D --> E["言い回し<br/>Stub既定/Haiku任意"]
    E --> F{"解説の最終値<br/>== コード正解?"}
    F -- 不一致 --> X["破棄"]
    F -- 一致 --> G["validate<br/>(zod+ajv不変条件)"]
    G --> H["problems.json"]
    H --> I["toAudioScript<br/>正規化→台本"]
    I --> J["AudioPlayer→Web Speech<br/>出題→間→正解→解説"]

    style B fill:#e8f5e9,stroke:#2e7d32
    style F fill:#fff3e0,stroke:#e65100
    style J fill:#e3f2fd,stroke:#1565c0
```

---

## 3. コスト構造（なぜ安いか）

```mermaid
flowchart TB
    subgraph FREE["💚 常時無料（主軸）"]
        F1["Web Speech API<br/>端末内蔵TTS"]
        F2["GitHub Pages<br/>静的配信"]
        F3["localStorage<br/>進捗保存=バックエンド不要"]
        F4["決定論生成<br/>=リクエスト毎の課金なし"]
        F5["Service Worker<br/>オフライン動作"]
    end
    subgraph LOW["💛 任意・低コスト（品質を上げたい時だけ）"]
        L1["Claude Haiku<br/>言い回しのみ・ビルド時バッチ"]
        L2["VOICEVOX(ローカル)<br/>高品質日本語・事前生成mp3"]
    end
    subgraph PAID["🟠 規模拡大後のみ（任意）"]
        P1["クラウドTTS(Polly等)<br/>配信用プレミアム音源"]
        P2["Supabase<br/>端末間同期・集計"]
    end

    FREE ==> 個人運用で十分
    LOW -. 必要時だけ .-> FREE
    PAID -. 収益化後 .-> LOW

    style FREE fill:#e8f5e9,stroke:#2e7d32
    style LOW fill:#fffde7,stroke:#f9a825
    style PAID fill:#fff3e0,stroke:#e65100
```

| 項目 | 主軸（無料） | コスト発生条件 |
|---|---|---|
| 音声合成 | Web Speech API | クラウドTTSを選んだ時のみ |
| ホスティング | GitHub Pages | 独自ドメイン/大規模配信時のみ |
| 問題生成 | 決定論コード（Stub） | Haiku言い回しを使う時のみ（1回/問・ビルド時） |
| 進捗/同期 | localStorage | 端末間同期が必要になったら Supabase |

---

## 4. 品質保証の多層ゲート（事故率を下げる）

```mermaid
flowchart TB
    L1["① 生成段: 綺麗な値・物理成立のみ採用<br/>(汚い係数は振り直し/破棄)"]
    L2["② 自動検算: 正解は純関数算出<br/>solver_checked=true"]
    L3["③ 整合確認: 解説の最終値==正解<br/>(不一致は破棄)"]
    L4["④ 構造検証: zod ⇄ ajv 二重<br/>(ドリフト検知テスト)"]
    L5["⑤ 不変条件スイープ: 全テンプレ×多シード<br/>answer∈choices/選択肢一意/exam↔subject"]
    L6["⑥ data↔engine / web↔engine 整合<br/>(種問題・配信JSONが式と一致)"]
    L7["⑦ 読み上げ品質: 単位/記号/専門用語の正規化<br/>未変換記号ゼロをテスト"]
    L8["⑧ 人間ゲート: human_checked<br/>validated昇格は人手検算後"]

    L1-->L2-->L3-->L4-->L5-->L6-->L7-->L8
    L8 --> OUT(["出題/聞き流しに供給"])

    style L2 fill:#e8f5e9,stroke:#2e7d32
    style L3 fill:#e8f5e9,stroke:#2e7d32
    style L7 fill:#e3f2fd,stroke:#1565c0
    style L8 fill:#fff3e0,stroke:#e65100
```

各層は CI（GitHub Actions・無料枠）で自動実行。**品質コストもほぼ0**で、回帰を機械的に止める。

---

## 5. 再生順の決定（SRS連携・聞き流しの賢さ）

```mermaid
flowchart TB
    START["再生開始"] --> MODE{"出題対象モード"}
    MODE -- 通常 --> W["弱点topicを前方へ<br/>weakestTopics(SM-2)"]
    MODE -- 復習 --> DUE["期日到来のみ<br/>LocalProgress.dueTopics"]
    MODE -- 間違い --> WR["直近不正解のみ<br/>LocalProgress.wrongTopics"]
    W --> FILT["科目/難易度フィルタ"]
    DUE --> FILT
    WR --> FILT
    FILT --> INTL["インターリーブ<br/>(同一topic連続回避)"]
    INTL --> LIM["件数/分タイマー・レジューム"]
    LIM --> PLAY["台本生成→読み上げ"]
    PLAY --> END{"末尾/タイマー?"}
    END -- はい --> SUM["締め要約を読み上げ<br/>(何問・重点論点)"]
    END -- ユーザー停止 --> NOSUM["要約なし"]

    style DUE fill:#e8f5e9,stroke:#2e7d32
    style INTL fill:#e3f2fd,stroke:#1565c0
```

---

## 6. テスト容易性（品質を安く保つ設計）

```mermaid
flowchart LR
    subgraph INJECT["注入インターフェース=モックで高速テスト"]
        SP["Speaker<br/>→ FakeSpeaker"]
        ST["StorageLike<br/>→ MemoryStorage"]
        NA["Narrator<br/>→ Stub/Corrupting"]
        SL["sleep / now<br/>→ 即時・仮想時計"]
    end
    INJECT --> UNIT["Vitest 195件<br/>DOM/音声/時間なしで純検証"]
    UNIT --> CI["GitHub Actions<br/>(無料枠で全層を毎PR)"]

    style INJECT fill:#f3e5f5,stroke:#6a1b9a
    style UNIT fill:#e8f5e9,stroke:#2e7d32
```

DOM・実音声・実時間を**注入で差し替え**るため、CI は速く・無料枠で完結。＝**品質保証の運用コストが低い**。

---

## 7. 段階的コスト戦略（今 → 次 → 将来）

```mermaid
flowchart LR
    NOW["🟢 今(コスト0)<br/>Web Speech・GitHub Pages<br/>localStorage・決定論生成<br/>Vitest+Actions"]
    NEXT["🟡 次(低コスト・効果大)<br/>VOICEVOX事前生成音源<br/>Web Push復習通知<br/>Lighthouse CI / Playwright"]
    FUT["🟠 将来(収益化後)<br/>Supabaseで同期・集計<br/>クラウドTTS / アプリ課金"]
    NOW --> NEXT --> FUT

    style NOW fill:#e8f5e9,stroke:#2e7d32
    style NEXT fill:#fffde7,stroke:#f9a825
    style FUT fill:#fff3e0,stroke:#e65100
```

---

## まとめ：コスパと品質の両立ロジック

```mermaid
mindmap
  root((音声学習<br/>コスパ×品質))
    コスパ
      無料部品主軸
        Web Speech API
        GitHub Pages
        localStorage
      決定論生成
        リクエスト毎課金なし
        Stub既定でLLM任意
      テスト注入で安いCI
    品質
      正解はコード算出
        ハルシネーション源を断つ
      多層ゲート
        検算/整合/不変条件
        zod⇄ajvドリフト検知
      読み上げ正規化
        単位/記号/専門用語
      人間ゲート
        validated昇格は人手後
    継続(UX)
      SRS連携(復習/間違い)
      アクティブリコール
      字幕/原稿/A11y
      タイマー/レジューム/要約
```

**設計の要諦**: 「お金がかかる部分（正確な計算・自然な音声）を、お金のかからない方法（決定論コード・端末内蔵TTS）で代替し、品質はコードと自動テストで機械的に担保する」。これにより**個人運用でランニングコストほぼ0**のまま、資格問題に必須の正確性を維持する。
