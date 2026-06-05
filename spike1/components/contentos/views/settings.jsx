"use client";
import React from "react";
import { Icons } from "../icons";
import { MOCK } from "../mockdata";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { Panel, Button, Toggle, Field, Input, Progress, SectionTitle, Avatar } from "../ui";
const FSe = "var(--font)";

function Row({ title, body, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FSe, fontWeight: 500, fontSize: 13.5, color: "var(--ink-900)" }}>{title}</div>
        {body && <div style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.45 }}>{body}</div>}
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
    </div>
  );
}

export function SettingsView() {
  const app = useApp();
  const s = app.settings;
  const set = (patch) => app.setSettings(p => ({ ...p, ...patch }));

  return (
    <div>
      <Topbar title="Settings" sub="Preferensi alert, jadwal, dan data" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* pause all / vacation */}
          <Panel style={{ background: s.pauseAll ? "var(--st-paused-bg)" : "rgba(255,255,255,0.62)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: 14, flex: "0 0 auto", display: "grid", placeItems: "center", background: s.pauseAll ? "var(--st-paused)" : "var(--primary-grad)", color: "#fff" }}><Icons.pause size={22} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>Jeda semua (vacation)</div>
                <div style={{ fontFamily: FSe, fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>Hentikan semua posting di semua channel. Alert run-terlewat ikut disenyapkan.</div>
              </div>
              <Toggle on={s.pauseAll} onChange={v => app.togglePauseAll(v)} />
            </div>
            {s.pauseAll && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(149,121,196,.25)" }}>
                <Field label="Lanjut otomatis pada tanggal (opsional)">
                  <Input type="date" value={s.resumeDate} onChange={e => set({ resumeDate: e.target.value })} />
                </Field>
              </div>
            )}
          </Panel>

          {/* alerts */}
          <Panel>
            <SectionTitle sub="Telegram & in-app">Alert</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title="Telegram" body={s.telegram.connected ? `Terhubung sebagai ${s.telegram.handle}` : "Belum terhubung"}>
                {s.telegram.connected ? <span className="cos-pill" style={{ color: "var(--green-500)", background: "var(--green-100)" }}><span className="dot" style={{ background: "var(--green-500)" }} />Terhubung</span>
                  : <Button size="sm" variant="primary" onClick={() => { set({ telegram: { connected: true, handle: "@rama" } }); app.toast("Telegram terhubung", "success"); }}>Hubungkan</Button>}
              </Row>
              <Row title="Alert kegagalan" body="Publish gagal, token, run terlewat. Selalu aktif — tidak bisa dimatikan.">
                <span style={{ fontFamily: FSe, fontSize: 12, fontWeight: 600, color: "var(--ink-400)" }}>Selalu aktif</span>
              </Row>
              <Row title="Ringkasan harian “posted ✓”" body="Notifikasi Telegram harian saat semua posting berhasil.">
                <Toggle on={s.dailyPing} onChange={v => set({ dailyPing: v })} />
              </Row>
            </div>
          </Panel>

          {/* schedule defaults */}
          <Panel>
            <SectionTitle sub="Berlaku untuk rule baru">Jadwal & waktu</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title="Zona waktu" body="Semua jadwal diautor & ditampilkan dalam WIB.">
                <span style={{ fontFamily: FSe, fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)" }}>WIB (UTC+7)</span>
              </Row>
              <Row title={`Grace window default — ${s.defaultGrace} menit`} body="Toleransi keterlambatan sebelum run ditandai terlewat.">
                <input type="range" min={10} max={60} step={5} value={s.defaultGrace} onChange={e => set({ defaultGrace: +e.target.value })} style={{ width: 160, accentColor: "var(--green-500)" }} />
              </Row>
            </div>
          </Panel>

          {/* data */}
          <Panel>
            <SectionTitle sub="Ekspor & hapus">Data</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title="Ekspor data" body="Unduh semua rule, run, dan pengaturan (JSON).">
                <Button size="sm" variant="secondary" icon={<Icons.upload size={15} style={{ transform: "rotate(180deg)" }} />} onClick={() => app.toast("Menyiapkan ekspor…", "info")}>Ekspor</Button>
              </Row>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FSe, fontWeight: 500, fontSize: 13.5, color: "var(--danger)" }}>Hapus semua data</div>
                  <div style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>Menghapus semua channel, rule, dan media secara permanen.</div>
                </div>
                <Button size="sm" variant="danger" icon={<Icons.trash size={15} />} onClick={() => app.confirm({ title: "Hapus SEMUA data?", confirmLabel: "Hapus semua",
                  body: "Tindakan ini permanen dan tidak bisa dibatalkan.",
                  consequence: "Semua channel, rule, pool media, dan riwayat run akan dihapus selamanya. Kamu harus menyiapkan ulang dari awal.",
                  onConfirm: () => app.toast("Semua data dihapus", "success") })}>Hapus semua</Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* right: storage + profile quick */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Media tersimpan">Penyimpanan</SectionTitle>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: FSe, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>{s.storage.used} MB</span>
              <span style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)" }}>/ {s.storage.total} MB</span>
            </div>
            <Progress value={Math.round(s.storage.used / s.storage.total * 100)} showWarn h={9} />
            <div style={{ fontFamily: FSe, fontSize: 11.5, color: "var(--ink-400)", marginTop: 9 }}>{Math.round(s.storage.used / s.storage.total * 100)}% terpakai</div>
          </Panel>
          <ProfileCard compact />
        </div>
      </div>
    </div>
  );
}

function ProfileCard() {
  const app = useApp();
  const p = MOCK.PROFILE;
  return (
    <Panel>
      <SectionTitle sub="Akun">Profil</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
        <Avatar name={p.name} size={48} />
        <div><div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{p.name}</div>
          <div style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)" }}>{p.email}</div></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", fontFamily: FSe, fontSize: 12.5 }}>
        <span style={{ color: "var(--ink-400)" }}>Metode login</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{p.method}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", fontFamily: FSe, fontSize: 12.5 }}>
        <span style={{ color: "var(--ink-400)" }}>Bergabung</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{p.joined}</span>
      </div>
      <Button variant="secondary" full icon={<Icons.logout size={16} />} style={{ marginTop: 14 }} onClick={() => app.confirm({ title: "Keluar dari SinaraCast?", danger: false, confirmLabel: "Keluar",
        body: "Kamu bisa masuk lagi kapan saja lewat magic link.", onConfirm: () => app.go("signin") })}>Keluar</Button>
    </Panel>
  );
}

export function ProfileView() {
  const app = useApp();
  const p = MOCK.PROFILE;
  return (
    <div>
      <Topbar title="Profil" sub="Identitas & sesi" />
      <div style={{ maxWidth: 520 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <Avatar name={p.name} size={64} />
            <div><div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 20, color: "var(--ink-900)" }}>{p.name}</div>
              <div style={{ fontFamily: FSe, fontSize: 13, color: "var(--ink-400)" }}>{p.email}</div></div>
          </div>
          <Field label="Nama" style={{ marginTop: 14 }}><Input defaultValue={p.name} /></Field>
          <Field label="Email" style={{ marginTop: 14 }}><Input defaultValue={p.email} icon={<Icons.mail size={17} />} readOnly /></Field>
          <Row title="Metode login" body="Tanpa kata sandi — tautan masuk dikirim ke email.">
            <span style={{ fontFamily: FSe, fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)" }}>{p.method}</span>
          </Row>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Button variant="primary" icon={<Icons.check size={16} />} onClick={() => app.toast("Profil disimpan", "success")}>Simpan</Button>
            <Button variant="secondary" icon={<Icons.logout size={16} />} onClick={() => app.confirm({ title: "Keluar?", danger: false, confirmLabel: "Keluar", body: "Kamu bisa masuk lagi lewat magic link.", onConfirm: () => app.go("signin") })}>Keluar</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
