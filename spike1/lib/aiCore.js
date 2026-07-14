// Engine AI bersama — dipakai fitur perencanaan konten (ide/konsep/script) dan bisa
// dipakai ulang fitur lain. Netral terhadap penyedia, sama seperti captionCore:
//   CAPTION_PROVIDER = gemini (default, gratis) | claude
// Menyediakan dua bentuk keluaran: teks bebas (aiText) dan JSON terstruktur (aiJson).

const PROVIDER = (process.env.CAPTION_PROVIDER || "gemini").toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export function aiConfigured() {
  if (PROVIDER === "claude") return !!process.env.ANTHROPIC_API_KEY;
  return !!process.env.GEMINI_API_KEY;
}

// Unduh gambar dari URL publik → inline base64 (Gemini/Claude tidak menarik URL).
async function fetchImageInline(imageUrl) {
  if (!imageUrl || /\.(mp4|mov|m4v)(\?|$)/i.test(imageUrl)) return null;
  try {
    const r = await fetch(imageUrl);
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
    if (!/^image\//.test(ct)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return null;
    return { mimeType: ct, data: buf.toString("base64") };
  } catch { return null; }
}

// ---- Gemini ----
async function geminiCall(prompt, { imageUrl, temperature = 0.9, maxTokens = 1200, schema } = {}) {
  const key = process.env.GEMINI_API_KEY;
  const parts = [{ text: prompt }];
  const img = await fetchImageInline(imageUrl);
  if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  const generationConfig = { temperature, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } };
  if (schema) { generationConfig.responseMimeType = "application/json"; generationConfig.responseSchema = schema; }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig }) }
  );
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Gemini error ${res.status}`);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("AI tidak mengembalikan hasil. Coba lagi.");
  return text;
}

// ---- Claude ----
async function claudeCall(prompt, { imageUrl, temperature = 0.9, maxTokens = 1200, schema } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  const content = [{ type: "text", text: schema ? `${prompt}\n\nBalas HANYA JSON valid sesuai struktur diminta, tanpa teks lain.` : prompt }];
  const img = await fetchImageInline(imageUrl);
  if (img) content.unshift({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data } });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, temperature, messages: [{ role: "user", content }] }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Claude error ${res.status}`);
  const text = (j?.content || []).map((b) => b.text || "").join("").trim();
  if (!text) throw new Error("AI tidak mengembalikan hasil. Coba lagi.");
  return text;
}

const call = (prompt, opts) => (PROVIDER === "claude" ? claudeCall(prompt, opts) : geminiCall(prompt, opts));

export async function aiText(prompt, opts = {}) {
  return call(prompt, opts);
}

// Kembalikan objek/array hasil parse. Gemini pakai responseSchema (paling andal);
// Claude diminta balas JSON lalu di-parse dengan pembersihan pagar ```.
export async function aiJson(prompt, schema, opts = {}) {
  const raw = await call(prompt, { ...opts, schema });
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Sisakan dari kurung pertama supaya toleran terhadap teks pengantar.
    const s = cleaned.search(/[[{]/);
    if (s >= 0) { try { return JSON.parse(cleaned.slice(s)); } catch { /* fallthrough */ } }
    throw new Error("AI mengembalikan format tak terduga. Coba lagi.");
  }
}
