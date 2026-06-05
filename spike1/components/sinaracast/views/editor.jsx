"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Button, Field, Input, Select, TimeField,
  Segmented, EmptyState, Chip, SectionTitle, Banner, Spinner,
} from "../ui";
import {
  uploadPoolImage, createRuleWithPools, updateRuleFields, loadRuleDetail, addPoolImageRow, removePoolImageRow,
} from "../dataLayer";
import { Lightbox } from "../lightbox";
const { useState: uEd, useRef, useEffect } = React;
const FE = "var(--font)";

const CADENCE = [
  { value: "daily", label: "Setiap hari" },
  { value: "everyN", label: "Setiap beberapa hari" },
  { value: "weekdays", label: "Hari tertentu saja" },
];
const WD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]; // editor idx 0=Mon..6=Sun
const toDow = (i) => (i + 1) % 7;   // editor idx -> schema dow (0=Sun..6=Sat)
const fromDow = (d) => (d + 6) % 7; // schema dow -> editor idx

function readDims(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { res({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { rej(new Error("read")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export function EditorView() {
  const app = useApp();
  const { id, ch: pCh } = app.params;
  const existing = id ? app.rules.find((r) => r.id === id) : null;
  const isNew = !existing;
  const chId = pCh || existing?.ch || app.channel;
  const channel = app.channels.find((c) => c.id === chId);
  const b = BRANDS[chId] || { name: channel?.name || "—", accent: "var(--ink-500)", soft: "var(--line)" };

  const [name, setName] = uEd(existing ? existing.name : "");
  const [mode, setMode] = uEd(existing ? existing.mode : "schedule");
  const [cadence, setCadence] = uEd("daily");
  const [everyN, setEveryN] = uEd(2);
  const [days, setDays] = uEd([0, 1, 2, 3, 4]);
  const [time, setTime] = uEd("08:00");
  const [wdTime, setWdTime] = uEd("14:00");
  const [weTime, setWeTime] = uEd("09:00");
  const [grace, setGrace] = uEd(app.settings.defaultGrace || 30);
  const [holidays, setHolidays] = uEd([]);
  const [images, setImages] = uEd({ weekday: [], weekend: [], single: [] });
  const [poolIdByRole, setPoolIdByRole] = uEd({});
  const [tab, setTab] = uEd("weekday");
  const [touched, setTouched] = uEd(false);
  const [loading, setLoading] = uEd(!!existing);
  const [uploading, setUploading] = uEd(false);
  const [saving, setSaving] = uEd(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!existing) return;
    let active = true;
    loadRuleDetail(id).then(({ rule, images: im, poolIdByRole: pr }) => {
      if (!active) return;
      if (rule) {
        setMode(rule.mode);
        setCadence(rule.cadence_type === "daily" ? "daily" : rule.cadence_type === "every_n_days" ? "everyN" : "weekdays");
        if (rule.interval_days) setEveryN(rule.interval_days);
        if (rule.weekdays?.length) setDays(rule.weekdays.map(fromDow).sort((a, z) => a - z));
        if (rule.post_time) setTime(rule.post_time.slice(0, 5));
        if (rule.weekday_time) setWdTime(rule.weekday_time.slice(0, 5));
        if (rule.weekend_time) setWeTime(rule.weekend_time.slice(0, 5));
        setGrace(rule.grace_minutes);
      }
      setImages({ weekday: im.weekday, weekend: im.weekend, single: im.single });
      setPoolIdByRole(pr);
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const role = mode === "schedule" ? tab : "single";
  const curImgs = images[role] || [];
  const reqRoles = mode === "schedule" ? ["weekday", "weekend"] : ["single"];
  const emptyRole = reqRoles.find((r) => (images[r] || []).length === 0);
  const errors = {};
  if (touched && !name.trim()) errors.name = "Beri nama jadwalnya dulu.";
  if (touched && emptyRole) errors.pool = `Kumpulan ${emptyRole === "weekday" ? "hari kerja " : emptyRole === "weekend" ? "akhir pekan " : ""}masih kosong, minimal 1 gambar.`;

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    for (const file of files) {
      if (!["image/jpeg", "image/png"].includes(file.type)) { app.toast("Hanya JPG / PNG", "error"); continue; }
      if (file.size > 8 * 1024 * 1024) { app.toast("Maksimal 8 MB", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      if (Math.abs(dim.width / dim.height - 9 / 16) > 0.04) { app.toast(`Rasio harus 9:16 — gambar ini ${dim.width}×${dim.height}`, "error"); continue; }
      setUploading(true);
      try {
        const row = await uploadPoolImage(file, chId, dim);
        if (!isNew && poolIdByRole[role]) {
          row.id = await addPoolImageRow(poolIdByRole[role], row, (images[role] || []).length);
          row.poolId = poolIdByRole[role];
        }
        setImages((im) => ({ ...im, [role]: [...(im[role] || []), row] }));
        app.toast("Gambar diunggah & divalidasi (9:16) ✓", "success");
      } catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
      finally { setUploading(false); }
    }
  }

  async function removeImg(idx) {
    const item = curImgs[idx];
    setImages((im) => ({ ...im, [role]: (im[role] || []).filter((_, i) => i !== idx) }));
    try { await removePoolImageRow(item.id, item.storage_path); } catch {}
  }

  async function save() {
    setTouched(true);
    if (!name.trim() || emptyRole) { app.toast("Lengkapi data yang wajib diisi", "error"); return; }
    const payload = {
      channelDbId: channel?._id, name: name.trim(), mode,
      cadenceType: cadence === "daily" ? "daily" : cadence === "everyN" ? "every_n_days" : "weekdays",
      intervalDays: cadence === "everyN" ? everyN : null,
      weekdaysDb: cadence === "weekdays" ? days.map(toDow).sort((a, z) => a - z) : null,
      postTime: time, weekdayTime: wdTime, weekendTime: weTime, grace,
      images: mode === "schedule" ? { weekday: images.weekday, weekend: images.weekend } : { single: images.single },
    };
    setSaving(true);
    try {
      if (isNew) await createRuleWithPools(payload);
      else await updateRuleFields(id, payload);
      await app.reload();
      app.toast(`Jadwal “${name}” disimpan`, "success");
      app.go("rules");
    } catch (err) { app.toast("Gagal menyimpan: " + (err.message || err), "error"); }
    finally { setSaving(false); }
  }

  if (!channel) {
    return <div><Topbar title="Buat jadwal" /><Panel pad={0}><EmptyState icon={<Icons.connections size={28} />} title="Pilih akun dulu" body="Sambungkan akun Instagram dulu untuk membuat jadwal." action={<Button variant="amber" onClick={() => app.go("connections")}>Manajemen Akun</Button>} /></Panel></div>;
  }
  if (loading) return <div style={{ display: "grid", placeItems: "center", minHeight: 320 }}><Spinner size={30} /></div>;

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple onChange={onFiles} style={{ display: "none" }} />
      <Topbar title={existing ? "Ubah jadwal" : "Buat jadwal"}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · {channel.handle}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("rules")}>Kembali</Button>
          <Button variant="primary" icon={saving ? <Spinner size={15} /> : <Icons.check size={17} />} disabled={saving} onClick={save}>{saving ? "Menyimpan…" : "Simpan jadwal"}</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub="Nama, cara, dan akun tujuan">Dasar</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Nama jadwal" error={errors.name}>
                <Input placeholder="cth. Jam buka" value={name} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Akun">
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 14px", background: "var(--line-soft)", borderRadius: 13, border: "1px solid var(--line)" }}>
                  <BrandAvatar brand={b} size={26} /><span style={{ fontFamily: FE, fontWeight: 500, fontSize: 13.5, color: "var(--ink-900)" }}>{b.name}</span>
                </div>
              </Field>
            </div>
            <Field label="Cara pilih gambar" hint={mode === "schedule" ? "Gambar beda untuk hari kerja & akhir pekan." : "Satu kumpulan gambar, diacak bergiliran tanpa diulang."} style={{ marginTop: 14 }}>
              <Segmented full options={[{ value: "schedule", label: "Beda akhir pekan" }, { value: "pool", label: "Satu kumpulan" }]} value={mode} onChange={setMode} />
            </Field>
          </Panel>

          <Panel>
            <SectionTitle sub="Unggah gambar Story. Syarat: ukuran 9:16, JPG/PNG, maks 8 MB."
              right={<Button size="sm" variant="secondary" disabled={uploading} icon={uploading ? <Spinner size={15} /> : <Icons.upload size={16} />} onClick={() => fileRef.current?.click()}>{uploading ? "Mengunggah…" : "Unggah gambar"}</Button>}>Kumpulan gambar</SectionTitle>
            {errors.pool && <Banner tone="warn" icon={<Icons.warn size={17} />} title="Gambar tidak boleh kosong" body={errors.pool} />}
            {mode === "schedule" && (
              <div style={{ marginBottom: 14 }}>
                <Segmented options={[{ value: "weekday", label: `Hari kerja · ${images.weekday.length}` }, { value: "weekend", label: `Akhir pekan · ${images.weekend.length}` }]} value={tab} onChange={setTab} />
              </div>
            )}
            <PoolGrid imgs={curImgs} onAdd={() => fileRef.current?.click()} onRemove={removeImg} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontFamily: FE, fontSize: 12, color: "var(--ink-500)" }}>
              <Icons.shuffle size={15} style={{ color: b.accent }} /> Acak tanpa ulang: tiap gambar terpakai sekali per siklus sebelum diacak ulang.
            </div>
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Semua waktu WIB (UTC+7)">Waktu posting</SectionTitle>
            <Field label="Seberapa sering">
              <Select options={CADENCE} value={cadence} onChange={setCadence} />
            </Field>
            {cadence === "everyN" && <Field label="Setiap berapa hari" style={{ marginTop: 12 }}><Input type="number" min={2} value={everyN} onChange={(e) => setEveryN(+e.target.value)} /></Field>}
            {cadence === "weekdays" && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                {WD.map((d, i) => (
                  <button key={d} onClick={() => setDays((ds) => ds.includes(i) ? ds.filter((x) => x !== i) : [...ds, i])}
                    style={{ flex: 1, height: 38, borderRadius: 10, border: "1px solid " + (days.includes(i) ? b.accent : "var(--line)"), cursor: "pointer",
                      background: days.includes(i) ? b.soft : "#fff", color: days.includes(i) ? b.accent : "var(--ink-400)", fontFamily: FE, fontSize: 11.5, fontWeight: 600 }}>{d}</button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              {mode === "schedule" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Jam hari kerja"><TimeField value={wdTime} onChange={setWdTime} /></Field>
                  <Field label="Jam akhir pekan"><TimeField value={weTime} onChange={setWeTime} /></Field>
                </div>
              ) : (
                <Field label="Jam posting"><TimeField value={time} onChange={setTime} /></Field>
              )}
            </div>
            <Field label={`Toleransi telat — ${grace} menit`} hint="Berapa lama masih boleh telat sebelum dianggap terlewat." style={{ marginTop: 14 }}>
              <input type="range" min={10} max={60} step={5} value={grace} onChange={(e) => setGrace(+e.target.value)} style={{ width: "100%", accentColor: "var(--green-500)" }} />
            </Field>
          </Panel>

          <Panel>
            <SectionTitle sub="Jadwal otomatis dilewati pada tanggal ini">Hari libur</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {holidays.length === 0 && <span style={{ fontFamily: FE, fontSize: 12.5, color: "var(--ink-400)" }}>Belum ada tanggal libur.</span>}
              {holidays.map((h, i) => <Chip key={h + i} tone="lilac" icon={<Icons.calendar size={13} />} onRemove={() => setHolidays((hs) => hs.filter((_, x) => x !== i))}>{h}</Chip>)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PoolGrid({ imgs, onAdd, onRemove }) {
  const [view, setView] = uEd(null); // lightbox index, or null
  if (!imgs.length) return (
    <div style={{ border: "1.5px dashed var(--line)", borderRadius: 16, padding: "30px 20px" }}>
      <EmptyState compact icon={<Icons.image size={26} />} title="Belum ada gambar" body="Unggah gambar Story (9:16) untuk mulai." action={<Button size="sm" variant="amber" icon={<Icons.upload size={16} />} onClick={onAdd}>Unggah gambar</Button>} />
    </div>
  );
  // delete from the lightbox, then keep it open on a neighbouring image (or close)
  const deleteAt = (idx) => {
    const remaining = imgs.length - 1;
    onRemove(idx);
    setView(remaining <= 0 ? null : Math.min(idx, remaining - 1));
  };
  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {imgs.map((im, i) => (
        <div key={im.storage_path || i} style={{ position: "relative" }}>
          <img src={im.url} alt="" onClick={() => setView(i)} title="Klik untuk pratinjau"
            style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)", display: "block", cursor: "zoom-in" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")} />
          <button onClick={() => onRemove(i)} aria-label="Hapus" style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
        </div>
      ))}
      <button onClick={onAdd} style={{ aspectRatio: "9/16", borderRadius: 12, border: "1.5px dashed var(--line)", background: "rgba(255,255,255,.4)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Icons.plus size={20} /><span style={{ fontFamily: FE, fontSize: 10 }}>Tambah</span></div>
      </button>
    </div>
    <Lightbox imgs={imgs} index={view} onClose={() => setView(null)} onIndex={setView} onDelete={deleteAt} />
    </>
  );
}
