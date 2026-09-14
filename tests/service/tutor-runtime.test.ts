import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Env } from "../../site/environment.js";
import worker from "../../site/worker.js";
import catalog from "../../web/service/catalog.json";
import { testDatabase } from "./database.js";

let database: ReturnType<typeof testDatabase>;
beforeEach(() => {
  database = testDatabase();
});
afterEach(() => {
  database.close();
  vi.unstubAllGlobals();
});
const problem = catalog[0]!;
function call(path: string, env: Partial<Env>) {
  return worker.fetch(
    new Request(`https://example.test/api/${path}`, {
      method: path === "tutor" ? "POST" : "GET",
      headers: { "oai-authenticated-user-id": "owner", "content-type": "application/json" },
      ...(path === "tutor"
        ? {
            body: JSON.stringify({
              question: "説明して",
              problemId: problem.id,
              revision: problem.revision,
              reveal: true,
            }),
          }
        : {}),
    }),
    { DB: database.binding, ...env },
  );
}

it("keeps incomplete or mismatched AI configuration on the verified explanation without spending a request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const configurations: Partial<Env>[] = [
    {},
    { ANTHROPIC_API_KEY: "test-key" },
    { TUTOR_MODEL: "test-model", LLM_API_KEY: "test-key" },
    { TUTOR_MODEL: "test-model", TUTOR_PROVIDER: "compatible", ANTHROPIC_API_KEY: "test-key" },
    { TUTOR_MODEL: "test-model", TUTOR_PROVIDER: "compatible", LLM_API_KEY: "test-key", LLM_API_URL: "invalid" },
    {
      TUTOR_MODEL: "test-model",
      TUTOR_PROVIDER: "compatible",
      LLM_API_KEY: "test-key",
      LLM_API_URL: "http://example.test",
    },
    { TUTOR_MODEL: "test-model", TUTOR_PROVIDER: "unknown", ANTHROPIC_API_KEY: "test-key" },
  ];
  for (const env of configurations) {
    expect(await (await call("me", env)).json()).toMatchObject({ externalAI: false });
    expect(await (await call("admin/overview", env)).json()).toMatchObject({ runtime: { tutorConfigured: false } });
    expect(await (await call("tutor", env)).json()).toMatchObject({
      mode: "verified-explanation",
      answer: problem.solution.join("\n"),
      externalConfigured: false,
    });
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect((await database.binding.prepare("SELECT * FROM usage").all()).results).toHaveLength(0);
});

it("uses the selected provider's key and reports configured status consistently with the actual request", async () => {
  const text = JSON.stringify({
    explanation: problem.solution.join("\n"),
    sourceIds: [problem.id],
    calculations: [],
    held: false,
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      Response.json(
        String(url) === "https://api.anthropic.com/v1/messages"
          ? { content: [{ text }], usage: { input_tokens: 100, output_tokens: 50 } }
          : { choices: [{ message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 50 } },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const configurations: Partial<Env>[] = [
    { TUTOR_MODEL: "test-model", ANTHROPIC_API_KEY: "anthropic-test-key" },
    {
      TUTOR_MODEL: "test-model",
      TUTOR_PROVIDER: "compatible",
      LLM_API_KEY: "compatible-test-key",
      LLM_API_URL: "https://example.test/v1/chat/completions",
    },
  ];
  for (const env of configurations) {
    expect(await (await call("me", env)).json()).toMatchObject({ externalAI: true });
    expect(await (await call("tutor", env)).json()).toMatchObject({
      mode: "ai-suggestion",
      externalConfigured: true,
      held: false,
    });
  }
  expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("x-api-key")).toBe("anthropic-test-key");
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
    "https://api.anthropic.com/v1/messages",
    "https://example.test/v1/chat/completions",
  ]);
  expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer compatible-test-key");
  expect((await database.binding.prepare("SELECT * FROM usage").all()).results).toMatchObject([
    { requests: 2, input_tokens: 200, output_tokens: 100, in_flight: 0 },
  ]);
});
