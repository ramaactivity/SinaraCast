// Studio Konten → SinaraCast: validation for posts pushed from the Studio Konten repo
// (finished designs/videos become a draft or a scheduled post). Pure, so it is unit-tested.

const VIDEO = new Set(["mp4", "mov"]);
const IMAGE = new Set(["jpg", "jpeg", "png", "webp"]);
export const STUDIO_EXT = { mp4: "video/mp4", mov: "video/quicktime", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Instagram only accepts JPEG for image_url, so images must arrive as jpg.
const igImage = (f) => f === "jpg" || f === "jpeg";

// Returns an error string, or null when the post can be created.
export function checkStudioPost(p, now = new Date()) {
  if (!p || typeof p !== "object") return "Data postingan kosong";
  if (!["story", "feed", "reels"].includes(p.post_type)) return "Jenis postingan harus story, feed, atau reels";
  if (!["draft", "scheduled"].includes(p.status)) return "Status harus draft atau scheduled";
  const media = Array.isArray(p.media) ? p.media : [];
  if (!media.length) return "Tidak ada media";
  for (const m of media) {
    if (typeof m?.url !== "string" || !/^https:\/\//.test(m.url)) return "URL media tidak valid";
    if (!IMAGE.has(m.format) && !VIDEO.has(m.format)) return `Format ${m.format} tidak didukung`;
  }
  const videos = media.filter((m) => VIDEO.has(m.format)).length;
  if (p.post_type === "feed") {
    if (media.length > 10) return "Carousel maksimal 10 slide";
    if (videos) return "Feed dari Studio Konten hanya gambar (video pakai reels)";
    if (!media.every((m) => igImage(m.format))) return "Gambar feed harus JPG (syarat Instagram)";
  }
  if (p.post_type === "story" && media.length !== 1) return "Story satu media per postingan";
  if (p.post_type === "story" && !videos && !igImage(media[0].format)) return "Gambar story harus JPG (syarat Instagram)";
  if (p.post_type === "reels" && (media.length !== 1 || videos !== 1)) return "Reels butuh tepat satu video";
  if (p.caption != null && String(p.caption).length > 2200) return "Caption lebih dari 2.200 karakter";
  const tags = String(p.caption ?? "").match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
  if (tags > 30) return `Hashtag ${tags}, maksimal 30 (syarat Instagram)`;
  if (p.status === "scheduled") {
    const t = Date.parse(p.scheduled_at || "");
    if (!Number.isFinite(t)) return "Jadwal (scheduled_at) wajib untuk status scheduled";
    if (t < now.getTime() + 2 * 60 * 1000) return "Jadwal minimal 2 menit dari sekarang";
  }
  return null;
}
