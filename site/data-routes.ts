import { z } from "zod";
import { respondSupport, saveRubric } from "./admin.js";
import type { RecordRow } from "./db.js";
import type { Env } from "./environment.js";
import { body, failure, json } from "./http.js";
import { transcribe } from "./ocr.js";
import { importRecords, purgeExpiredAssets } from "./transfer.js";
export async function dataRoutes(request: Request, env: Env, userId: string, admin: boolean): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === "/api/assets" && request.method === "POST") {
    if (!env.BUCKET) return failure("画像の保存先が未設定です", 503);
    const mime = request.headers.get("content-type") ?? "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) return failure("PNG・JPEG・WebPを使用してください");
    if (Number(request.headers.get("content-length")) > 5_000_000) return failure("画像は5MB以内にしてください", 413);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > 5_000_000) return failure("画像は5MB以内にしてください", 413);
    const prefix = new Uint8Array(bytes);
    const valid =
      mime === "image/png"
        ? prefix[0] === 137 && prefix[1] === 80
        : mime === "image/jpeg"
          ? prefix[0] === 255 && prefix[1] === 216
          : new TextDecoder().decode(prefix.slice(0, 4)) === "RIFF" &&
            new TextDecoder().decode(prefix.slice(8, 12)) === "WEBP";
    if (!valid) return failure("画像ファイルを確認してください");
    const id = crypto.randomUUID(),
      key = `answers/${userId}/${id}`;
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
    try {
      await env.DB.prepare(
        "INSERT INTO assets(id,owner,object_key,mime,size,created_at,expires_at) VALUES(?,?,?,?,?,?,?)",
      )
        .bind(id, userId, key, mime, bytes.byteLength, Date.now(), Date.now() + 30 * 86400000)
        .run();
    } catch (e) {
      await env.BUCKET.delete(key);
      throw e;
    }
    return json({ id, url: `/api/assets/${id}`, expiresInDays: 30 }, 201);
  }
  if (path.startsWith("/api/assets/")) {
    const id = decodeURIComponent(path.slice(12));
    const asset = await env.DB.prepare("SELECT * FROM assets WHERE owner=? AND id=?")
      .bind(userId, id)
      .first<{ object_key: string; mime: string; expires_at: number }>();
    if (!asset || !env.BUCKET) return failure("画像がありません", 404);
    if (request.method === "DELETE" || asset.expires_at < Date.now()) {
      await env.BUCKET.delete(asset.object_key);
      await env.DB.prepare("DELETE FROM assets WHERE owner=? AND id=?").bind(userId, id).run();
      return request.method === "DELETE" ? json({ deleted: true }) : failure("画像の保存期限を過ぎました", 410);
    }
    const object = await env.BUCKET.get(asset.object_key);
    return object
      ? new Response(object.body, {
          headers: {
            "content-type": asset.mime,
            "cache-control": "private, no-store",
            "x-content-type-options": "nosniff",
          },
        })
      : failure("画像がありません", 404);
  }
  if (path === "/api/import" && request.method === "POST")
    return json(await importRecords(env.DB, userId, await body(request, 8_000_000)));
  if (path === "/api/ocr" && request.method === "POST") {
    const input = z.object({ assetId: z.string() }).parse(await body(request));
    return json(await transcribe(env, userId, input.assetId));
  }
  if (path === "/api/admin/purge" && request.method === "POST") {
    if (!admin) return failure("運営権限が必要です", 403);
    return json(await purgeExpiredAssets(env.DB, env.BUCKET));
  }
  if (path === "/api/admin/rubric" && request.method === "POST") {
    if (!admin) return failure("監修権限が必要です", 403);
    return json(await saveRubric(env.DB, userId, await body(request)), 201);
  }
  if (path === "/api/admin/support") {
    if (!admin) return failure("監修権限が必要です", 403);
    if (request.method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT owner,id,revision,body,updated_at FROM records WHERE kind='support' AND deleted=0 AND json_extract(body,'$.shareWithReviewer')=1 ORDER BY updated_at DESC LIMIT 500",
      ).all<RecordRow>();
      return json({ items: rows.results.map((r) => ({ ...r, body: JSON.parse(r.body) })) });
    }
    if (request.method === "POST") {
      const result = await respondSupport(env.DB, userId, await body(request));
      return result.conflict ? failure("別の操作で更新されています", 409) : json(result);
    }
  }
  if (path === "/api/export" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM records WHERE owner=?").bind(userId).all<RecordRow>();
    const events = await env.DB.prepare("SELECT body FROM attempts WHERE owner=? ORDER BY created_at")
      .bind(userId)
      .all<{ body: string }>();
    const files = await env.DB.prepare("SELECT id,mime,size,created_at,expires_at FROM assets WHERE owner=?")
      .bind(userId)
      .all();
    return json({
      app: "denken-os-service",
      version: 1,
      exportedAt: new Date().toISOString(),
      records: rows.results.map((r) => ({ ...r, owner: undefined, body: JSON.parse(r.body) })),
      attempts: events.results.map((r) => JSON.parse(r.body)),
      assets: files.results,
    });
  }
  if (path === "/api/account" && request.method === "DELETE") {
    const input = z.object({ confirm: z.literal("学習記録を削除") }).parse(await body(request));
    void input;
    const files = await env.DB.prepare("SELECT object_key FROM assets WHERE owner=?")
      .bind(userId)
      .all<{ object_key: string }>();
    for (const file of files.results) await env.BUCKET?.delete(file.object_key);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM records WHERE owner=?").bind(userId),
      env.DB.prepare("DELETE FROM attempts WHERE owner=?").bind(userId),
      env.DB.prepare("DELETE FROM assets WHERE owner=?").bind(userId),
      env.DB.prepare("DELETE FROM usage WHERE owner=?").bind(userId),
    ]);
    // Keep the ownership role so account deletion never reopens first-owner enrollment.
    return json({ deleted: true });
  }
  return null;
}
