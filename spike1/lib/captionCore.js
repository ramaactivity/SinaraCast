// Pembuat caption AI — sengaja dibuat netral terhadap penyedia (provider) supaya
// nanti saat SinaraCast sudah publik & ada pemasukan, pindah ke AI berbayar
// (mis. Claude) cukup ganti env CAPTION_PROVIDER, tanpa mengubah composer/route.
//
//   CAPTION_PROVIDER = gemini (default, gratis) | claude
//   GEMINI_API_KEY   = kunci dari Google AI Studio
//   GEMINI_MODEL     = opsional, default gemini-2.5-flash
//   ANTHROPIC_API_KEY / ANTHROPIC_MODEL = dipakai kalau provider = claude

const PROVIDER = (process.env.CAPTION_PROVIDER || "gemini").toLowerCase();

// True kalau provider aktif punya kunci — dipakai route untuk balas ramah
// "belum dikonfigurasi" alih-alih error mentah (pola sama seperti R2).
export function captionConfigured() {
  if (PROVIDER === "claude") return !!process.env.ANTHROPIC_API_KEY;
  return !!process.env.GEMINI_API_KEY; // gemini
}

const PLATFORM_LABEL = { instagram: "Instagram", tiktok: "TikTok" };
const TYPE_LABEL = { story: "Story", feed: "Feed", reels: "Reels", tiktok_video: "video TikTok" };
const TONE_GUIDE = {
  santai: "santai dan akrab, seperti ngobrol dengan teman",
  profesional: "rapi, sopan, dan meyakinkan",
  ceria: "ceria dan penuh semangat",
  jualan: "persuasif dan mendorong orang untuk bertindak (soft selling)",
};

// Aturan gaya yang dipakai semua mode — sesuai glosarium SinaraCast: bahasa manusia,
// tanpa jargon, dan tanpa tanda hubung panjang.
function styleRules() {
  return [
    "Pakai bahasa Indonesia sehari-hari yang natural dan enak dibaca.",
    "JANGAN gunakan tanda hubung panjang (—); pakai koma atau titik.",
    "Hindari klise berlebihan dan bahasa yang terlalu kaku.",
    "Akhiri dengan 3-6 tagar relevan di baris paling bawah.",
    "Balas HANYA caption jadinya, tanpa basa-basi, tanpa tanda kutip pembungkus, tanpa penjelasan.",
  ].join(" ");
}

const EMOJI_GUIDE = {
  tanpa: "Jangan gunakan emoji sama sekali.",
  sedikit: "Boleh 1-2 emoji bila cocok, jangan berlebihan.",
  banyak: "Boleh pakai emoji cukup banyak agar terasa ekspresif.",
};

// Ubah persona akun (jsonb tersimpan) jadi blok instruksi karakter. Inilah yang
// bikin pengguna tak perlu brief ulang: karakter akun sudah "diingat" di sini.
function personaBlock(persona) {
  if (!persona || typeof persona !== "object") return "";
  const L = [];
  if (persona.voice?.trim()) L.push(`Karakter & gaya bahasa akun ini: ${persona.voice.trim()}.`);
  if (persona.audience?.trim()) L.push(`Target pembaca: ${persona.audience.trim()}.`);
  if (persona.signature?.trim()) L.push(`Sisipkan ajakan/penutup khas bernuansa: ${persona.signature.trim()}.`);
  if (persona.avoid?.trim()) L.push(`Hindari: ${persona.avoid.trim()}.`);
  if (persona.hashtags?.trim()) L.push(`Utamakan memakai tagar khas akun ini bila relevan: ${persona.hashtags.trim()}.`);
  if (persona.emoji && EMOJI_GUIDE[persona.emoji]) L.push(EMOJI_GUIDE[persona.emoji]);
  return L.length ? ` Ikuti karakter tetap akun ini. ${L.join(" ")}` : "";
}

// Rakit instruksi. mode "polish" memoles draf pengguna; selain itu buat caption baru.
function buildPrompt({ mode, draft, instruction, tone, platform, postType, brandName, persona }) {
  const plat = PLATFORM_LABEL[platform] || "media sosial";
  const jenis = TYPE_LABEL[postType] || "postingan";
  const brand = brandName ? ` untuk akun "${brandName}"` : "";
  const arahan = instruction?.trim() ? ` Arahan tambahan dari pengguna kali ini: ${instruction.trim()}.` : "";
  const pblock = personaBlock(persona);
  // Persona jadi sumber gaya utama. Nada (tone) hanya dipakai kalau tak ada persona,
  // atau saat pengguna sengaja memilihnya sebagai penimpa sesaat.
  const gaya = pblock ? "" : ` Gaya bahasa: ${TONE_GUIDE[tone] || TONE_GUIDE.santai}.`;
  const head = `Kamu penulis caption media sosial berbahasa Indonesia yang jago dan natural. Postingan ini untuk ${plat} berjenis ${jenis}${brand}.${gaya}${pblock}`;
  // Aturan emoji: kalau persona sudah menentukan, jangan ulang; kalau tidak, default sedikit.
  const emojiRule = persona?.emoji && EMOJI_GUIDE[persona.emoji] ? "" : ` ${EMOJI_GUIDE.sedikit}`;
  const rules = `${styleRules()}${emojiRule}`;

  if (mode === "polish" && draft?.trim()) {
    return `${head}${arahan}\n\nBerikut caption yang sudah ditulis pengguna:\n"""\n${draft.trim()}\n"""\n\nPerbaiki, poles, dan buat lebih menarik caption di atas, TAPI pertahankan maksud, fakta, dan informasi aslinya (nama, harga, tanggal, promo jangan diubah). ${rules}`;
  }
  const dasar = draft?.trim()
    ? `Gunakan poin/ide berikut sebagai bahan: ${draft.trim()}.`
    : "Buat caption yang menarik dan relevan.";
  return `${head}${arahan} ${dasar} Jika ada gambar terlampir, perhatikan isinya sebagai inspirasi caption. ${rules}`;
}

// Ambil gambar dari URL publik dan ubah ke inline base64 — Gemini/Claude tidak
// menarik URL sendiri, jadi kita yang unduh. Video di-skip (caption dari arahan saja).
async function fetchImageInline(imageUrl) {
  if (!imageUrl) return null;
  if (/\.(mp4|mov|m4v)(\?|$)/i.test(imageUrl)) return null; // video: tak dikirim
  try {
    const r = await fetch(imageUrl);
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
    if (!/^image\//.test(ct)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return null; // aman untuk inline
    return { mimeType: ct, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function generateWithGemini(opts) {
  const key = process.env.GEMINI_API_KEY;
  // "latest" = alias stabil yang tersedia untuk akun baru & multimodal (baca gambar).
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts = [{ text: buildPrompt(opts) }];
  const img = await fetchImageInline(opts.imageUrl);
  if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        // thinkingBudget 0: matikan "mikir" model — caption tak perlu itu, dan tanpa ini
        // token kepakai buat berpikir sampai caption kepotong. maxOutputTokens dilonggarkan.
        generationConfig: { temperature: 0.9, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Gemini error ${res.status}`);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("AI tidak mengembalikan teks. Coba lagi.");
  return text;
}

async function generateWithClaude(opts) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const content = [{ type: "text", text: buildPrompt(opts) }];
  const img = await fetchImageInline(opts.imageUrl);
  if (img) content.unshift({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data } });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "user", content }] }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Claude error ${res.status}`);
  const text = (j?.content || []).map((b) => b.text || "").join("").trim();
  if (!text) throw new Error("AI tidak mengembalikan teks. Coba lagi.");
  return text;
}

// Titik masuk tunggal yang dipanggil route. Pilih provider dari env.
export async function generateCaption(opts) {
  if (PROVIDER === "claude") return generateWithClaude(opts);
  return generateWithGemini(opts);
}
