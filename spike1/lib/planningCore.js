// Perencanaan konten berbantuan AI: ide batch, konsep+hook, dan naskah/script.
// Selalu mengikuti "karakter akun" (persona) bila ada, jadi hasilnya on-brand.
import { aiText, aiJson, aiConfigured } from "./aiCore";

export { aiConfigured as planningConfigured };

const PLATFORM_LABEL = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X (Twitter)", threads: "Threads", facebook: "Facebook" };
const FORMAT_LABEL = { story: "Story", feed: "Feed", reels: "Reels", carousel: "Carousel", video: "Video", single_image: "Gambar tunggal", thread: "Thread" };
const GOAL_LABEL = { awareness: "Awareness", engagement: "Engagement", conversion: "Konversi", traffic: "Traffic", retention: "Retensi", other: "Lainnya" };
const FORMAT_ENUM = Object.keys(FORMAT_LABEL);

// Blok karakter akun — sama semangatnya dengan captionCore, agar seluruh output on-brand.
function personaText(persona) {
  if (!persona || typeof persona !== "object") return "";
  const L = [];
  if (persona.voice?.trim()) L.push(`Karakter & gaya bahasa akun: ${persona.voice.trim()}.`);
  if (persona.audience?.trim()) L.push(`Target pembaca: ${persona.audience.trim()}.`);
  if (persona.signature?.trim()) L.push(`Ciri khas/ajakan: ${persona.signature.trim()}.`);
  if (persona.avoid?.trim()) L.push(`Hindari: ${persona.avoid.trim()}.`);
  return L.length ? ` ${L.join(" ")}` : "";
}

const NO_DASH = "Pakai bahasa Indonesia yang natural, JANGAN gunakan tanda hubung panjang (—).";

function ctx({ brandName, platform, persona }) {
  const plat = PLATFORM_LABEL[platform] || "media sosial";
  const brand = brandName ? ` untuk akun/brand "${brandName}"` : "";
  return `Konten media sosial di ${plat}${brand}.${personaText(persona)}`;
}

// 1) IDE BATCH — daftar ide konten siap dijadikan entri rencana.
export async function generateIdeas({ brandName, platform, persona, pillars, goal, count = 8, seed }) {
  const n = Math.min(Math.max(parseInt(count, 10) || 8, 3), 20);
  const guide = [
    pillars?.trim() ? `Sebar ke pilar konten ini bila cocok: ${pillars.trim()}.` : "Variasikan pilar konten (edukasi, promosi, hiburan, testimoni, di balik layar, dsb).",
    goal ? `Utamakan mendukung tujuan: ${GOAL_LABEL[goal] || goal}.` : "",
    seed?.trim() ? `Kembangkan dari arahan/tema ini: ${seed.trim()}.` : "",
  ].filter(Boolean).join(" ");
  const prompt = `Kamu perencana konten media sosial berpengalaman. ${ctx({ brandName, platform, persona })} Buat ${n} ide konten yang beragam, spesifik, dan layak tayang. ${guide} Untuk tiap ide beri: judul singkat menarik (title), pilar (pillar), tipe konten (contentType, mis. Edukasi/Promosi/Hiburan), format paling cocok (format), tujuan (goal), dan satu kalimat angle/sudut pandang (angle). ${NO_DASH}`;
  const schema = {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            pillar: { type: "string" },
            contentType: { type: "string" },
            format: { type: "string", enum: FORMAT_ENUM },
            goal: { type: "string", enum: Object.keys(GOAL_LABEL) },
            angle: { type: "string" },
          },
          required: ["title", "angle"],
        },
      },
    },
    required: ["ideas"],
  };
  const out = await aiJson(prompt, schema, { temperature: 1.0, maxTokens: 2200 });
  const ideas = Array.isArray(out) ? out : out?.ideas || [];
  return ideas.slice(0, n).map((i) => ({
    title: (i.title || "").trim(),
    pillar: (i.pillar || "").trim(),
    contentType: (i.contentType || "").trim(),
    format: FORMAT_ENUM.includes(i.format) ? i.format : "",
    goal: Object.keys(GOAL_LABEL).includes(i.goal) ? i.goal : "",
    angle: (i.angle || "").trim(),
  })).filter((i) => i.title);
}

// 2) KONSEP + HOOK — untuk satu konten. Mengisi hook, konsep (notes), format, jam.
export async function generateConcept({ brandName, platform, persona, title, pillar, format, goal, seed }) {
  const detail = [
    title?.trim() ? `Judul/tema: ${title.trim()}.` : "",
    pillar?.trim() ? `Pilar: ${pillar.trim()}.` : "",
    format ? `Format: ${FORMAT_LABEL[format] || format}.` : "",
    goal ? `Tujuan: ${GOAL_LABEL[goal] || goal}.` : "",
    seed?.trim() ? `Arahan tambahan: ${seed.trim()}.` : "",
  ].filter(Boolean).join(" ");
  const prompt = `Kamu perencana konten media sosial. ${ctx({ brandName, platform, persona })} ${detail || "Buat konsep konten baru yang relevan."} Kembangkan menjadi konsep matang. ${NO_DASH} Beri: konsep/deskripsi eksekusi 2-4 kalimat (concept), 1 kalimat hook/teks cover yang bikin berhenti scroll (hook), 3 saran ide visual singkat (visualIdeas), format paling pas (format), dan jam tayang WIB yang disarankan (bestTime, format "HH:MM").`;
  const schema = {
    type: "object",
    properties: {
      concept: { type: "string" },
      hook: { type: "string" },
      visualIdeas: { type: "array", items: { type: "string" } },
      format: { type: "string", enum: FORMAT_ENUM },
      bestTime: { type: "string" },
    },
    required: ["concept", "hook"],
  };
  const out = await aiJson(prompt, schema, { temperature: 0.9, maxTokens: 1200 });
  return {
    concept: (out.concept || "").trim(),
    hook: (out.hook || "").trim(),
    visualIdeas: Array.isArray(out.visualIdeas) ? out.visualIdeas.filter(Boolean) : [],
    format: FORMAT_ENUM.includes(out.format) ? out.format : (format || ""),
    bestTime: /^\d{1,2}:\d{2}$/.test(out.bestTime || "") ? out.bestTime : "",
  };
}

// 3) NASKAH / SCRIPT — teks siap tempel. Reels/video: hook-isi-CTA per adegan;
// carousel: outline per slide; lainnya: struktur ringkas. Dikembalikan sebagai teks.
export async function generateScript({ brandName, platform, persona, title, format, hook, goal, seed }) {
  const f = format || "reels";
  const shape = (f === "reels" || f === "video" || f === "story")
    ? "Susun sebagai naskah video vertikal: bagi per ADEGAN (Scene 1, 2, 3…). Tiap adegan tulis: [Visual] apa yang tampak, [Voiceover/Teks] kata-kata di layar/narasi, dan durasi perkiraan. Mulai dengan hook 3 detik pertama, akhiri dengan CTA jelas."
    : (f === "carousel")
      ? "Susun sebagai outline carousel: Slide 1 (hook/cover) sampai slide penutup (CTA). Tiap slide tulis judul slide + isi singkat."
      : "Susun sebagai struktur ringkas: Hook, Isi (poin-poin), lalu CTA.";
  const detail = [title?.trim() ? `Judul/tema: ${title.trim()}.` : "", hook?.trim() ? `Hook: ${hook.trim()}.` : "", goal ? `Tujuan: ${GOAL_LABEL[goal] || goal}.` : "", seed?.trim() ? `Arahan: ${seed.trim()}.` : ""].filter(Boolean).join(" ");
  const prompt = `Kamu penulis naskah konten media sosial. ${ctx({ brandName, platform, persona })} Format: ${FORMAT_LABEL[f] || f}. ${detail} Tulis naskah/script lengkap yang siap diproduksi. ${shape} ${NO_DASH} Balas HANYA naskahnya, tanpa basa-basi pembuka.`;
  return (await aiText(prompt, { temperature: 0.85, maxTokens: 1600 })).trim();
}

// 5) STORYBOARD — pecah konsep/script jadi frame per adegan (deskripsi visual +
// narasi/teks di layar + durasi). Untuk video/reels/story; carousel = per slide.
export async function generateStoryboard({ brandName, platform, persona, title, format, hook, script, concept, goal, seed }) {
  const f = format || "reels";
  const isSlides = f === "carousel" || f === "feed";
  const unit = isSlides ? "slide" : "adegan";
  const basis = [
    title?.trim() ? `Judul: ${title.trim()}.` : "",
    hook?.trim() ? `Hook: ${hook.trim()}.` : "",
    concept?.trim() ? `Konsep: ${concept.trim()}.` : "",
    script?.trim() ? `Naskah yang sudah ada (jadikan acuan utama):\n${script.trim()}` : "",
    goal ? `Tujuan: ${GOAL_LABEL[goal] || goal}.` : "",
    seed?.trim() ? `Arahan: ${seed.trim()}.` : "",
  ].filter(Boolean).join("\n");
  const prompt = `Kamu storyboard artist konten media sosial. ${ctx({ brandName, platform, persona })} Format: ${FORMAT_LABEL[f] || f}.\n${basis || "Buat storyboard konten baru yang relevan."}\n\nPecah menjadi 4-7 ${unit} berurutan. Untuk tiap ${unit} isi: nomor urut (scene), deskripsi VISUAL yang tampak/komposisi shot (visual), teks di layar atau voiceover singkat (voiceover), dan perkiraan durasi detik untuk video (duration, kosongkan untuk slide). Mulai dengan hook kuat di ${unit} pertama dan akhiri dengan CTA. ${NO_DASH}`;
  const schema = {
    type: "object",
    properties: {
      frames: {
        type: "array",
        items: {
          type: "object",
          properties: {
            scene: { type: "integer" },
            visual: { type: "string" },
            voiceover: { type: "string" },
            duration: { type: "string" },
          },
          required: ["visual"],
        },
      },
    },
    required: ["frames"],
  };
  const out = await aiJson(prompt, schema, { temperature: 0.85, maxTokens: 2000 });
  const frames = Array.isArray(out) ? out : out?.frames || [];
  return frames.map((fr, i) => ({
    scene: Number.isFinite(fr.scene) ? fr.scene : i + 1,
    visual: (fr.visual || "").trim(),
    voiceover: (fr.voiceover || "").trim(),
    duration: (fr.duration || "").toString().trim(),
  })).filter((fr) => fr.visual);
}

// 4) ANALISA GAMBAR REFERENSI — lihat gambar contoh/inspirasi, jelaskan kenapa
// bagus + cara adaptasi ke brand + beberapa ide konten turunannya.
export async function analyzeReference({ brandName, platform, persona, imageUrl, note }) {
  const extra = note?.trim() ? ` Catatan pengguna soal referensi ini: ${note.trim()}.` : "";
  const prompt = `Kamu direktur kreatif media sosial. ${ctx({ brandName, platform, persona })} Perhatikan GAMBAR referensi/inspirasi yang terlampir.${extra} Analisa gambar itu dan beri: 3-5 alasan kenapa konten ini menarik/berhasil (whyGood), 3-5 langkah konkret cara mengadaptasinya untuk brand ini tanpa menjiplak (adaptation), dan 3 ide konten turunan (contentIdeas: judul singkat tiap ide). ${NO_DASH}`;
  const schema = {
    type: "object",
    properties: {
      whyGood: { type: "array", items: { type: "string" } },
      adaptation: { type: "array", items: { type: "string" } },
      contentIdeas: { type: "array", items: { type: "string" } },
    },
    required: ["whyGood", "adaptation"],
  };
  const out = await aiJson(prompt, schema, { imageUrl, temperature: 0.8, maxTokens: 1400 });
  return {
    whyGood: Array.isArray(out.whyGood) ? out.whyGood.filter(Boolean) : [],
    adaptation: Array.isArray(out.adaptation) ? out.adaptation.filter(Boolean) : [],
    contentIdeas: Array.isArray(out.contentIdeas) ? out.contentIdeas.filter(Boolean) : [],
  };
}
