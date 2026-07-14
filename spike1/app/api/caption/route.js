import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCaption, captionConfigured } from "../../../lib/captionCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Buatkan / poles caption dengan AI. Auth: pengguna yang sudah masuk.
// body: { imageUrl?, draft?, instruction?, tone?, platform?, postType?, brandName?, mode? }
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    if (!captionConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Fitur AI belum aktif. Tambahkan GEMINI_API_KEY dulu." },
        { status: 501 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "polish" ? "polish" : "generate";
    if (mode === "polish" && !body.draft?.trim()) {
      return NextResponse.json({ ok: false, error: "Tulis dulu captionmu untuk diperbaiki." }, { status: 400 });
    }

    const caption = await generateCaption({
      mode,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      draft: typeof body.draft === "string" ? body.draft.slice(0, 3000) : "",
      instruction: typeof body.instruction === "string" ? body.instruction.slice(0, 500) : "",
      tone: body.tone,
      platform: body.platform,
      postType: body.postType,
      brandName: typeof body.brandName === "string" ? body.brandName.slice(0, 80) : "",
      persona: body.persona && typeof body.persona === "object" ? body.persona : null,
    });

    return NextResponse.json({ ok: true, caption });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
