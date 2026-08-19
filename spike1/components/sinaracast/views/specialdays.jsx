"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import {
  Panel, Button, IconButton, Field, Input, Select, DateField, Toggle, Chip,
  SectionTitle, EmptyState, Spinner, Modal,
} from "../ui";
import { addSpecialDay, updateSpecialDay, setSpecialDayActive, deleteSpecialDay, syncSpecialDaysNow } from "../dataLayer";
import { t } from "../i18n";

const { useState: uSp } = React;
const FD = "var(--font)";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtID = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${t(HARI[d.getUTCDay()])}, ${d.getUTCDate()} ${t(BULAN[d.getUTCMonth()])} ${d.getUTCFullYear()}`;
};
const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const daysUntil = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayWib()}T00:00:00Z`)) / 86400000);

const KATEGORI = [
  { value: "national", label: "Nasional" },
  { value: "religious", label: "Keagamaan" },
  { value: "custom", label: "Custom" },
];
const KAT_LABEL = { national: "Nasional", religious: "Keagamaan", custom: "Custom" };
const KAT_TONE = { national: "amber", religious: "lilac", custom: "green" };

const countdownLabel = (n) =>
  n === 0 ? t("Hari ini") : n === 1 ? t("Besok") : t("{0} hari lagi", [n]);

export function SpecialDaysView() {
  const app = useApp();
  const days = app.specialDays || [];
  const [date, setDate] = uSp("");
  const [name, setName] = uSp("");
  const [cat, setCat] = uSp("custom");
  const [busy, setBusy] = uSp(false);
  const [syncing, setSyncing] = uSp(false);
  const [editing, setEditing] = uSp(null); // row being edited in the modal
  const [showPast, setShowPast] = uSp(false);

  const today = todayWib();
  const upcoming = days.filter((d) => d.date >= today).sort((a, z) => a.date.localeCompare(z.date));
  const past = days.filter((d) => d.date < today).sort((a, z) => z.date.localeCompare(a.date));
  const nextActive = upcoming.find((d) => d.active);

  // Content already lined up per date: one-off scheduled posts + content plans.
  // Plans linked to a scheduled post are skipped so a hybrid item isn't counted twice.
  const scheduledByDate = {};
  (app.oneoffs || []).forEach((o) => {
    if (o.status === "Skipped" || o.status === "Failed") return;
    const key = `${o.ym}-${String(o.day).padStart(2, "0")}`;
    scheduledByDate[key] = (scheduledByDate[key] || 0) + 1;
  });
  (app.plans || []).forEach((p) => {
    if (!p.plannedDate || p.scheduledPostId) return;
    scheduledByDate[p.plannedDate] = (scheduledByDate[p.plannedDate] || 0) + 1;
  });

  async function add() {
    if (!date || !name.trim()) { app.toast(t("Isi tanggal dan nama harinya dulu"), "error"); return; }
    setBusy(true);
    try {
      await addSpecialDay({ date, name, category: cat });
      await app.reload();
      app.toast(t("“{0}” ditambahkan", [name.trim()]), "success");
      setDate(""); setName(""); setCat("custom");
    } catch (e) { app.toast(t("Gagal menambah: {0}", [e.message || e]), "error"); }
    finally { setBusy(false); }
  }

  async function refresh() {
    setSyncing(true);
    try {
      const r = await syncSpecialDaysNow();
      await app.reload();
      app.toast(r.source === "seed" ? t("Sumber publik tidak terjangkau, pakai data bawaan") : t("Kalender hari besar diperbarui"), "success");
    } catch (e) { app.toast(t("Gagal menyegarkan: {0}", [e.message || e]), "error"); }
    finally { setSyncing(false); }
  }

  async function toggleActive(d, on) {
    app.setSpecialDays((xs) => xs.map((x) => (x.id === d.id ? { ...x, active: on } : x)));
    try { await setSpecialDayActive(d.id, on); }
    catch (e) {
      app.setSpecialDays((xs) => xs.map((x) => (x.id === d.id ? { ...x, active: !on } : x)));
      app.toast(t("Gagal menyimpan: {0}", [e.message || e]), "error");
    }
  }

  function removeDay(d) {
    app.confirm({
      title: t("Hapus “{0}”?", [d.name]), danger: true, confirmLabel: t("Hapus"),
      body: t("Tanggal ini dihapus dari daftar hari spesial."),
      consequence: t("Jadwal otomatis akan memperlakukan tanggal ini seperti hari biasa."),
      onConfirm: async () => {
        try { await deleteSpecialDay(d.id); await app.reload(); app.toast(t("“{0}” dihapus", [d.name]), "success"); }
        catch (e) { app.toast(t("Gagal menghapus: {0}", [e.message || e]), "error"); }
      },
    });
  }

  return (
    <div>
      <Topbar title={t("Hari Spesial")}
        sub={t("Hari besar nasional, keagamaan, dan tanggal penting milikmu")}
        right={<Button variant="secondary" icon={syncing ? <Spinner size={15} /> : <Icons.retry size={16} />} disabled={syncing} onClick={refresh}>{syncing ? t("Menyegarkan…") : t("Refresh dari sumber publik")}</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* add your own */}
          <Panel>
            <SectionTitle sub={t("Hari yang belum tercantum bisa kamu tambahkan sendiri.")}>{t("Tambah hari spesial")}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "170px minmax(0,1fr) 150px auto", gap: 12, alignItems: "end" }}>
              <Field label={t("Tanggal")}><DateField value={date} onChange={setDate} /></Field>
              <Field label={t("Nama hari")}><Input placeholder={t("cth. Ulang tahun brand, Hari Kopi")} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label={t("Kategori")}><Select options={KATEGORI} value={cat} onChange={setCat} /></Field>
              <Button variant="amber" icon={busy ? <Spinner size={15} /> : <Icons.plus size={16} sw={2} />} disabled={busy} onClick={add} style={{ height: 46 }}>{t("Tambah")}</Button>
            </div>
          </Panel>

          {/* upcoming list */}
          <Panel pad={0}>
            <div style={{ padding: "18px 18px 4px" }}>
              <SectionTitle sub={t("{0} tanggal di depan. Nonaktifkan yang tidak relevan untuk brand-mu; pilihanmu tidak akan tertimpa refresh.", [upcoming.length])} style={{ marginBottom: 8 }}>{t("Akan datang")}</SectionTitle>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={<Icons.sun size={28} />} title={t("Belum ada hari spesial")}
                body={t("Tekan “Refresh dari sumber publik” untuk mengisi kalender hari besar Indonesia, atau tambah tanggalmu sendiri di atas.")}
                action={<Button variant="amber" icon={<Icons.retry size={16} />} onClick={refresh}>{t("Refresh sekarang")}</Button>} />
            ) : (
              <div>
                {upcoming.map((d, i) => <DayRow key={d.id} d={d} last={i === upcoming.length - 1} count={scheduledByDate[d.date] || 0} onToggle={toggleActive} onEdit={() => setEditing(d)} onDelete={() => removeDay(d)} onCreate={() => app.go("composer", { ch: app.channel, date: d.date })} />)}
              </div>
            )}
          </Panel>

          {/* past, collapsed */}
          {past.length > 0 && (
            <button onClick={() => setShowPast((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FD, fontSize: 12.5, fontWeight: 600, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
              <Icons.chevRight size={14} style={{ transform: showPast ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
              {t("Sudah lewat (")}{past.length})
            </button>
          )}
          {showPast && (
            <Panel pad={0}>
              {past.slice(0, 30).map((d, i) => <DayRow key={d.id} d={d} past last={i === Math.min(past.length, 30) - 1} onToggle={toggleActive} onEdit={() => setEditing(d)} onDelete={() => removeDay(d)} />)}
            </Panel>
          )}
        </div>

        {/* countdown inspector */}
        <Panel strong style={{ position: app.isMobile ? "static" : "sticky", top: 92 }}>
          <SectionTitle sub={t("Hari spesial aktif terdekat")}>{t("Hitung mundur")}</SectionTitle>
          {!nextActive ? (
            <div style={{ fontFamily: FD, fontSize: 13, color: "var(--ink-400)", lineHeight: 1.5 }}>{t("Tidak ada hari spesial aktif di depan.")}</div>
          ) : (
            <div>
              <div style={{ fontFamily: FD, fontSize: 34, fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.1 }}>{countdownLabel(daysUntil(nextActive.date))}</div>
              <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: "var(--ink-700)", marginTop: 8 }}>{nextActive.name}</div>
              <div style={{ fontFamily: FD, fontSize: 12.5, color: "var(--ink-400)", marginTop: 3 }}>{fmtID(nextActive.date)}</div>
              <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />
              <div style={{ fontFamily: FD, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
                {t("Pengingat otomatis dikirim 7 hari dan 1 hari sebelumnya, lewat lonceng aplikasi dan Telegram.")}
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <Button variant="primary" size="sm" full icon={<Icons.plus size={15} sw={2} />} onClick={() => app.go("composer", { ch: app.channel, date: nextActive.date })}>{t("Buat postingan tanggal ini")}</Button>
                <Button variant="secondary" size="sm" full icon={<Icons.rules size={15} />} onClick={() => app.go("rules")}>{t("Atur perilaku jadwal")}</Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <EditModal d={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DayRow({ d, past, last, count = 0, onToggle, onEdit, onDelete, onCreate }) {
  const n = daysUntil(d.date);
  const dim = past || !d.active;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: last ? "none" : "1px solid var(--line)", opacity: dim ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{d.name}</span>
          <Chip tone={KAT_TONE[d.category] || "muted"}>{t(KAT_LABEL[d.category] || d.category)}</Chip>
          {count > 0 && <Chip tone="green" icon={<Icons.checkCircle size={12} />}>{count} {t("konten terjadwal")}</Chip>}
        </div>
        <div style={{ fontFamily: FD, fontSize: 12, color: "var(--ink-500)", marginTop: 3 }}>
          {fmtID(d.date)}{!past && d.active && <span style={{ color: "var(--ink-400)" }}> · {countdownLabel(n)}</span>}
          {!past && count === 0 && <span style={{ color: "var(--ink-300)" }}> {t("· belum ada konten")}</span>}
        </div>
      </div>
      {!past && onCreate && <IconButton icon={<Icons.plus size={16} sw={2} />} tone="amber" tip={t("Buat postingan untuk tanggal ini")} size={32} onClick={onCreate} />}
      <Toggle on={d.active} onChange={(v) => onToggle(d, v)} size="sm" />
      <IconButton icon={<Icons.edit size={15} />} tip={t("Ubah")} size={32} onClick={onEdit} />
      {d.source === "manual"
        ? <IconButton icon={<Icons.trash size={15} />} tone="danger" tip={t("Hapus")} size={32} onClick={onDelete} />
        : <span style={{ width: 32 }} />}
    </div>
  );
}

function EditModal({ d, onClose }) {
  const app = useApp();
  const [date, setDate] = uSp("");
  const [name, setName] = uSp("");
  const [cat, setCat] = uSp("custom");
  const [busy, setBusy] = uSp(false);
  React.useEffect(() => { if (d) { setDate(d.date); setName(d.name); setCat(d.category); } }, [d]);
  if (!d) return null;

  async function save() {
    if (!date || !name.trim()) { app.toast(t("Tanggal dan nama wajib diisi"), "error"); return; }
    setBusy(true);
    try {
      await updateSpecialDay(d.id, { date, name, category: cat });
      await app.reload();
      app.toast(t("Perubahan disimpan"), "success");
      onClose();
    } catch (e) { app.toast(t("Gagal menyimpan: {0}", [e.message || e]), "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={!!d} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={t("Perubahanmu tidak akan tertimpa refresh otomatis.")}>{t("Ubah hari spesial")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label={t("Tanggal")}><DateField value={date} onChange={setDate} /></Field>
          <Field label={t("Nama hari")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t("Kategori")}><Select options={KATEGORI} value={cat} onChange={setCat} /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>
          <Button variant="primary" disabled={busy} icon={busy ? <Spinner size={15} /> : <Icons.check size={16} />} onClick={save}>{t("Simpan")}</Button>
        </div>
      </div>
    </Modal>
  );
}
