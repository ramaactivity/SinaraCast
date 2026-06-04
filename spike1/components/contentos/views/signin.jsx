"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Button, Input, Field, Spinner } from "../ui";
const { useState: uSi } = React;
const FSi = "var(--font)";

export function SignInView() {
  const app = useApp();
  const [stage, setStage] = uSi("form"); // form | sent | signing | expired
  const [email, setEmail] = uSi("rama@contentos.id");
  const [err, setErr] = uSi("");

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Masukkan email yang valid."); return; }
    setErr(""); setStage("sent");
  };
  const follow = () => { setStage("signing"); setTimeout(() => app.go("rules"), 1600); };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: 420, maxWidth: "100%" }}>
        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}><Icons.grid size={22} sw={2} /></div>
          <span style={{ fontFamily: FSi, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>Content OS</span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.82)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)", padding: 30 }}>
          {stage === "form" && (
            <>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 19, color: "var(--ink-900)", textAlign: "center" }}>Masuk</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-400)", textAlign: "center", margin: "6px 0 22px", lineHeight: 1.5 }}>Tanpa kata sandi. Kami kirim tautan masuk ke email kamu.</div>
              <Field label="Email" error={err}>
                <Input icon={<Icons.mail size={18} />} value={email} invalid={!!err} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="kamu@email.com" />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 18 }} icon={<Icons.mail size={18} />} onClick={submit}>Kirim tautan masuk</Button>
            </>
          )}
          {stage === "sent" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--green-100)", color: "var(--green-500)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icons.mail size={28} /></div>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Cek email kamu</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-500)", margin: "8px 0 22px", lineHeight: 1.5 }}>Tautan masuk dikirim ke <b style={{ color: "var(--ink-900)" }}>{email}</b>. Tautan berlaku 15 menit.</div>
              <Button variant="primary" full icon={<Icons.external size={17} />} onClick={follow}>Buka tautan (simulasi)</Button>
              <button onClick={() => setStage("expired")} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontFamily: FSi, fontSize: 12, color: "var(--ink-400)" }}>Simulasikan tautan kedaluwarsa →</button>
            </div>
          )}
          {stage === "signing" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}><Spinner size={34} /></div>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>Sedang masuk…</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-400)", marginTop: 6 }}>Memverifikasi tautan kamu.</div>
            </div>
          )}
          {stage === "expired" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--danger-bg)", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icons.warn size={28} /></div>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Tautan kedaluwarsa</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-500)", margin: "8px 0 22px", lineHeight: 1.5 }}>Tautan ini tidak berlaku lagi. Kirim ulang tautan baru ke {email}.</div>
              <Button variant="primary" full icon={<Icons.retry size={17} />} onClick={() => setStage("sent")}>Kirim ulang tautan</Button>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: FSi, fontSize: 11.5, color: "var(--ink-400)" }}>Semua waktu dalam WIB (UTC+7)</div>
      </div>
    </div>
  );
}
