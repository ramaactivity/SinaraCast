"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { createIdea, updateIdea, deleteIdea, uploadIdeaImage, createContentPlansBatch } from "../dataLayer";
import { BrandAvatar, Panel, Card, Button, Field, Input, Textarea, Select, Segmented, EmptyState, Modal, Spinner, SectionTitle, PlatIcon } from "../ui";
import { Lightbox } from "../lightbox";
import { t } from "../i18n";
const { useState: uIB } = React;
const F = "var(--font)";

const brandAv = (name) => ({ name: name || "—", short: (name || "?").slice(0, 2).toUpperCase(), grad: "var(--primary-grad)" });

// Jenis item bank ide — label + warna + ikon.
const KINDS = {
  idea:        { label: "Ide",       color: "var(--st-publishing)", icon: (s) => <Icons.sparkle size={s} /> },
  inspiration: { label: "Inspirasi", color: "#8B5CF6",              icon: (s) => <Icons.heart size={s} /> },
  reference:   { label: "Referensi", color: "var(--st-scheduled)",  icon: (s) => <Icons.link size={s} /> },
  example:     { label: "Contoh",    color: "var(--st-success)",    icon: (s) => <Icons.image size={s} /> },
};
const KIND_OPTS = Object.entries(KINDS).map(([v, m]) => ({ value: v, label: m.label }));
const tint = (c, pct = 13) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const emptyDraft = (brandId) => ({ id: null, kind: "idea", title: "", note: "", url: "", imageUrl: "", tags: "", source: "", brandId: brandId || null });
const imgBtn = { width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,.92)", color: "var(--ink-700)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" };
const pad2 = (n) => String(n).padStart(2, "0");
const wibDatePlus = (days) => { const d = new Date(Date.now() + 7 * 3600 * 1000 + days * 86400 * 1000); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };

// Tebak platform dari URL/sumber → ikon yang cocok (biar cepat dikenali).
const PLAT_KEYS = ["instagram", "tiktok", "youtube", "facebook", "twitter", "threads"];
function sourcePlatform(url, source) {
  const s = `${url || ""} ${source || ""}`.toLowerCase();
  if (/instagram|\big\b/.test(s)) return "instagram";
  if (/tiktok/.test(s)) return "tiktok";
  if (/youtu/.test(s)) return "youtube";
  if (/facebook|fb\.com/.test(s)) return "facebook";
  if (/twitter|x\.com/.test(s)) return "twitter";
  if (/threads/.test(s)) return "threads";
  return null;
}

export function IdeaBankView() {
  const app = useApp();
  const brandId = app.brand;
  const brand = app.activeBrand;
  const accounts = app.brandAccounts || [];
  const token = app.session?.access_token;
  const [kindFilter, setKindFilter] = uIB("all");
  const [q, setQ] = uIB("");
  const [editing, setEditing] = uIB(null);     // draft object or null
  const [saving, setSaving] = uIB(false);
  const [preview, setPreview] = uIB(null);     // image url for lightbox
  const [analyze, setAnalyze] = uIB(null);     // idea being analysed
  const [expandingId, setExpandingId] = uIB(null);

  const brandNameById = Object.fromEntries((app.brands || []).map((b) => [b.id, b.name]));
  // Ide untuk brand ini + ide umum (tanpa brand).
  const all = (app.ideas || []).filter((i) => !i.brandId || i.brandId === brandId);
  const qn = q.trim().toLowerCase();
  const items = all.filter((i) =>
    (kindFilter === "all" || i.kind === kindFilter) &&
    (!qn || `${i.title} ${i.note} ${(i.tags || []).join(" ")} ${i.source}`.toLowerCase().includes(qn))
  );
  const countBy = (k) => all.filter((i) => i.kind === k).length;
  // Tab jenis: hitungan hanya muncul kalau > 0 (tidak menampilkan "(0)").
  const filterOpts = [{ value: "all", label: t("Semua {0}", [all.length]) }, ...Object.entries(KINDS).map(([v, m]) => {
    const n = countBy(v); return { value: v, label: n ? `${t(m.label)} ${n}` : t(m.label) };
  })];

  const openNew = () => setEditing(emptyDraft(brandId));
  const openEdit = (i) => setEditing({ id: i.id, kind: i.kind, title: i.title, note: i.note, url: i.url, imageUrl: i.imageUrl, tags: (i.tags || []).join(", "), source: i.source, brandId: i.brandId || null });

  async function saveDraft() {
    const d = editing;
    if (!d.title.trim() && !d.note.trim() && !d.url.trim()) { app.toast(t("Isi minimal judul, catatan, atau link."), "error"); return; }
    setSaving(true);
    try {
      const payload = { ...d, tags: d.tags.split(",").map((it) => it.trim()).filter(Boolean) };
      if (d.id) await updateIdea(d.id, payload); else await createIdea(payload);
      await app.reload();
      app.toast(d.id ? t("Ide diperbarui ✓") : t("Ide disimpan ✓"), "success");
      setEditing(null);
    } catch (e) { app.toast(t("Gagal menyimpan: {0}", [e.message || e]), "error"); }
    finally { setSaving(false); }
  }

  function remove(i) {
    app.confirm({
      title: t("Hapus item ini?"), danger: true, confirmLabel: t("Hapus"),
      body: t("\"{0}\" akan dihapus dari bank ide.", [i.title || i.note || "Item"]),
      onConfirm: async () => {
        try { await deleteIdea(i.id); await app.reload(); app.toast(t("Dihapus"), "success"); }
        catch (e) { app.toast(t("Gagal menghapus: {0}", [e.message || e]), "error"); }
      },
    });
  }

  // Ide → rencana konten. Bawa judul/catatan/link ke editor; AI di sana bisa
  // langsung mengembangkannya (persona akun otomatis kepakai).
  function toPlan(i, titleOverride) {
    const platform = accounts[0]?.platform || "instagram";
    app.go("contentEditor", { brand: i.brandId || brandId, platform, title: titleOverride || i.title || "", note: i.note || "", reference: i.url || "", seed: 1 });
  }

  // Kembangkan satu ide → beberapa ide turunan langsung masuk Rencana Konten.
  async function expand(i) {
    if (expandingId) return;
    setExpandingId(i.id);
    try {
      const platform = accounts[0]?.platform || "instagram";
      const persona = accounts.find((a) => a.platform === platform)?.aiPersona || accounts[0]?.aiPersona || null;
      const seed = [i.title, i.note].filter(Boolean).join(". ");
      const r = await fetch("/api/plan", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: "ideas", brandName: brand?.name || "", platform, persona, count: 3, seed }),
      });
      const j = await r.json();
      if (!j.ok) { app.toast(j.error || t("Gagal membuat ide"), "error"); return; }
      const channelDbId = accounts.find((a) => a.platform === platform)?._id || null;
      const rows = (j.ideas || []).map((idea, x) => ({
        brandDbId: i.brandId || brandId, channelDbId, platform,
        plannedDate: wibDatePlus(1 + x * 2), plannedTime: null,
        title: idea.title, contentType: idea.contentType, pillar: idea.pillar, format: idea.format, goal: idea.goal,
        notes: idea.angle ? `Angle: ${idea.angle}` : null, status: "idea",
      }));
      if (!rows.length) { app.toast(t("Tidak ada ide dihasilkan. Coba lagi."), "info"); return; }
      await createContentPlansBatch(rows);
      await app.reload();
      app.toast(t("{0} ide turunan masuk Rencana Konten ✓", [rows.length]), "success");
    } catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setExpandingId(null); }
  }

  const right = <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={openNew}>{t("Tambah ide")}</Button>;

  if (!brand) {
    return (
      <div>
        <Topbar title={t("Bank Ide & Referensi")} />
        <Panel pad={0}><EmptyState icon={<Icons.bookmark size={28} />} title={t("Belum ada brand")} body={t("Tambahkan akun sosial media dulu untuk mulai mengumpulkan ide.")} action={<Button variant="amber" onClick={() => app.go("connections")}>{t("Buka Manajemen Akun")}</Button>} /></Panel>
      </div>
    );
  }

  return (
    <div>
      <Topbar title={t("Bank Ide & Referensi")}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={brandAv(brand.name)} size={18} /> {brand.name} {t("· kumpulan ide, inspirasi & referensi")}</span>}
        right={right} />

      {all.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: app.isMobile ? "1 1 100%" : "1 1 240px", minWidth: 0, maxWidth: app.isMobile ? "none" : 320 }}>
            <Input icon={<Icons.search size={16} />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Cari ide, catatan, tag…")} />
          </div>
          {app.isMobile
            ? <div style={{ width: "100%" }}><Select value={kindFilter} onChange={setKindFilter} options={filterOpts} /></div>
            : <Segmented options={filterOpts} value={kindFilter} onChange={setKindFilter} />}
        </div>
      )}

      {all.length === 0 ? (
        <Panel pad={0}><EmptyState icon={<Icons.bookmark size={28} />} title={t("Bank ide masih kosong")}
          body={t("Tempat menaruh ide konten, inspirasi dari akun lain, contoh, dan link referensi. Simpan sekarang, kembangkan jadi konten kapan saja.")}
          action={<Button variant="amber" icon={<Icons.plus size={16} sw={2} />} onClick={openNew}>{t("Tambah ide pertama")}</Button>} />
        </Panel>
      ) : items.length === 0 ? (
        <Panel pad={0}><EmptyState icon={<Icons.search size={26} />} title={t("Tidak ada yang cocok")} body={t("Coba ubah kata kunci atau filter.")} action={<Button variant="secondary" onClick={() => { setQ(""); setKindFilter("all"); }}>{t("Hapus filter")}</Button>} compact /></Panel>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, alignItems: "start" }}>
          {items.map((i) => (
            <IdeaCard key={i.id} i={i} brandLabel={i.brandId ? brandNameById[i.brandId] : "Umum"}
              expanding={expandingId === i.id}
              onPreview={() => setPreview(i.imageUrl)} onEdit={() => openEdit(i)} onRemove={() => remove(i)}
              onToPlan={() => toPlan(i)} onExpand={() => expand(i)} onAnalyze={() => setAnalyze(i)} />
          ))}
        </div>
      )}

      <IdeaModal editing={editing} setEditing={setEditing} onSave={saveDraft} saving={saving} brands={app.brands} toast={app.toast} token={token} />
      <AnalyzeModal idea={analyze} onClose={() => setAnalyze(null)} token={token} brand={brand} accounts={accounts} onToPlan={toPlan} />
      <Lightbox imgs={preview ? [{ url: preview }] : []} index={preview ? 0 : null} onClose={() => setPreview(null)} onIndex={() => {}} ratio={null} />
    </div>
  );
}

function IdeaCard({ i, brandLabel, expanding, onPreview, onEdit, onRemove, onToPlan, onExpand, onAnalyze }) {
  const k = KINDS[i.kind] || KINDS.idea;
  const plat = sourcePlatform(i.url, i.source);
  return (
    <Card pad={0} style={{ display: "flex", flexDirection: "column" }}>
      {i.imageUrl ? (
        <div onClick={onPreview} title={t("Klik untuk pratinjau")} style={{ height: 132, cursor: "zoom-in", borderRadius: "16px 16px 0 0", overflow: "hidden", borderBottom: "1px solid var(--line)", background: `#f2f3f5 center/cover no-repeat url("${i.imageUrl}")` }} />
      ) : null}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F, fontSize: 11, fontWeight: 600, color: k.color, background: tint(k.color), padding: "3px 9px", borderRadius: 999 }}>{k.icon(12)} {t(k.label)}</span>
          <span style={{ marginLeft: "auto", fontFamily: F, fontSize: 10, fontWeight: 600, color: "var(--ink-400)", background: "rgba(140,144,158,.12)", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{brandLabel}</span>
        </div>
        {i.title ? <div style={{ fontFamily: F, fontWeight: 600, fontSize: 14, color: "var(--ink-900)", lineHeight: 1.35 }}>{i.title}</div> : null}
        {i.note ? <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{i.note}</div> : null}
        {(i.url || i.source) ? (
          i.url
            ? <a href={i.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F, fontSize: 12, color: "var(--st-scheduled)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {plat ? <PlatIcon p={plat} size={13} /> : <Icons.external size={13} />} {i.source || i.url.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            : <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F, fontSize: 12, color: "var(--ink-400)", whiteSpace: "nowrap" }}>{plat ? <PlatIcon p={plat} size={13} /> : null} {i.source}</span>
        ) : null}
        {i.tags?.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{i.tags.slice(0, 6).map((it, x) => <span key={x} style={{ fontFamily: F, fontSize: 10.5, color: "var(--ink-500)", background: "rgba(140,144,158,.12)", padding: "2px 8px", borderRadius: 999 }}>#{it.replace(/^#/, "")}</span>)}</div> : null}
        <div style={{ display: "flex", gap: 7, marginTop: "auto", paddingTop: 6, alignItems: "center" }}>
          <Button size="sm" variant="primary" icon={<Icons.sparkle size={14} />} onClick={onToPlan}>{t("Jadikan konten")}</Button>
          <Button size="sm" variant="secondary" disabled={expanding} icon={expanding ? <Spinner size={13} /> : <Icons.layers size={14} />} onClick={onExpand}>{t("3 ide")}</Button>
          <div style={{ marginLeft: "auto" }}>
            <CardMenu items={[
              { icon: <Icons.edit size={14} />, label: t("Edit"), onClick: onEdit },
              ...(i.imageUrl ? [{ icon: <Icons.sparkle size={14} />, label: t("Analisa gambar"), onClick: onAnalyze }] : []),
              { icon: <Icons.trash size={14} />, label: t("Hapus"), onClick: onRemove, danger: true },
            ]} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function CardMenu({ items }) {
  const [open, setOpen] = uIB(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} aria-label={t("Menu")} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", color: "var(--ink-500)", display: "grid", placeItems: "center" }}><Icons.more size={16} /></button>
      {open && (
        <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", zIndex: 30, minWidth: 168, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 5, animation: "scPop .14s" }}>
          {items.map((it, x) => (
            <button key={x} onClick={() => { setOpen(false); it.onClick(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer", fontFamily: F, fontSize: 12.5, fontWeight: 500, color: it.danger ? "var(--danger)" : "var(--ink-700)", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = it.danger ? "var(--danger-100, rgba(220,80,80,.1))" : "rgba(140,144,158,.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              {it.icon} {t(it.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Modal analisa gambar referensi dengan AI (vision).
function AnalyzeModal({ idea, onClose, token, brand, accounts, onToPlan }) {
  const open = !!idea;
  const [busy, setBusy] = uIB(false);
  const [res, setRes] = uIB(null);
  const [err, setErr] = uIB("");

  React.useEffect(() => {
    if (!open) { setRes(null); setErr(""); return; }
    let active = true;
    setBusy(true); setRes(null); setErr("");
    const platform = accounts[0]?.platform || "instagram";
    const persona = accounts.find((a) => a.platform === platform)?.aiPersona || accounts[0]?.aiPersona || null;
    fetch("/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task: "analyze", brandName: brand?.name || "", platform, persona, imageUrl: idea.imageUrl, note: idea.note }),
    }).then((r) => r.json()).then((j) => { if (!active) return; if (j.ok) setRes(j.analysis); else setErr(j.error || t("Gagal menganalisa")); })
      .catch((e) => active && setErr(e.message || String(e)))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [open]); // eslint-disable-line

  const List = ({ title, items, color }) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it, x) => (
          <div key={x} style={{ display: "flex", gap: 8, fontFamily: F, fontSize: 12.5, color: "var(--ink-700)", lineHeight: 1.5 }}>
            <span style={{ color, flex: "0 0 auto", marginTop: 2 }}>•</span><span>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={() => !busy && onClose()} width={560}>
      <div style={{ padding: 22 }}>
        <SectionTitle sub={t("AI melihat gambar referensimu dan menyarankan cara pakai")}>{t("Analisa referensi")}</SectionTitle>
        {idea?.imageUrl && <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 14 }}><img src={idea.imageUrl} alt="" style={{ display: "block", width: "100%", maxHeight: 200, objectFit: "cover" }} /></div>}
        {busy && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 4px", fontFamily: F, fontSize: 13, color: "var(--ink-500)" }}><Spinner size={18} /> {t("Menganalisa gambar…")}</div>}
        {err && <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--danger)", padding: "6px 2px" }}>{err}</div>}
        {res && (
          <>
            {res.whyGood?.length ? <List title={t("Kenapa ini menarik")} items={res.whyGood} color="var(--st-success)" /> : null}
            {res.adaptation?.length ? <List title={t("Cara adaptasi ke brandmu")} items={res.adaptation} color="var(--st-scheduled)" /> : null}
            {res.contentIdeas?.length ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: "var(--st-publishing)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>{t("Ide konten turunan")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {res.contentIdeas.map((it, x) => (
                    <div key={x} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 11 }}>
                      <span style={{ flex: 1, fontFamily: F, fontSize: 12.5, color: "var(--ink-800)" }}>{it}</span>
                      <Button size="sm" variant="ghost" icon={<Icons.sparkle size={13} />} onClick={() => { onClose(); onToPlan(idea, it); }}>{t("Jadikan konten")}</Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Button variant="ghost" disabled={busy} onClick={onClose}>{t("Tutup")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function IdeaModal({ editing, setEditing, onSave, saving, brands, toast, token }) {
  const open = !!editing;
  const d = editing || {};
  const set = (k, v) => setEditing((s) => ({ ...s, [k]: v }));
  const brandOpts = [{ value: "", label: t("Umum (semua brand)") }, ...(brands || []).map((b) => ({ value: b.id, label: b.name }))];
  const fileRef = React.useRef(null);
  const [uploading, setUploading] = uIB(false);
  const [dragOver, setDragOver] = uIB(false);
  const [fetching, setFetching] = uIB(false);

  async function ingest(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast?.(t("Hanya gambar JPG / PNG / WebP"), "error"); return; }
    if (file.size > 10 * 1024 * 1024) { toast?.(t("Gambar terlalu besar (maks 10 MB)"), "error"); return; }
    setUploading(true);
    try { const url = await uploadIdeaImage(file); set("imageUrl", url); }
    catch (e) { toast?.(t("Gagal unggah gambar: {0}", [e.message || e]), "error"); }
    finally { setUploading(false); }
  }

  // Ambil pratinjau dari link (Open Graph) → isi judul/gambar/sumber yang kosong.
  async function fetchPreview() {
    const url = (d.url || "").trim();
    if (!url) { toast?.(t("Isi link dulu."), "info"); return; }
    setFetching(true);
    try {
      const r = await fetch("/api/og", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }) });
      const j = await r.json();
      if (!j.ok) { toast?.(j.error || t("Gagal mengambil pratinjau"), "error"); return; }
      let filled = 0;
      if (j.title && !d.title?.trim()) { set("title", j.title); filled++; }
      if (j.image && !d.imageUrl?.trim()) { set("imageUrl", j.image); filled++; }
      if (j.siteName && !d.source?.trim()) { set("source", j.siteName); filled++; }
      if (j.description && !d.note?.trim()) { set("note", j.description); filled++; }
      toast?.(filled ? t("Pratinjau terisi ✓") : t("Tautan tidak memberi pratinjau (mungkin butuh login)."), filled ? "success" : "info");
    } catch (e) { toast?.(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setFetching(false); }
  }

  return (
    <Modal open={open} onClose={() => !saving && setEditing(null)} width={560}>
      <div style={{ padding: "22px 22px 0" }}>
        <SectionTitle sub={t("Simpan ide, inspirasi, contoh, atau referensi")}>{d.id ? t("Edit item") : t("Tambah ke bank ide")}</SectionTitle>
        <Field label={t("Jenis")} style={{ marginBottom: 13 }}>
          <Segmented full options={KIND_OPTS} value={d.kind || "idea"} onChange={(v) => set("kind", v)} />
        </Field>
        <Field label={t("Judul")} style={{ marginBottom: 13 }}>
          <Input value={d.title || ""} onChange={(e) => set("title", e.target.value)} placeholder={t("mis. Reels behind the scenes dapur")} />
        </Field>
        <Field label={t("Catatan / deskripsi")} style={{ marginBottom: 16 }}>
          <Textarea value={d.note || ""} onChange={(e) => set("note", e.target.value)} style={{ minHeight: 78 }} placeholder={t("Kenapa ini menarik, poin penting, cara adaptasi…")} />
        </Field>

        {/* Referensi: link + sumber + gambar dalam satu blok */}
        <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>{t("Referensi")}</div>
        <Field label={t("Link (opsional)")} style={{ marginBottom: 13 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><Input value={d.url || ""} onChange={(e) => set("url", e.target.value)} icon={<Icons.link size={15} />} placeholder="https://…" /></div>
            <Button variant="secondary" disabled={fetching} icon={fetching ? <Spinner size={14} /> : <Icons.sparkle size={15} />} onClick={fetchPreview}>{t("Ambil pratinjau")}</Button>
          </div>
        </Field>
        <Field label={t("Sumber (opsional)")} style={{ marginBottom: 13 }}>
          <Input value={d.source || ""} onChange={(e) => set("source", e.target.value)} placeholder={t("mis. IG @kompetitor")} />
        </Field>
        <Field label={t("Gambar contoh (opsional)")} style={{ marginBottom: 16 }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; ingest(f); }} />
          {d.imageUrl ? (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
              <img src={d.imageUrl} alt="" style={{ display: "block", width: "100%", maxHeight: 220, objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 7 }}>
                <button onClick={() => fileRef.current?.click()} title={t("Ganti gambar")} style={imgBtn}><Icons.upload size={14} /></button>
                <button onClick={() => set("imageUrl", "")} title={t("Hapus gambar")} style={imgBtn}><Icons.x size={14} /></button>
              </div>
            </div>
          ) : (
            <div onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); ingest(e.dataTransfer.files?.[0]); }}
              style={{ border: `1.5px dashed ${dragOver ? "var(--primary-400)" : "var(--line)"}`, background: dragOver ? "var(--primary-100)" : "rgba(140,144,158,.045)", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: uploading ? "default" : "pointer", transition: "background .15s, border-color .15s" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, margin: "0 auto 8px", display: "grid", placeItems: "center", background: "var(--primary-100)", color: "var(--primary-500)" }}>{uploading ? <Spinner size={18} /> : <Icons.upload size={18} />}</div>
              <div style={{ fontFamily: F, fontWeight: 600, fontSize: 12.5, color: "var(--ink-800)" }}>{uploading ? t("Mengunggah…") : t("Tarik & lepas, atau klik untuk unggah")}</div>
              <div style={{ fontFamily: F, fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>{t("JPG / PNG / WebP · maks 10 MB")}</div>
            </div>
          )}
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Field label={t("Tag (pisah koma)")}>
            <Input value={d.tags || ""} onChange={(e) => set("tags", e.target.value)} icon={<Icons.tag size={15} />} placeholder={t("promo, video, dapur")} />
          </Field>
          <Field label={t("Brand")}>
            <Select value={d.brandId || ""} onChange={(v) => set("brandId", v || null)} options={brandOpts} />
          </Field>
        </div>
      </div>
      {/* footer sticky */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid var(--line)", padding: "14px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="ghost" disabled={saving} onClick={() => setEditing(null)}>{t("Batal")}</Button>
        <Button variant="primary" disabled={saving} icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.check size={16} />} onClick={onSave}>{d.id ? t("Simpan") : t("Tambah")}</Button>
      </div>
    </Modal>
  );
}
