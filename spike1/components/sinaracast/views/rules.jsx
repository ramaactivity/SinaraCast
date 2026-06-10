"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp, useFetchState } from "../store";
import { Topbar } from "../shell";
import {
  BRANDS, BrandAvatar, Panel, Card, Button, IconButton, Status, Toggle,
  Sparkline, MediaThumb, EmptyState, Skeleton, Spinner, SectionTitle, Modal, Banner,
} from "../ui";
const { useState: uRl } = React;
const FR = "var(--font)";

function modeLabel(m) { return m === "schedule" ? "Beda akhir pekan" : "Satu kumpulan"; }

export function RulesView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  // resolve within the ACTIVE brand's accounts only (never fall back to another brand's channel)
  const ch = (app.brandAccounts || []).find(c => c.id === app.channel) || (app.brandAccounts || [])[0];
  const b = BRANDS[ch?.brand] || { name: ch?.name || "—", accent: "var(--ink-500)", soft: "var(--line)" };
  const rules = app.rules.filter(r => r.ch === (ch?.id || app.channel));
  const [sel, setSel] = uRl(null);

  if (!ch) {
    return (
      <div>
        <Topbar title="Jadwal Otomatis" />
        <Panel pad={0}><EmptyState icon={<Icons.connections size={28} />} title="Belum ada akun"
          body="Sambungkan akun Instagram pertamamu dulu untuk mulai membuat jadwal otomatis."
          action={<Button variant="amber" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.go("connections")}>Sambungkan akun</Button>} /></Panel>
      </div>
    );
  }

  const selRule = rules.find(r => r.id === sel) || rules[0];

  // activity summary for this channel — real counts over the last 7 days (WIB)
  const chRuns = app.runs.filter(r => r.ch === app.channel);
  const failCt = chRuns.filter(r => r.status === "Failed").length;
  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate() - (6 - i)));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  });
  const week = last7.map(key => chRuns.filter(r => r.dateWib === key && r.status === "Published").length);
  const pubWeek = week.reduce((a, n) => a + n, 0);

  const isTikTok = ch.platform === "tiktok";
  const right = isTikTok
    ? <Button variant="secondary" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.go("composer", { ch: app.channel })}>Buat postingan TikTok</Button>
    : <Button variant="amber" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.go("editor", { ch: app.channel, mode: "schedule", isNew: true })}>Buat jadwal</Button>;

  return (
    <div>
      <Topbar title="Jadwal Otomatis" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} src={ch.avatarUrl} size={18} /> {b.name} · {ch.handle}</span>} right={right} />

      {/* channel-level banners */}
      {ch.status === "Needs reconnect" && <Banner tone="error" icon={<Icons.alert size={18} />}
        title="Akun perlu disambungkan ulang" body="Koneksi ke Instagram putus. Posting dihentikan sampai akun tersambung kembali."
        action={<Button size="sm" variant="danger" onClick={() => app.go("connections")}>Sambungkan ulang</Button>} />}
      {ch.paused && <Banner tone="paused" icon={<Icons.pause size={18} />}
        title="Akun ini sedang dijeda" body={`Tidak ada postingan sampai dilanjutkan${ch.resumeDate ? ` · otomatis ${ch.resumeDate}` : ""}.`}
        action={<Button size="sm" variant="secondary" onClick={() => app.go("connections")}>Atur jeda</Button>} />}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* activity summary */}
          {phase === "ready" && rules.length > 0 && (
            <Panel pad={18}>
              <div style={app.isMobile
                ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }
                : { display: "flex", alignItems: "center", gap: 26 }}>
                <Stat label="Terbit minggu ini" value={`${pubWeek} postingan`} sub="7 hari terakhir" spark={week} color={b.accent} />
                {!app.isMobile && <Div />}
                <Stat label="Jadwal aktif" value={`${rules.filter(r => r.active).length} / ${rules.length}`} sub="di akun ini" />
                {!app.isMobile && <Div />}
                <Stat label="Perlu perhatian" value={failCt > 0 ? `${failCt} gagal` : "Aman"} sub={failCt > 0 ? "lihat Riwayat" : "semua lancar"} danger={failCt > 0} />
              </div>
            </Panel>
          )}

          {/* rule list */}
          {phase === "loading" && <LoadingRules />}
          {phase === "error" && <ErrorState onRetry={() => app.toast("Memuat ulang…", "info")} />}
          {phase === "ready" && rules.length === 0 && (
            isTikTok
              ? <Panel pad={0}><EmptyState icon={<Icons.film size={28} />} title="Jadwal otomatis khusus Instagram"
                  body={`Jadwal Stories berulang baru tersedia untuk Instagram. Untuk ${b.name} (TikTok), jadwalkan video sekali lewat Buat Postingan.`}
                  action={<Button variant="amber" icon={<Icons.plus size={16} sw={2} />} onClick={() => app.go("composer", { ch: app.channel })}>Buat postingan TikTok</Button>} /></Panel>
              : <Panel pad={0}><EmptyState icon={<Icons.rules size={28} />} title="Belum ada jadwal di akun ini"
                  body={`Buat jadwal otomatis pertama untuk ${b.name}. Masukkan kumpulan gambar, atur waktunya, lalu biarkan terbit sendiri.`}
                  action={<Button variant="amber" icon={<Icons.plus size={18} sw={2} />} onClick={() => app.go("editor", { ch: app.channel, mode: "schedule", isNew: true })}>Buat jadwal</Button>} /></Panel>
          )}
          {phase === "ready" && rules.map(r => (
            <RuleCard key={r.id} r={r} b={b} selected={selRule && selRule.id === r.id} onSelect={() => setSel(r.id)} disabled={ch.status === "Needs reconnect"} />
          ))}
        </div>

        {/* what's next inspector */}
        {phase === "ready" && rules.length > 0 && selRule && <NextInspector r={selRule} b={b} ch={ch} />}
        {phase === "loading" && <Panel style={{ height: 360 }}><Skeleton h={20} w="50%" /><div style={{ height: 14 }} /><Skeleton h={150} r={14} /></Panel>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, spark, color, danger }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: FR, fontSize: 11.5, color: "var(--ink-400)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: FR, fontSize: 19, fontWeight: 600, color: danger ? "var(--danger)" : "var(--ink-900)", margin: "3px 0 1px" }}>{value}</div>
      {spark ? <Sparkline data={spark} w={110} h={30} color={color} /> : <div style={{ fontFamily: FR, fontSize: 11, color: "var(--ink-400)" }}>{sub}</div>}
    </div>
  );
}
const Div = () => <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />;

function RuleCard({ r, b, selected, onSelect, disabled }) {
  const app = useApp();
  const [menu, setMenu] = uRl(false);
  const menuRef = React.useRef(null);
  // Close the "..." menu on outside click / Escape (robust, not via a fixed overlay
  // which app-shell's backdrop-filter would trap).
  React.useEffect(() => {
    if (!menu) return;
    const onDoc = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [menu]);
  const total = r.mode === "schedule" ? (r.pools.weekday + r.pools.weekend) : r.pools.pool;
  return (
    <Card pad={0} onClick={() => app.go("editor", { ch: r.ch, id: r.id })} style={{ borderColor: selected ? b.accent : "var(--line)", borderWidth: selected ? 1.5 : 1,
      boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)", overflow: "visible" }} hover>
      <div onMouseEnter={onSelect} style={{ display: "flex", alignItems: "center", gap: app.isMobile ? 11 : 14, padding: "16px 18px", flexWrap: app.isMobile ? "wrap" : "nowrap" }}>
        <MediaThumb seed={r.lastImg} src={r.thumbUrl} w={46} label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FR, fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{r.name}</span>
            <span style={{ fontFamily: FR, fontSize: 10.5, fontWeight: 600, color: b.accent, background: b.soft, padding: "2px 8px", borderRadius: 999 }}>{modeLabel(r.mode)}</span>
            {!r.active && <Status s="Inactive" />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 5, fontFamily: FR, fontSize: 12, color: "var(--ink-500)", flexWrap: "wrap", rowGap: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icons.calendar size={14} />{r.cadence}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icons.clock size={14} />{r.time} WIB</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icons.image size={14} />{total} gambar</span>
          </div>
        </div>
        {/* shuffle cycle progress (hidden on mobile — also shown in the inspector) */}
        {!app.isMobile && (
        <div style={{ textAlign: "right", marginRight: 4, flex: "0 0 auto" }}>
          <div style={{ fontFamily: FR, fontSize: 10.5, color: "var(--ink-400)", marginBottom: 5, display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}><Icons.shuffle size={13} />{r.cycle.used}/{r.cycle.total} sudah tampil</div>
          <CycleDots used={r.cycle.used} total={r.cycle.total} color={b.accent} />
        </div>
        )}
        <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", flex: "0 0 auto" }}><Toggle on={r.active} onChange={(v) => app.toggleRuleActive(r, v)} /></span>
        <div ref={menuRef} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
          <IconButton icon={<Icons.more size={18} />} onClick={() => setMenu(m => !m)} active={menu} />
          {menu && (
            <>
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50, background: "#fff", borderRadius: 13, boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", padding: 5, width: 168, animation: "scPop .14s" }}>
                <Menu icon={<Icons.edit size={16} />} onClick={() => { setMenu(false); app.go("editor", { ch: r.ch, id: r.id }); }}>Ubah jadwal</Menu>
                <Menu icon={<Icons.play size={16} />} onClick={() => { setMenu(false); app.postNow(r); }}>Terbitkan sekarang</Menu>
                <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
                <Menu icon={<Icons.trash size={16} />} danger onClick={() => { setMenu(false); app.confirm({
                  title: `Hapus jadwal “${r.name}”?`, danger: true, confirmLabel: "Hapus jadwal",
                  body: "Tindakan ini tidak bisa dibatalkan.",
                  consequence: "Jadwal ini dihapus dan berhenti memposting. Gambar-gambarnya tetap tersimpan, tidak ikut terhapus.",
                  onConfirm: () => { app.deleteRule(r.id); app.toast(`Jadwal “${r.name}” dihapus`, "success"); } }); }}>Hapus jadwal</Menu>
              </div>
            </>
          )}
        </div>
      </div>
      {/* footer: status + post-now */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderTop: "1px solid var(--line)", background: "rgba(246,245,251,.5)", borderRadius: "0 0 var(--r-md) var(--r-md)", flexWrap: "wrap", rowGap: 10 }}>
        {r.todayStatus === "Failed"
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FR, fontSize: 12, color: "var(--danger)" }}><Status s="Failed" /> {r.failReason}</span>
          : <span style={{ fontFamily: FR, fontSize: 12, color: "var(--ink-500)" }}>Terbit berikutnya: <b style={{ color: "var(--ink-900)", fontWeight: 600 }}>{r.nextRun}</b></span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
          {r.todayStatus === "Failed" && <Button size="sm" variant="secondary" icon={<Icons.retry size={15} />} onClick={() => app.postNow(r, true)}>Coba lagi</Button>}
          <Button size="sm" variant="primary" icon={<Icons.play size={15} />} disabled={disabled || !r.active} onClick={() => app.postNow(r)}>Terbitkan sekarang</Button>
        </div>
      </div>
    </Card>
  );
}

// Shuffle-cycle progress dots. Capped so a large pool (e.g. 64 images) can't push
// the card layout out of shape — beyond the cap we show a proportional fill instead
// of one dot per image. The exact "x/y sudah tampil" count is shown above this.
function CycleDots({ used, total, color }) {
  const MAXD = 12;
  const t = total || 0;
  const shown = Math.min(t, MAXD);
  const filled = t ? Math.max(used > 0 ? 1 : 0, Math.round((used / t) * shown)) : 0;
  return (
    <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", flexWrap: "nowrap" }}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < filled ? color : "var(--line)" }} />
      ))}
    </div>
  );
}

function Menu({ children, icon, danger, onClick }) {
  const [h, setH] = uRl(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", cursor: "pointer", borderRadius: 9,
        background: h ? (danger ? "var(--danger-bg)" : "rgba(140,144,158,.1)") : "transparent", color: danger ? "var(--danger)" : "var(--ink-700)",
        fontFamily: FR, fontSize: 13, fontWeight: 500, textAlign: "left" }}>{icon}{children}</button>
  );
}

/* What's next inspector */
function NextInspector({ r, b, ch }) {
  const app = useApp();
  const [swap, setSwap] = uRl(false);
  const total = r.mode === "schedule" ? r.pools.weekday : r.pools.pool;
  const paused = ch.paused || ch.status === "Needs reconnect";
  return (
    <Panel strong style={{ position: "sticky", top: 8 }}>
      <SectionTitle sub={r.name}>Terbit berikutnya</SectionTitle>
      <div style={{ display: "flex", gap: 14 }}>
        <MediaThumb seed={r.lastImg} src={r.thumbUrl} w={92} label="9:16" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FR, fontSize: 11, color: "var(--ink-400)" }}>Dijadwalkan</div>
          <div style={{ fontFamily: FR, fontWeight: 600, fontSize: 15, color: "var(--ink-900)", margin: "2px 0 10px" }}>{r.nextRun}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontFamily: FR, fontSize: 12, color: "var(--ink-600)" }}>
            <Meta icon={<Icons.shuffle size={14} />} t={`Diacak, tiap gambar dapat giliran · ${r.cycle.used}/${r.cycle.total} sudah tampil`} />
            <Meta icon={<Icons.layers size={14} />} t={r.mode === "schedule" ? `${r.pools.weekday} gambar hari kerja` : `${r.pools.pool} gambar`} />
            <Meta icon={<Icons.clock size={14} />} t={`Toleransi telat ${r.grace} menit`} />
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />
      <div style={{ fontFamily: FR, fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)", marginBottom: 10 }}>Khusus hari ini</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {r.todayOverride === "skip"
          ? <Button variant="secondary" size="sm" style={{ padding: "0 10px" }} icon={<Icons.retry size={15} />} disabled={paused} onClick={() => app.unskipToday(r)}>Batalkan</Button>
          : <Button variant="secondary" size="sm" style={{ padding: "0 10px" }} icon={<Icons.skip size={15} />} disabled={paused} onClick={() => app.skipToday(r)}>Lewati</Button>}
        <Button variant="secondary" size="sm" style={{ padding: "0 10px" }} icon={<Icons.swap size={15} />} disabled={paused || r.todayOverride === "skip"} onClick={() => setSwap(true)}>Ganti gambar</Button>
      </div>
      <div style={{ marginTop: 9 }}>
        <Button variant="primary" size="sm" full icon={<Icons.play size={15} />} disabled={paused || !r.active} onClick={() => app.postNow(r)}>Terbitkan sekarang</Button>
      </div>
      <button onClick={() => app.go("editor", { ch: r.ch, id: r.id })} style={{ width: "100%", marginTop: 14, background: "transparent", border: "none", cursor: "pointer", fontFamily: FR, fontSize: 12.5, fontWeight: 600, color: b.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>Ubah jadwal lengkap <Icons.chevRight size={15} /></button>

      <SwapModal open={swap} onClose={() => setSwap(false)} r={r} />
    </Panel>
  );
}
function Meta({ icon, t }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--ink-400)" }}>{icon}</span>{t}</span>; }

function SwapModal({ open, onClose, r }) {
  const app = useApp();
  const [pick, setPick] = uRl(null);
  const role = r.mode === "schedule" ? "weekday" : "single";
  const imgs = (r.poolImages || []).filter(im => im.role === role);
  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`Pilih satu gambar untuk postingan hari ini saja — “${r.name}”`}>Ganti gambar hari ini</SectionTitle>
        {imgs.length === 0
          ? <div style={{ padding: "28px 0", textAlign: "center", fontFamily: FR, fontSize: 13, color: "var(--ink-400)" }}>Belum ada gambar untuk jadwal ini.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, maxHeight: 360, overflow: "auto" }} className="sc-scroll">
              {imgs.map((im, i) => (
                <MediaThumb key={i} src={im.url} w={"100%"} ratio={16 / 9} selected={pick === i} onClick={() => setPick(i)} />
              ))}
            </div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={pick === null} icon={<Icons.check size={17} />} onClick={() => { const im = imgs[pick]; onClose(); app.swapToday(r, im?.id, im?.url); }}>Pakai gambar ini</Button>
        </div>
      </div>
    </Modal>
  );
}

/* shared small bits */
function LoadingRules() {
  return <>{[0, 1, 2].map(i => <Panel key={i} pad={16} style={{ marginBottom: 0 }}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Skeleton w={46} h={62} r={10} /><div style={{ flex: 1 }}><Skeleton w="40%" h={16} /><div style={{ height: 9 }} /><Skeleton w="65%" h={12} /></div><Spinner /></div></Panel>)}</>;
}
function ErrorState({ onRetry }) {
  return <Panel pad={0}><EmptyState icon={<Icons.warn size={28} />} title="Gagal memuat jadwal" body="Ada kendala saat mengambil data. Periksa koneksi internet lalu coba lagi." action={<Button variant="secondary" icon={<Icons.retry size={16} />} onClick={onRetry}>Coba lagi</Button>} /></Panel>;
}
