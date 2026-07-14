import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const pick = (html, res) => {
  for (const re of res) { const m = html.match(re); if (m?.[1]) return decode(m[1].trim()); }
  return "";
};
function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}
// Ambil pratinjau tautan (Open Graph): judul + gambar + deskripsi. Best-effort —
// beberapa situs (mis. Instagram tanpa login) membatasi, jadi hasil bisa kosong.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const { url } = await request.json().catch(() => ({}));
    if (!url || !/^https?:\/\//i.test(url)) return NextResponse.json({ ok: false, error: "URL tidak valid" }, { status: 400 });

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SinaraCastBot/1.0; +https://sinara-cast.vercel.app)", "Accept": "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `Tidak bisa membuka tautan (${res.status})` }, { status: 200 });
    const html = (await res.text()).slice(0, 400_000); // batasi

    const title = pick(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);
    let image = pick(html, [
      /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);
    const description = pick(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);
    if (image && image.startsWith("//")) image = "https:" + image;

    let siteName = pick(html, [/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i]);
    if (!siteName) { try { siteName = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ } }

    return NextResponse.json({ ok: true, title, image, description, siteName });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}
