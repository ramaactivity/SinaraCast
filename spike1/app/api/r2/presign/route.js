import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { r2Configured, presignR2Put, r2PublicUrl } from "../../../../lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ALLOWED = { mp4: "video/mp4", mov: "video/quicktime" };

// Presign a direct browser→R2 upload for a large video. Auth: signed-in user.
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    if (!r2Configured()) {
      return NextResponse.json({ ok: false, error: "Penyimpanan video besar belum dikonfigurasi (R2). Untuk sementara, video maksimal 50 MB." }, { status: 501 });
    }
    const { ext } = await request.json().catch(() => ({}));
    const contentType = ALLOWED[ext];
    if (!contentType) return NextResponse.json({ ok: false, error: "Format harus MP4/MOV" }, { status: 400 });

    const key = `${ures.user.id}/${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await presignR2Put(key, contentType);
    return NextResponse.json({ ok: true, uploadUrl, publicUrl: r2PublicUrl(key), contentType });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
