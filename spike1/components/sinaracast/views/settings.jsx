"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { Panel, Button, Toggle, Field, Input, Progress, SectionTitle, Avatar, DateField, Slider, LangSwitch } from "../ui";
import { THEMES } from "../theme";
import { t } from "../i18n";
const FSe = "var(--font)";

// Theme picker — custom swatch cards (no native radio). Only colors change;
// the whole app recolors instantly because every component reads CSS tokens.
function ThemePicker() {
  const app = useApp();
  return (
    <Panel>
      <SectionTitle sub={t("Pilih warna favoritmu — cuma warnanya yang berubah, tata letaknya tetap")}>{t("Tampilan")}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 4 }}>
        {THEMES.map((th) => {
          const active = app.theme === th.id;
          return (
            <button key={th.id} type="button" onClick={() => app.setTheme(th.id)} aria-pressed={active}
              style={{ position: "relative", textAlign: "left", cursor: "pointer", padding: 14, borderRadius: 16,
                border: active ? "2px solid var(--primary-500)" : "1px solid var(--line)",
                background: active ? "var(--primary-100)" : "var(--surface-2)",
                boxShadow: active ? "var(--shadow-sm)" : "none", transition: "border-color .18s, background .18s, box-shadow .18s" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
                {th.swatch.map((c, i) => (
                  <span key={i} style={{ width: 24, height: 24, borderRadius: 8, background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }} />
                ))}
              </div>
              <div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{t(th.name)}</div>
              <div style={{ fontFamily: FSe, fontSize: 11.5, color: "var(--ink-500)", marginTop: 1 }}>{t(th.sub)}</div>
              {active && (
                <span style={{ position: "absolute", top: 11, right: 11, width: 20, height: 20, borderRadius: "50%", background: "var(--primary-grad)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--shadow-primary)" }}>
                  <Icons.check size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 4 }}>
        <Row title={t("Bahasa aplikasi")}
          body={t("Semua tulisan di aplikasi ikut bahasa ini. Caption dan isi kontenmu tidak diterjemahkan.")}>
          <LangSwitch size="sm" />
        </Row>
      </div>
    </Panel>
  );
}

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
      <Topbar title={t("Pengaturan")} sub={t("Pemberitahuan, jadwal, dan data")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* pause all / vacation */}
          <Panel style={{ background: s.pauseAll ? "var(--st-paused-bg)" : "var(--panel)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: 14, flex: "0 0 auto", display: "grid", placeItems: "center", background: s.pauseAll ? "var(--st-paused)" : "var(--primary-grad)", color: "#fff" }}><Icons.pause size={22} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{t("Mode Libur")}</div>
                <div style={{ fontFamily: FSe, fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>{t("Berhenti memposting di semua akun untuk sementara. Selama libur, kamu juga tidak diingatkan soal jadwal yang terlewat.")}</div>
              </div>
              <Toggle on={s.pauseAll} onChange={v => app.togglePauseAll(v)} />
            </div>
            {s.pauseAll && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(149,121,196,.25)" }}>
                <Field label={t("Lanjut otomatis pada tanggal (boleh dikosongkan)")}>
                  <DateField value={s.resumeDate} onChange={v => set({ resumeDate: v })} />
                </Field>
              </div>
            )}
          </Panel>

          {/* appearance / theme */}
          <ThemePicker />

          {/* alerts */}
          <Panel>
            <SectionTitle sub={t("Lewat Telegram & di dalam aplikasi")}>{t("Pemberitahuan")}</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title="Telegram" body={s.telegram.connected ? t("Terhubung sebagai {0}", [s.telegram.handle]) : t("Belum terhubung")}>
                {s.telegram.connected
                  ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="sc-pill" style={{ color: "var(--green-500)", background: "var(--green-100)" }}><span className="dot" style={{ background: "var(--green-500)" }} />{t("Terhubung")}</span><Button size="sm" variant="secondary" onClick={() => app.testTelegram()}>{t("Kirim tes")}</Button><Button size="sm" variant="ghost" onClick={() => app.confirm({ title: t("Putuskan Telegram?"), confirmLabel: t("Putuskan"), body: t("Pemberitahuan tidak lagi dikirim ke Telegram (tetap muncul di dalam aplikasi)."), onConfirm: () => app.disconnectTelegram() })}>{t("Putuskan")}</Button></div>
                  : <Button size="sm" variant="primary" onClick={() => app.connectTelegram()}>{t("Hubungkan")}</Button>}
              </Row>
              <Row title={t("Pemberitahuan kalau gagal")} body={t("Saat ada postingan gagal terbit, token bermasalah, atau jadwal terlewat. Selalu aktif.")}>
                <span style={{ fontFamily: FSe, fontSize: 12, fontWeight: 600, color: "var(--ink-400)" }}>{t("Selalu aktif")}</span>
              </Row>
              <Row title={t("Laporan harian")} body={t("Tiap hari dikabari di Telegram kalau semua postingan berhasil terbit.")}>
                <Toggle on={s.dailyPing} onChange={v => app.saveSettings({ dailyPing: v })} />
              </Row>
            </div>
          </Panel>

          {/* schedule defaults */}
          <Panel>
            <SectionTitle sub={t("Berlaku untuk jadwal baru")}>{t("Jadwal & waktu")}</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title={t("Zona waktu")} body={t("Semua jadwal dibuat & ditampilkan dalam WIB.")}>
                <span style={{ fontFamily: FSe, fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)" }}>{t("WIB (UTC+7)")}</span>
              </Row>
              <Row title={t("Toleransi telat — {0} menit", [s.defaultGrace])} body={t("Berapa lama postingan masih boleh telat sebelum dianggap terlewat.")}>
                <Slider min={10} max={60} step={5} value={s.defaultGrace}
                  onChange={v => set({ defaultGrace: v })}
                  onCommit={v => app.saveSettings({ defaultGrace: v })}
                  style={{ width: 160 }} />
              </Row>
            </div>
          </Panel>

          {/* special days */}
          <Panel>
            <SectionTitle sub={t("Hari besar nasional, keagamaan, dan tanggalmu sendiri")}>{t("Hari Spesial")}</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title={t("Pengingat hari spesial")} body={t("Diingatkan 7 hari dan 1 hari sebelum tiap hari spesial aktif, lewat lonceng aplikasi & Telegram.")}>
                <Toggle on={s.specialReminders} onChange={v => { set({ specialReminders: v }); app.saveSettings({ specialReminders: v }); }} />
              </Row>
              <Row title={t("Daftar hari spesial")} body={t("Kalender hari besar tersinkron otomatis tiap hari; tambah, ubah, atau nonaktifkan tanggal di halamannya.")}>
                <Button size="sm" variant="secondary" icon={<Icons.sun size={15} />} onClick={() => app.go("specialdays")}>{t("Kelola")}</Button>
              </Row>
            </div>
          </Panel>

          {/* reports & metrics */}
          <Panel>
            <SectionTitle sub={t("Berjalan otomatis di latar belakang")}>{t("Laporan & metrik")}</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title={t("Metrik konten otomatis")} body={t("Story diambil menjelang 24 jam tayang (Instagram menghapusnya setelah itu); Feed & Reels diperbarui harian sampai 30 hari.")}>
                <span style={{ fontFamily: FSe, fontSize: 12, fontWeight: 600, color: "var(--ink-400)" }}>{t("Selalu aktif")}</span>
              </Row>
              <Row title={t("Pencatatan followers harian")} body={t("Jumlah followers tiap akun dicatat sekali sehari untuk grafik pertumbuhan.")}>
                <span style={{ fontFamily: FSe, fontSize: 12, fontWeight: 600, color: "var(--ink-400)" }}>{t("Selalu aktif")}</span>
              </Row>
              <Row title={t("Ringkasan")} body={t("Performa per konten, total metrik, dan naik-turun followers.")}>
                <Button size="sm" variant="secondary" icon={<Icons.sparkle size={15} />} onClick={() => app.go("ringkasan")}>{t("Buka")}</Button>
              </Row>
            </div>
          </Panel>

          {/* data */}
          <Panel>
            <SectionTitle sub={t("Ekspor & hapus")}>{t("Data")}</SectionTitle>
            <div style={{ marginTop: -4 }}>
              <Row title={t("Unduh data saya")} body={t("Simpan semua akun, jadwal, riwayat, dan pengaturan jadi satu file (JSON).")}>
                <Button size="sm" variant="secondary" icon={<Icons.upload size={15} style={{ transform: "rotate(180deg)" }} />} onClick={() => app.exportData()}>{t("Unduh")}</Button>
              </Row>
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FSe, fontWeight: 500, fontSize: 13.5, color: "var(--danger)" }}>{t("Hapus semua data")}</div>
                  <div style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{t("Menghapus semua akun, jadwal, dan gambar secara permanen.")}</div>
                </div>
                <Button size="sm" variant="danger" icon={<Icons.trash size={15} />} onClick={() => app.confirm({ title: t("Hapus SEMUA data?"), confirmLabel: t("Hapus semua"),
                  body: t("Tindakan ini permanen dan tidak bisa dibatalkan."),
                  consequence: t("Semua akun, jadwal, gambar, dan riwayat akan hilang selamanya. Kamu harus menyiapkan semuanya dari awal lagi."),
                  onConfirm: () => app.deleteEverything() })}>{t("Hapus semua")}</Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* right: storage + profile quick (pinned while the left column scrolls) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: app.isMobile ? "static" : "sticky", top: 92 }}>
          <Panel strong>
            <SectionTitle sub={t("Media tersimpan")}>{t("Penyimpanan")}</SectionTitle>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: FSe, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>{s.storage.used} MB</span>
              <span style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)" }}>/ {s.storage.total} MB</span>
            </div>
            <Progress value={Math.round(s.storage.used / s.storage.total * 100)} showWarn h={9} />
            <div style={{ fontFamily: FSe, fontSize: 11.5, color: "var(--ink-400)", marginTop: 9 }}>{Math.round(s.storage.used / s.storage.total * 100)}{t("% terpakai")}</div>
            {(app.channels || []).length > 0 && <>
              <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(app.channels || []).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <span style={{ flex: 1, fontFamily: FSe, fontSize: 12, color: "var(--ink-600)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.handle || c.name}</span>
                    <span style={{ fontFamily: FSe, fontSize: 11.5, color: "var(--ink-400)", fontVariantNumeric: "tabular-nums" }}>{s.storage.perChannel?.[c.id] ?? 0} MB</span>
                  </div>
                ))}
              </div>
            </>}
          </Panel>
          <ProfileCard compact />
        </div>
      </div>
    </div>
  );
}

function ProfileCard() {
  const app = useApp();
  const p = app.profile;
  return (
    <Panel>
      <SectionTitle sub={t("Akun")}>{t("Profil")}</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
        <Avatar name={p.name} size={48} />
        <div><div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{p.name}</div>
          <div style={{ fontFamily: FSe, fontSize: 12, color: "var(--ink-400)" }}>{p.email}</div></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", fontFamily: FSe, fontSize: 12.5 }}>
        <span style={{ color: "var(--ink-400)" }}>{t("Metode login")}</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{p.method}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)", fontFamily: FSe, fontSize: 12.5 }}>
        <span style={{ color: "var(--ink-400)" }}>{t("Bergabung")}</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{p.joined}</span>
      </div>
      <Button variant="secondary" full icon={<Icons.logout size={16} />} style={{ marginTop: 14 }} onClick={() => app.confirm({ title: t("Keluar dari SinaraCast?"), confirmLabel: t("Keluar"),
        body: t("Kamu bisa masuk lagi kapan saja lewat email."), onConfirm: () => app.signOut() })}>{t("Keluar")}</Button>
    </Panel>
  );
}

export function ProfileView() {
  const app = useApp();
  const p = app.profile;
  return (
    <div>
      <Topbar title={t("Profil")} sub={t("Akun kamu")} />
      <div style={{ maxWidth: 520 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <Avatar name={p.name} size={64} />
            <div><div style={{ fontFamily: FSe, fontWeight: 600, fontSize: 20, color: "var(--ink-900)" }}>{p.name}</div>
              <div style={{ fontFamily: FSe, fontSize: 13, color: "var(--ink-400)" }}>{p.email}</div></div>
          </div>
          <Field label={t("Nama")} style={{ marginTop: 14 }}><Input defaultValue={p.name} /></Field>
          <Field label="Email" style={{ marginTop: 14 }}><Input defaultValue={p.email} icon={<Icons.mail size={17} />} readOnly /></Field>
          <Row title={t("Cara masuk")} body={t("Tanpa kata sandi. Kode masuk dikirim ke email kamu.")}>
            <span style={{ fontFamily: FSe, fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)" }}>{p.method}</span>
          </Row>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Button variant="primary" icon={<Icons.check size={16} />} onClick={() => app.toast(t("Profil disimpan"), "success")}>{t("Simpan")}</Button>
            <Button variant="secondary" icon={<Icons.logout size={16} />} onClick={() => app.confirm({ title: t("Keluar?"), confirmLabel: t("Keluar"), body: t("Kamu bisa masuk lagi lewat email."), onConfirm: () => app.signOut() })}>{t("Keluar")}</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
