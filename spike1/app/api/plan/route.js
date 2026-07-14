import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateIdeas, generateConcept, generateScript, analyzeReference, planningConfigured } from "../../../lib/planningCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// AI perencanaan konten. Auth: pengguna yang sudah masuk.
// body: { task: "ideas"|"concept"|"script", ...params }
export async function POST(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ ok: false, error: "No auth token" }, { status: 401 });
    const { data: ures } = await createClient(URL_, ANON).auth.getUser(token);
    if (!ures?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    if (!planningConfigured()) {
      return NextResponse.json({ ok: false, error: "Fitur AI belum aktif. Tambahkan GEMINI_API_KEY dulu." }, { status: 501 });
    }

    const b = await request.json().catch(() => ({}));
    const persona = b.persona && typeof b.persona === "object" ? b.persona : null;
    const common = {
      brandName: typeof b.brandName === "string" ? b.brandName.slice(0, 80) : "",
      platform: b.platform, persona,
      seed: typeof b.seed === "string" ? b.seed.slice(0, 600) : "",
    };

    if (b.task === "ideas") {
      const ideas = await generateIdeas({ ...common, pillars: b.pillars, goal: b.goal, count: b.count });
      return NextResponse.json({ ok: true, ideas });
    }
    if (b.task === "concept") {
      const concept = await generateConcept({ ...common, title: b.title, pillar: b.pillar, format: b.format, goal: b.goal });
      return NextResponse.json({ ok: true, concept });
    }
    if (b.task === "script") {
      const script = await generateScript({ ...common, title: b.title, format: b.format, hook: b.hook, goal: b.goal });
      return NextResponse.json({ ok: true, script });
    }
    if (b.task === "analyze") {
      if (!b.imageUrl) return NextResponse.json({ ok: false, error: "Butuh gambar untuk dianalisa" }, { status: 400 });
      const analysis = await analyzeReference({ ...common, imageUrl: b.imageUrl, note: b.note });
      return NextResponse.json({ ok: true, analysis });
    }
    return NextResponse.json({ ok: false, error: "Task tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
