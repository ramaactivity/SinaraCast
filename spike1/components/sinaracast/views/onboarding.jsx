"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { Panel, Button } from "../ui";
const { useState: uOb } = React;
const FOb = "var(--font)";

export function OnboardingView() {
  const app = useApp();
  // Progress derived from real state: connecting a channel implies the Meta
  // app + Business steps are done; Telegram from the linked flag.
  const chCt = app.channels.length;
  const tgOn = !!app.settings.telegram.connected;
  const steps = [
    { id: "dev", title: "Akun developer Meta", done: chCt > 0 },
    { id: "biz", title: "Ubah IG ke Business + hubungkan Page", done: chCt > 0 },
    { id: "connect", title: `Sambungkan channel (${chCt}/4)`, done: chCt > 0 },
    { id: "telegram", title: "Siapkan Telegram", done: tgOn },
  ];
  const firstUndone = steps.findIndex(s => !s.done);
  const [active, setActive] = uOb(firstUndone === -1 ? 0 : firstUndone);
  const doneCt = steps.filter(s => s.done).length;
  const pct = Math.round(doneCt / steps.length * 100);

  const complete = (i) => {
    const id = steps[i].id;
    if (id === "connect") return app.connectChannel();
    if (id === "telegram") return app.connectTelegram();
    setActive(i + 1 < steps.length ? i + 1 : i);
  };

  return (
    <div>
      <Topbar title="Setup Meta" sub="Penyiapan satu kali — bisa dilanjutkan kapan saja"
        right={<Button variant="ghost" onClick={() => app.go("connections")}>Lewati untuk sekarang</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        {/* stepper */}
        <Panel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: FOb, fontWeight: 600, fontSize: 14, color: "var(--ink-900)" }}>Progres</span>
            <span style={{ fontFamily: FOb, fontSize: 12, fontWeight: 600, color: "var(--green-500)" }}>{pct}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "rgba(140,144,158,.16)", marginBottom: 18, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--green-grad)", borderRadius: 999, transition: "width .4s" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {steps.map((s, i) => {
              const on = active === i;
              return (
                <button key={s.id} onClick={() => setActive(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", border: "none", cursor: "pointer", borderRadius: 12, textAlign: "left", background: on ? "var(--primary-100)" : "transparent" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center",
                    background: s.done ? "var(--green-grad)" : on ? "var(--primary-grad)" : "rgba(140,144,158,.14)", color: s.done || on ? "#fff" : "var(--ink-400)" }}>
                    {s.done ? <Icons.check size={14} sw={2.6} /> : <span style={{ fontFamily: FOb, fontSize: 12, fontWeight: 600 }}>{i + 1}</span>}</span>
                  <span style={{ fontFamily: FOb, fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--primary-500)" : s.done ? "var(--ink-400)" : "var(--ink-700)" }}>{s.title}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* step detail */}
        <Panel strong pad={28}>
          <StepDetail step={steps[active]} idx={active} total={steps.length} onComplete={() => complete(active)} onBack={() => setActive(a => Math.max(0, a - 1))} app={app} />
        </Panel>
      </div>
    </div>
  );
}

const STEP_BODY = {
  dev: ["Buat akun developer Meta", ["Buka developers.facebook.com dan masuk.", "Buat aplikasi baru, pilih tipe Business.", "Catat App ID — akan dipakai saat menghubungkan channel."]],
  biz: ["Ubah IG ke Business + hubungkan Page", ["Di Instagram, ubah akun ke Professional → Business.", "Tautkan setiap akun IG ke Facebook Page-nya.", "Pastikan kamu admin Page tersebut."]],
  connect: ["Sambungkan channel", ["Klik ‘Sambungkan channel’ — popup Instagram terbuka.", "Login & beri izin (konten publikasi).", "Ulangi untuk tiap brand (maks 4)."]],
  telegram: ["Siapkan Telegram", ["Klik ‘Hubungkan Telegram’ — bot SinaraCast terbuka.", "Tekan Start di Telegram.", "Otomatis tersambung — alert publish masuk ke sana."]],
};

function StepDetail({ step, idx, total, onComplete, onBack, app }) {
  const [t, body] = STEP_BODY[step.id];
  return (
    <div>
      <div style={{ fontFamily: FOb, fontSize: 11.5, fontWeight: 600, letterSpacing: ".08em", color: "var(--primary-500)", marginBottom: 6 }}>LANGKAH {idx + 1} DARI {total}</div>
      <div style={{ fontFamily: FOb, fontWeight: 600, fontSize: 22, color: "var(--ink-900)", marginBottom: 18 }}>{t}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        {body.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", flex: "0 0 auto", background: "var(--primary-100)", color: "var(--primary-500)", display: "grid", placeItems: "center", fontFamily: FOb, fontSize: 12, fontWeight: 600, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontFamily: FOb, fontSize: 14, color: "var(--ink-700)", lineHeight: 1.55 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--primary-100)", borderRadius: 13, padding: "13px 16px", display: "flex", gap: 10, marginBottom: 24 }}>
        <Icons.info size={18} style={{ color: "var(--primary-500)", flex: "0 0 auto", marginTop: 1 }} />
        <span style={{ fontFamily: FOb, fontSize: 12.5, color: "#B07B22", lineHeight: 1.5 }}>Butuh detail lengkap? Buka Meta Setup Runbook untuk panduan langkah demi langkah.</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {idx > 0 && <Button variant="secondary" icon={<Icons.chevLeft size={17} />} onClick={onBack}>Sebelumnya</Button>}
        <Button variant="ghost" icon={<Icons.external size={16} />} onClick={() => app.toast("Membuka Runbook…", "info")}>Buka Runbook</Button>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="primary" icon={step.done ? <Icons.check size={17} /> : <Icons.chevRight size={17} />} iconRight onClick={onComplete}>{step.done ? "Selesai ✓" : step.id === "connect" ? "Sambungkan channel" : step.id === "telegram" ? "Hubungkan Telegram" : "Tandai selesai"}</Button>
        </div>
      </div>
    </div>
  );
}
