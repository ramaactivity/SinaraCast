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

const { useState: uSp } = React;
const FD = "var(--font)";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const fmtID = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
  n === 0 ? "Hari ini" : n === 1 ? "Besok" : `${n} hari lagi`;

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

  async function add() {
    if (!date || !name.trim()) { app.toast("Isi tanggal dan nama harinya dulu", "error"); return; }
    setBusy(true);
    try {
      await addSpecialDay({ date, name, category: cat });
      await app.reload();
      app.toast(`“${name.trim()}” ditambahkan`, "success");
      setDate(""); setName(""); setCat("custom");
    } catch (e) { app.toast("Gagal menambah: " + (e.message || e), "error"); }
    finally { setBusy(false); }
  }

  async function refresh() {
    setSyncing(true);
    try {
      const r = await syncSpecialDaysNow();
      await app.reload();
      app.toast(r.source === "seed" ? "Sumber publik tidak terjangkau, pakai data bawaan" : "Kalender hari besar diperbarui", "success");
    } catch (e) { app.toast("Gagal menyegarkan: " + (e.message || e), "error"); }
    finally { setSyncing(false); }
  }

  async function toggleActive(d, on) {
    app.setSpecialDays((xs) => xs.map((x) => (x.id === d.id ? { ...x, active: on } : x)));
    try { await setSpecialDayActive(d.id, on); }
    catch (e) {
      app.setSpecialDays((xs) => xs.map((x) => (x.id === d.id ? { ...x, active: !on } : x)));
      app.toast("Gagal menyimpan: " + (e.message || e), "error");
    }
  }

  function removeDay(d) {
    app.confirm({
      title: `Hapus “${d.name}”?`, danger: true, confirmLabel: "Hapus",
      body: "Tanggal ini dihapus dari daftar hari spesial.",
      consequence: "Jadwal otomatis akan memperlakukan tanggal ini seperti hari biasa.",
      onConfirm: async () => {
        try { await deleteSpecialDay(d.id); await app.reload(); app.toast(`“${d.name}” dihapus`, "success"); }
        catch (e) { app.toast("Gagal menghapus: " + (e.message || e), "error"); }
      },
    });
  }

  return (
    <div>
      <Topbar title="Hari Spesial"
        sub="Hari besar nasional, keagamaan, dan tanggal penting milikmu"
        right={<Button variant="secondary" icon={syncing ? <Spinner size={15} /> : <Icons.retry size={16} />} disabled={syncing} onClick={refresh}>{syncing ? "Menyegarkan…" : "Refresh dari sumber publik"}</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* add your own */}
          <Panel>
            <SectionTitle sub="Hari yang belum tercantum bisa kamu tambahkan sendiri.">Tambah hari spesial</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "170px minmax(0,1fr) 150px auto", gap: 12, alignItems: "end" }}>
              <Field label="Tanggal"><DateField value={date} onChange={setDate} /></Field>
              <Field label="Nama hari"><Input placeholder="cth. Ulang tahun brand, Hari Kopi" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Kategori"><Select options={KATEGORI} value={cat} onChange={setCat} /></Field>
              <Button variant="amber" icon={busy ? <Spinner size={15} /> : <Icons.plus size={16} sw={2} />} disabled={busy} onClick={add} style={{ height: 46 }}>Tambah</Button>
            </div>
          </Panel>

          {/* upcoming list */}
          <Panel pad={0}>
            <div style={{ padding: "18px 18px 4px" }}>
              <SectionTitle sub={`${upcoming.length} tanggal di depan. Nonaktifkan yang tidak relevan untuk brand-mu; pilihanmu tidak akan tertimpa refresh.`} style={{ marginBottom: 8 }}>Akan datang</SectionTitle>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={<Icons.sun size={28} />} title="Belum ada hari spesial"
                body="Tekan “Refresh dari sumber publik” untuk mengisi kalender hari besar Indonesia, atau tambah tanggalmu sendiri di atas."
                action={<Button variant="amber" icon={<Icons.retry size={16} />} onClick={refresh}>Refresh sekarang</Button>} />
            ) : (
              <div>
                {upcoming.map((d, i) => <DayRow key={d.id} d={d} last={i === upcoming.length - 1} onToggle={toggleActive} onEdit={() => setEditing(d)} onDelete={() => removeDay(d)} />)}
              </div>
            )}
          </Panel>

          {/* past, collapsed */}
          {past.length > 0 && (
            <button onClick={() => setShowPast((v) => !v)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FD, fontSize: 12.5, fontWeight: 600, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
              <Icons.chevRight size={14} style={{ transform: showPast ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
              Sudah lewat ({past.length})
            </button>
          )}
          {showPast && (
            <Panel pad={0}>
              {past.slice(0, 30).map((d, i) => <DayRow key={d.id} d={d} past last={i === Math.min(past.length, 30) - 1} onToggle={toggleActive} onEdit={() => setEditing(d)} onDelete={() => removeDay(d)} />)}
            </Panel>
          )}
        </div>

        {/* countdown inspector */}
        <Panel strong style={{ position: app.isMobile ? "static" : "sticky", top: 8 }}>
          <SectionTitle sub="Hari spesial aktif terdekat">Hitung mundur</SectionTitle>
          {!nextActive ? (
            <div style={{ fontFamily: FD, fontSize: 13, color: "var(--ink-400)", lineHeight: 1.5 }}>Tidak ada hari spesial aktif di depan.</div>
          ) : (
            <div>
              <div style={{ fontFamily: FD, fontSize: 34, fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.1 }}>{countdownLabel(daysUntil(nextActive.date))}</div>
              <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: "var(--ink-700)", marginTop: 8 }}>{nextActive.name}</div>
              <div style={{ fontFamily: FD, fontSize: 12.5, color: "var(--ink-400)", marginTop: 3 }}>{fmtID(nextActive.date)}</div>
              <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />
              <div style={{ fontFamily: FD, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.55 }}>
                Pengingat otomatis dikirim 7 hari dan 1 hari sebelumnya, lewat lonceng aplikasi dan Telegram.
              </div>
              <div style={{ marginTop: 14 }}>
                <Button variant="secondary" size="sm" full icon={<Icons.rules size={15} />} onClick={() => app.go("rules")}>Atur perilaku jadwal</Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <EditModal d={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DayRow({ d, past, last, onToggle, onEdit, onDelete }) {
  const n = daysUntil(d.date);
  const dim = past || !d.active;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: last ? "none" : "1px solid var(--line)", opacity: dim ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{d.name}</span>
          <Chip tone={KAT_TONE[d.category] || "muted"}>{KAT_LABEL[d.category] || d.category}</Chip>
        </div>
        <div style={{ fontFamily: FD, fontSize: 12, color: "var(--ink-500)", marginTop: 3 }}>
          {fmtID(d.date)}{!past && d.active && <span style={{ color: "var(--ink-400)" }}> · {countdownLabel(n)}</span>}
        </div>
      </div>
      <Toggle on={d.active} onChange={(v) => onToggle(d, v)} size="sm" />
      <IconButton icon={<Icons.edit size={15} />} tip="Ubah" size={32} onClick={onEdit} />
      {d.source === "manual"
        ? <IconButton icon={<Icons.trash size={15} />} tone="danger" tip="Hapus" size={32} onClick={onDelete} />
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
    if (!date || !name.trim()) { app.toast("Tanggal dan nama wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await updateSpecialDay(d.id, { date, name, category: cat });
      await app.reload();
      app.toast("Perubahan disimpan", "success");
      onClose();
    } catch (e) { app.toast("Gagal menyimpan: " + (e.message || e), "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={!!d} onClose={onClose} width={440}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub="Perubahanmu tidak akan tertimpa refresh otomatis.">Ubah hari spesial</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Tanggal"><DateField value={date} onChange={setDate} /></Field>
          <Field label="Nama hari"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Kategori"><Select options={KATEGORI} value={cat} onChange={setCat} /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={busy} icon={busy ? <Spinner size={15} /> : <Icons.check size={16} />} onClick={save}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
