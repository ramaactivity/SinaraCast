"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Button, Field, Input, Select, TimeField, DateField,
  Segmented, EmptyState, Chip, SectionTitle, Banner, Spinner, Slider, NumberField,
} from "../ui";
import {
  uploadPoolImage, uploadReelVideo, createRuleWithPools, updateRuleFields, loadRuleDetail, addPoolImageRow, removePoolImageRow, ensurePool,
} from "../dataLayer";
import { Lightbox } from "../lightbox";
const MAX_VIDEO_MB = 300; // >48 MB detours to R2 (Supabase free caps files at 50 MB)
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

/* ---------------- Masa berlaku (rentang tanggal jadwal) ----------------
   Dua tanggal, keduanya opsional: kosong = tanpa batas di sisi itu. Kosong
   dua-duanya (bawaan) berarti jadwal jalan terus sampai dihentikan sendiri. */
const MON_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pad2 = (n) => String(n).padStart(2, "0");
const todayWib = () => { const d = new Date(Date.now() + 7 * 3600 * 1000); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
const fmtDay = (ymd) => { if (!ymd) return ""; const [y, m, d] = ymd.split("-").map(Number); return `${d} ${MON_ID[m - 1]} ${y}`; };
const shiftDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
};
// Tambah n bulan, lalu jepit ke hari terakhir bulan itu (31 Jan + 1 bulan = 28/29 Feb).
const shiftMonths = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
};
const daysInclusive = (a, z) => {
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = z.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
};
// Pilihan lama berjalan. Tanggal terakhir = hari mulai + durasi - 1 hari, supaya
// "1 bulan" berarti tepat satu bulan penuh (17 Agu → 16 Sep), bukan sebulan lebih sehari.
const DURATIONS = [
  { value: "forever", label: "Tidak dibatasi — sampai saya hentikan sendiri" },
  { value: "7d",  label: "1 minggu" },
  { value: "14d", label: "2 minggu" },
  { value: "1m",  label: "1 bulan" },
  { value: "3m",  label: "3 bulan" },
  { value: "6m",  label: "6 bulan" },
  { value: "1y",  label: "1 tahun" },
  { value: "custom", label: "Sampai tanggal tertentu" },
];
function endFromDuration(startYmd, dur) {
  const s = startYmd || todayWib();
  if (dur === "7d")  return shiftDays(s, 6);
  if (dur === "14d") return shiftDays(s, 13);
  if (dur === "1m")  return shiftDays(shiftMonths(s, 1), -1);
  if (dur === "3m")  return shiftDays(shiftMonths(s, 3), -1);
  if (dur === "6m")  return shiftDays(shiftMonths(s, 6), -1);
  if (dur === "1y")  return shiftDays(shiftMonths(s, 12), -1);
  return null;
}

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
  // Posting times per day — each daypart holds a LIST of times (mis. pagi/sore/malam);
  // each time publishes 1 Story drawn from the pool via the no-repeat cycle.
  const [postTimes, setPostTimes] = uEd(["08:00"]);
  const [weekdayTimes, setWeekdayTimes] = uEd(["14:00"]);
  const [weekendTimes, setWeekendTimes] = uEd(["09:00"]);
  const [grace, setGrace] = uEd(app.settings.defaultGrace || 30);
  const [specialBehavior, setSpecialBehavior] = uEd("normal");
  // Masa berlaku. Bawaannya: mulai langsung, tanpa tanggal berhenti.
  const [startMode, setStartMode] = uEd("now");      // "now" | "date"
  const [startDate, setStartDate] = uEd("");
  const [duration, setDuration] = uEd("forever");    // lihat DURATIONS
  const [endDate, setEndDate] = uEd("");
  const [images, setImages] = uEd({ weekday: [], weekend: [], single: [], special: [] });
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
    loadRuleDetail(id).then(({ rule, images: im, poolIdByRole: pr }) => {
      if (!active) return;
      if (rule) {
        setMode(rule.mode);
        setSpecialBehavior(rule.special_behavior || "normal");
        setCadence(rule.cadence_type === "daily" ? "daily" : rule.cadence_type === "every_n_days" ? "everyN" : "weekdays");
        if (rule.interval_days) setEveryN(rule.interval_days);
        if (rule.weekdays?.length) setDays(rule.weekdays.map(fromDow).sort((a, z) => a - z));
        // Array-first with legacy single-time fallback so old rules load intact.
        const pt = timeList(rule.post_times, rule.post_time); if (pt) setPostTimes(pt);
        const wdt = timeList(rule.weekday_times, rule.weekday_time); if (wdt) setWeekdayTimes(wdt);
        const wet = timeList(rule.weekend_times, rule.weekend_time); if (wet) setWeekendTimes(wet);
        setGrace(rule.grace_minutes);
        // Masa berlaku tersimpan sebagai dua tanggal saja — pilihan durasi yang dulu
        // dipakai tidak ikut disimpan, jadi saat dibuka lagi tampil sebagai tanggal.
        const sd = (rule.start_date || "").slice(0, 10);
        const ed = (rule.end_date || "").slice(0, 10);
        if (sd) { setStartMode("date"); setStartDate(sd); }
        if (ed) { setDuration("custom"); setEndDate(ed); }
      }
      setImages({ weekday: im.weekday, weekend: im.weekend, single: im.single, special: im.special || [] });
      setPoolIdByRole(pr);
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  // Pool tabs: the 'special' tab appears when the rule posts special content on
  // special days. Pool mode normally has no tabs; with a special pool it gets two.
  const wantSpecial = specialBehavior === "special_pool";
  const tabRoles = mode === "schedule"
    ? (wantSpecial ? ["weekday", "weekend", "special"] : ["weekday", "weekend"])
    : (wantSpecial ? ["single", "special"] : ["single"]);
  const role = tabRoles.includes(tab) ? tab : tabRoles[0];
  const curImgs = images[role] || [];
  const reqRoles = mode === "schedule" ? ["weekday", "weekend"] : ["single"];
  const emptyRole = reqRoles.find((r) => (images[r] || []).length === 0);
  // FR-21: warn if another active rule on this channel posts at any of the same times.
  const myTimes = (mode === "schedule" ? [...weekdayTimes, ...weekendTimes] : postTimes).filter(Boolean);
  const otherTimes = (o) => o.mode === "schedule" ? [...(o.weekdayTimes || []), ...(o.weekendTimes || [])] : (o.postTimes || []);
  const clashRule = app.rules.find((o) => o.ch === chId && o.id !== existing?.id && o.active && otherTimes(o).some((t) => myTimes.includes(t)));
  // Warn when a daypart has more posting times than images: the no-repeat cycle
  // resets once exhausted, so extra slots reuse an image that day.
  const overSlots = mode === "schedule"
    ? (images.weekday.length > 0 && weekdayTimes.length > images.weekday.length) || (images.weekend.length > 0 && weekendTimes.length > images.weekend.length)
    : images.single.length > 0 && postTimes.length > images.single.length;
  // Masa berlaku: nilai yang benar-benar dikirim ke database (string kosong → NULL).
  const effStart = startMode === "date" ? startDate : "";
  const effEnd = duration === "forever" ? "" : endDate;
  const startAnchor = effStart || todayWib();
  const rangeInvalid = !!(effEnd && effEnd < startAnchor);
  const alreadyOver = !!(effEnd && effEnd < todayWib());
  // Ganti pilihan lama berjalan → hitung ulang tanggal berhentinya dari tanggal mulai.
  function pickDuration(v) {
    setDuration(v);
    if (v === "forever") { setEndDate(""); return; }
    if (v === "custom") { if (!endDate) setEndDate(shiftDays(startAnchor, 29)); return; }
    setEndDate(endFromDuration(startAnchor, v));
  }
  function pickStart(v) {
    setStartDate(v);
    if (duration !== "forever" && duration !== "custom") setEndDate(endFromDuration(v, duration));
  }
  function pickStartMode(v) {
    setStartMode(v);
    const anchor = v === "date" ? (startDate || todayWib()) : todayWib();
    if (v === "date" && !startDate) setStartDate(todayWib());
    if (duration !== "forever" && duration !== "custom") setEndDate(endFromDuration(anchor, duration));
  }

  const errors = {};
  if (touched && !name.trim()) errors.name = "Beri nama jadwalnya dulu.";
  if (touched && emptyRole) errors.pool = `Kumpulan ${emptyRole === "weekday" ? "hari kerja " : emptyRole === "weekend" ? "akhir pekan " : ""}masih kosong, minimal 1 gambar.`;
  if (touched && startMode === "date" && !startDate) errors.range = "Pilih tanggal mulainya dulu.";
  else if (touched && duration !== "forever" && !endDate) errors.range = "Pilih tanggal berhentinya dulu.";
  else if (touched && rangeInvalid) errors.range = "Tanggal berhenti tidak boleh sebelum tanggal mulai.";

  // On an existing rule, every upload persists immediately — which needs the
  // role's pool row. Older rules have no 'special' pool yet, so create it on
  // first use and remember its id.
  async function poolIdFor(r) {
    if (isNew) return null;
    if (poolIdByRole[r]) return poolIdByRole[r];
    const pid = await ensurePool(id, r);
    setPoolIdByRole((m) => ({ ...m, [r]: pid }));
    return pid;
  }

  // Add the uploaded row to the current role pool — or, when `rep` is an index,
  // replace that slot in place (and clean up the old DB row + stored file).
  async function commitRow(row, rep) {
    const pid = await poolIdFor(role);
    if (rep != null) {
      const old = (images[role] || [])[rep];
      if (pid) { row.id = await addPoolImageRow(pid, row, rep); row.poolId = pid; }
      setImages((im) => ({ ...im, [role]: (im[role] || []).map((x, k) => (k === rep ? row : x)) }));
      if (old) { try { await removePoolImageRow(old.id, old.storage_path); } catch {} }
    } else {
      if (pid) { row.id = await addPoolImageRow(pid, row, (images[role] || []).length); row.poolId = pid; }
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
    if (startMode === "date" && !startDate) { app.toast("Pilih tanggal mulainya dulu", "error"); return; }
    if (duration !== "forever" && !endDate) { app.toast("Pilih tanggal berhentinya dulu", "error"); return; }
    if (rangeInvalid) { app.toast("Tanggal berhenti tidak boleh sebelum tanggal mulai", "error"); return; }
    const payload = {
      channelDbId: channel?._id, name: name.trim(), mode,
      cadenceType: cadence === "daily" ? "daily" : cadence === "everyN" ? "every_n_days" : "weekdays",
      intervalDays: cadence === "everyN" ? everyN : null,
      weekdaysDb: cadence === "weekdays" ? days.map(toDow).sort((a, z) => a - z) : null,
      postTimes, weekdayTimes, weekendTimes, grace,
      specialBehavior,
      startDate: effStart || null, endDate: effEnd || null,
      images: {
        ...(mode === "schedule" ? { weekday: images.weekday, weekend: images.weekend } : { single: images.single }),
        ...(images.special?.length ? { special: images.special } : {}),
      },
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
            {tabRoles.length > 1 && (
              <div style={{ marginBottom: 14 }}>
                <Segmented options={tabRoles.map((r) => ({
                  value: r,
                  label: `${r === "weekday" ? "Hari kerja" : r === "weekend" ? "Akhir pekan" : r === "special" ? "Hari spesial" : "Kumpulan"} · ${(images[r] || []).length}`,
                }))} value={role} onChange={setTab} />
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
                      background: days.includes(i) ? b.soft : "var(--surface)", color: days.includes(i) ? b.accent : "var(--ink-400)", fontFamily: FE, fontSize: 11.5, fontWeight: 600 }}>{d}</button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              {mode === "schedule" ? (
                <>
                  <Field label="Jam hari kerja" hint="Bisa lebih dari satu — tiap jam terbit 1 Story."><TimeList times={weekdayTimes} onChange={setWeekdayTimes} b={b} /></Field>
                  <Field label="Jam akhir pekan" hint="Bisa lebih dari satu — tiap jam terbit 1 Story."><TimeList times={weekendTimes} onChange={setWeekendTimes} b={b} /></Field>
                </>
              ) : (
                <Field label="Jam posting" hint="Bisa lebih dari satu — tiap jam terbit 1 Story dari kumpulan."><TimeList times={postTimes} onChange={setPostTimes} b={b} /></Field>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 7, fontFamily: FE, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
                <Icons.shuffle size={14} style={{ color: b.accent, flex: "0 0 auto", marginTop: 1 }} />
                <span>Tiap jam menerbitkan 1 Story, diambil bergiliran dari kumpulan tanpa diulang.{" "}
                  {mode === "schedule"
                    ? `${weekdayTimes.length} Story tiap hari kerja, ${weekendTimes.length} tiap akhir pekan.`
                    : `${postTimes.length} Story tiap hari terbit.`}</span>
              </div>
              {overSlots && <CountNote />}
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
            <SectionTitle sub="Sampai kapan jadwal ini jalan">Masa berlaku</SectionTitle>
            <Field label="Mulai jalan">
              <Segmented full options={[{ value: "now", label: "Langsung" }, { value: "date", label: "Tanggal tertentu" }]} value={startMode} onChange={pickStartMode} />
            </Field>
            {startMode === "date" && (
              <div style={{ marginTop: 10 }}><DateField value={startDate} min={todayWib()} onChange={pickStart} /></div>
            )}
            <Field label="Lama berjalan" style={{ marginTop: 14 }}>
              <Select options={DURATIONS} value={duration} onChange={pickDuration} />
            </Field>
            {duration === "custom" && (
              <div style={{ marginTop: 10 }}><DateField value={endDate} min={startAnchor} onChange={setEndDate} /></div>
            )}
            {errors.range && (
              <div style={{ display: "flex", gap: 7, marginTop: 10, fontFamily: FE, fontSize: 11.5, color: "var(--danger)", lineHeight: 1.5 }}>
                <Icons.warn size={14} style={{ flex: "0 0 auto", marginTop: 1 }} /><span>{errors.range}</span>
              </div>
            )}
            <RangeNote start={effStart} end={effEnd} invalid={rangeInvalid} over={alreadyOver} accent={b.accent} />
          </Panel>

          <Panel>
            <SectionTitle sub="Apa yang jadwal ini lakukan saat hari besar atau tanggal spesialmu">Hari spesial</SectionTitle>
            <Select value={specialBehavior} onChange={(v) => { setSpecialBehavior(v); if (v === "special_pool") setTab("special"); }} options={[
              { value: "normal", label: "Posting seperti biasa" },
              { value: "skip", label: "Lewati hari spesial" },
              { value: "special_pool", label: "Pakai kumpulan khusus" },
            ]} />
            {specialBehavior === "special_pool" && (
              <div style={{ display: "flex", gap: 7, marginTop: 10, fontFamily: FE, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
                <Icons.image size={14} style={{ color: b.accent, flex: "0 0 auto", marginTop: 1 }} />
                <span>Isi tab “Hari spesial” di Kumpulan gambar. Kalau kosong, jadwal memakai gambar biasa.</span>
              </div>
            )}
            {specialBehavior === "skip" && (
              <div style={{ display: "flex", gap: 7, marginTop: 10, fontFamily: FE, fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5 }}>
                <Icons.skip size={14} style={{ color: b.accent, flex: "0 0 auto", marginTop: 1 }} />
                <span>Jadwal ini istirahat pada tanggal yang aktif di daftar hari spesial.</span>
              </div>
            )}
            <button onClick={() => app.go("specialdays")} style={{ marginTop: 12, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: FE, fontSize: 12.5, fontWeight: 600, color: b.accent, display: "flex", alignItems: "center", gap: 5 }}>
              Kelola daftar hari spesial <Icons.chevRight size={14} />
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// Normalize a rule's stored times (array-first, single-time fallback) to a sorted,
// deduped list of "HH:MM". Returns null when there's nothing to load.
function timeList(arr, single) {
  const raw = (Array.isArray(arr) && arr.length) ? arr : (single ? [single] : []);
  const norm = raw.map((t) => (t || "").slice(0, 5)).filter((t) => /^\d{2}:\d{2}$/.test(t));
  return norm.length ? [...new Set(norm)].sort() : null;
}

// Human daypart label for a time — matches how Rama describes slots (pagi/sore/malam).
function dayPart(t) {
  const h = parseInt((t || "00").slice(0, 2), 10);
  if (h < 5) return "malam";
  if (h < 11) return "pagi";
  if (h < 15) return "siang";
  if (h < 18) return "sore";
  return "malam";
}
// Suggest the next slot ~4h after the latest existing one, so "Tambah jam" lands on a
// sensible fresh time. Steps forward until it finds a time not already in the list.
function suggestNextTime(times) {
  const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const set = new Set(times);
  const mins = times.map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; });
  let cand = Math.max(0, ...mins) + 240;
  if (cand > 23 * 60 + 30) cand = 20 * 60; // wrap late times back to a daytime slot
  for (let i = 0; i < 48 && set.has(fmt(cand)); i++) cand = (cand + 30) % (24 * 60);
  return fmt(cand);
}

// Editable list of posting times for one daypart: a row per time (with its pagi/sore/
// malam chip + remove), plus a dashed "Tambah jam" row. At least one time stays.
function TimeList({ times, onChange, b }) {
  const set = (i, v) => onChange(times.map((t, k) => (k === i ? v : t)));
  const add = () => onChange([...times, suggestNextTime(times)]);
  const remove = (i) => { if (times.length > 1) onChange(times.filter((_, k) => k !== i)); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {times.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}><TimeField value={t} onChange={(v) => set(i, v)} /></div>
          <span style={{ fontFamily: FE, fontSize: 11, fontWeight: 600, color: b.accent, background: b.soft, borderRadius: 8, padding: "4px 8px", minWidth: 44, textAlign: "center" }}>{dayPart(t)}</span>
          <button onClick={() => remove(i)} disabled={times.length <= 1} aria-label="Hapus jam"
            style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface)", cursor: times.length <= 1 ? "not-allowed" : "pointer", opacity: times.length <= 1 ? 0.4 : 1, color: "var(--ink-500)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <Icons.x size={13} sw={2.4} />
          </button>
        </div>
      ))}
      <button onClick={add}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 11, border: "1.5px dashed var(--line)", background: "var(--raise)", cursor: "pointer", fontFamily: FE, fontSize: 12.5, fontWeight: 600, color: b.accent }}>
        <Icons.plus size={16} /> Tambah jam
      </button>
    </div>
  );
}

// Ringkasan masa berlaku dalam satu kalimat, supaya pilihan durasi + tanggal langsung
// terbaca sebagai rentang nyata ("17 Agu 2026 sampai 16 Sep 2026 · 31 hari").
function RangeNote({ start, end, invalid, over, accent }) {
  if (invalid) return null;
  let text;
  if (!start && !end) text = "Jadwal ini jalan terus tanpa batas waktu, sampai kamu matikan atau hapus sendiri.";
  else if (start && end) text = `Jalan ${fmtDay(start)} sampai ${fmtDay(end)} · ${daysInclusive(start, end)} hari, lalu berhenti sendiri.`;
  else if (end) text = `Jalan mulai hari ini sampai ${fmtDay(end)} · ${daysInclusive(todayWib(), end)} hari, lalu berhenti sendiri.`;
  else text = `Mulai jalan ${fmtDay(start)}, lalu terus tanpa batas waktu.`;
  return (
    <div style={{ display: "flex", gap: 7, marginTop: 12, background: over ? "var(--st-publishing-bg)" : "var(--line-soft)", borderRadius: 10, padding: "9px 11px",
      fontFamily: FE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>
      {over
        ? <Icons.warn size={14} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
        : <Icons.calendar size={14} style={{ color: accent, flex: "0 0 auto", marginTop: 1 }} />}
      <span>{over ? `Tanggal berhentinya (${fmtDay(end)}) sudah lewat, jadi jadwal ini tidak akan menerbitkan apa pun.` : text}</span>
    </div>
  );
}

// Shown when a daypart has more posting times than images: the no-repeat cycle resets
// once exhausted, so an extra slot reuses an image that day.
function CountNote() {
  return (
    <div style={{ display: "flex", gap: 7, marginTop: 9, background: "var(--st-publishing-bg)", borderRadius: 10, padding: "8px 11px", fontFamily: FE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>
      <Icons.warn size={14} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
      <span>Jam posting lebih banyak dari gambar. Sebagian jam akan mengulang gambar yang sudah terpakai hari itu. Tambah gambar biar tiap jam beda.</span>
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
          <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} aria-label="Hapus" style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--surface)", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
        </div>
      ))}
      <button onClick={onAdd} style={{ aspectRatio: "9/16", borderRadius: 12, border: "1.5px dashed var(--line)", background: "var(--raise)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Icons.plus size={20} /><span style={{ fontFamily: FE, fontSize: 10 }}>Tambah</span></div>
      </button>
    </div>
    <Lightbox imgs={imgs} index={view} onClose={() => setView(null)} onIndex={setView} onDelete={deleteAt}
      onReplace={onReplace ? (idx) => { setView(null); onReplace(idx); } : undefined} />
    </>
  );
}
