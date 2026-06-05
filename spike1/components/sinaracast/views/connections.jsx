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

export function ConnectionsView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [editBrand, setEditBrand] = uCn(null);
  const channels = app.channels;
  const atCap = channels.length >= 4;
  // live setup checklist
  const connectedCt = channels.filter(c => c.status === "Connected").length;
  const META_STEPS = [
    { t: "Akun developer Meta dibuat", done: channels.length > 0 },
    { t: "Aplikasi dalam Development Mode", done: channels.length > 0 },
    { t: "IG diubah ke Business + Page tersambung", done: channels.length > 0 },
    { t: `Channel terhubung (${connectedCt}/4)`, done: connectedCt > 0 },
    { t: "Alert Telegram tersambung", done: !!app.settings.telegram.connected },
  ];

  const nameOf = (c) => BRANDS[c.brand]?.name || c.name || c.handle;
  // Reconnect runs the same OAuth flow; the callback matches by ig_user_id and
  // refreshes this channel's token in place. User must pick the same IG account.
  const reconnect = () => app.connectChannel();

  const togglePause = (c) => app.toggleChannelPause(c, nameOf(c));

  return (
    <div>
      <Topbar title="Manajemen Akun" sub="Kelola akun Instagram, koneksi, dan Telegram"
        right={<Button variant="amber" icon={<Icons.plus size={18} sw={2} />} disabled={atCap}
          onClick={() => atCap ? app.toast("Maksimal 4 akun. Hapus salah satu untuk menambah.", "error") : app.connectChannel()}>Tambah akun</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {atCap && <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--primary-100)", borderRadius: 13, padding: "10px 14px", fontFamily: FC, fontSize: 12.5, color: "#B07B22" }}><Icons.info size={16} />Sudah mencapai batas 4 akun.</div>}

          {phase === "loading" && [0, 1, 2, 3].map(i => <Panel key={i}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Skeleton w={48} h={48} r={13} /><div style={{ flex: 1 }}><Skeleton w="35%" h={16} /><div style={{ height: 8 }} /><Skeleton w="55%" h={12} /></div></div></Panel>)}

          {phase === "ready" && channels.map(c => {
            const b = BRANDS[c.brand] || { name: c.name || c.handle, short: (c.name || "?").slice(0, 2).toUpperCase(), accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)" };
            return (
              <Panel key={c.id} pad={20}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: app.isMobile ? "wrap" : "nowrap" }}>
                  <BrandAvatar brand={b} src={c.avatarUrl} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: FC, fontWeight: 600, fontSize: 16, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{b.name}</span>
                      <span style={{ flex: "0 0 auto" }}><Status s={c.paused ? "Paused" : c.status} pulse={c.status === "Needs reconnect"} /></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6, fontFamily: FC, fontSize: 12, color: "var(--ink-500)", flexWrap: "wrap", rowGap: 3 }}>
                      <span>{c.handle}</span><span style={{ color: "var(--ink-300)" }}>·</span><span>{c.followers} pengikut</span>
                      <span style={{ color: "var(--ink-300)" }}>·</span><span>Aktif s/d {c.tokenExpires}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto", marginLeft: app.isMobile ? 0 : "auto", marginTop: app.isMobile ? 4 : 0, width: app.isMobile ? "100%" : "auto", justifyContent: app.isMobile ? "flex-start" : "flex-end" }}>
                    {c.status === "Needs reconnect" || c.status === "Expiring"
                      ? <Button size="sm" variant={c.status === "Needs reconnect" ? "danger" : "secondary"} icon={<Icons.retry size={15} />} onClick={() => reconnect(c)}>Sambungkan ulang</Button>
                      : <Button size="sm" variant={c.paused ? "primary" : "secondary"} icon={c.paused ? <Icons.play size={15} /> : <Icons.pause size={15} />} onClick={() => togglePause(c)}>{c.paused ? "Lanjutkan" : "Jeda"}</Button>}
                    <IconButton icon={<Icons.edit size={17} />} tip="Ubah nama" onClick={() => setEditBrand(c)} />
                    <IconButton icon={<Icons.trash size={17} />} tone="danger" tip="Hapus akun" onClick={() => app.confirm({
                      title: `Hapus ${b.name}?`, danger: true, confirmLabel: "Hapus akun",
                      body: "Akun ini diputus dari SinaraCast.",
                      consequence: `Jadwal milik ${b.name} berhenti memposting. Akun & gambarnya disembunyikan, bukan dihapus permanen.`,
                      onConfirm: () => app.archiveChannel(c) })} />
                  </div>
                </div>
                {c.status === "Needs reconnect" && <div style={{ marginTop: 13, background: "var(--danger-bg)", borderRadius: 11, padding: "10px 13px", fontFamily: FC, fontSize: 12, color: "var(--danger)", display: "flex", gap: 8 }}><Icons.alert size={16} style={{ flex: "0 0 auto" }} />Koneksi ke Instagram putus. Posting dihentikan sampai akun ini disambungkan kembali.</div>}
              </Panel>
            );
          })}
        </div>

        {/* right: telegram + meta checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TelegramCard />
          <Panel>
            <SectionTitle sub="Sekali saja di awal">Langkah penyiapan</SectionTitle>
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
            <Button size="sm" variant="ghost" full icon={<Icons.external size={15} />} style={{ marginTop: 14, justifyContent: "flex-start" }} onClick={() => app.go("onboarding")}>Buka panduan lengkap</Button>
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
      <SectionTitle sub="Pemberitahuan gagal selalu aktif">Telegram</SectionTitle>
      {tg.connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--green-100)", borderRadius: 13, padding: "12px 14px" }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--green-grad)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Icons.telegram size={19} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FC, fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>Terhubung</div>
            <div style={{ fontFamily: FC, fontSize: 11.5, color: "var(--ink-500)" }}>{tg.handle}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => app.testTelegram()}>Kirim tes</Button>
          <IconButton icon={<Icons.x size={16} />} tip="Putuskan" onClick={() => app.confirm({ title: "Putuskan Telegram?", danger: true, confirmLabel: "Putuskan",
            body: "Pemberitahuan tetap muncul di dalam aplikasi, tapi tidak lagi dikirim ke Telegram.",
            onConfirm: () => app.disconnectTelegram() })} />
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: FC, fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, margin: "0 0 12px" }}>Hubungkan Telegram untuk dapat pemberitahuan saat posting gagal, koneksi bermasalah, atau jadwal terlewat.</p>
          <Button size="sm" variant="primary" full icon={<Icons.telegram size={16} />} onClick={() => app.connectTelegram()}>Hubungkan Telegram</Button>
        </div>
      )}
    </Panel>
  );
}

function BrandEditModal({ c, onClose }) {
  const app = useApp();
  const [name, setName] = uCn("");
  React.useEffect(() => { if (c) setName(c.name || BRANDS[c.brand]?.name || ""); }, [c]);
  if (!c) return null;
  const b = BRANDS[c.brand] || { name: c.name || c.handle, short: (c.name || "?").slice(0, 2).toUpperCase(), accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)" };
  const save = () => { app.renameChannel(c, name); onClose(); };
  return (
    <Modal open={!!c} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub="Ubah nama tampilan brand">Identitas brand</SectionTitle>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><BrandAvatar brand={b} src={c.avatarUrl} size={64} ring /></div>
        <Field label="Nama brand"><Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); }} /></Field>
        <Field label="Handle Instagram" style={{ marginTop: 14 }}><Input value={c.handle} icon={<Icons.connections size={17} />} readOnly /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="primary" icon={<Icons.check size={17} />} disabled={!name.trim()} onClick={save}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
