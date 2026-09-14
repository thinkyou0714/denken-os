export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const failure = (message: string, status = 400) => json({ error: message }, status);

export async function body(request: Request, max = 150000): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > max) throw new Error("入力の容量が上限を超えています");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > max) throw new Error("入力の容量が上限を超えています");
  return JSON.parse(text);
}
