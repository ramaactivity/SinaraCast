"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp, useFetchState } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Button, IconButton, Status, Field, Input,
  SectionTitle, Skeleton, Modal,
} from "../ui";
const { useState: uCn } = React;
const FC = "var(--font)";

const META_STEPS = [
  { t: "Akun developer Meta dibuat", done: true },
  { t: "Aplikasi dalam Development Mode", done: true },
  { t: "IG diubah ke Business + Page tersambung", done: true },
  { t: "Channel terhubung (4/4)", done: false },
];

export function ConnectionsView() {
  const app = useApp();
  const phase = useFetchState();
  const [editBrand, setEditBrand] = uCn(null);
  const channels = app.channels;
  const atCap = channels.length >= 4;

  const reconnect = (c) => { app.toast(`Menyambungkan ulang ${BRANDS[c.brand].name}…`, "info");
    setTimeout(() => { app.setChannels(cs => cs.map(x => x.id === c.id ? { ...x, status: "Connected", tokenExpires: "20 Agu 2026", lastRefresh: "Baru saja" } : x)); app.toast(`${BRANDS[c.brand].name} tersambung kembali`, "success"); }, 1500); };

  const togglePause = (c) => { app.setChannels(cs => cs.map(x => x.id === c.id ? { ...x, paused: !x.paused, resumeDate: !x.paused ? "" : x.resumeDate } : x));
    app.toast(c.paused ? `${BRANDS[c.brand].name} dilanjutkan` : `${BRANDS[c.brand].name} dijeda`, "info"); };

  return (
    <div>
      <Topbar title="Connections" sub="Kelola channel, koneksi Meta, dan alert Telegram"
        right={<Button variant="amber" icon={<Icons.plus size={18} sw={2} />} disabled={atCap}
          onClick={() => atCap ? app.toast("Maksimal 4 channel. Hapus salah satu untuk menambah.", "error") : app.toast("Membuka otorisasi Meta…", "info")}>Tambah channel</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {atCap && <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--primary-100)", borderRadius: 13, padding: "10px 14px", fontFamily: FC, fontSize: 12.5, color: "#B07B22" }}><Icons.info size={16} />Sudah mencapai batas 4 channel.</div>}

          {phase === "loading" && [0, 1, 2, 3].map(i => <Panel key={i}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Skeleton w={48} h={48} r={13} /><div style={{ flex: 1 }}><Skeleton w="35%" h={16} /><div style={{ height: 8 }} /><Skeleton w="55%" h={12} /></div></div></Panel>)}

          {phase === "ready" && channels.map(c => {
            const b = BRANDS[c.brand];
            return (
              <Panel key={c.id} pad={20}>
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  <BrandAvatar brand={b} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: FC, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>{b.name}</span>
                      <Status s={c.status} pulse={c.status === "Needs reconnect"} />
                      {c.paused && <Status s="Paused" />}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 5, fontFamily: FC, fontSize: 12, color: "var(--ink-500)" }}>
                      <span>{c.handle}</span><span>·</span><span>{c.followers} pengikut</span>
                      <span>·</span><span>Token: {c.tokenExpires}</span>
                    </div>
                  </div>
                  {c.status === "Needs reconnect" || c.status === "Expiring"
                    ? <Button size="sm" variant={c.status === "Needs reconnect" ? "danger" : "secondary"} icon={<Icons.retry size={15} />} onClick={() => reconnect(c)}>Sambungkan ulang</Button>
                    : <Button size="sm" variant="secondary" icon={c.paused ? <Icons.play size={15} /> : <Icons.pause size={15} />} onClick={() => togglePause(c)}>{c.paused ? "Lanjutkan" : "Jeda"}</Button>}
                  <IconButton icon={<Icons.edit size={17} />} tip="Ubah identitas" onClick={() => setEditBrand(c)} />
                  <IconButton icon={<Icons.trash size={17} />} tone="danger" tip="Hapus channel" onClick={() => app.confirm({
                    title: `Hapus ${b.name}?`, confirmLabel: "Hapus channel",
                    body: "Channel diputus dari SinaraCast.",
                    consequence: `Semua rule milik ${b.name} akan dinonaktifkan (tidak dihapus) dan berhenti memposting. Media tetap tersimpan.`,
                    onConfirm: () => { app.toast(`${b.name} dihapus — rule-nya dinonaktifkan`, "success"); } })} />
                </div>
                {c.status === "Needs reconnect" && <div style={{ marginTop: 13, background: "var(--danger-bg)", borderRadius: 11, padding: "10px 13px", fontFamily: FC, fontSize: 12, color: "var(--danger)", display: "flex", gap: 8 }}><Icons.alert size={16} style={{ flex: "0 0 auto" }} />Token Meta kedaluwarsa. Posting ditahan; tidak ada percobaan publish sampai tersambung kembali.</div>}
              </Panel>
            );
          })}
        </div>

        {/* right: telegram + meta checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TelegramCard />
          <Panel>
            <SectionTitle sub="Penyiapan satu kali">Checklist Meta</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {META_STEPS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center",
                    background: s.done ? "var(--green-100)" : "rgba(140,144,158,.13)", color: s.done ? "var(--green-500)" : "var(--ink-400)" }}>
                    {s.done ? <Icons.check size={13} sw={2.4} /> : <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}</span>
                  <span style={{ fontFamily: FC, fontSize: 12.5, color: s.done ? "var(--ink-500)" : "var(--ink-900)", fontWeight: s.done ? 400 : 500, textDecoration: s.done ? "line-through" : "none" }}>{s.t}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" full icon={<Icons.external size={15} />} style={{ marginTop: 14, justifyContent: "flex-start" }} onClick={() => app.go("onboarding")}>Buka panduan setup lengkap</Button>
          </Panel>
        </div>
      </div>

      <BrandEditModal c={editBrand} onClose={() => setEditBrand(null)} />
    </div>
  );
}

function TelegramCard() {
  const app = useApp();
  const tg = app.settings.telegram;
  return (
    <Panel strong>
      <SectionTitle sub="Alert kegagalan selalu aktif">Alert Telegram</SectionTitle>
      {tg.connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--green-100)", borderRadius: 13, padding: "12px 14px" }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--green-grad)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Icons.telegram size={19} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FC, fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>Terhubung</div>
            <div style={{ fontFamily: FC, fontSize: 11.5, color: "var(--ink-500)" }}>{tg.handle}</div>
          </div>
          <IconButton icon={<Icons.x size={16} />} tip="Putuskan" onClick={() => app.confirm({ title: "Putuskan Telegram?", danger: true, confirmLabel: "Putuskan",
            body: "Alert kegagalan tidak bisa dimatikan, tapi tanpa Telegram hanya muncul di in-app center.",
            consequence: "Kamu tetap menerima alert di dalam aplikasi, tapi tidak lagi via Telegram.",
            onConfirm: () => { app.setSettings(s => ({ ...s, telegram: { ...s.telegram, connected: false } })); app.toast("Telegram diputus", "info"); } })} />
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: FC, fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, margin: "0 0 12px" }}>Hubungkan bot Telegram untuk menerima alert kegagalan publish, token, dan run terlewat.</p>
          <Button size="sm" variant="primary" full icon={<Icons.telegram size={16} />} onClick={() => { app.setSettings(s => ({ ...s, telegram: { connected: true, handle: "@rama" } })); app.toast("Telegram terhubung", "success"); }}>Hubungkan Telegram</Button>
        </div>
      )}
    </Panel>
  );
}

function BrandEditModal({ c, onClose }) {
  const app = useApp();
  const [name, setName] = uCn("");
  React.useEffect(() => { if (c) setName(BRANDS[c.brand].name); }, [c]);
  if (!c) return null;
  const b = BRANDS[c.brand];
  return (
    <Modal open={!!c} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub="Ubah nama tampilan & avatar brand">Identitas brand</SectionTitle>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><BrandAvatar brand={b} size={64} ring /></div>
        <Field label="Nama brand"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Handle Instagram" style={{ marginTop: 14 }}><Input value={c.handle} icon={<Icons.connections size={17} />} readOnly /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="primary" icon={<Icons.check size={17} />} onClick={() => { app.toast("Identitas brand diperbarui", "success"); onClose(); }}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
