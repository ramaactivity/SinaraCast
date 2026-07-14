"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { createIdea, updateIdea, deleteIdea, uploadIdeaImage } from "../dataLayer";
import { BrandAvatar, Panel, Card, Button, Field, Input, Textarea, Select, Segmented, EmptyState, Modal, Chip, Spinner, SectionTitle } from "../ui";
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

export function IdeaBankView() {
  const app = useApp();
  const brandId = app.brand;
  const brand = app.activeBrand;
  const accounts = app.brandAccounts || [];
  const [kindFilter, setKindFilter] = uIB("all");
  const [q, setQ] = uIB("");
  const [editing, setEditing] = uIB(null);     // draft object or null
  const [saving, setSaving] = uIB(false);

  // Ide untuk brand ini + ide umum (tanpa brand).
  const all = (app.ideas || []).filter((i) => !i.brandId || i.brandId === brandId);
  const qn = q.trim().toLowerCase();
  const items = all.filter((i) =>
    (kindFilter === "all" || i.kind === kindFilter) &&
    (!qn || `${i.title} ${i.note} ${(i.tags || []).join(" ")} ${i.source}`.toLowerCase().includes(qn))
  );
  const countBy = (k) => all.filter((i) => i.kind === k).length;

  const openNew = () => setEditing(emptyDraft(brandId));
  const openEdit = (i) => setEditing({ id: i.id, kind: i.kind, title: i.title, note: i.note, url: i.url, imageUrl: i.imageUrl, tags: (i.tags || []).join(", "), source: i.source, brandId: i.brandId || null });

  async function saveDraft() {
    const d = editing;
    if (!d.title.trim() && !d.note.trim() && !d.url.trim()) { app.toast("Isi minimal judul, catatan, atau link.", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...d, tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      if (d.id) await updateIdea(d.id, payload); else await createIdea(payload);
      await app.reload();
      app.toast(d.id ? "Ide diperbarui ✓" : "Ide disimpan ✓", "success");
      setEditing(null);
    } catch (e) { app.toast("Gagal menyimpan: " + (e.message || e), "error"); }
    finally { setSaving(false); }
  }

  function remove(i) {
    app.confirm({
      title: "Hapus item ini?", danger: true, confirmLabel: "Hapus",
      body: `"${i.title || i.note || "Item"}" akan dihapus dari bank ide.`,
      onConfirm: async () => {
        try { await deleteIdea(i.id); await app.reload(); app.toast("Dihapus", "success"); }
        catch (e) { app.toast("Gagal menghapus: " + (e.message || e), "error"); }
      },
    });
  }

  // Ide → rencana konten. Bawa judul/catatan/link ke editor; AI di sana bisa
  // langsung mengembangkannya (persona akun otomatis kepakai).
  function toPlan(i) {
    const platform = accounts[0]?.platform || "instagram";
    app.go("contentEditor", { brand: i.brandId || brandId, platform, title: i.title || "", note: i.note || "", reference: i.url || "", seed: 1 });
  }

  const right = <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={openNew}>Tambah ide</Button>;

  if (!brand) {
    return (
      <div>
        <Topbar title="Bank Ide & Referensi" />
        <Panel pad={0}><EmptyState icon={<Icons.bookmark size={28} />} title="Belum ada brand" body="Tambahkan akun sosial media dulu untuk mulai mengumpulkan ide." action={<Button variant="amber" onClick={() => app.go("connections")}>Buka Manajemen Akun</Button>} /></Panel>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Bank Ide & Referensi"
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={brandAv(brand.name)} size={18} /> {brand.name} · kumpulan ide, inspirasi & referensi</span>}
        right={right} />

      {all.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: app.isMobile ? "1 1 100%" : "1 1 240px", minWidth: 0, maxWidth: app.isMobile ? "none" : 320 }}>
            <Input icon={<Icons.search size={16} />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ide, catatan, tag…" />
          </div>
          <div style={{ minWidth: app.isMobile ? "100%" : 360 }}>
            <Segmented options={[{ value: "all", label: `Semua (${all.length})` }, ...Object.entries(KINDS).map(([v, m]) => ({ value: v, label: `${m.label} (${countBy(v)})` }))]} value={kindFilter} onChange={setKindFilter} />
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <Panel pad={0}><EmptyState icon={<Icons.bookmark size={28} />} title="Bank ide masih kosong"
          body="Tempat menaruh ide konten, inspirasi dari akun lain, contoh, dan link referensi. Simpan sekarang, kembangkan jadi konten kapan saja."
          action={<Button variant="amber" icon={<Icons.plus size={16} sw={2} />} onClick={openNew}>Tambah ide pertama</Button>} />
        </Panel>
      ) : items.length === 0 ? (
        <Panel pad={0}><EmptyState icon={<Icons.search size={26} />} title="Tidak ada yang cocok" body="Coba ubah kata kunci atau filter." action={<Button variant="secondary" onClick={() => { setQ(""); setKindFilter("all"); }}>Hapus filter</Button>} compact /></Panel>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, alignItems: "start" }}>
          {items.map((i) => <IdeaCard key={i.id} i={i} onEdit={() => openEdit(i)} onRemove={() => remove(i)} onToPlan={() => toPlan(i)} />)}
        </div>
      )}

      <IdeaModal editing={editing} setEditing={setEditing} onSave={saveDraft} saving={saving} brands={app.brands} defaultBrandId={brandId} toast={app.toast} />
    </div>
  );
}

function IdeaCard({ i, onEdit, onRemove, onToPlan }) {
  const k = KINDS[i.kind] || KINDS.idea;
  return (
    <Card pad={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {i.imageUrl ? (
        <div style={{ height: 132, background: `#f2f3f5 center/cover no-repeat url("${i.imageUrl}")`, borderBottom: "1px solid var(--line)" }} />
      ) : null}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F, fontSize: 11, fontWeight: 600, color: k.color, background: tint(k.color), padding: "3px 9px", borderRadius: 999 }}>{k.icon(12)} {k.label}</span>
          {i.source ? <span style={{ fontFamily: F, fontSize: 11, color: "var(--ink-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {i.source}</span> : null}
        </div>
        {i.title ? <div style={{ fontFamily: F, fontWeight: 600, fontSize: 14, color: "var(--ink-900)", lineHeight: 1.35 }}>{i.title}</div> : null}
        {i.note ? <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{i.note}</div> : null}
        {i.url ? <a href={i.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F, fontSize: 12, color: "var(--st-scheduled)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Icons.external size={13} /> {i.url.replace(/^https?:\/\//, "").slice(0, 40)}</a> : null}
        {i.tags?.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{i.tags.slice(0, 6).map((t, x) => <span key={x} style={{ fontFamily: F, fontSize: 10.5, color: "var(--ink-500)", background: "rgba(140,144,158,.12)", padding: "2px 8px", borderRadius: 999 }}>#{t.replace(/^#/, "")}</span>)}</div> : null}
        <div style={{ display: "flex", gap: 7, marginTop: "auto", paddingTop: 6, flexWrap: "wrap" }}>
          <Button size="sm" variant="primary" icon={<Icons.sparkle size={14} />} onClick={onToPlan}>Jadikan konten</Button>
          <Button size="sm" variant="ghost" icon={<Icons.edit size={14} />} onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" icon={<Icons.trash size={14} />} onClick={onRemove} />
        </div>
      </div>
    </Card>
  );
}

function IdeaModal({ editing, setEditing, onSave, saving, brands, defaultBrandId, toast }) {
  const open = !!editing;
  const d = editing || {};
  const set = (k, v) => setEditing((s) => ({ ...s, [k]: v }));
  const brandOpts = [{ value: "", label: "Umum (semua brand)" }, ...(brands || []).map((b) => ({ value: b.id, label: b.name }))];
  const fileRef = React.useRef(null);
  const [uploading, setUploading] = uIB(false);
  const [dragOver, setDragOver] = uIB(false);

  async function ingest(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast?.("Hanya gambar JPG / PNG / WebP", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { toast?.("Gambar terlalu besar (maks 10 MB)", "error"); return; }
    setUploading(true);
    try { const url = await uploadIdeaImage(file); set("imageUrl", url); }
    catch (e) { toast?.("Gagal unggah gambar: " + (e.message || e), "error"); }
    finally { setUploading(false); }
  }
  return (
    <Modal open={open} onClose={() => !saving && setEditing(null)} width={540}>
      <div style={{ padding: 22 }}>
        <SectionTitle sub="Simpan ide, inspirasi, contoh, atau referensi">{d.id ? "Edit item" : "Tambah ke bank ide"}</SectionTitle>
        <Field label="Jenis" style={{ marginBottom: 13 }}>
          <Segmented full options={KIND_OPTS} value={d.kind || "idea"} onChange={(v) => set("kind", v)} />
        </Field>
        <Field label="Judul" style={{ marginBottom: 13 }}>
          <Input value={d.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="mis. Reels behind the scenes dapur" />
        </Field>
        <Field label="Catatan / deskripsi" style={{ marginBottom: 13 }}>
          <Textarea value={d.note || ""} onChange={(e) => set("note", e.target.value)} style={{ minHeight: 84 }} placeholder="Kenapa ini menarik, poin penting, cara adaptasi…" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Link (opsional)">
            <Input value={d.url || ""} onChange={(e) => set("url", e.target.value)} icon={<Icons.link size={15} />} placeholder="https://…" />
          </Field>
          <Field label="Sumber (opsional)">
            <Input value={d.source || ""} onChange={(e) => set("source", e.target.value)} placeholder="mis. IG @kompetitor" />
          </Field>
        </div>
        <Field label="Gambar contoh (opsional)" style={{ marginTop: 13 }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; ingest(f); }} />
          {d.imageUrl ? (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
              <img src={d.imageUrl} alt="" style={{ display: "block", width: "100%", maxHeight: 220, objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 7 }}>
                <button onClick={() => fileRef.current?.click()} title="Ganti gambar" style={imgBtn}><Icons.upload size={14} /></button>
                <button onClick={() => set("imageUrl", "")} title="Hapus gambar" style={imgBtn}><Icons.x size={14} /></button>
              </div>
            </div>
          ) : (
            <div onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); ingest(e.dataTransfer.files?.[0]); }}
              style={{ border: `1.5px dashed ${dragOver ? "var(--primary-400)" : "var(--line)"}`, background: dragOver ? "var(--primary-100)" : "rgba(140,144,158,.045)", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: uploading ? "default" : "pointer", transition: "background .15s, border-color .15s" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, margin: "0 auto 8px", display: "grid", placeItems: "center", background: "var(--primary-100)", color: "var(--primary-500)" }}>{uploading ? <Spinner size={18} /> : <Icons.upload size={18} />}</div>
              <div style={{ fontFamily: F, fontWeight: 600, fontSize: 12.5, color: "var(--ink-800)" }}>{uploading ? "Mengunggah…" : "Tarik & lepas, atau klik untuk unggah"}</div>
              <div style={{ fontFamily: F, fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>JPG / PNG / WebP · maks 10 MB</div>
            </div>
          )}
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 13 }}>
          <Field label="Tag (pisah koma)">
            <Input value={d.tags || ""} onChange={(e) => set("tags", e.target.value)} icon={<Icons.tag size={15} />} placeholder="promo, video, dapur" />
          </Field>
          <Field label="Brand">
            <Select value={d.brandId || ""} onChange={(v) => set("brandId", v || null)} options={brandOpts} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <Button variant="ghost" disabled={saving} onClick={() => setEditing(null)}>Batal</Button>
          <Button variant="primary" disabled={saving} icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.check size={16} />} onClick={onSave}>{d.id ? "Simpan" : "Tambah"}</Button>
        </div>
      </div>
    </Modal>
  );
}
