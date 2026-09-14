import { z } from "zod";
import { type Problem, problemSchema } from "../lib/engine/schema.js";
import { validateProblem } from "../lib/engine/validate.js";
import { attemptSchema, gradePaper, learningMetrics, paperSchema } from "../lib/service/assessment.js";
import { gradeQuantity } from "../lib/service/quantities.js";
import { skillReviewSchedule } from "../lib/service/review-schedule.js";
import { entitlementActive } from "../lib/service/study-tools.js";
import baseCatalog from "../web/service/catalog.json";
import papersJson from "../web/service/papers.json";
import { calibration } from "./admin.js";
import { dataRoutes } from "./data-routes.js";
import { digest, logAudit, readRecords, writeRecord } from "./db.js";
import type { Env } from "./environment.js";
import { body, failure, json } from "./http.js";
import { authenticatedIdentity } from "./identity.js";

import { validLegacy } from "./transfer.js";
import { tutor, tutorConfigured } from "./tutor.js";

interface Member {
  id: string;
  role: string;
  status: string;
}
type CatalogueItem = Problem & { revision: string; family: string };
const papers = (papersJson as unknown[]).map((p) => paperSchema.parse(p));
const shipped: CatalogueItem[] = baseCatalog.map((p) => ({
  ...problemSchema.parse(p),
  revision: p.revision,
  family: p.family,
}));
const KINDS = new Set([
  "profile",
  "plan",
  "exam",
  "note",
  "cause",
  "experiment",
  "support",
  "law",
  "ingest",
  "rubric",
  "legacy",
  "interview",
  "correction",
  "entitlement",
  "skills",
  "feedback",
  "blueprint",
  "cost",
  "capacity",
  "voice",
  "holdout",
  "draft",
  "exam-result",
  "exam-archive",
]);
const ADMIN_KINDS = new Set(["law", "ingest", "rubric", "correction", "entitlement", "blueprint", "capacity"]);
async function member(env: Env, id: string): Promise<Member> {
  // Site is initially owner-private. Platform policy restricts the first visitor to its owner.
  // Subsequent visitors are students and cannot acquire the owner role.
  await env.DB.prepare(
    "INSERT INTO members(id,role,created_at,status) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM members WHERE role='owner') THEN 'student' ELSE 'owner' END,?,'active' WHERE NOT EXISTS(SELECT 1 FROM members WHERE id=?)",
  )
    .bind(id, Date.now(), id)
    .run();
  const result = await env.DB.prepare("SELECT id,role,status FROM members WHERE id=?").bind(id).first<Member>();
  if (!result) throw new Error("利用者情報を取得できません");
  return result;
}
async function catalogue(env: Env, history = false): Promise<CatalogueItem[]> {
  const base = shipped;
  const changes = await readRecords(env.DB, "catalog", "problem");
  const reviewRows = await env.DB.prepare(
    "SELECT target,fingerprint,decision,created_at FROM reviews ORDER BY created_at DESC LIMIT 10000",
  ).all<{ target: string; fingerprint: string; decision: string; created_at: number }>();
  const latest = new Map<string, string>();
  for (const review of reviewRows.results) {
    const key = `${review.target}@${review.fingerprint}`;
    if (!latest.has(key)) latest.set(key, review.decision);
  }
  const additions: CatalogueItem[] = [];
  for (const row of changes) {
    const p = row.body as CatalogueItem;
    if (latest.get(`${p.id}@${p.revision}`) === "approve") {
      const approved = problemSchema.safeParse({
        ...p,
        status: "published",
        validation: { ...p.validation, human_checked: true, supervisor_checked: true },
      });
      if (approved.success) additions.push({ ...approved.data, revision: p.revision, family: p.family });
    }
  }
  const all = [...additions, ...base].filter((p) => latest.get(`${p.id}@${p.revision}`) !== "retract");
  return history ? all : [...new Map(all.map((p) => [p.id, p] as const).reverse()).values()];
}
const recordInput = z.object({
  id: z.string().min(1).max(120),
  expectedRevision: z.number().int().nonnegative(),
  body: z.unknown(),
});
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === "/favicon.ico") return new Response(null, { status: 302, headers: { location: "/icon.svg" } });
  if (!path.startsWith("/api/"))
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
  if (!env.DB) return failure("学習記録の保存先に接続できません。入力を残したまま再試行してください。", 503);
  if (path === "/api/health" && request.method === "GET") {
    await env.DB.prepare("SELECT id FROM members LIMIT 1").first();
    return json({ ok: true, service: "denken-os", schema: 1, database: "ready" });
  }
  // Automation is a narrowly scoped, optional draft-ingestion capability only.
  if (path === "/api/automation/draft" && request.method === "POST") {
    if (!env.AUTOMATION_KEY || request.headers.get("authorization") !== `Bearer ${env.AUTOMATION_KEY}`)
      return failure("認証が必要です", 401);
    const value = z
      .object({
        url: z.url(),
        title: z.string().min(1).max(300),
        hash: z.string().min(1).max(128),
        kind: z.enum(["law", "paper"]),
        excerpt: z.string().max(20000).default(""),
      })
      .parse(await body(request));
    const host = new URL(value.url).hostname;
    if (!["www.shiken.or.jp", "www.meti.go.jp", "laws.e-gov.go.jp"].includes(host))
      return failure("公式の参照先だけを受け付けます");
    const key = await digest([value.url, value.hash]);
    const created = await writeRecord(env.DB, "catalog", "ingest", key, { ...value, status: "draft" }, 0);
    return json({ id: key, created, status: "draft" });
  }
  const authenticated = await authenticatedIdentity(request, env);
  if (!authenticated) return failure("本人確認が完了していません。ChatGPTでサインインし直してください。", 401);
  const userId = authenticated.id;
  const expectedOwner = request.headers.get("x-denken-owner");
  if (expectedOwner && expectedOwner !== userId)
    return failure("利用者が変わっています。保存待ちの内容を残したまま、元の利用者でサインインしてください。", 409);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return failure("同じサイトから操作してください", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site") return failure("同じサイトから操作してください", 403);
  }
  const me = await member(env, userId);
  if (me.status !== "active") return failure("このアカウントは利用停止中です", 403);
  const admin = me.role === "owner" || me.role === "reviewer";
  if (path === "/api/me" && request.method === "GET")
    return json({
      id: me.id,
      role: me.role,
      externalAI: tutorConfigured(env),
      imageStorage: !!env.BUCKET,
      authentication: authenticated.method,
    });
  const storedPapers =
    path === "/api/catalog" || path.startsWith("/api/exam/") ? await readRecords(env.DB, "catalog", "paper") : [];
  const paperVersions = [...storedPapers.map((r) => paperSchema.parse(r.body)), ...papers];
  if (path === "/api/admin/paper" && request.method === "POST") {
    if (!admin) return failure("監修権限が必要です", 403);
    const input = z
      .object({ paper: paperSchema, humanConfirmed: z.literal(true), reviewNotes: z.string().min(20) })
      .parse(await body(request));
    const paper = { ...input.paper, status: "reviewed" as const };
    for (const ref of [paper.questionPdf, paper.answerPdf]) {
      if (ref.startsWith("./service/official/")) continue;
      const target = new URL(ref);
      if (target.protocol !== "https:" || target.hostname !== "www.shiken.or.jp")
        return failure("公式PDFか保存済みの原典を指定してください");
    }
    const saved = await writeRecord(env.DB, "catalog", "paper", `${paper.id}@${paper.revision}`, paper, 0);
    if (!saved) return failure("同じ問題版は変更できません。新しい版を指定してください", 409);
    await logAudit(env.DB, userId, "paper:publish", paper.id, {
      revision: paper.revision,
      reviewNotes: input.reviewNotes,
    });
    return json({ id: paper.id, revision: paper.revision }, 201);
  }
  if (path === "/api/catalog" && request.method === "GET")
    return json({
      problems: await catalogue(env),
      papers: [...new Map(paperVersions.map((p) => [p.id, p] as const).reverse()).values()],
    });
  if (path === "/api/attempts" && request.method === "GET") {
    const cursor = Number(url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
    const rows = await env.DB.prepare(
      "SELECT id,body,created_at FROM attempts WHERE owner=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 2000",
    )
      .bind(userId, cursor, cursor, url.searchParams.get("beforeId") ?? "\uffff")
      .all<{ id: string; body: string; created_at: number }>();
    const items = rows.results.map((r) => JSON.parse(r.body));
    return json({
      items,
      nextBefore: rows.results.length === 2000 ? rows.results.at(-1)?.created_at : null,
      nextId: rows.results.length === 2000 ? rows.results.at(-1)?.id : null,
      metrics: learningMetrics(items),
    });
  }
  if (path === "/api/attempts" && request.method === "POST") {
    const candidate = attemptSchema.parse(await body(request));
    const prior = await env.DB.prepare("SELECT body FROM attempts WHERE owner=? AND id=?")
      .bind(userId, candidate.id)
      .first<{ body: string }>();
    if (prior) {
      const saved = JSON.parse(prior.body);
      if (
        saved.problemId !== candidate.problemId ||
        saved.revision !== candidate.revision ||
        saved.answer !== candidate.answer
      )
        return failure("答案IDが別の内容で使用されています", 409);
      return json({ attempt: saved, duplicate: true });
    }
    const known = (await catalogue(env, true)).find(
      (p) => p.id === candidate.problemId && p.revision === candidate.revision,
    );
    if (!known && candidate.mode !== "validation")
      return failure("この問題版を確認できません。答案は検証用として保存できます。", 409);
    let correct: boolean | null = null;
    if (known?.format === "multiple_choice") correct = known.answer === candidate.answer;
    else if (known?.format === "numeric")
      correct = gradeQuantity(
        candidate.answer,
        known.answer,
        known.grading ?? { unit: "", absolute: 1e-9, relative: 0.005, requireUnit: false, accepted: [] },
      ).correct;
    const attempt = {
      ...candidate,
      correct,
      score: correct === null ? null : correct ? 1 : 0,
      family: known?.topic ?? candidate.family,
      topic: known?.topic ?? candidate.topic,
      subject: known?.subject ?? candidate.subject,
      graderVersion: "service-1",
    };
    const existing = await env.DB.prepare("SELECT body FROM attempts WHERE owner=? AND id=?")
      .bind(userId, attempt.id)
      .first<{ body: string }>();
    if (existing) {
      const saved = JSON.parse(existing.body);
      if (
        saved.problemId !== attempt.problemId ||
        saved.revision !== attempt.revision ||
        saved.answer !== attempt.answer
      )
        return failure("答案IDが別の内容で使用されています", 409);
      return json({ attempt: saved, duplicate: true });
    }
    const inserted = await env.DB.prepare(
      "INSERT INTO attempts(owner,id,problem_id,revision,family,mode,body,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO NOTHING",
    )
      .bind(
        userId,
        attempt.id,
        attempt.problemId,
        attempt.revision,
        attempt.family,
        attempt.mode,
        JSON.stringify(attempt),
        attempt.finishedAt,
      )
      .run();
    if (!inserted.meta.changes) {
      const row = await env.DB.prepare("SELECT body FROM attempts WHERE owner=? AND id=?")
        .bind(userId, attempt.id)
        .first<{ body: string }>();
      if (!row) return failure("保存状態を再確認してください", 409);
      const saved = JSON.parse(row.body);
      if (
        saved.problemId !== attempt.problemId ||
        saved.revision !== attempt.revision ||
        saved.answer !== attempt.answer
      )
        return failure("答案IDが競合しています", 409);
      return json({ attempt: saved, duplicate: true });
    }
    return json({ attempt, duplicate: false }, 201);
  }
  if (path === "/api/skills" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT body FROM attempts WHERE owner=? ORDER BY created_at LIMIT 20000")
      .bind(userId)
      .all<{ body: string }>();
    return json({ items: skillReviewSchedule(rows.results.map((r) => attemptSchema.parse(JSON.parse(r.body)))) });
  }
  if (path.startsWith("/api/records/")) {
    const kind = decodeURIComponent(path.slice("/api/records/".length));
    if (!KINDS.has(kind)) return failure("記録の種類が不明です", 404);
    const shared = ADMIN_KINDS.has(kind),
      owner = shared ? "catalog" : userId;
    if (request.method === "GET") return json({ items: await readRecords(env.DB, owner, kind) });
    if (shared && !admin) return failure("監修・運営権限が必要です", 403);
    if (request.method === "POST") {
      const input = recordInput.parse(await body(request, kind === "legacy" ? 2_000_000 : 150000));
      if (kind === "exam-result" || kind === "exam-archive") return failure("提出済み答案は変更できません", 403);
      if (kind === "exam") {
        const existing = await env.DB.prepare(
          "SELECT body FROM records WHERE owner=? AND kind='exam' AND id=? AND deleted=0",
        )
          .bind(userId, input.id)
          .first<{ body: string }>();
        if (!existing) return failure("模試は開始操作から作成してください", 409);
        const previous = JSON.parse(existing.body) as {
          paperId: string;
          revision: string;
          startedAt: number;
          deadline: number;
          mode: string;
          finished?: boolean;
        };
        if (previous.finished) return failure("提出済みの答案は変更できません", 409);
        if (previous.mode === "exam" && Date.now() > previous.deadline)
          return failure("制限時間を過ぎました。保存済みの答案を提出してください", 409);
        const edits = z
          .object({
            answers: z.record(z.string(), z.string()),
            selected: z.array(z.string()),
            visited: z.array(z.object({ group: z.string(), at: z.number() })).default([]),
            reasons: z.record(z.string(), z.string()).default({}),
            flagged: z.array(z.string()).max(200).default([]),
          })
          .parse(input.body);
        input.body = { ...previous, ...edits };
      }
      if (kind === "legacy" && !validLegacy(input.body)) return failure("秘密情報や不正な形式は保存できません");
      const saved = await writeRecord(env.DB, owner, kind, input.id, input.body, input.expectedRevision);
      if (!saved) return failure("別の操作で更新されています。最新の記録と入力内容を比較してください。", 409);
      if (shared) await logAudit(env.DB, userId, `write:${kind}`, input.id, { revision: input.expectedRevision + 1 });
      return json({ id: input.id, revision: input.expectedRevision + 1 }, 201);
    }
    if (request.method === "DELETE") {
      const input = z
        .object({ id: z.string(), expectedRevision: z.number().int().positive() })
        .parse(await body(request));
      const deleted = await env.DB.prepare(
        "UPDATE records SET deleted=1,revision=revision+1,updated_at=? WHERE owner=? AND kind=? AND id=? AND revision=? AND deleted=0",
      )
        .bind(Date.now(), owner, kind, input.id, input.expectedRevision)
        .run();
      return deleted.meta.changes ? json({ deleted: true }) : failure("別の操作で更新されています", 409);
    }
  }
  if (path === "/api/exam/start" && request.method === "POST") {
    const input = z.object({ paperId: z.string(), mode: z.enum(["practice", "exam"]) }).parse(await body(request));
    const paper = paperVersions.find((p) => p.id === input.paperId);
    if (!paper) return failure("試験が見つかりません", 404);
    const session = {
      paperId: paper.id,
      revision: paper.revision,
      mode: input.mode,
      startedAt: Date.now(),
      deadline: Date.now() + paper.durationMinutes * 60000,
      answers: {},
      selected: [],
      visited: [],
      reasons: {},
    };
    const id = crypto.randomUUID();
    await writeRecord(env.DB, userId, "exam", id, session, 0);
    return json({ id, revision: 1, body: session }, 201);
  }
  if (path === "/api/exam/grade" && request.method === "POST") {
    const input = z
      .object({
        paperId: z.string(),
        revision: z.string(),
        answers: z.record(z.string(), z.string()),
        selected: z.array(z.string()),
        sessionId: z.string(),
      })
      .parse(await body(request));
    const paper = paperVersions.find((p) => p.id === input.paperId && p.revision === input.revision);
    if (!paper) return failure("試験の版を確認できません", 409);
    const stored = await env.DB.prepare("SELECT body FROM records WHERE owner=? AND kind='exam' AND id=? AND deleted=0")
      .bind(userId, input.sessionId)
      .first<{ body: string }>();
    if (!stored) return failure("保存済みの模試がありません", 404);
    const session = JSON.parse(stored.body) as {
      paperId: string;
      revision: string;
      answers: Record<string, string>;
      selected: string[];
      deadline: number;
      mode: string;
    };
    if (session.paperId !== paper.id || session.revision !== paper.revision)
      return failure("模試の版が一致しません", 409);
    const result = gradePaper(paper, session.answers, session.selected);
    const saved = await writeRecord(
      env.DB,
      userId,
      "exam-result",
      input.sessionId,
      {
        paperId: paper.id,
        revision: paper.revision,
        sessionId: input.sessionId,
        answers: session.answers,
        selected: session.selected,
        result,
        gradedAt: Date.now(),
      },
      0,
    );
    await env.DB.prepare(
      "UPDATE records SET body=json_set(body,'$.finished',json('true')),revision=revision+1,updated_at=? WHERE owner=? AND kind='exam' AND id=? AND json_extract(body,'$.finished') IS NOT 1",
    )
      .bind(Date.now(), userId, input.sessionId)
      .run();
    if (!saved) {
      const previous = await env.DB.prepare("SELECT body FROM records WHERE owner=? AND kind='exam-result' AND id=?")
        .bind(userId, input.sessionId)
        .first<{ body: string }>();
      return json(previous ? JSON.parse(previous.body) : { error: "結果を取得できません" });
    }
    return json({ result, gradedAt: Date.now(), expired: session.mode === "exam" && Date.now() > session.deadline });
  }
  if (path === "/api/tutor" && request.method === "POST") {
    const input = z
      .object({
        question: z.string().min(1).max(4000),
        problemId: z.string().optional(),
        revision: z.string().optional(),
        level: z.number().int().min(0).max(20).default(0),
        reveal: z.boolean().default(false),
      })
      .parse(await body(request));
    const problem = (await catalogue(env)).find(
      (p) => p.id === input.problemId && (!input.revision || p.revision === input.revision),
    );
    if (env.REQUIRE_TUTOR_ENTITLEMENT === "true") {
      const grant = await env.DB.prepare(
        "SELECT body FROM records WHERE owner='catalog' AND kind='entitlement' AND id=? AND deleted=0",
      )
        .bind(userId)
        .first<{ body: string }>();
      if (!entitlementActive(grant ? JSON.parse(grant.body) : null))
        return failure("このAI機能を利用できる会員権限がありません", 403);
    }
    return json(
      await tutor(env, userId, { question: input.question, problem, level: input.level, reveal: input.reveal }),
    );
  }
  if (path === "/api/content" && request.method === "GET") {
    if (!admin) return failure("監修権限が必要です", 403);
    return json({ items: await readRecords(env.DB, "catalog", "problem") });
  }
  if (path === "/api/content" && request.method === "POST") {
    if (!admin) return failure("監修権限が必要です", 403);
    const raw = await body(request),
      problem = problemSchema.parse(raw);
    const draft = {
      ...problem,
      status: "draft" as const,
      validation: { ...problem.validation, human_checked: false, supervisor_checked: false },
    };
    const errors = validateProblem(draft);
    if (!errors.ok) return json({ error: "問題の機械検証に失敗しました", details: errors.issues }, 422);
    const fingerprint = await digest(draft),
      candidate = { ...draft, revision: fingerprint, family: draft.topic };
    await writeRecord(env.DB, "catalog", "problem", `${draft.id}@${fingerprint}`, candidate, 0);
    await logAudit(env.DB, userId, "content:draft", draft.id, { fingerprint });
    return json({ problem: candidate }, 201);
  }
  if (path === "/api/reviews" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 2000").all();
    return json({ items: rows.results });
  }
  if (path === "/api/reviews" && request.method === "POST") {
    if (!admin) return failure("監修権限が必要です", 403);
    const review = z
      .object({
        target: z.string(),
        fingerprint: z.string(),
        decision: z.enum(["approve", "hold", "reject", "retract"]),
        reason: z.string().min(10).max(4000),
        cases: z.array(z.object({ name: z.string().min(1), result: z.string().min(1) })).min(1),
        humanConfirmed: z.literal(true),
      })
      .parse(await body(request));
    const draft = await env.DB.prepare(
      "SELECT body FROM records WHERE owner='catalog' AND kind='problem' AND id=? AND deleted=0",
    )
      .bind(`${review.target}@${review.fingerprint}`)
      .first<{ body: string }>();
    const existing = shipped.find((p) => p.id === review.target && p.revision === review.fingerprint);
    if (!draft && !existing) return failure("審査対象の版がありません", 409);
    if (review.decision === "approve" && review.cases.length < 3)
      return failure("代表例・境界条件・反例の確認結果を記録してください");
    if (review.decision === "approve") {
      const p = draft ? JSON.parse(draft.body) : existing;
      const checked = problemSchema.safeParse({
        ...p,
        status: "published",
        validation: { ...p.validation, human_checked: true, supervisor_checked: true },
      });
      if (!checked.success || !validateProblem(checked.data).ok)
        return failure("計算・解の品質・物理条件の機械検証が完了していません", 422);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO reviews(id,target,fingerprint,decision,reviewer,reason,cases,created_at) VALUES(?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        review.target,
        review.fingerprint,
        review.decision,
        userId,
        review.reason,
        JSON.stringify(review.cases),
        Date.now(),
      )
      .run();
    await logAudit(env.DB, userId, `review:${review.decision}`, review.target, { fingerprint: review.fingerprint });
    return json({ id }, 201);
  }
  const dataResponse = await dataRoutes(request, env, userId, admin);
  if (dataResponse) return dataResponse;
  if (path === "/api/admin/overview" && request.method === "GET") {
    if (!admin) return failure("運営権限が必要です", 403);
    const users = await env.DB.prepare("SELECT id,role,status,created_at FROM members ORDER BY created_at").all();
    const logs = await env.DB.prepare("SELECT * FROM audit ORDER BY created_at DESC LIMIT 200").all();
    const costs = await env.DB.prepare(
      "SELECT day,kind,SUM(requests) AS requests,SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens FROM usage GROUP BY day,kind ORDER BY day DESC LIMIT 90",
    ).all();
    return json({
      members: users.results,
      runtime: {
        checkedAt: Date.now(),
        database: "ready",
        authentication: authenticated.method,
        tutorConfigured: tutorConfigured(env),
        ocrConfigured: !!(env.BUCKET && env.ANTHROPIC_API_KEY && env.TUTOR_MODEL),
        imageStorage: !!env.BUCKET,
        automationConfigured: !!env.AUTOMATION_KEY,
      },
      audit: logs.results,
      usage: costs.results,
      calibration: await calibration(env.DB),
      ingest: await readRecords(env.DB, "catalog", "ingest"),
    });
  }
  if (path === "/api/admin/member" && request.method === "POST") {
    if (me.role !== "owner") return failure("所有者の権限が必要です", 403);
    const input = z
      .object({ id: z.string(), role: z.enum(["student", "reviewer"]), status: z.enum(["active", "suspended"]) })
      .parse(await body(request));
    if (input.id === userId) return failure("自身の所有者権限は変更できません");
    await env.DB.prepare("UPDATE members SET role=?,status=? WHERE id=? AND role!='owner'")
      .bind(input.role, input.status, input.id)
      .run();
    await logAudit(env.DB, userId, "member:update", input.id, input);
    return json({ updated: true });
  }
  return failure("この操作には対応していません", 404);
}
export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof z.ZodError)
        return json({ error: "入力内容を確認してください", details: error.issues.map((i) => i.message) }, 422);
      console.error("DENKEN request failed", error instanceof Error ? error.name : "unknown");
      return failure(
        error instanceof SyntaxError
          ? "JSONの形式を確認してください"
          : "処理を完了できません。入力を残したまま再試行してください。",
        503,
      );
    }
  },
};
