"use client";
import React from "react";
import { Icons } from "../icons";
import { Button, Input, Field, Spinner } from "../ui";
import { supabase } from "../supabaseClient";
import { t } from "../i18n";
const { useState: uSi } = React;
const FSi = "var(--font)";

// Passwordless sign-in (Supabase Auth + Resend SMTP). The email contains a
// 6-digit code AND a magic link. PWA users type the code here (verifyOtp creates
// the session in THIS context — no bounce to the system browser); normal browsers
// can just click the link.
export function SignInView({ onBack }) {
  const [stage, setStage] = uSi("form"); // form | sending | sent | verifying
  const [email, setEmail] = uSi("");
  const [code, setCode] = uSi("");
  const [err, setErr] = uSi("");

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr(t("Masukkan email yang valid.")); return; }
    setErr(""); setStage("sending"); setCode("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) { setErr(error.message); setStage("form"); return; }
    setStage("sent");
  };

  const verify = async () => {
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) { setErr(t("Masukkan 6 digit kode dari email.")); return; }
    setErr(""); setStage("verifying");
    const { error } = await supabase.auth.verifyOtp({ email, token: digits, type: "email" });
    if (error) { setErr(error.message || "Kode salah atau kedaluwarsa."); setStage("sent"); return; }
    // success → onAuthStateChange in SinaraCast picks up the session and loads the app
  };

  const busy = stage === "sending" || stage === "verifying";

  return (
    <div style={{ width: "100%", minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {onBack && (
          <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: FSi, fontSize: 13, fontWeight: 600, color: "var(--ink-500)", marginBottom: 14 }}>{t("← Kembali")}</button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 26 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}><Icons.grid size={22} sw={2} /></div>
          <span style={{ fontFamily: FSi, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>SinaraCast</span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.82)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)", padding: 30 }}>
          {(stage === "form" || stage === "sending") && (
            <>
              <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 19, color: "var(--ink-900)", textAlign: "center" }}>{t("Masuk")}</div>
              <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-400)", textAlign: "center", margin: "6px 0 22px", lineHeight: 1.5 }}>{t("Tanpa kata sandi. Kami kirim kode 6 digit ke email kamu.")}</div>
              <Field label="Email" error={err}>
                <Input icon={<Icons.mail size={18} />} type="email" inputMode="email" value={email} invalid={!!err} disabled={stage === "sending"}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder={t("kamu@email.com")} />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 18 }} disabled={stage === "sending"}
                icon={stage === "sending" ? <Spinner size={16} /> : <Icons.mail size={18} />} onClick={submit}>
                {stage === "sending" ? t("Mengirim…") : t("Kirim kode masuk")}
              </Button>
            </>
          )}
          {(stage === "sent" || stage === "verifying") && (
            <div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--green-100)", color: "var(--green-500)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Icons.mail size={28} /></div>
                <div style={{ fontFamily: FSi, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>{t("Cek email kamu")}</div>
                <div style={{ fontFamily: FSi, fontSize: 13, color: "var(--ink-500)", margin: "8px 0 20px", lineHeight: 1.55 }}>{t("Kode 6 digit dikirim ke")} <b style={{ color: "var(--ink-900)" }}>{email}</b>{t(". Masukkan di bawah.")}</div>
              </div>
              <Field label={t("Kode 6 digit")} error={err}>
                <Input value={code} invalid={!!err} disabled={stage === "verifying"} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  placeholder="••••••" style={{ textAlign: "center", letterSpacing: "0.5em", fontSize: 22, fontWeight: 700 }}
                  onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={e => e.key === "Enter" && verify()} />
              </Field>
              <Button variant="primary" full size="lg" style={{ marginTop: 16 }} disabled={busy || code.length < 6}
                icon={stage === "verifying" ? <Spinner size={16} /> : <Icons.check size={18} />} onClick={verify}>
                {stage === "verifying" ? t("Memverifikasi…") : t("Masuk")}
              </Button>
              <div style={{ fontFamily: FSi, fontSize: 12, color: "var(--ink-400)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>{t("Di browser biasa, kamu juga bisa")} <b>{t("klik tautannya")}</b> {t("di email.")}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button onClick={() => { setStage("form"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FSi, fontSize: 12.5, color: "var(--ink-500)", fontWeight: 600 }}>{t("← Ganti email")}</button>
                <button onClick={submit} disabled={busy} style={{ background: "none", border: "none", cursor: busy ? "default" : "pointer", fontFamily: FSi, fontSize: 12.5, color: "var(--primary-500)", fontWeight: 600 }}>{t("Kirim ulang kode")}</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: FSi, fontSize: 11.5, color: "var(--ink-400)" }}>{t("Semua waktu dalam WIB (UTC+7)")}</div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: FSi, fontSize: 11.5, color: "var(--ink-400)", display: "flex", gap: 14, justifyContent: "center" }}>
          <a href="/privacy" style={{ color: "var(--ink-400)" }}>{t("Privasi")}</a>
          <a href="/terms" style={{ color: "var(--ink-400)" }}>{t("Ketentuan")}</a>
          <a href="/data-deletion" style={{ color: "var(--ink-400)" }}>{t("Hapus Data")}</a>
        </div>
      </div>
    </div>
  );
}
