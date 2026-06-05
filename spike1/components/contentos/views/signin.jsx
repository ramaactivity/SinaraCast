"use client";
import React from "react";
import { Icons } from "../icons";
import { Button, Input, Textarea, Field, Spinner } from "../ui";
import { supabase } from "../supabaseClient";
const { useState: uSi } = React;
const FSi = "var(--font)";

// Passwordless sign-in (Supabase Auth). The email contains a magic LINK. In a
// normal browser you click it. Inside an installed PWA (iOS especially) the link
// opens the system browser — NOT the PWA — so the session would land in the wrong
// place. To stay inside the PWA, paste the link here: we extract its token and
// verify it in THIS context (works on Supabase free tier, no template/SMTP needed).
function parseAuthLink(input) {
  let s = (input || "").trim();
  if (!s) return null;
  // pull a URL out of pasted text if there's surrounding text
  const m = s.match(/https?:\/\/\S+/);
  if (m) s = m[0];
  try {
    let url = new URL(s);
    // unwrap Gmail/Google safe-link redirects: .../url?q=<real>
    if (url.hostname.includes("google.com") && url.searchParams.get("q")) url = new URL(url.searchParams.get("q"));
    // implicit flow: tokens in the URL hash
    const hash = url.hash ? new URLSearchParams(url.hash.slice(1)) : null;
    if (hash?.get("access_token") && hash.get("refresh_token")) {
      return { kind: "session", access_token: hash.get("access_token"), refresh_token: hash.get("refresh_token") };
    }
    // verify link: ?token=<hash>&type=<type>
    const token_hash = url.searchParams.get("token_hash") || url.searchParams.get("token");
    const type = url.searchParams.get("type") || "email";
    if (token_hash) return { kind: "token_hash", token_hash, type };
    return null;
  } catch { return null; }
}

export function SignInView() {
  const [stage, setStage] = uSi("form"); // form | sending | sent | verifying
  const [email, setEmail] = uSi("");
  const [link, setLink] = uSi("");
  const [err, setErr] = uSi("");

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Masukkan email yang valid."); return; }
    setErr(""); setStage("sending"); setLink("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) { setErr(error.message); setStage("form"); return; }
    setStage("sent");
  };

  const verify = async () => {
    const parsed = parseAuthLink(link);
    if (!parsed) { setErr("Tautan tidak dikenali. Salin tautan masuk dari email lalu tempel di sini."); return; }
    setErr(""); setStage("verifying");
    let error;
    if (parsed.kind === "session") {
      ({ error } = await supabase.auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token }));
    } else {
      ({ error } = await supabase.auth.verifyOtp({ token_hash: parsed.token_hash, type: parsed.type }));
    }
    if (error) { setErr(error.message || "Tautan kedaluwarsa atau sudah dipakai. Kirim ulang lalu coba lagi."); setStage("sent"); return; }
    // success → onAuthStateChange in ContentOS picks up the session and loads the app
  };

  const busy = stage === "sending" || stage === "verifying";

  return (
    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}><Icons.grid size={22} sw={2} /></div>
          <span style={{ fontFamily: FSi, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>SinaraCast</span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.82)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)", padding: 30 }}>
          {(stage === "form" || stage === "sending") && (
            <>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 19, color: "var(--ink-900)", textAlign: "center" }}>Masuk</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-400)", textAlign: "center", margin: "6px 0 22px", lineHeight: 1.5 }}>Tanpa kata sandi. Kami kirim tautan masuk ke email kamu.</div>
              <Field label="Email" error={err}>
                <Input icon={<Icons.mail size={18} />} type="email" inputMode="email" value={email} invalid={!!err} disabled={stage === "sending"}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="kamu@email.com" />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 18 }} disabled={stage === "sending"}
                icon={stage === "sending" ? <Spinner size={16} /> : <Icons.mail size={18} />} onClick={submit}>
                {stage === "sending" ? "Mengirim…" : "Kirim tautan masuk"}
              </Button>
            </>
          )}
          {(stage === "sent" || stage === "verifying") && (
            <div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--green-100)", color: "var(--green-500)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icons.mail size={28} /></div>
                <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Cek email kamu</div>
                <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-500)", margin: "8px 0 18px", lineHeight: 1.55 }}>Tautan masuk dikirim ke <b style={{ color: "var(--ink-900)" }}>{email}</b>.</div>
              </div>
              <div style={{ background: "var(--primary-100)", borderRadius: 13, padding: "12px 14px", marginBottom: 16, fontFamily: FSi, fontSize: 12.5, color: "#8a5a12", lineHeight: 1.55 }}>
                <b>Pakai aplikasi (PWA)?</b> Di email, <b>tahan tautannya → Salin</b>, lalu tempel di bawah. (Mengklik tautan akan membuka browser, bukan aplikasi ini.)
              </div>
              <Field label="Tempel tautan masuk dari email" error={err}>
                <Textarea value={link} invalid={!!err} disabled={stage === "verifying"} placeholder="https://…supabase.co/auth/v1/verify?token=…"
                  onChange={e => setLink(e.target.value)} style={{ minHeight: 70, fontSize: 12.5 }} />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 14 }} disabled={busy || !link.trim()}
                icon={stage === "verifying" ? <Spinner size={16} /> : <Icons.check size={18} />} onClick={verify}>
                {stage === "verifying" ? "Memverifikasi…" : "Masuk"}
              </Button>
              <div style={{ fontFamily: FSi, fontSize: 12, color: "var(--ink-400)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>Di browser biasa, cukup <b>klik tautannya</b> di email.</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button onClick={() => { setStage("form"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FSi, fontSize: 12.5, color: "var(--ink-500)", fontWeight: 600 }}>← Ganti email</button>
                <button onClick={submit} disabled={busy} style={{ background: "none", border: "none", cursor: busy ? "default" : "pointer", fontFamily: FSi, fontSize: 12.5, color: "var(--primary-500)", fontWeight: 600 }}>Kirim ulang</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: FSi, fontSize: 11.5, color: "var(--ink-400)" }}>Semua waktu dalam WIB (UTC+7)</div>
      </div>
    </div>
  );
}
