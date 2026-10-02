"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, IconButton, Status, Field, Input, Select, SectionTitle, Skeleton, Modal, PlatIcon } from "../ui";
import { createBrand, renameBrand, setChannelBrand, deleteBrand } from "../dataLayer";
import { t } from "../i18n";
const { useState: uCn } = React;
const FC = "var(--font)";

const PLAT = { instagram: { l: "Instagram", c: "#C2387E" }, tiktok: { l: "TikTok", c: "#3B3B3F" }, threads: { l: "Threads", c: "#3B3B3F" } };
const brandAv = (name) => ({ name: name || "—", short: (name || "?").slice(0, 2).toUpperCase(), grad: "var(--primary-grad)" });
// Izin Instagram yang ditampilkan per akun (basic selalu ada, tidak perlu ditampilkan).
const IG_PERMS = [
  ["instagram_business_content_publish", "Terbitkan postingan"],
  ["instagram_business_manage_insights", "Statistik"],
  ["instagram_business_manage_comments", "Komentar"],
  ["instagram_business_manage_messages", "Pesan (DM)"],
];
const acctStyle = (c) => BRANDS[c.brand] || { name: c.name || c.handle, short: (c.name || "?").slice(0, 2).toUpperCase(), accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)" };

export function ConnectionsView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [editAcct, setEditAcct] = uCn(null);     // account (channel) rename
  const [moveAcct, setMoveAcct] = uCn(null);     // account → brand mover
  const [nameModal, setNameModal] = uCn(null);   // { brand?, mode } create/rename brand
  const channels = app.channels;
  const brands = app.brands || [];

  const connectedCt = channels.filter(c => c.status === "Connected").length;
  const META_STEPS = [
    { t: t("Akun developer Meta dibuat"), done: channels.length > 0 },
    { t: t("Aplikasi dalam Development Mode"), done: channels.length > 0 },
    { t: t("IG diubah ke Business + Page tersambung"), done: channels.length > 0 },
    { t: t("Akun terhubung ({0})", [connectedCt]), done: connectedCt > 0 },
    { t: t("Alert Telegram tersambung"), done: !!app.settings.telegram.connected },
  ];

  const nameOf = (c) => acctStyle(c).name;
  const reconnect = (c) => (c?.platform === "tiktok" ? app.connectTikTokChannel() : c?.platform === "threads" ? app.connectThreadsChannel() : app.connectChannel());

  const saveBrandName = async (name, brandObj) => {
    try {
      if (brandObj) { await renameBrand(brandObj.id, name); await app.reload(); app.toast(t("Nama brand diperbarui"), "success"); }
      else { const id = await createBrand(name); await app.reload(); app.selectBrand?.(id); app.toast(t("Brand dibuat"), "success"); }
    } catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); }
    setNameModal(null);
  };
  const moveToBrand = async (c, brandId) => {
    try { await setChannelBrand(c._id, brandId); await app.reload(); app.toast(t("{0} dipindahkan", [nameOf(c)]), "success"); }
    catch (e) { app.toast(t("Gagal memindahkan: {0}", [e.message || e]), "error"); }
    setMoveAcct(null);
  };
  const removeBrand = (br) => app.confirm({
    title: t("Hapus brand \"{0}\"?", [br.name]), danger: true, confirmLabel: t("Hapus brand"),
    body: br.accounts.length ? t("{0} akun akan lepas dari brand ini (akunnya tidak ikut terhapus).", [br.accounts.length]) : t("Brand kosong ini akan dihapus."),
    consequence: t("Rencana konten milik brand ini ikut terhapus. Tindakan ini tidak bisa dibatalkan."),
    onConfirm: async () => { try { await deleteBrand(br.id); await app.reload(); app.toast(t("Brand dihapus"), "success"); } catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); } },
  });

  // One account, rendered as a row inside its brand's panel.
  const AccountRow = ({ c }) => {
    const b = acctStyle(c);
    const isTT = c.platform === "tiktok" || c.platform === "threads"; // dark badge
    const isTh = c.platform === "threads"; // agent-only: no pause, brand move, or rename
    return (
      <div style={{ borderTop: "1px solid var(--line-soft)", padding: app.isMobile ? "12px 14px" : "13px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: app.isMobile ? "wrap" : "nowrap" }}>
          <BrandAvatar brand={b} src={c.avatarUrl} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontFamily: FC, fontWeight: 600, fontSize: 14.5, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.handle}</span>
              <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FC, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", padding: "2px 7px 2px 5px", borderRadius: 6, color: isTT ? "#fff" : "#b8338a", background: isTT ? "#111" : "#fbe6f3" }}><PlatIcon p={c.platform} size={11} color={isTT ? "#fff" : "#b8338a"} />{PLAT[c.platform]?.l || c.platform}</span>
              <span style={{ flex: "0 0 auto" }}><Status s={c.paused ? "Paused" : c.status} pulse={c.status === "Needs reconnect"} /></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, fontFamily: FC, fontSize: 11.5, color: "var(--ink-400)", flexWrap: "wrap", rowGap: 2 }}>
              <span>{c.followers} {t("pengikut")}</span><span style={{ color: "var(--ink-300)" }}>·</span><span>{t("Aktif s/d")} {c.tokenExpires}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center", flex: "0 0 auto", marginLeft: app.isMobile ? 0 : "auto", marginTop: app.isMobile ? 6 : 0, width: app.isMobile ? "100%" : "auto", justifyContent: app.isMobile ? "flex-start" : "flex-end" }}>
            {c.status === "Needs reconnect" || c.status === "Expiring"
              ? <Button size="sm" variant={c.status === "Needs reconnect" ? "danger" : "secondary"} icon={<Icons.retry size={15} />} onClick={() => reconnect(c)}>{t("Sambungkan ulang")}</Button>
              : !isTh && <Button size="sm" variant={c.paused ? "primary" : "secondary"} icon={c.paused ? <Icons.play size={15} /> : <Icons.pause size={15} />} onClick={() => app.toggleChannelPause(c, nameOf(c))}>{c.paused ? t("Lanjutkan") : t("Jeda")}</Button>}
            {c.status === "Connected" && <IconButton size={34} icon={<Icons.retry size={16} />} tip={t("Sambungkan ulang (perbarui izin)")} onClick={() => reconnect(c)} />}
            {!isTh && <IconButton size={34} icon={<Icons.swap size={16} />} tip={t("Pindahkan ke brand lain")} onClick={() => setMoveAcct(c)} />}
            {!isTh && <IconButton size={34} icon={<Icons.edit size={16} />} tip={t("Ubah nama akun")} onClick={() => setEditAcct(c)} />}
            <IconButton size={34} icon={<Icons.trash size={16} />} tone="danger" tip={t("Hapus akun")} onClick={() => app.confirm({
              title: t("Hapus {0}?", [c.handle]), danger: true, confirmLabel: t("Hapus akun"), body: t("Akun ini diputus dari SinaraCast."),
              consequence: t("Jadwal & postingannya berhenti. Akun disembunyikan, bukan dihapus permanen."), onConfirm: () => app.archiveChannel(c) })} />
          </div>
        </div>
        {c.platform === "instagram" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10, fontFamily: FC, fontSize: 11 }}>
            <span style={{ color: "var(--ink-400)", marginRight: 2 }}>{t("Izin:")}</span>
            {c.igScopes
              ? IG_PERMS.map(([k, label]) => {
                  const on = c.igScopes.includes(k);
                  return <span key={k} title={on ? t("Aktif") : t("Tidak aktif")} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 6px", borderRadius: 999, fontWeight: 600, color: on ? "var(--st-success)" : "var(--st-skipped)", background: on ? "var(--st-success-bg)" : "var(--st-skipped-bg)" }}>
                    {on ? <Icons.check size={11} sw={2.4} /> : <Icons.x size={11} sw={2.4} />}{t(label)}
                  </span>;
                })
              : <span style={{ color: "var(--ink-400)" }}>{t("belum tercatat. Sambungkan ulang untuk melihat izin akun ini.")}</span>}
          </div>
        )}
        {c.status === "Needs reconnect" && <div style={{ marginTop: 11, background: "var(--danger-bg)", borderRadius: 11, padding: "9px 12px", fontFamily: FC, fontSize: 11.5, color: "var(--danger)", display: "flex", gap: 8 }}><Icons.alert size={15} style={{ flex: "0 0 auto" }} />{t("Koneksi ke")} {PLAT[c.platform]?.l || c.platform} {t("putus. Posting dihentikan sampai disambungkan kembali.")}</div>}
      </div>
    );
  };

  return (
    <div>
      <Topbar title={t("Manajemen Akun")} sub={t("Brand, akun sosial media, koneksi, dan Telegram")}
        right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" icon={<Icons.layers size={17} sw={2} />} onClick={() => setNameModal({ mode: "create" })}>{t("Brand baru")}</Button>
          <Button variant="secondary" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.connectTikTokChannel()}>{t("Sambungkan TikTok")}</Button>
          <Button variant="amber" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.connectChannel()}>{t("Tambah Instagram")}</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {phase === "loading" && [0, 1, 2].map(i => <Panel key={i}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Skeleton w={48} h={48} r={13} /><div style={{ flex: 1 }}><Skeleton w="35%" h={16} /><div style={{ height: 8 }} /><Skeleton w="55%" h={12} /></div></div></Panel>)}

          {phase === "ready" && channels.length === 0 && brands.length === 0 && (
            <Panel pad={28}>
              <div style={{ textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--primary-100)", color: "var(--primary-500)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icons.connections size={26} /></div>
                <div style={{ fontFamily: FC, fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>{t("Belum ada akun di sini")}</div>
                <div style={{ fontFamily: FC, fontSize: 13, color: "var(--ink-500)", marginTop: 6, lineHeight: 1.5 }}>{t("Kamu masuk sebagai")} <b style={{ color: "var(--ink-900)" }}>{app.profile.email || "—"}</b>{t(". Kalau akunmu seharusnya sudah ada, mungkin emailnya berbeda.")}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
                  <Button variant="secondary" icon={<Icons.logout size={16} />} onClick={() => app.confirm({ title: t("Keluar & ganti akun?"), confirmLabel: t("Keluar"), body: t("Masuk lagi dengan email yang benar."), onConfirm: () => app.signOut() })}>{t("Keluar / ganti email")}</Button>
                  <Button variant="amber" icon={<Icons.plus size={16} sw={2} />} onClick={() => app.connectChannel()}>{t("Tambah akun")}</Button>
                </div>
              </div>
            </Panel>
          )}

          {/* brand workspaces — one panel per brand, its social accounts as rows inside */}
          {phase === "ready" && brands.map(br => (
            <Panel key={br.id} pad={0}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, padding: app.isMobile ? "14px 14px" : "15px 18px" }}>
                <BrandAvatar brand={brandAv(br.name)} size={32} />
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 4 }}>
                  <span style={{ fontFamily: FC, fontWeight: 700, fontSize: 15.5, color: "var(--ink-900)", letterSpacing: "-.01em" }}>{br.name}</span>
                  <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 600, color: "var(--ink-500)", background: "rgba(140,144,158,.13)", padding: "2px 9px", borderRadius: 999 }}>{t("{0} akun", [br.accounts.length])}</span>
                  {br.id === app.brand && <span style={{ fontFamily: FC, fontSize: 10.5, fontWeight: 600, color: "var(--primary-600, #b8338a)", background: "var(--primary-100)", padding: "2px 8px", borderRadius: 999 }}>{t("aktif")}</span>}
                </div>
                <span style={{ flex: 1 }} />
                <IconButton size={32} icon={<Icons.edit size={16} />} tip={t("Ubah nama brand")} onClick={() => setNameModal({ mode: "rename", brand: br })} />
                <IconButton size={32} icon={<Icons.trash size={16} />} tone="danger" tip={t("Hapus brand")} onClick={() => removeBrand(br)} />
              </div>
              {br.accounts.length === 0
                ? <div style={{ borderTop: "1px solid var(--line-soft)", padding: "14px 18px", fontFamily: FC, fontSize: 12.5, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{t("Belum ada akun di brand ini.")}<Button size="sm" variant="secondary" icon={<Icons.plus size={14} />} onClick={() => app.connectChannel()}>{t("Tambah Instagram")}</Button><Button size="sm" variant="secondary" icon={<Icons.plus size={14} />} onClick={() => app.connectTikTokChannel()}>TikTok</Button></div>
                : br.accounts.map(c => <AccountRow key={c.id} c={c} />)}
            </Panel>
          ))}

          {/* Threads: only used by the Hermes agent, so it lives outside the brands */}
          {phase === "ready" && (
            <Panel pad={0}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, padding: app.isMobile ? "14px 14px" : "15px 18px", flexWrap: "wrap" }}>
                <PlatIcon p="threads" size={22} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: FC, fontWeight: 700, fontSize: 15.5, color: "var(--ink-900)" }}>Threads</div>
                  <div style={{ fontFamily: FC, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{t("Dipakai agen Hermes untuk posting dan membalas komentar. Tidak muncul di Buat Postingan.")}</div>
                </div>
                <Button size="sm" variant="secondary" icon={<Icons.plus size={14} />} onClick={() => app.connectThreadsChannel()}>{t("Sambungkan Threads")}</Button>
              </div>
              {(app.threadsChannels || []).map(c => <AccountRow key={c._id} c={c} />)}
            </Panel>
          )}
        </div>

        {/* right: telegram + meta checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TelegramCard />
          <Panel>
            <SectionTitle sub={t("Sekali saja di awal")}>{t("Langkah penyiapan")}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {META_STEPS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: s.done ? "var(--green-100)" : "rgba(140,144,158,.13)", color: s.done ? "var(--green-500)" : "var(--ink-400)" }}>
                    {s.done ? <Icons.check size={13} sw={2.4} /> : <span style={{ fontFamily: FC, fontSize: 11, fontWeight: 600 }}>{i + 1}</span>}</span>
                  <span style={{ fontFamily: FC, fontSize: 12.5, color: s.done ? "var(--ink-500)" : "var(--ink-900)", fontWeight: s.done ? 400 : 500, textDecoration: s.done ? "line-through" : "none" }}>{s.t}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" full icon={<Icons.external size={15} />} style={{ marginTop: 14, justifyContent: "flex-start" }} onClick={() => app.go("onboarding")}>{t("Buka panduan lengkap")}</Button>
          </Panel>
        </div>
      </div>

      <AccountRenameModal c={editAcct} onClose={() => setEditAcct(null)} />
      <MoveBrandModal c={moveAcct} brands={brands} onClose={() => setMoveAcct(null)} onMove={moveToBrand} onCreateMove={async (c, name) => { try { const id = await createBrand(name); await setChannelBrand(c._id, id); await app.reload(); app.toast(t("Brand dibuat & akun dipindahkan"), "success"); } catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); } setMoveAcct(null); }} />
      <NameModal cfg={nameModal} onClose={() => setNameModal(null)} onSave={saveBrandName} />
    </div>
  );
}

function TelegramCard() {
  const app = useApp();
  const tg = app.settings.telegram;
  return (
    <Panel strong>
      <SectionTitle sub={t("Pemberitahuan gagal selalu aktif")}>Telegram</SectionTitle>
      {tg.connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--green-100)", borderRadius: 13, padding: "12px 14px" }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--green-grad)", color: "#fff", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Icons.telegram size={19} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FC, fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>{t("Terhubung")}</div>
            <div style={{ fontFamily: FC, fontSize: 11.5, color: "var(--ink-500)" }}>{tg.handle}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => app.testTelegram()}>{t("Kirim tes")}</Button>
          <IconButton icon={<Icons.x size={16} />} tip={t("Putuskan")} onClick={() => app.confirm({ title: t("Putuskan Telegram?"), danger: true, confirmLabel: t("Putuskan"), body: t("Pemberitahuan tetap muncul di aplikasi, tapi tidak dikirim ke Telegram."), onConfirm: () => app.disconnectTelegram() })} />
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: FC, fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, margin: "0 0 12px" }}>{t("Hubungkan Telegram untuk dapat pemberitahuan saat posting gagal, koneksi bermasalah, atau jadwal terlewat.")}</p>
          <Button size="sm" variant="primary" full icon={<Icons.telegram size={16} />} onClick={() => app.connectTelegram()}>{t("Hubungkan Telegram")}</Button>
        </div>
      )}
    </Panel>
  );
}

// Rename an account's (channel's) display name.
function AccountRenameModal({ c, onClose }) {
  const app = useApp();
  const [name, setName] = uCn("");
  React.useEffect(() => { if (c) setName(c.name || ""); }, [c]);
  if (!c) return null;
  const save = () => { app.renameChannel(c, name); onClose(); };
  return (
    <Modal open={!!c} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={t("Ubah nama tampilan akun")}>{t("Identitas akun")}</SectionTitle>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><BrandAvatar brand={acctStyle(c)} src={c.avatarUrl} size={64} ring /></div>
        <Field label={t("Nama akun")}><Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); }} /></Field>
        <Field label={t("Handle")} style={{ marginTop: 14 }}><Input value={c.handle} icon={<Icons.connections size={17} />} readOnly /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          <Button variant="primary" icon={<Icons.check size={17} />} disabled={!name.trim()} onClick={save}>{t("Simpan")}</Button>
        </div>
      </div>
    </Modal>
  );
}

// Create / rename a brand.
function NameModal({ cfg, onClose, onSave }) {
  const [name, setName] = uCn("");
  React.useEffect(() => { if (cfg) setName(cfg.brand?.name || ""); }, [cfg]);
  if (!cfg) return null;
  const isRename = cfg.mode === "rename";
  const save = () => name.trim() && onSave(name.trim(), cfg.brand || null);
  return (
    <Modal open={!!cfg} onClose={onClose} width={420}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={isRename ? t("Ubah nama brand") : t("Buat workspace brand baru")}>{isRename ? t("Ubah brand") : t("Brand baru")}</SectionTitle>
        <Field label={t("Nama brand")}><Input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); }} placeholder={t("mis. Mahakan Coffee")} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          <Button variant="primary" icon={<Icons.check size={17} />} disabled={!name.trim()} onClick={save}>{isRename ? t("Simpan") : t("Buat")}</Button>
        </div>
      </div>
    </Modal>
  );
}

// Move an account into another brand (or a brand-new one).
function MoveBrandModal({ c, brands, onClose, onMove, onCreateMove }) {
  const [pick, setPick] = uCn("");
  const [newName, setNewName] = uCn("");
  React.useEffect(() => { if (c) { setPick(c.brandId || ""); setNewName(""); } }, [c]);
  if (!c) return null;
  const others = brands.filter(b => b.id !== c.brandId);
  return (
    <Modal open={!!c} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`${c.handle} (${PLAT[c.platform]?.l || c.platform})`}>{t("Pindahkan ke brand")}</SectionTitle>
        <Field label={t("Brand tujuan")}>
          <Select value={pick} onChange={setPick} placeholder={t("Pilih brand…")} options={brands.map(b => ({ value: b.id, label: `${b.name}${b.id === c.brandId ? t(" (sekarang)") : ""}` }))} />
        </Field>
        <div style={{ fontFamily: FC, fontSize: 11.5, color: "var(--ink-400)", margin: "14px 0 6px", fontWeight: 600 }}>{t("atau buat brand baru")}</div>
        <Field><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("Nama brand baru…")} /></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          {newName.trim()
            ? <Button variant="primary" icon={<Icons.check size={17} />} onClick={() => onCreateMove(c, newName.trim())}>{t("Buat & pindahkan")}</Button>
            : <Button variant="primary" icon={<Icons.swap size={16} />} disabled={!pick || pick === c.brandId} onClick={() => onMove(c, pick)}>{t("Pindahkan")}</Button>}
        </div>
      </div>
    </Modal>
  );
}
