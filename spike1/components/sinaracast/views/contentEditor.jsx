"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { loadContentPlan, createContentPlan, updateContentPlan, deleteContentPlan, linkPlanToRule, unlinkPlan, adaptContentPlan, uploadPlanImage } from "../dataLayer";
import { BrandAvatar, Panel, Button, Field, Input, Textarea, Select, Segmented, TimeField, DateField, SectionTitle, Spinner, PlatIcon, Modal } from "../ui";
import { Lightbox } from "../lightbox";
import { t } from "../i18n";
const { useState: uCE, useEffect } = React;
const FCE = "var(--font)";

// Platform metadata — label + accent (used here and by the planner calendar later)
// + whether SinaraCast can auto-publish it (Instagram only in v1).
export const PLATFORM = {
  instagram: { label: "Instagram", accent: "#C2387E", auto: true },
  tiktok:    { label: "TikTok",    accent: "#3B3B3F", auto: false },
  youtube:   { label: "YouTube",   accent: "#E0322B", auto: false },
  linkedin:  { label: "LinkedIn",  accent: "#1467B0", auto: false },
  twitter:   { label: "X (Twitter)", accent: "#3A3A3C", auto: false },
  threads:   { label: "Threads",   accent: "#5A5A5E", auto: false },
  facebook:  { label: "Facebook",  accent: "#1877F2", auto: false },
};
const PLATFORM_OPTS = Object.entries(PLATFORM).map(([v, m]) => ({ value: v, label: m.label }));
const FORMAT_OPTS = [
  { value: "story", label: "Story" }, { value: "feed", label: "Feed" }, { value: "reels", label: "Reels" },
  { value: "carousel", label: "Carousel" }, { value: "video", label: "Video" },
  { value: "single_image", label: "Gambar tunggal" }, { value: "thread", label: "Thread" },
];
const GOAL_OPTS = [
  { value: "awareness", label: "Awareness" }, { value: "engagement", label: "Engagement" },
  { value: "conversion", label: "Konversi" }, { value: "traffic", label: "Traffic" },
  { value: "retention", label: "Retensi" }, { value: "other", label: "Lainnya" },
];
// Lean default flow + opt-in extra stages (FR-44).
const LEAN = ["idea", "ready", "posted"];
const LEAN_OPTS = [{ value: "idea", label: "Ide" }, { value: "ready", label: "Siap" }, { value: "posted", label: "Posted" }];
const ALL_STATUS_OPTS = [
  { value: "idea", label: "Ide" }, { value: "draft", label: "Draf" }, { value: "review", label: "Review" },
  { value: "approved", label: "Disetujui" }, { value: "revision", label: "Revisi" }, { value: "ready", label: "Siap" }, { value: "posted", label: "Posted" },
];

const pad = (n) => String(n).padStart(2, "0");
const todayWib = () => { const d = new Date(Date.now() + 7 * 3600 * 1000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

export function ContentEditorView() {
  const app = useApp();
  const planId = app.params.id || null; // present → edit mode
  const _initAcct = app.channels.find((c) => c.id === app.channel); // active account → its brand + platform
  const [brandId, setBrandId] = uCE(app.params.brand || _initAcct?.brandId || app.brand || app.brands?.[0]?.id || "");
  const [platform, setPlatform] = uCE(app.params.platform || _initAcct?.platform || "instagram");
  const [date, setDate] = uCE(app.params.date || todayWib());
  const [time, setTime] = uCE(app.params.time || "");
  const [title, setTitle] = uCE(app.params.title || "");
  const [contentType, setContentType] = uCE("");
  const [pillar, setPillar] = uCE("");
  const [format, setFormat] = uCE("");
  const [goal, setGoal] = uCE("");
  const [hook, setHook] = uCE("");
  const [caption, setCaption] = uCE("");
  const [script, setScript] = uCE("");
  const [notes, setNotes] = uCE(app.params.note || "");
  const [referenceImages, setReferenceImages] = uCE([]);
  const [storyboard, setStoryboard] = uCE([]);
  const [referenceUrl, setReferenceUrl] = uCE(app.params.reference || "");
  const [briefUrl, setBriefUrl] = uCE("");
  const [designUrl, setDesignUrl] = uCE("");
  const [status, setStatus] = uCE("idea");
  const [postLink, setPostLink] = uCE("");
  const [postedAt, setPostedAt] = uCE(null);
  const [m, setM] = uCE({ views: "", likes: "", comments: "", shares: "", saves: "", reach: "" });
  const [metricsSource, setMetricsSource] = uCE("none");
  const [autoManaged, setAutoManaged] = uCE(false);
  const [source, setSource] = uCE("manual");
  const [scheduledPostId, setScheduledPostId] = uCE(null);
  const [recurringRuleId, setRecurringRuleId] = uCE(null);
  const [showRulePicker, setShowRulePicker] = uCE(false);
  const [extraStages, setExtraStages] = uCE(false);
  const [saving, setSaving] = uCE(false);
  const [loading, setLoading] = uCE(!!planId);

  const setMetric = (k, v) => setM((s) => ({ ...s, [k]: v.replace(/[^\d]/g, "") }));

  // Load existing plan when editing.
  useEffect(() => {
    if (!planId) return;
    let active = true;
    loadContentPlan(planId).then((p) => {
      if (!active || !p) { if (active) setLoading(false); return; }
      if (p.brand_id) setBrandId(p.brand_id);
      setPlatform(p.platform); setDate(p.planned_date || todayWib()); setTime((p.planned_time || "").slice(0, 5));
      setTitle(p.title || ""); setContentType(p.content_type || ""); setPillar(p.pillar || "");
      setFormat(p.format || ""); setGoal(p.goal || "");
      setHook(p.hook || ""); setCaption(p.caption || ""); setNotes(p.notes || ""); setScript(p.script || "");
      setReferenceImages(Array.isArray(p.reference_images) ? p.reference_images : []); setStoryboard(Array.isArray(p.storyboard) ? p.storyboard : []);
      setReferenceUrl(p.reference_url || ""); setBriefUrl(p.brief_url || ""); setDesignUrl(p.design_url || "");
      setStatus(p.status); setPostLink(p.post_link || ""); setPostedAt(p.posted_at);
      setAutoManaged(!!p.auto_managed);
      setSource(p.source || "manual"); setScheduledPostId(p.scheduled_post_id || null); setRecurringRuleId(p.recurring_rule_id || null);
      setExtraStages(!LEAN.includes(p.status));
      setMetricsSource(p.metrics_source || "none");
      setM({ views: p.m_views ?? "", likes: p.m_likes ?? "", comments: p.m_comments ?? "", shares: p.m_shares ?? "", saves: p.m_saves ?? "", reach: p.m_reach ?? "" });
      setLoading(false);
    }).catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [planId]);

  // Follow the sidebar's active account/brand for NEW content (not when editing a plan).
  // An account switch (e.g. Mahakan IG → TikTok) re-derives brand + platform from it;
  // an empty brand just sets the brand. Ref-guarded so opening with params is preserved.
  const lastSel = React.useRef(app.channel + "|" + app.brand);
  useEffect(() => {
    if (planId) return;
    const sel = app.channel + "|" + app.brand;
    if (sel === lastSel.current) return;
    lastSel.current = sel;
    const acct = app.channels.find((c) => c.id === app.channel);
    if (acct) { setBrandId(acct.brandId); setPlatform(acct.platform); }
    else if (app.brand) setBrandId(app.brand);
  }, [app.channel, app.brand, planId]);

  const plat = PLATFORM[platform] || PLATFORM.instagram;
  const brandObj = app.brands.find((x) => x.id === brandId) || null;
  // resolved connected account for this brand+platform (null = plan-only, no API account)
  const account = app.channels.find((c) => c.brandId === brandId && c.platform === platform) || null;
  const igAccount = app.channels.find((c) => c.brandId === brandId && c.platform === "instagram") || null;
  const brandAvatar = { name: brandObj?.name || "—", short: (brandObj?.name || "?").slice(0, 2).toUpperCase(), grad: "var(--primary-grad)" };
  const isPosted = status === "posted";
  // Lock metrics only when they're actually engine-sourced (auto_ig). A linked plan
  // that's posted but whose insights aren't pulled yet still allows manual entry.
  const metricsLocked = metricsSource === "auto_ig";
  const valid = !!brandId && !!platform && !!date;
  const linked = source !== "manual";                              // connected to a one-off or rule
  const linkedOneoff = scheduledPostId ? (app.oneoffs || []).find((o) => o.id === scheduledPostId) : null;
  const linkedRule = recurringRuleId ? (app.rules || []).find((r) => r.id === recurringRuleId) : null;
  const igRules = igAccount ? (app.rules || []).filter((r) => r.ch === igAccount.id) : [];
  const canAuto = plat.auto && !!igAccount;                         // IG auto-publish needs a connected IG account in this brand
  // other platforms of this brand to "adapt" into (exclude the current one)
  const brandPlatforms = [...new Set((brandObj?.accounts || []).map((a) => a.platform))].filter((p) => p !== platform);

  if (!brandObj) {
    return (
      <div>
        <Topbar title={t("Konten")} />
        <Panel><div style={{ padding: 40, textAlign: "center", fontFamily: FCE, color: "var(--ink-400)" }}>{t("Tambahkan akun dulu sebelum merencanakan konten.")}<div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => app.go("connections")}>{t("Buka Manajemen Akun")}</Button></div></div></Panel>
      </div>
    );
  }
  if (loading) {
    return <div><Topbar title={t("Konten")} /><Panel style={{ height: 280, display: "grid", placeItems: "center" }}><Spinner size={28} /></Panel></div>;
  }

  function payload() {
    return {
      brandDbId: brandId, channelDbId: account?._id || null, platform, plannedDate: date, plannedTime: time || null,
      title, contentType, pillar, format, goal, hook, caption, notes, script,
      referenceImages, storyboard,
      referenceUrl, briefUrl, designUrl, status, postLink, postedAt,
      m: metricsLocked ? null : m,
    };
  }

  // Save the form (create or update) and return the plan id — shared by the Save
  // button and the auto-publish link actions (which need a persisted id first).
  async function persist() {
    if (!valid) { app.toast(t("Lengkapi brand, platform, dan tanggal tayang."), "error"); return null; }
    setSaving(true);
    try {
      if (planId) { await updateContentPlan(planId, payload()); return planId; }
      return await createContentPlan(payload());
    } catch (e) { app.toast(t("Gagal menyimpan: {0}", [e.message || e]), "error"); return null; }
    finally { setSaving(false); }
  }

  async function save() {
    const id = await persist();
    if (!id) return;
    await app.reload();
    app.toast(planId ? t("Konten diperbarui") : t("Konten direncanakan ✓"), "success");
    app.go("planner");
  }

  // "Jadwalkan otomatis via SinaraCast" → persist, then open the composer to build
  // the linked one-off (it links back on schedule). IG only.
  async function scheduleAuto() {
    if (!igAccount) { app.toast(t("Hubungkan akun Instagram di brand ini dulu (Manajemen Akun)."), "error"); return; }
    const id = await persist();
    if (!id) return;
    app.go("composer", { ch: igAccount.id, planId: id });
  }
  // Adapt this plan into another of the brand's platforms (clone as a fresh idea).
  async function adapt(toPlatform) {
    const id = planId || await persist();
    if (!id) return;
    try {
      const acct = app.channels.find((c) => c.brandId === brandId && c.platform === toPlatform) || null;
      const newId = await adaptContentPlan(id, { platform: toPlatform, channelDbId: acct?._id || null });
      await app.reload();
      app.toast(t("Disalin ke {0} ✓", [PLATFORM[toPlatform]?.label || toPlatform]), "success");
      app.go("contentEditor", { id: newId });
    } catch (e) { app.toast(t("Gagal menyalin: {0}", [e.message || e]), "error"); }
  }
  async function linkRule(ruleId) {
    const id = await persist();
    if (!id) return;
    try { await linkPlanToRule(id, ruleId); await app.reload(); app.toast(t("Terhubung ke jadwal rutin ✓"), "success"); app.go("contentEditor", { id }); }
    catch (e) { app.toast(t("Gagal menghubungkan: {0}", [e.message || e]), "error"); }
  }
  function disconnect() {
    if (!planId) return;
    app.confirm({
      title: t("Putuskan dari publikasi otomatis?"), danger: false, confirmLabel: t("Putuskan"),
      body: t("Konten kembali dilacak manual. Postingan terjadwal yang sudah dibuat tidak ikut dibatalkan."),
      onConfirm: async () => {
        try { await unlinkPlan(planId); await app.reload(); app.toast(t("Tautan dilepas — kembali manual"), "info"); app.go("contentEditor", { id: planId }); }
        catch (e) { app.toast(t("Gagal: {0}", [e.message || e]), "error"); }
      },
    });
  }

  function remove() {
    app.confirm({
      title: t("Hapus konten ini?"), danger: true, confirmLabel: t("Hapus"),
      body: t("Entri perencanaan ini akan dihapus."),
      consequence: t("Catatan perencanaan hilang. Tindakan ini tidak bisa dibatalkan."),
      onConfirm: async () => {
        try { await deleteContentPlan(planId); await app.reload(); app.toast(t("Konten dihapus"), "success"); app.go("planner"); }
        catch (e) { app.toast(t("Gagal menghapus: {0}", [e.message || e]), "error"); }
      },
    });
  }

  // This brand's other plan entries, newest planned-date first.
  const myPlans = (app.plans || []).filter((p) => p.brandId === brandId && p.id !== planId)
    .slice().sort((a, b) => `${b.plannedDate} ${b.plannedTime}`.localeCompare(`${a.plannedDate} ${a.plannedTime}`)).slice(0, 8);

  return (
    <div>
      <Topbar title={planId ? t("Edit Konten") : t("Konten Baru")}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={brandAvatar} size={18} /> {brandObj.name} · {t(plat.label)}{account ? ` · ${account.handle}` : ""}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("planner")}>{t("Kembali")}</Button>
          {planId && <Button variant="danger" icon={<Icons.trash size={15} />} disabled={saving} onClick={remove}>{t("Hapus")}</Button>}
          <Button variant="primary" icon={saving ? <Spinner size={15} color="#fff" /> : <Icons.check size={16} sw={2.2} />} disabled={!valid || saving} onClick={save}>{planId ? t("Simpan") : t("Simpan konten")}</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        {/* main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel>
            <SectionTitle sub={t("Akun, platform, dan jadwal tayang")}>{t("Utama")}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label={t("Brand")} hint={account ? t("Akun: {0}", [account.handle]) : t("Plan-only (belum ada akun untuk platform ini)")}>
                <Select value={brandId} onChange={setBrandId} options={app.brands.map((br) => ({ value: br.id, label: br.name }))} />
              </Field>
              <Field label={t("Platform")}>
                <Select value={platform} onChange={setPlatform} options={PLATFORM_OPTS} />
              </Field>
              <Field label={t("Tanggal tayang")}><DateField value={date} onChange={setDate} /></Field>
              <Field label={t("Jam (opsional, WIB)")}><TimeField value={time || "09:00"} onChange={setTime} /></Field>
            </div>
            <Field label={t("Judul / headline")} style={{ marginTop: 14 }}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("mis. Promo kopi akhir pekan")} />
            </Field>
            {canAuto
              ? <div style={{ display: "flex", gap: 9, marginTop: 14, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
                  <Icons.sparkle size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
                  <span style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Instagram (")}{igAccount.handle}{t(") bisa dijadwalkan otomatis lewat SinaraCast — status & link terisi sendiri saat terbit. Atur di panel")} <b>{t("Otomatis")}</b>.</span>
                </div>
              : plat.auto
                ? <div style={{ display: "flex", gap: 9, marginTop: 14, background: "rgba(140,144,158,.09)", borderRadius: 11, padding: "10px 12px" }}>
                    <Icons.info size={15} style={{ color: "var(--ink-400)", flex: "0 0 auto", marginTop: 1 }} />
                    <span style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Brand ini belum punya akun Instagram terhubung.")} <b onClick={() => app.go("connections")} style={{ color: "var(--primary-500)", cursor: "pointer" }}>{t("Hubungkan akun IG")}</b> {t("untuk auto-publish; sementara ini rencanakan & lacak manual.")}</span>
                  </div>
                : <div style={{ display: "flex", gap: 9, marginTop: 14, background: "rgba(140,144,158,.09)", borderRadius: 11, padding: "10px 12px" }}>
                    <Icons.info size={15} style={{ color: "var(--ink-400)", flex: "0 0 auto", marginTop: 1 }} />
                    <span style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.45 }}><b>{t("Auto-publish: Segera hadir")}</b> {t("untuk")} {t(plat.label)}{t(". Untuk sekarang, rencanakan & lacak manual (tandai Posted + tempel link sendiri).")}</span>
                  </div>}
          </Panel>

          <Panel>
            <SectionTitle sub={t("Tipe, pilar, format, dan tujuan")}>{t("Strategi")}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: app.isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <Field label={t("Tipe konten")}><Input value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder={t("mis. Edukasi, Promosi")} /></Field>
              <Field label={t("Content pillar")}><Input value={pillar} onChange={(e) => setPillar(e.target.value)} placeholder={t("mis. Behind the scenes")} /></Field>
              <Field label={t("Format")}><Select value={format} onChange={setFormat} options={FORMAT_OPTS} placeholder={t("Pilih format…")} /></Field>
              <Field label={t("Goal")}><Select value={goal} onChange={setGoal} options={GOAL_OPTS} placeholder={t("Pilih tujuan…")} /></Field>
            </div>
          </Panel>

          <PlanAI
            token={app.session?.access_token} toast={app.toast}
            brandName={brandObj.name} platform={platform} persona={account?.aiPersona || null}
            fields={{ title, pillar, format, goal, hook, notes }}
            apply={{ setHook, setNotes, setFormat, setTime, setCaption, setScript }}
            hasTime={!!time}
          />

          <Panel>
            <SectionTitle sub={t("Hook, caption, script, dan catatan")}>{t("Copywriting")}</SectionTitle>
            <Field label={t("Hook / teks cover")}><Input value={hook} onChange={(e) => setHook(e.target.value)} placeholder={t("Kalimat pembuka di cover…")} /></Field>
            <Field label={t("Caption")} style={{ marginTop: 14 }}><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} style={{ minHeight: 110 }} placeholder={t("Tulis draft caption…")} /></Field>
            <Field label={t("Naskah / script")} hint={t("Reels/video: hook, isi, CTA per adegan. Diisi AI atau tulis sendiri.")} style={{ marginTop: 14 }}><Textarea value={script} onChange={(e) => setScript(e.target.value)} style={{ minHeight: 120 }} placeholder={t("Naskah produksi…")} /></Field>
            <Field label={t("Catatan")} style={{ marginTop: 14 }}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 64 }} placeholder={t("Catatan produksi, ide visual, dll.")} /></Field>
          </Panel>

          <VisualBoard
            token={app.session?.access_token} toast={app.toast}
            brandName={brandObj.name} platform={platform} persona={account?.aiPersona || null}
            fields={{ title, format, hook, script, notes, goal }}
            referenceImages={referenceImages} setReferenceImages={setReferenceImages}
            storyboard={storyboard} setStoryboard={setStoryboard}
            bankImages={(app.ideas || []).filter((x) => x.imageUrl && (!x.brandId || x.brandId === brandId))}
          />

          <Panel>
            <SectionTitle sub={t("Tautan referensi & aset")}>{t("Produksi")}</SectionTitle>
            <Field label={t("Link referensi")}><Input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} icon={<Icons.link size={16} />} placeholder="https://…" /></Field>
            <Field label={t("Brief (Google Docs)")} style={{ marginTop: 14 }}><Input value={briefUrl} onChange={(e) => setBriefUrl(e.target.value)} icon={<Icons.external size={16} />} placeholder="https://docs.google.com/…" /></Field>
            <Field label={t("Desain (Canva / Drive)")} style={{ marginTop: 14 }}><Input value={designUrl} onChange={(e) => setDesignUrl(e.target.value)} icon={<Icons.image size={16} />} placeholder="https://canva.com/…" /></Field>
          </Panel>
        </div>

        {/* side column: status & hasil */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub={t("Tahap & hasil")}>{t("Status")}</SectionTitle>
            {linked ? (
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", background: "rgba(140,144,158,.09)", borderRadius: 11 }}>
                <Icons.sparkle size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto" }} />
                <span style={{ fontFamily: FCE, fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.4 }}>{t("Status")} <b>{LEAN.includes(status) ? LEAN_OPTS.find(o => o.value === status)?.label : ALL_STATUS_OPTS.find(o => o.value === status)?.label}</b> {t("— diatur otomatis oleh SinaraCast.")}</span>
              </div>
            ) : (
              <>
                {extraStages
                  ? <Select value={status} onChange={(v) => setStatus(v)} options={ALL_STATUS_OPTS} />
                  : <Segmented full options={LEAN_OPTS} value={LEAN.includes(status) ? status : "idea"} onChange={setStatus} />}
                <div style={{ marginTop: 8 }}>
                  {extraStages
                    ? <button onClick={() => { setExtraStages(false); if (!LEAN.includes(status)) setStatus("idea"); }} style={ghostLink}>{t("← Tahap ringkas saja")}</button>
                    : <button onClick={() => setExtraStages(true)} style={ghostLink}>{t("+ Tahap lain (Draf, Review, Disetujui, Revisi)")}</button>}
                </div>
              </>
            )}

            {isPosted && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <Field label={t("Link postingan")}>
                  <Input value={postLink} onChange={(e) => setPostLink(e.target.value)} icon={<Icons.link size={16} />} placeholder="https://instagram.com/…" disabled={metricsLocked} />
                </Field>
                <div style={{ fontFamily: FCE, fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".04em", margin: "16px 0 8px" }}>
                  {t("Performa")} {metricsLocked ? t("· diisi otomatis") : t("· diisi manual")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["views", "Dilihat"], ["reach", "Jangkauan"], ["likes", "Suka"], ["comments", "Komentar"], ["shares", "Dibagikan"], ["saves", "Disimpan"]].map(([k, label]) => (
                    <Field key={k} label={label}>
                      <Input value={m[k]} onChange={(e) => setMetric(k, e.target.value)} inputMode="numeric" placeholder="0" disabled={metricsLocked} />
                    </Field>
                  ))}
                </div>
                {metricsLocked && <div style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-400)", marginTop: 10, lineHeight: 1.45 }}>{t("Metrik ini ditarik otomatis dari Instagram dan tidak bisa diedit manual.")}</div>}
              </div>
            )}
          </Panel>

          {/* Otomatis — hybrid auto-publish link (Instagram only, FR-46) */}
          {plat.auto ? (
            <Panel>
              <SectionTitle sub={t("Hubungkan ke publikasi SinaraCast")}>{t("Otomatis")}</SectionTitle>
              {isPosted ? (
                <div style={{ display: "flex", gap: 9, padding: "10px 12px", background: "var(--green-100)", borderRadius: 11 }}>
                  <Icons.checkCircle size={15} style={{ color: "var(--green-500)", flex: "0 0 auto", marginTop: 1 }} />
                  <span style={{ fontFamily: FCE, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Sudah terbit.")} {linked ? t("Terbit otomatis lewat SinaraCast.") : t("Ditandai posted manual.")}</span>
                </div>
              ) : source === "linked_oneoff" ? (
                <div>
                  <div style={{ display: "flex", gap: 9, padding: "10px 12px", background: "var(--st-publishing-bg)", borderRadius: 11, marginBottom: 10 }}>
                    <Icons.calendar size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
                    <span style={{ fontFamily: FCE, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Terhubung ke postingan terjadwal")}{linkedOneoff ? <> · {linkedOneoff.type} · {pad(linkedOneoff.day)}/{linkedOneoff.ym.slice(5)} {linkedOneoff.time} WIB</> : ""}{t(". Status & link terisi otomatis saat terbit.")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {scheduledPostId && <Button size="sm" variant="secondary" full icon={<Icons.edit size={15} />} onClick={() => app.go("composer", { ch: igAccount?.id, postId: scheduledPostId })}>{t("Buka postingan")}</Button>}
                    <Button size="sm" variant="ghost" full onClick={disconnect}>{t("Putuskan")}</Button>
                  </div>
                </div>
              ) : source === "linked_rule" ? (
                <div>
                  <div style={{ display: "flex", gap: 9, padding: "10px 12px", background: "var(--st-publishing-bg)", borderRadius: 11, marginBottom: 10 }}>
                    <Icons.rules size={15} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
                    <span style={{ fontFamily: FCE, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Terhubung ke jadwal rutin")} <b>{linkedRule?.name || t("(jadwal)")}</b>{t(". Akan terbit otomatis sesuai jadwalnya.")}</span>
                  </div>
                  <Button size="sm" variant="ghost" full onClick={disconnect}>{t("Putuskan")}</Button>
                </div>
              ) : !canAuto ? (
                <div style={{ display: "flex", gap: 9, padding: "10px 12px", background: "rgba(140,144,158,.09)", borderRadius: 11 }}>
                  <Icons.info size={15} style={{ color: "var(--ink-400)", flex: "0 0 auto", marginTop: 1 }} />
                  <span style={{ fontFamily: FCE, fontSize: 12, color: "var(--ink-600)", lineHeight: 1.45 }}>{t("Brand ini belum punya akun Instagram terhubung.")} <b onClick={() => app.go("connections")} style={{ color: "var(--primary-500)", cursor: "pointer" }}>{t("Hubungkan akun IG")}</b> {t("untuk menjadwalkan otomatis.")}</span>
                </div>
              ) : (
                <div>
                  <Button variant="primary" full disabled={saving} icon={<Icons.sparkle size={16} />} onClick={scheduleAuto}>{t("Jadwalkan otomatis via SinaraCast")}</Button>
                  <div style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-400)", margin: "8px 0 12px", lineHeight: 1.45 }}>{t("Buat postingan sekali (Story/Feed/Reels) yang terbit otomatis di tanggal & jam ini.")}</div>
                  {showRulePicker ? (
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <Field label={t("Pilih jadwal rutin")}>
                        {igRules.length
                          ? <Select value="" onChange={(v) => v && linkRule(v)} options={igRules.map((r) => ({ value: r.id, label: r.name }))} placeholder={t("Pilih jadwal…")} />
                          : <div style={{ fontFamily: FCE, fontSize: 12, color: "var(--ink-400)" }}>{t("Belum ada jadwal rutin di akun ini.")}</div>}
                      </Field>
                    </div>
                  ) : (
                    <button onClick={() => setShowRulePicker(true)} style={ghostLink}>{t("atau hubungkan ke jadwal rutin yang ada →")}</button>
                  )}
                </div>
              )}
            </Panel>
          ) : null}

          {/* Adapt to another of the brand's platforms (plan once → per-platform variants) */}
          {brandPlatforms.length > 0 && (
            <Panel>
              <SectionTitle sub={t("Plan sekali, sebar ke platform lain brand ini")}>{t("Salin ke platform lain")}</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {brandPlatforms.map((pf) => {
                  const m = PLATFORM[pf] || { label: pf, accent: "var(--ink-500)" };
                  return (
                    <Button key={pf} size="sm" variant="secondary" disabled={saving} icon={<PlatIcon p={pf} size={15} />} onClick={() => adapt(pf)}>{t(m.label)}</Button>
                  );
                })}
              </div>
              <div style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-400)", marginTop: 10, lineHeight: 1.45 }}>{t("Menyalin judul, caption, dan strategi sebagai konten baru (status Ide) untuk platform itu.")}</div>
            </Panel>
          )}
        </div>
      </div>

      {/* this brand's other plan entries */}
      <Panel style={{ marginTop: 18 }}>
        <SectionTitle sub={t("Rencana konten untuk {0}", [brandObj.name])}>{t("Konten brand ini")}</SectionTitle>
        {myPlans.length === 0 ? (
          <div style={{ fontFamily: FCE, fontSize: 12.5, color: "var(--ink-400)", padding: "8px 2px" }}>{t("Belum ada konten lain untuk brand ini. Yang kamu simpan akan muncul di sini, di Rencana Konten, dan di kalender.")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {myPlans.map((p) => {
              const pm = PLATFORM[p.platform] || { label: p.platform, accent: "var(--ink-500)" };
              return (
                <button key={p.id} onClick={() => app.go("contentEditor", { id: p.id })}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--primary-200)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--line)"; }}
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "var(--surface)", textAlign: "left", width: "100%", boxShadow: "var(--shadow-sm)", transition: "box-shadow .14s, border-color .14s" }}>
                  <PlatIcon p={p.platform} size={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FCE, fontWeight: 600, fontSize: 13, color: p.title ? "var(--ink-900)" : "var(--ink-300)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || t("(tanpa judul)")}</div>
                    <div style={{ fontFamily: FCE, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{t(pm.label)} · {p.plannedDate}{p.plannedTime ? t(" · {0} WIB", [p.plannedTime]) : ""}</div>
                  </div>
                  <span style={{ fontFamily: FCE, fontSize: 11, fontWeight: 600, color: "var(--ink-500)", background: "rgba(140,144,158,.13)", padding: "3px 9px", borderRadius: 999, flex: "0 0 auto" }}>{p.statusUi}</span>
                  <Icons.chevRight size={16} style={{ color: "var(--ink-300)", flex: "0 0 auto" }} />
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

// Bantuan AI perencanaan: konsep+hook, script/naskah, dan caption — semua mengikuti
// karakter (persona) akun. Mengisi field editor langsung; pengguna bisa mengeditnya.
function PlanAI({ token, toast, brandName, platform, persona, fields, apply, hasTime }) {
  const [open, setOpen] = uCE(false);
  const [seed, setSeed] = uCE("");
  const [busy, setBusy] = uCE("");   // "" | "concept" | "script" | "caption"
  const [msg, setMsg] = uCE("");

  async function callPlan(task) {
    const r = await fetch("/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task, brandName, platform, persona, seed,
        title: fields.title, pillar: fields.pillar, format: fields.format, goal: fields.goal, hook: fields.hook }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || t("Gagal"));
    return j;
  }

  async function doConcept() {
    if (busy) return; setBusy("concept"); setMsg("");
    try {
      const { concept } = await callPlan("concept");
      if (concept.hook) apply.setHook(concept.hook);
      const noteParts = [concept.concept, concept.visualIdeas?.length ? t("Ide visual:") + "\n- " + concept.visualIdeas.join("\n- ") : ""].filter(Boolean);
      if (noteParts.length) apply.setNotes(noteParts.join("\n\n"));
      if (concept.format && !fields.format) apply.setFormat(concept.format);
      if (concept.bestTime && !hasTime) apply.setTime(concept.bestTime);
      setMsg(concept.bestTime && !hasTime ? t("Konsep, hook, jam ({0}) terisi ✓", [concept.bestTime]) : t("Konsep & hook terisi ✓"));
      toast(t("Konsep & hook dibuat ✓"), "success");
    } catch (e) { toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setBusy(""); }
  }

  async function doScript() {
    if (busy) return; setBusy("script"); setMsg("");
    try {
      const { script } = await callPlan("script");
      apply.setScript(script);
      setMsg("Naskah/script terisi di bawah ✓");
      toast(t("Script dibuat ✓"), "success");
    } catch (e) { toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setBusy(""); }
  }

  async function doCaption() {
    if (busy) return; setBusy("caption"); setMsg("");
    try {
      const instruction = [fields.title, fields.hook, seed].filter(Boolean).join(". ");
      const r = await fetch("/api/caption", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: "generate", instruction, persona, platform, postType: fields.format, brandName }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || t("Gagal"));
      apply.setCaption(j.caption);
      setMsg(t("Caption terisi ✓"));
      toast(t("Caption dibuat ✓"), "success");
    } catch (e) { toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setBusy(""); }
  }

  const accent = "var(--st-publishing)";
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 15px", borderRadius: 13, cursor: "pointer",
        border: `1px solid ${accent}`, background: "var(--st-publishing-bg)", color: accent, fontFamily: FCE, fontSize: 13, fontWeight: 600, alignSelf: "flex-start" }}>
        <Icons.sparkle size={16} /> {t("Kembangkan dengan AI — konsep, script, caption")}
      </button>
    );
  }
  return (
    <Panel>
      <SectionTitle sub={t("Konsep, hook, script & caption — ikut karakter akun")} right={<button onClick={() => setOpen(false)} aria-label={t("Tutup")} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-400)", display: "inline-flex" }}><Icons.x size={16} /></button>}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ color: accent, display: "inline-flex" }}><Icons.sparkle size={16} /></span>{t("Bantuan AI")}</span>
      </SectionTitle>
      <Field label={t("Arahan singkat (opsional)")} hint={t("Mis. angkat sisi keluarga, target ibu muda. Judul & strategi di atas juga dipakai.")}>
        <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} style={{ minHeight: 48 }} placeholder={t("Kosongkan pun tidak apa-apa…")} />
      </Field>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 12 }}>
        <Button size="sm" variant="primary" disabled={!!busy} icon={busy === "concept" ? <Spinner size={14} color="#fff" /> : <Icons.sparkle size={15} />} onClick={doConcept}>{t("Konsep & hook")}</Button>
        <Button size="sm" variant="secondary" disabled={!!busy} icon={busy === "script" ? <Spinner size={14} /> : <Icons.film size={15} />} onClick={doScript}>{t("Buatkan script")}</Button>
        <Button size="sm" variant="secondary" disabled={!!busy} icon={busy === "caption" ? <Spinner size={14} /> : <Icons.edit size={15} />} onClick={doCaption}>{t("Buatkan caption")}</Button>
      </div>
      {msg && <div style={{ fontFamily: FCE, fontSize: 12, color: "var(--st-success)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icons.checkCircle size={14} /> {msg}</div>}
    </Panel>
  );
}

// Papan Visual: moodboard referensi (unggah / dari Bank Ide) + storyboard AI.
function VisualBoard({ token, toast, brandName, platform, persona, fields, referenceImages, setReferenceImages, storyboard, setStoryboard, bankImages }) {
  const fileRef = React.useRef(null);
  const [uploading, setUploading] = uCE(false);
  const [picker, setPicker] = uCE(false);
  const [preview, setPreview] = uCE(null);   // lightbox index
  const [genBusy, setGenBusy] = uCE(false);

  async function onFiles(list) {
    const arr = [...(list || [])].filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type));
    if (!arr.length) { toast(t("Hanya gambar JPG / PNG / WebP"), "error"); return; }
    setUploading(true);
    try {
      for (const f of arr) {
        if (f.size > 10 * 1024 * 1024) { toast(t("\"{0}\" lewat 10 MB, dilewati", [f.name]), "info"); continue; }
        const url = await uploadPlanImage(f);
        setReferenceImages((prev) => [...prev, url]);
      }
    } catch (e) { toast(t("Gagal unggah: {0}", [e.message || e]), "error"); }
    finally { setUploading(false); }
  }
  const addFromBank = (url) => { setReferenceImages((prev) => (prev.includes(url) ? prev : [...prev, url])); };
  const removeImg = (idx) => setReferenceImages((prev) => prev.filter((_, i) => i !== idx));

  async function genStory() {
    if (genBusy) return; setGenBusy(true);
    try {
      const r = await fetch("/api/plan", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: "storyboard", brandName, platform, persona, title: fields.title, format: fields.format, hook: fields.hook, script: fields.script, concept: fields.notes, goal: fields.goal }),
      });
      const j = await r.json();
      if (!j.ok) { toast(j.error || t("Gagal membuat storyboard"), "error"); return; }
      setStoryboard(j.frames || []);
      toast(t("Storyboard dibuat ✓"), "success");
    } catch (e) { toast(t("Gagal: {0}", [e.message || e]), "error"); }
    finally { setGenBusy(false); }
  }
  const setFrame = (i, k, v) => setStoryboard((prev) => prev.map((fr, x) => (x === i ? { ...fr, [k]: v } : fr)));
  const removeFrame = (i) => setStoryboard((prev) => prev.filter((_, x) => x !== i));
  const addFrame = () => setStoryboard((prev) => [...prev, { scene: prev.length + 1, visual: "", voiceover: "", duration: "" }]);

  const thumb = (url, i) => (
    <div key={i} style={{ position: "relative", width: 92, height: 92, flex: "0 0 auto" }}>
      <div onClick={() => setPreview(i)} title={t("Pratinjau")} style={{ width: "100%", height: "100%", borderRadius: 11, border: "1px solid var(--line)", cursor: "zoom-in", background: `#f2f3f5 center/cover no-repeat url("${url}")` }} />
      <button onClick={() => removeImg(i)} aria-label={t("Hapus")} style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
    </div>
  );

  return (
    <Panel>
      <SectionTitle sub={t("Moodboard referensi & storyboard adegan")}>{t("Papan Visual")}</SectionTitle>

      {/* Moodboard */}
      <div style={{ fontFamily: FCE, fontSize: 11.5, fontWeight: 700, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>{t("Referensi visual")}</div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={(e) => { const fs = e.target.files; e.target.value = ""; onFiles(fs); }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {referenceImages.map((u, i) => thumb(u, i))}
        <button onClick={() => !uploading && fileRef.current?.click()} title={t("Unggah gambar")} style={{ width: 92, height: 92, borderRadius: 11, border: "1.5px dashed var(--line)", background: "rgba(140,144,158,.045)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)", flex: "0 0 auto" }}>{uploading ? <Spinner size={18} /> : <Icons.upload size={20} />}</button>
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
        <Button size="sm" variant="secondary" icon={<Icons.upload size={14} />} disabled={uploading} onClick={() => fileRef.current?.click()}>{t("Unggah gambar")}</Button>
        <Button size="sm" variant="ghost" icon={<Icons.bookmark size={14} />} onClick={() => setPicker(true)}>{t("Dari Bank Ide")}</Button>
      </div>

      {/* Storyboard */}
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 18, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: FCE, fontSize: 11.5, fontWeight: 700, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".04em", flex: 1 }}>{t("Storyboard")}</span>
          {storyboard.length > 0 && <Button size="sm" variant="ghost" disabled={genBusy} icon={genBusy ? <Spinner size={13} /> : <Icons.retry size={14} />} onClick={genStory}>{t("Buat ulang")}</Button>}
        </div>
        {storyboard.length === 0 ? (
          <div style={{ border: "1.5px dashed var(--line)", borderRadius: 12, padding: "20px 16px", textAlign: "center", background: "rgba(140,144,158,.03)" }}>
            <div style={{ fontFamily: FCE, fontSize: 12.5, color: "var(--ink-500)", marginBottom: 12, lineHeight: 1.5 }}>{t("Belum ada storyboard. Biarkan AI memecah konsep/naskah jadi adegan bergambar.")}</div>
            <Button size="sm" variant="primary" disabled={genBusy} icon={genBusy ? <Spinner size={14} color="#fff" /> : <Icons.film size={15} />} onClick={genStory}>{t("Buatkan storyboard (AI)")}</Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {storyboard.map((fr, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}>
                <div style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "var(--st-publishing-bg)", color: "var(--st-publishing)", display: "grid", placeItems: "center", fontFamily: FCE, fontWeight: 700, fontSize: 13 }}>{fr.scene || i + 1}</div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Field label={t("Visual")} style={{ marginBottom: 0 }}><Textarea value={fr.visual || ""} onChange={(e) => setFrame(i, "visual", e.target.value)} style={{ minHeight: 44 }} placeholder={t("Apa yang tampak di layar…")} /></Field>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}><Field label={t("Teks / voiceover")} style={{ marginBottom: 0 }}><Textarea value={fr.voiceover || ""} onChange={(e) => setFrame(i, "voiceover", e.target.value)} style={{ minHeight: 40 }} placeholder={t("Teks di layar / narasi…")} /></Field></div>
                    <div style={{ width: 96, flex: "0 0 auto" }}><Field label={t("Durasi")} style={{ marginBottom: 0 }}><Input value={fr.duration || ""} onChange={(e) => setFrame(i, "duration", e.target.value)} placeholder={t("3 dtk")} /></Field></div>
                  </div>
                </div>
                <button onClick={() => removeFrame(i)} aria-label={t("Hapus adegan")} style={{ width: 28, height: 28, flex: "0 0 auto", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", color: "var(--ink-400)", display: "grid", placeItems: "center", alignSelf: "flex-start" }}><Icons.x size={14} /></button>
              </div>
            ))}
            <button onClick={addFrame} style={{ ...ghostLink, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}><Icons.plus size={14} /> {t("Tambah adegan")}</button>
          </div>
        )}
      </div>

      {/* Picker Bank Ide */}
      <Modal open={picker} onClose={() => setPicker(false)} width={620}>
        <div style={{ padding: 22 }}>
          <SectionTitle sub={t("Pilih gambar dari item Bank Ide untuk brand ini")}>{t("Ambil dari Bank Ide")}</SectionTitle>
          {bankImages.length === 0 ? (
            <div style={{ fontFamily: FCE, fontSize: 13, color: "var(--ink-400)", textAlign: "center", padding: 20 }}>{t("Belum ada item Bank Ide bergambar untuk brand ini.")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, maxHeight: 360, overflowY: "auto" }} className="sc-scroll">
              {bankImages.map((it) => {
                const on = referenceImages.includes(it.imageUrl);
                return (
                  <button key={it.id} onClick={() => addFromBank(it.imageUrl)} title={it.title || t("Tambah")} style={{ position: "relative", padding: 0, border: on ? "2px solid var(--primary-400)" : "1px solid var(--line)", borderRadius: 11, overflow: "hidden", cursor: "pointer", background: "#fff" }}>
                    <div style={{ height: 92, background: `#f2f3f5 center/cover no-repeat url("${it.imageUrl}")` }} />
                    <div style={{ padding: "6px 8px", fontFamily: FCE, fontSize: 10.5, color: "var(--ink-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{it.title || t("(tanpa judul)")}</div>
                    {on && <span style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "var(--primary-500)", color: "#fff", display: "grid", placeItems: "center" }}><Icons.check size={12} sw={2.6} /></span>}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><Button variant="primary" onClick={() => setPicker(false)}>{t("Selesai")}</Button></div>
        </div>
      </Modal>

      <Lightbox imgs={referenceImages.map((u) => ({ url: u }))} index={preview} onClose={() => setPreview(null)} onIndex={setPreview} ratio={null} />
    </Panel>
  );
}

const ghostLink = { background: "none", border: "none", cursor: "pointer", fontFamily: FCE, fontSize: 12, fontWeight: 600, color: "var(--primary-500)", padding: 0 };
