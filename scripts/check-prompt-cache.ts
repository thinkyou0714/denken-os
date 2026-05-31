/**
 * check-prompt-cache.ts — Anthropic prompt caching の本番動作を診断する。
 *
 * 目的:
 *   `lib/engine/narrate.ts` の AnthropicNarrator は system プロンプトに
 *   `cache_control: { type: "ephemeral" }` を付けてキャッシュを有効化しているが、
 *   本番で実際にキャッシュヒットしているかは usage を見ないと分からない。
 *   このスクリプトは narrate.ts と同形の API 呼出を 2 回連続で発火し、
 *   2 回目のレスポンスの `usage.cache_read_input_tokens` が > 0 であることを確認する。
 *
 * 設計判断:
 *   - narrate.ts を一切編集しない(並行セッションの territory)。
 *   - production code path にも一切影響しない standalone 診断ツール。
 *   - system プロンプトは narrate.ts と同じパターン("数値を変えないリライタ")で
 *     現実的なキャッシュサイズ(>= 1024 tokens 推奨)を作る。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/check-prompt-cache.ts
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/check-prompt-cache.ts --json
 *
 * 出力:
 *   call#1 usage = { input, cache_creation, cache_read, output }
 *   call#2 usage = { input, cache_creation, cache_read, output }
 *   verdict   = PASS / FAIL (cache_read > 0 on call#2)
 *
 * 終了コード:
 *   0 = PASS (caching effective)
 *   1 = FAIL (cache_read = 0 on call#2 → caching not working)
 *   2 = ERROR (API key missing, network error, parse error)
 */

const JSON_MODE = process.argv.includes("--json");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[check-prompt-cache] ANTHROPIC_API_KEY is not set; cannot verify cache behaviour.");
  process.exit(2);
}

// Anthropic の prompt caching は cache 対象が 1024 tokens 以上ある時にのみ
// cache_creation が発生する (Haiku モデルの最低キャッシュサイズ; モデルにより異なる)。
// 試験問題のリライト指示風の十分長い system を組み立てる。
const CACHED_SYSTEM = `あなたは電験 (電気主任技術者試験) の問題文・解説のリライト専門家です。
与えられた既定の問題文 (statement) と解法ステップ (solution) を、
より自然で読みやすい日本語に言い換えてください。

# 絶対遵守の制約

- 数値・単位・記号を一切変更しない。係数も、途中式の値も、正解も固定。
- 新しい数値や事実を加えない。物理的な関係を変えない。
- 解法ステップの最終的な答えの値は、与えられた answerText と必ず一致させる。
- 出典・著作権・著者人格権に触れない。誇張しない。盛らない。
- 出力は statement (問題文 1 つ) と solution (解法ステップの配列) のみ。

# 文体ガイド

- 高校物理・電気の入門書を参考に、敬体は使わず常体で簡潔に。
- 単位は SI を優先。代表的な単位接頭辞 (k, M, μ, m, n) は数値直後に空白なしで付ける。
- 数値は半角、Ω・Δ・℃などの記号はそのまま使う。
- 解法ステップは 1 ステップ 1 動作。式 → 代入 → 計算 → 単位確認 → 答え、の流れ。

# 禁則

- LaTeX 等の数式マークアップは使わない (本文プレーンテキストのみ)。
- 同じ言い回しのまま統計的に頻出する語の連続を避ける。
- 「〜と思います」「〜でしょう」のような曖昧表現を避ける。
- 受験者の心理を煽る言葉 (絶対・必ず合格・楽勝など) を使わない。
- 関係ない試験 (危険物・電工 など) の引用を避ける。`;

const USER_PROMPT_1 = `topic: 三相交流電力 / subject: 理論
answerText(最終的な答え, 厳守): 30 kW
defaultStatement: 三相平衡負荷の有効電力を求めよ。
defaultSolution:
1. 三相有効電力 P = √3 × V × I × cosθ
2. P = √3 × 200 × 100 × 0.866
3. P ≈ 30000 W = 30 kW`;

const USER_PROMPT_2 = `topic: 単相2線式の電圧降下 / subject: 電力
answerText(最終的な答え, 厳守): 4 V
defaultStatement: 単相2線式の電圧降下を求めよ。
defaultSolution:
1. 電圧降下 e = 2 × I × (R cosθ + X sinθ)
2. e = 2 × 10 × (0.1 × 0.8 + 0.05 × 0.6)
3. e = 4 V`;

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface Snapshot {
  call: number;
  user_preview: string;
  usage: Usage;
}

function fmt(u: Usage): string {
  const i = u.input_tokens ?? 0;
  const c = u.cache_creation_input_tokens ?? 0;
  const r = u.cache_read_input_tokens ?? 0;
  const o = u.output_tokens ?? 0;
  return `input=${i} cache_creation=${c} cache_read=${r} output=${o}`;
}

async function callOnce(client: import("@anthropic-ai/sdk").default, user: string): Promise<Usage> {
  const res = await client.messages.create({
    model: process.env.DENKEN_NARRATE_MODEL ?? "claude-haiku-4-5",
    max_tokens: 256,
    system: [{ type: "text", text: CACHED_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  // The SDK exposes usage with cache_* fields when caching is in effect.
  return (res as { usage?: Usage }).usage ?? {};
}

async function main(): Promise<void> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const snapshots: Snapshot[] = [];

  // Call 1: should populate cache_creation_input_tokens.
  const u1 = await callOnce(client, USER_PROMPT_1);
  snapshots.push({ call: 1, user_preview: USER_PROMPT_1.split("\n")[0]!, usage: u1 });

  // Call 2: same system prompt → should hit cache (cache_read_input_tokens > 0).
  const u2 = await callOnce(client, USER_PROMPT_2);
  snapshots.push({ call: 2, user_preview: USER_PROMPT_2.split("\n")[0]!, usage: u2 });

  const cacheRead2 = u2.cache_read_input_tokens ?? 0;
  const verdict = cacheRead2 > 0 ? "PASS" : "FAIL";

  if (JSON_MODE) {
    console.log(
      JSON.stringify(
        {
          model: process.env.DENKEN_NARRATE_MODEL ?? "claude-haiku-4-5",
          verdict,
          calls: snapshots,
          note:
            verdict === "PASS"
              ? `cache hit confirmed (call#2 read ${cacheRead2} tokens from cache)`
              : "cache miss on call#2; system prompt may be below the model's cacheable minimum (1024 tokens for Haiku) or caching is disabled",
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`model: ${process.env.DENKEN_NARRATE_MODEL ?? "claude-haiku-4-5"}`);
    console.log(`call#1 (${snapshots[0]!.user_preview}): ${fmt(snapshots[0]!.usage)}`);
    console.log(`call#2 (${snapshots[1]!.user_preview}): ${fmt(snapshots[1]!.usage)}`);
    console.log(`verdict: ${verdict}`);
    if (verdict === "FAIL") {
      console.log(
        "note: cache_read=0 on call#2. The system prompt may be below the model's cacheable minimum (Haiku requires >=1024 tokens) or prompt caching is disabled for this account/region.",
      );
    }
  }

  process.exit(verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(`[check-prompt-cache] ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
