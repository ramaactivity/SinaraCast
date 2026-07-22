import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { r2Configured, presignR2Put, r2PublicUrl } from "../../../../lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// ALL media now lives on R2 (egress-free), not just large videos — so images
// are allowed here too. Keep this to real, known media types.
const ALLOWED = { mp4: "video/mp4", mov: "video/quicktime", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
// Folder segment must be a plain slug so callers can't inject path traversal.
const safeFolder = (f) => (typeof f === "string" && /^[a-z0-9-]{1,40}$/.test(f) ? f : "");

// Presign a direct browser→R2 upload for any media file. Auth: signed-in user.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    if (!r2Configured()) {
      return NextResponse.json({ ok: false, error: "Penyimpanan media (R2) belum dikonfigurasi." }, { status: 501 });
    }
    const { ext, folder } = await request.json().catch(() => ({}));
    const contentType = ALLOWED[ext];
    if (!contentType) return NextResponse.json({ ok: false, error: "Format berkas tidak didukung" }, { status: 400 });

    const seg = safeFolder(folder);
    const key = `${ures.user.id}/${seg ? seg + "/" : ""}${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await presignR2Put(key, contentType);
    return NextResponse.json({ ok: true, uploadUrl, publicUrl: r2PublicUrl(key), contentType });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
