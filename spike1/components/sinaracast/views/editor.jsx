"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Button, Field, Input, Select, TimeField,
  Segmented, EmptyState, Chip, SectionTitle, Banner, Spinner, Slider, NumberField,
} from "../ui";
import {
  uploadPoolImage, uploadReelVideo, createRuleWithPools, updateRuleFields, loadRuleDetail, addPoolImageRow, removePoolImageRow,
} from "../dataLayer";
import { Lightbox } from "../lightbox";
const MAX_VIDEO_MB = 50;
const isVideoUrl = (u) => /\.(mp4|mov)(\?|$)/i.test(u || "");
function readVideoMeta(file) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { res({ width: v.videoWidth, height: v.videoHeight, duration: v.duration }); URL.revokeObjectURL(url); };
    v.onerror = () => { rej(new Error("read")); URL.revokeObjectURL(url); };
    v.src = url;
  });
}
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
const IMG_MAXDIM = 1920, IMG_LIMIT = 8 * 1024 * 1024;
// Prepare a photo like Instagram does: center-crop to a target ratio, downscale very
// large images, always output JPEG, and step quality down to fit the 8 MB limit.
function prepareImage(file, cropRatio) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let cw = iw, ch = ih, sx = 0, sy = 0, cropped = false;
      if (cropRatio) {
        cw = iw; ch = Math.round(iw / cropRatio);
        if (ch > ih) { ch = ih; cw = Math.round(ih * cropRatio); }
        sx = Math.round((iw - cw) / 2); sy = Math.round((ih - ch) / 2);
        cropped = cw !== iw || ch !== ih;
      }
      const scale = Math.min(1, IMG_MAXDIM / Math.max(cw, ch));
      const ow = Math.max(1, Math.round(cw * scale)), oh = Math.max(1, Math.round(ch * scale));
      const canvas = document.createElement("canvas");
      canvas.width = ow; canvas.height = oh;
      canvas.getContext("2d").drawImage(img, sx, sy, cw, ch, 0, 0, ow, oh);
      URL.revokeObjectURL(url);
      const toBlobQ = (q) => new Promise((r) => canvas.toBlob((b) => r(b), "image/jpeg", q));
      (async () => {
        for (const q of [0.92, 0.85, 0.75, 0.65, 0.55]) {
          const blob = await toBlobQ(q);
          if (blob && (blob.size <= IMG_LIMIT || q === 0.55)) {
            const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
            return res({ file: out, width: ow, height: oh, cropped, shrunk: out.size < file.size && !cropped });
          }
        }
        rej(new Error("encode"));
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("read")); };
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
  const [countSingle, setCountSingle] = uEd(1);
  const [countWeekday, setCountWeekday] = uEd(1);
  const [countWeekend, setCountWeekend] = uEd(1);
  const [holidays, setHolidays] = uEd([]);
  const [images, setImages] = uEd({ weekday: [], weekend: [], single: [] });
  const [poolIdByRole, setPoolIdByRole] = uEd({});
  const [tab, setTab] = uEd("weekday");
  const [touched, setTouched] = uEd(false);
  const [loading, setLoading] = uEd(!!existing);
  const [uploading, setUploading] = uEd(false);
  const [saving, setSaving] = uEd(false);
  const fileRef = useRef(null);
  const replaceIdxRef = useRef(null); // when set, the next upload replaces this pool index
  function startReplace(idx) { replaceIdxRef.current = idx; fileRef.current?.click(); }

  useEffect(() => {
    if (!existing) return;
    let active = true;
    loadRuleDetail(id).then(({ rule, images: im, poolIdByRole: pr, counts: cnt }) => {
      if (!active) return;
      if (cnt) {
        if (cnt.single) setCountSingle(cnt.single);
        if (cnt.weekday) setCountWeekday(cnt.weekday);
        if (cnt.weekend) setCountWeekend(cnt.weekend);
      }
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
  // FR-21: warn if another active rule on this channel posts at the same time.
  const myTimes = (mode === "schedule" ? [wdTime, weTime] : [time]).filter(Boolean);
  const clashRule = app.rules.find((o) => o.ch === chId && o.id !== existing?.id && o.active && myTimes.includes(o.time));
  const errors = {};
  if (touched && !name.trim()) errors.name = "Beri nama jadwalnya dulu.";
  if (touched && emptyRole) errors.pool = `Kumpulan ${emptyRole === "weekday" ? "hari kerja " : emptyRole === "weekend" ? "akhir pekan " : ""}masih kosong, minimal 1 gambar.`;

  // Add the uploaded row to the current role pool — or, when `rep` is an index,
  // replace that slot in place (and clean up the old DB row + stored file).
  async function commitRow(row, rep) {
    if (rep != null) {
      const old = (images[role] || [])[rep];
      if (!isNew && poolIdByRole[role]) { row.id = await addPoolImageRow(poolIdByRole[role], row, rep); row.poolId = poolIdByRole[role]; }
      setImages((im) => ({ ...im, [role]: (im[role] || []).map((x, k) => (k === rep ? row : x)) }));
      if (old) { try { await removePoolImageRow(old.id, old.storage_path); } catch {} }
    } else {
      if (!isNew && poolIdByRole[role]) { row.id = await addPoolImageRow(poolIdByRole[role], row, (images[role] || []).length); row.poolId = poolIdByRole[role]; }
      setImages((im) => ({ ...im, [role]: [...(im[role] || []), row] }));
    }
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    let rep = replaceIdxRef.current; replaceIdxRef.current = null; // applies to the first valid file only
    for (const file of files) {
      // Story pools can also hold a 9:16 video (≤60s).
      if (["video/mp4", "video/quicktime"].includes(file.type)) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { app.toast(`Video maksimal ${MAX_VIDEO_MB} MB`, "error"); continue; }
        let meta; try { meta = await readVideoMeta(file); } catch { app.toast("Gagal membaca video", "error"); continue; }
        if (Math.abs(meta.width / meta.height - 9 / 16) > 0.06) app.toast("Video bukan 9:16 — Instagram akan menyesuaikan", "info");
        if (meta.duration && meta.duration > 60) { app.toast("Story video maksimal 60 detik (batas Instagram)", "error"); continue; }
        setUploading(true);
        try {
          const row = await uploadReelVideo(file, chId, meta);
          await commitRow(row, rep); rep = null;
          app.toast("Video diunggah ✓", "success");
        } catch (err) { app.toast("Gagal unggah: " + (err.message || err), "error"); }
        finally { setUploading(false); }
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { app.toast("Hanya gambar JPG/PNG/WebP atau video MP4", "error"); continue; }
      if (file.size > 40 * 1024 * 1024) { app.toast("Gambar terlalu besar (maks 40 MB)", "error"); continue; }
      let dim; try { dim = await readDims(file); } catch { app.toast("Gagal membaca gambar", "error"); continue; }
      // Pools are Story (9:16). Auto center-crop to 9:16, shrink huge files, output JPEG.
      let upFile, upDim;
      const cropRatio = Math.abs(dim.width / dim.height - 9 / 16) > 0.04 ? 9 / 16 : null;
      setUploading(true);
      try {
        const p = await prepareImage(file, cropRatio);
        upFile = p.file; upDim = { width: p.width, height: p.height };
        if (p.cropped) app.toast("Gambar dipotong otomatis ke 9:16", "info");
        else if (p.shrunk) app.toast("Gambar dikompres otomatis agar muat", "info");
      } catch { app.toast("Gagal menyiapkan gambar", "error"); setUploading(false); continue; }
      try {
        const row = await uploadPoolImage(upFile, chId, upDim);
        await commitRow(row, rep); rep = null;
        app.toast("Gambar diunggah ✓", "success");
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
      counts: mode === "schedule" ? { weekday: countWeekday, weekend: countWeekend } : { single: countSingle },
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" multiple onChange={onFiles} style={{ display: "none" }} />
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
            <SectionTitle sub={`Unggah gambar (otomatis dipotong 9:16) atau video MP4 (maks ${MAX_VIDEO_MB} MB, ≤60 dtk).`}
              right={<Button size="sm" variant="secondary" disabled={uploading} icon={uploading ? <Spinner size={15} /> : <Icons.upload size={16} />} onClick={() => fileRef.current?.click()}>{uploading ? "Mengunggah…" : "Unggah gambar"}</Button>}>Kumpulan gambar</SectionTitle>
            {errors.pool && <Banner tone="warn" icon={<Icons.warn size={17} />} title="Gambar tidak boleh kosong" body={errors.pool} />}
            {mode === "schedule" && (
              <div style={{ marginBottom: 14 }}>
                <Segmented options={[{ value: "weekday", label: `Hari kerja · ${images.weekday.length}` }, { value: "weekend", label: `Akhir pekan · ${images.weekend.length}` }]} value={tab} onChange={setTab} />
              </div>
            )}
            <PoolGrid imgs={curImgs} onAdd={() => fileRef.current?.click()} onRemove={removeImg} onReplace={startReplace} />
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
            {cadence === "everyN" && <Field label="Setiap berapa hari" style={{ marginTop: 12 }}><NumberField min={2} max={30} value={everyN} onChange={setEveryN} suffix="hari" /></Field>}
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
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: FE, fontWeight: 500, fontSize: 12.5, color: "var(--ink-700)", marginBottom: 2 }}>Jumlah Story per posting</div>
              {mode === "schedule" ? (
                <>
                  <CountRow label="Hari kerja" value={countWeekday} onChange={setCountWeekday} />
                  <div style={{ height: 1, background: "var(--line)" }} />
                  <CountRow label="Akhir pekan" value={countWeekend} onChange={setCountWeekend} />
                  {(countWeekday > images.weekday.length || countWeekend > images.weekend.length) && <CountNote />}
                </>
              ) : (
                <>
                  <CountRow label="Sekali jalan" value={countSingle} onChange={setCountSingle} />
                  {countSingle > images.single.length && <CountNote />}
                </>
              )}
              <div style={{ display: "flex", gap: 7, marginTop: 10, fontFamily: FE, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
                <Icons.shuffle size={14} style={{ color: b.accent, flex: "0 0 auto", marginTop: 1 }} />
                <span>Lebih dari 1 diposting jadi beberapa Story terpisah berurutan. Story tidak mendukung carousel.</span>
              </div>
            </div>
            <Field label={`Toleransi telat — ${grace} menit`} hint="Berapa lama masih boleh telat sebelum dianggap terlewat." style={{ marginTop: 14 }}>
              <Slider min={10} max={60} step={5} value={grace} onChange={setGrace} style={{ width: "100%" }} />
            </Field>
            {clashRule && <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
              <Icons.warn size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
              <span style={{ fontFamily: FE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>Jam ini sama dengan jadwal “{clashRule.name}”. Postingan tetap jalan (diproses bergiliran), tapi pertimbangkan jam berbeda biar tidak menumpuk.</span>
            </div>}
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

// One Story-count row: text label on the left, compact stepper on the right. Rows
// stack vertically so the pair fits the narrow side panel without label wrapping.
function CountRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 0" }}>
      <span style={{ fontFamily: FE, fontSize: 13, fontWeight: 500, color: "var(--ink-700)" }}>{label}</span>
      <NumberField min={1} max={5} value={value} onChange={onChange} />
    </div>
  );
}

// Shown when the requested Story count exceeds the images in that pool: the engine
// caps at the pool size (no frame repeats), so only that many Stories will post.
function CountNote() {
  return (
    <div style={{ display: "flex", gap: 7, marginTop: 9, background: "var(--st-publishing-bg)", borderRadius: 10, padding: "8px 11px", fontFamily: FE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>
      <Icons.warn size={14} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
      <span>Jumlah Story melebihi gambar yang tersedia. Tambah gambar, atau yang terbit hanya sebanyak gambar di kumpulan (tanpa pengulangan).</span>
    </div>
  );
}

function PoolGrid({ imgs, onAdd, onRemove, onReplace }) {
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
        <div key={im.storage_path || i} onClick={() => setView(i)} title="Klik untuk pratinjau" style={{ position: "relative", cursor: "zoom-in" }}
          onMouseEnter={(e) => (e.currentTarget.firstChild.style.boxShadow = "var(--shadow-md)")} onMouseLeave={(e) => (e.currentTarget.firstChild.style.boxShadow = "none")}>
          {(im.isVideo || isVideoUrl(im.url) || isVideoUrl(im.storage_path))
            ? <video src={im.url} muted playsInline preload="metadata"
                style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)", display: "block", background: "#000", transition: "box-shadow .15s" }} />
            : <img src={im.url} alt=""
                style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)", display: "block", transition: "box-shadow .15s" }} />}
          {(im.isVideo || isVideoUrl(im.url) || isVideoUrl(im.storage_path)) &&
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.55)", pointerEvents: "none" }}><Icons.play size={22} /></span>}
          <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} aria-label="Hapus" style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
        </div>
      ))}
      <button onClick={onAdd} style={{ aspectRatio: "9/16", borderRadius: 12, border: "1.5px dashed var(--line)", background: "rgba(255,255,255,.4)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Icons.plus size={20} /><span style={{ fontFamily: FE, fontSize: 10 }}>Tambah</span></div>
      </button>
    </div>
    <Lightbox imgs={imgs} index={view} onClose={() => setView(null)} onIndex={setView} onDelete={deleteAt}
      onReplace={onReplace ? (idx) => { setView(null); onReplace(idx); } : undefined} />
    </>
  );
}
