"use client";
import React from "react";
import { Icons } from "../icons";
import { Button, Input, Field, Spinner } from "../ui";
import { supabase } from "../supabaseClient";
const { useState: uSi } = React;
const FSi = "var(--font)";

// Real magic-link sign-in (Supabase Auth, OTP email). Standalone — rendered by
// the auth gate in ContentOS before any app context exists.
export function SignInView() {
  const [stage, setStage] = uSi("form"); // form | sent | sending
  const [email, setEmail] = uSi("");
  const [err, setErr] = uSi("");

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Masukkan email yang valid."); return; }
    setErr(""); setStage("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) { setErr(error.message); setStage("form"); return; }
    setStage("sent");
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%" }}>
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
                <Input icon={<Icons.mail size={18} />} value={email} invalid={!!err} disabled={stage === "sending"}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="kamu@email.com" />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 18 }} disabled={stage === "sending"}
                icon={stage === "sending" ? <Spinner size={16} /> : <Icons.mail size={18} />} onClick={submit}>
                {stage === "sending" ? "Mengirim…" : "Kirim tautan masuk"}
              </Button>
            </>
          )}
          {stage === "sent" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--green-100)", color: "var(--green-500)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icons.mail size={28} /></div>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Cek email kamu</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-500)", margin: "8px 0 22px", lineHeight: 1.5 }}>Tautan masuk dikirim ke <b style={{ color: "var(--ink-900)" }}>{email}</b>. Klik tautan di email itu untuk masuk. Tautan berlaku 15 menit.</div>
              <button onClick={() => setStage("form")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FSi, fontSize: 12.5, color: "var(--primary-500)", fontWeight: 600 }}>← Pakai email lain / kirim ulang</button>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: FSi, fontSize: 11.5, color: "var(--ink-400)" }}>Semua waktu dalam WIB (UTC+7)</div>
      </div>
    </div>
  );
}
