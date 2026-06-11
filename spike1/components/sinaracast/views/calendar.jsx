"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, IconButton, Status, EmptyState, Skeleton, Segmented, Select, Modal, SectionTitle, PlatIcon } from "../ui";
import { PLATFORM } from "./contentEditor";
const { useState: uCa } = React;
const FCa = "var(--font)";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad2 = (n) => String(n).padStart(2, "0");
// Brand styling for a channel slug, with a neutral fallback for OAuth channels.
const brandFor = (slug, channels) => BRANDS[slug] || {
  name: channels.find(c => c.id === slug)?.name || slug,
  short: (channels.find(c => c.id === slug)?.name || slug || "?").slice(0, 2).toUpperCase(),
  accent: "var(--ink-500)", soft: "var(--line)", grad: "linear-gradient(135deg,#9aa0ab,#7a8090)",
};

// Planner status → label + indicator color (distinct from run/oneoff statuses).
const PLAN_ORDER = ["idea", "draft", "review", "approved", "revision", "ready", "posted"];
const PLAN_LABEL = { idea: "Ide", draft: "Draf", review: "Review", approved: "Disetujui", revision: "Revisi", ready: "Siap", posted: "Posted" };
const PLAN_ST_COLOR = {
  idea: "var(--st-skipped)", draft: "var(--st-skipped)", review: "var(--st-publishing)",
  approved: "var(--st-scheduled)", revision: "var(--st-failed)", ready: "var(--st-scheduled)", posted: "var(--st-success)",
};
const platMeta = (p) => PLATFORM[p] || { label: p || "—", accent: "var(--ink-500)" };
const tint = (c, pct = 10) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

// Does a rule fire on this calendar day? Mirrors /api/cron isFireDay (WIB, JS day-of-week 0=Sun..6=Sat).
function ruleFires(rule, Y, M, day) {
  const jsDow = new Date(Date.UTC(Y, M, day)).getUTCDay();
  if (rule.cadenceType === "daily") return true;
  if (rule.cadenceType === "weekdays") return (rule.weekdaysDb || []).includes(jsDow);
  if (rule.cadenceType === "every_n_days") {
    const n = rule.intervalDays || 2;
    if (!rule.createdAt) return false;
    const anchor = new Date(new Date(rule.createdAt).getTime() + 7 * 3600 * 1000); // WIB
    const a = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const t = Date.UTC(Y, M, day);
    const diff = Math.round((t - a) / 86400000);
    return diff >= 0 && diff % n === 0;
  }
  return false;
}
function ruleTime(rule, Y, M, day) {
  if (rule.mode !== "schedule") return rule.postTime || "—";
  const jsDow = new Date(Date.UTC(Y, M, day)).getUTCDay();
  const weekend = jsDow === 0 || jsDow === 6;
  return (weekend ? rule.weekendTime : rule.weekdayTime) || "—";
}

// Run/one-off status → { dot, bg } for the in-cell event pills (soft tints, solid markers).
const ST_C = {
  Failed: { dot: "var(--st-failed)", bg: "var(--st-failed-bg)" },
  Published: { dot: "var(--st-success)", bg: "var(--st-success-bg)" },
  Draft: { dot: "var(--st-skipped)", bg: "var(--st-skipped-bg)" },
  Skipped: { dot: "var(--st-skipped)", bg: "var(--st-skipped-bg)" },
};
const stColor = (s) => ST_C[s] || { dot: "var(--st-scheduled)", bg: "var(--st-scheduled-bg)" };
// A one-off's implied platform (recurring runs are always Instagram).
const oneoffPlatform = (o) => o.type === "TikTok" ? "tiktok" : "instagram";

export function CalendarView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [filter, setFilter] = uCa("all");          // brand/account
  const [platFilter, setPlatFilter] = uCa("all");  // platform
  const [statFilter, setStatFilter] = uCa("all");  // planner status
  const [mode, setMode] = uCa("month");            // month | week | list
  const [sel, setSel] = uCa(null);                 // {day, items}
  const [monthOffset, setMonthOffset] = uCa(0);    // 0 = current month
  // Reset filters when the brand changes — an account/status filter from another
  // brand is meaningless here and would blank the calendar.
  React.useEffect(() => { setFilter("all"); setPlatFilter("all"); setStatFilter("all"); }, [app.brand]);

  // target month in WIB (shiftable via the prev/next nav)
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const base = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth() + monthOffset, 1));
  const Y = base.getUTCFullYear(), M = base.getUTCMonth();
  const isCurrentMonth = monthOffset === 0;
  const TODAY = isCurrentMonth ? nowWib.getUTCDate() : -1; // -1 → no "today" highlight off-month
  const DAYS = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const ym = `${Y}-${pad2(M + 1)}`;
  const MONTH = `${MONTH_NAMES[M]} ${Y}`;
  const leadingBlanks = (new Date(Date.UTC(Y, M, 1)).getUTCDay() + 6) % 7; // Mon-first offset
  const weekStart = isCurrentMonth ? Math.max(1, TODAY - ((new Date(Date.UTC(Y, M, TODAY)).getUTCDay() + 6) % 7)) : 1; // Monday of current week
  // projection window: future month → all days; current → today onward; past → none
  const projectFrom = monthOffset > 0 ? 1 : monthOffset < 0 ? Infinity : TODAY;

  // Everything is scoped to the active BRAND (workspace); `filter` narrows to one account.
  const brandAccts = app.brandAccounts || [];
  const brandSlugs = new Set(brandAccts.map(a => a.id));
  const inScope = (slug) => brandSlugs.has(slug) && (filter === "all" || slug === filter);
  const statusActive = statFilter !== "all";       // a planner-status filter hides runs/one-offs (they're not plan-pipeline items)
  const platOk = (p) => platFilter === "all" || p === platFilter;
  const rules = app.rules.filter(r => inScope(r.ch));
  const oneoffs = app.oneoffs.filter(o => o.ym === ym && inScope(o.ch));

  // content_plan entries this month for this brand, after account+platform+status filters.
  const plansMonth = (app.plans || []).filter(p => p.ym === ym && p.brandId === app.brand
    && (filter === "all" || p.ch === filter)
    && platOk(p.platform)
    && (statFilter === "all" || p.status === statFilter));
  // summary ignores the status filter so the breakdown stays meaningful.
  const plansSummary = (app.plans || []).filter(p => p.ym === ym && p.brandId === app.brand
    && (filter === "all" || p.ch === filter)
    && platOk(p.platform));

  // ground truth from real runs this month: ruleId|day → {status, time}
  const runByRuleDay = {};
  app.runs.forEach(r => {
    if (!r.dateWib || !r.dateWib.startsWith(ym)) return;
    if (!inScope(r.ch)) return;
    const day = parseInt(r.dateWib.slice(8, 10), 10);
    const time = (r.actual !== "—" ? r.actual : r.sched).split(", ")[1] || "";
    runByRuleDay[`${r.ruleId}|${day}`] = { status: r.status, time, ch: r.ch, rule: r.rule, ruleId: r.ruleId };
  });

  // Hari Spesial markers for this month (active only) — day → [{name, category}]
  const specialByDay = {};
  (app.specialDays || []).forEach((s) => {
    if (!s.active || !s.date?.startsWith(ym)) return;
    (specialByDay[parseInt(s.date.slice(8, 10), 10)] ||= []).push(s);
  });

  const itemsFor = (day) => {
    const items = [];
    // recurring runs + projections (Instagram) — hidden when a planner-status filter is on, or platform≠IG
    if (!statusActive && platOk("instagram")) {
      Object.entries(runByRuleDay).forEach(([key, v]) => {
        if (parseInt(key.split("|")[1], 10) !== day) return;
        items.push({ kind: "rule", ch: v.ch, title: v.rule, time: v.time || "—", status: v.status, ruleId: v.ruleId });
      });
      if (day >= projectFrom) {
        rules.forEach(r => {
          if (!r.active) return;
          if (!ruleFires(r, Y, M, day)) return;
          if (runByRuleDay[`${r.id}|${day}`]) return; // already shown from history
          items.push({ kind: "rule", ch: r.ch, title: r.name, time: ruleTime(r, Y, M, day), status: "Scheduled", rule: r });
        });
      }
    }
    // one-off scheduled posts — hidden when a planner-status filter is on
    if (!statusActive) {
      oneoffs.filter(o => o.day === day && platOk(oneoffPlatform(o))).forEach(o => items.push({ kind: "oneoff", ...o, platform: oneoffPlatform(o) }));
    }
    // planned content (content_plan)
    plansMonth.filter(p => p.day === day).forEach(p => items.push({
      kind: "plan", id: p.id, ch: p.ch, title: p.title || "(tanpa judul)", time: p.plannedTime || "—",
      statusKey: p.status, statusUi: p.statusUi, platform: p.platform, autoManaged: p.autoManaged,
    }));
    return items.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  };

  const openItem = (it) => {
    if (it.kind === "plan") app.go("contentEditor", { id: it.id, ch: it.ch });
    else if (it.kind === "oneoff") app.go("composer", { ch: it.ch, postId: it.id });
    else app.go("rules");
  };
  const createForDay = (day) => app.go("contentEditor", { brand: app.brand, date: `${ym}-${pad2(day)}` });

  const brandOpts = [{ value: "all", label: "Semua akun" }, ...brandAccts.map(a => ({ value: a.id, label: `${platMeta(a.platform).label} · ${a.handle}` }))];
  const platOpts = [{ value: "all", label: "Semua platform" }, ...Object.entries(PLATFORM).map(([v, m]) => ({ value: v, label: m.label }))];
  const statOpts = [{ value: "all", label: "Semua status" }, ...PLAN_ORDER.map(s => ({ value: s, label: PLAN_LABEL[s] }))];

  const totalItems = Array.from({ length: DAYS }, (_, i) => itemsFor(i + 1)).flat().length;

  // summary: count by status + by platform across the month (filter-aware).
  const byStatus = {}; PLAN_ORDER.forEach(s => { const n = plansSummary.filter(p => p.status === s).length; if (n) byStatus[s] = n; });
  const byPlatform = {}; plansSummary.forEach(p => { byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1; });

  // Build the grid cells: month = full weeks (with faded prev/next-month days); week = the seven days of the current week.
  const cells = [];
  if (mode === "week") {
    for (let k = 0; k < 7; k++) { const d = weekStart + k; cells.push(d > DAYS ? { type: "empty" } : { type: "day", day: d }); }
  } else {
    const total = Math.ceil((leadingBlanks + DAYS) / 7) * 7;
    for (let idx = 0; idx < total; idx++) {
      const n = idx - leadingBlanks + 1;
      if (n < 1) cells.push({ type: "faded", label: prevMonthDays + n });
      else if (n > DAYS) cells.push({ type: "faded", label: n - DAYS });
      else cells.push({ type: "day", day: n });
    }
  }
  const cap = mode === "week" ? 8 : 2;
  const rows = cells.length / 7;
  const useAgenda = app.isMobile || mode === "list";

  // ---- in-cell event pill (compact) ----
  const Pill = ({ it }) => {
    if (it.kind === "plan") {
      const pm = platMeta(it.platform);
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: tint(pm.accent, 9), borderRadius: 7, padding: "2px 7px 2px 6px", borderLeft: `2.5px solid ${pm.accent}`, overflow: "hidden", flex: "0 0 auto" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PLAN_ST_COLOR[it.statusKey] || "var(--st-scheduled)", flex: "0 0 auto" }} />
          <span style={{ fontFamily: FCa, fontSize: 10.5, color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
            {it.time !== "—" && <b style={{ fontWeight: 700, color: "var(--ink-700)" }}>{it.time} </b>}{it.title}
          </span>
        </div>
      );
    }
    const b = brandFor(it.ch, app.channels);
    const sc = stColor(it.status);
    const oneoff = it.kind === "oneoff";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: sc.bg, borderRadius: 7, padding: "2px 7px 2px 6px", borderLeft: oneoff ? `2.5px solid ${b.accent}` : "none", overflow: "hidden", flex: "0 0 auto" }}>
        <span style={{ width: 6, height: 6, borderRadius: oneoff ? 1.5 : "50%", background: sc.dot, flex: "0 0 auto" }} />
        <span style={{ fontFamily: FCa, fontSize: 10.5, color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
          <b style={{ fontWeight: 700, color: "var(--ink-700)" }}>{it.time}</b> {it.title}
        </span>
      </div>
    );
  };

  // ---- agenda row (mobile + desktop List mode) ----
  const AgendaRow = ({ it }) => {
    const b = brandFor(it.ch, app.channels);
    const isPlan = it.kind === "plan";
    const pm = isPlan ? platMeta(it.platform) : null;
    return (
      <button onClick={() => openItem(it)}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--primary-200)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--line)"; }}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 13, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%", boxShadow: "var(--shadow-sm)", transition: "box-shadow .14s, border-color .14s" }}>
        <BrandAvatar brand={b} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FCa, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
          <div style={{ fontFamily: FCa, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {it.time !== "—" ? `${it.time} WIB · ` : ""}{b.name}{isPlan ? ` · ${pm.label}` : it.kind === "oneoff" ? ` · ${it.type}` : ""}
          </div>
        </div>
        {isPlan
          ? <span style={{ fontFamily: FCa, fontSize: 11, fontWeight: 600, color: PLAN_ST_COLOR[it.statusKey] || "var(--ink-500)", background: tint(PLAN_ST_COLOR[it.statusKey] || "var(--ink-500)", 14), padding: "3px 9px", borderRadius: 999, flex: "0 0 auto" }}>{it.statusUi}</span>
          : <Status s={it.status} />}
      </button>
    );
  };

  const agendaBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {Array.from({ length: DAYS }, (_, i) => i + 1).map(day => {
        const items = itemsFor(day);
        if (!items.length) return null;
        const isToday = day === TODAY;
        return (
          <div key={day}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: isToday ? "var(--primary-grad)" : "rgba(140,144,158,.12)", color: isToday ? "#fff" : "var(--ink-700)", fontFamily: FCa, fontWeight: 700, fontSize: 13 }}>{pad2(day)}</span>
              <span style={{ fontFamily: FCa, fontSize: 12.5, fontWeight: 600, color: "var(--ink-500)" }}>{DOW[(new Date(Date.UTC(Y, M, day)).getUTCDay() + 6) % 7]}{isToday ? " · Hari ini" : ""}</span>
              {specialByDay[day] && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--primary-100)", color: "#E0922A", borderRadius: 999, padding: "2px 8px", fontFamily: FCa, fontSize: 10.5, fontWeight: 700 }}><Icons.sun size={11} />{specialByDay[day][0].name}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map((it, i) => <AgendaRow key={i} it={it} />)}</div>
          </div>
        );
      })}
    </div>
  );

  const gridBody = (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gridTemplateRows: `auto repeat(${rows}, minmax(0,1fr))`, gap: 8 }}>
      {DOW.map((d, di) => <div key={d} style={{ textAlign: "center", fontFamily: FCa, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: di >= 5 ? "var(--ink-300)" : "var(--ink-400)", paddingBottom: 6 }}>{d}</div>)}
      {cells.map((c, idx) => {
        if (c.type === "empty") return <div key={"e" + idx} />;
        if (c.type === "faded") return (
          <div key={"f" + idx} style={{ minWidth: 0, borderRadius: 14, padding: "8px 10px", fontFamily: FCa, fontSize: 12.5, fontWeight: 500, color: "var(--ink-300)", opacity: 0.5 }}>{pad2(c.label)}</div>
        );
        const day = c.day;
        const items = itemsFor(day);
        const isToday = day === TODAY;
        const weekend = ((new Date(Date.UTC(Y, M, day)).getUTCDay() + 6) % 7) >= 5;
        return (
          <button key={day} onClick={() => setSel({ day, items })}
            style={{ textAlign: "left", border: isToday ? "1.5px solid var(--primary-300)" : "1px solid var(--line-soft)", cursor: "pointer",
              background: isToday ? "var(--primary-100)" : weekend ? "rgba(140,144,158,.045)" : "rgba(255,255,255,.6)",
              borderRadius: 14, padding: "8px 10px 9px", minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6, transition: "box-shadow .14s, border-color .14s, transform .14s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; if (!isToday) e.currentTarget.style.borderColor = "var(--primary-200)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; if (!isToday) e.currentTarget.style.borderColor = "var(--line-soft)"; }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flex: "0 0 auto", minWidth: 0 }}>
              {isToday
                ? <span style={{ minWidth: 23, height: 23, padding: "0 6px", borderRadius: 8, background: "var(--primary-grad)", color: "#fff", display: "inline-grid", placeItems: "center", fontFamily: FCa, fontWeight: 700, fontSize: 12, boxShadow: "var(--shadow-primary)" }}>{pad2(day)}</span>
                : <span style={{ fontFamily: FCa, fontSize: 12.5, fontWeight: 600, color: weekend ? "var(--ink-300)" : "var(--ink-500)" }}>{pad2(day)}</span>}
              {specialByDay[day] && (
                <span title={specialByDay[day].map((s) => s.name).join(" · ")} style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0, background: "var(--primary-100)", color: "#E0922A", borderRadius: 999, padding: "2px 7px", fontFamily: FCa, fontSize: 9.5, fontWeight: 700 }}>
                  <Icons.sun size={10} style={{ flex: "0 0 auto" }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{specialByDay[day][0].name}</span>
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minHeight: 0, overflow: "hidden" }}>
              {items.slice(0, cap).map((it, i) => <Pill key={i} it={it} />)}
              {items.length > cap && <span style={{ fontFamily: FCa, fontSize: 10, fontWeight: 600, color: "var(--ink-400)", paddingLeft: 6, marginTop: 1, flex: "0 0 auto" }}>+{items.length - cap} lagi</span>}
            </div>
          </button>
        );
      })}
    </div>
  );

  const calendarPanel = (
    <Panel pad={app.isMobile ? 14 : 18} style={app.isMobile ? undefined : { flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* header: month nav · filters · legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap", flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconButton size={34} icon={<Icons.chevLeft size={18} />} tip="Bulan sebelumnya" onClick={() => setMonthOffset(o => o - 1)} />
          <span style={{ fontFamily: FCa, fontWeight: 700, fontSize: 18, color: "var(--ink-900)", minWidth: 132, textAlign: "center", letterSpacing: "-.01em" }}>{MONTH}</span>
          <IconButton size={34} icon={<Icons.chevRight size={18} />} tip="Bulan berikutnya" onClick={() => setMonthOffset(o => o + 1)} />
          {!isCurrentMonth && <Button size="sm" variant="ghost" onClick={() => setMonthOffset(0)} style={{ marginLeft: 4 }}>Hari ini</Button>}
        </div>
        {!app.isMobile && !useAgenda && <div style={{ display: "flex", gap: 14, fontFamily: FCa, fontSize: 11, fontWeight: 500, color: "var(--ink-400)", flexWrap: "wrap" }}>
          <Legend c="var(--st-scheduled)" t="Terjadwal" /><Legend c="var(--st-success)" t="Terbit" /><Legend c="var(--ink-400)" t="Rencana" sq /><Legend c="var(--st-scheduled)" t="Sekali" sq />
        </div>}
      </div>

      {/* filters: brand · platform · status (combinable) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap", flex: "0 0 auto" }}>
        <Icons.filter size={15} style={{ color: "var(--ink-300)", flex: "0 0 auto", marginRight: 1 }} />
        <div style={{ width: app.isMobile ? "30%" : 172, flex: app.isMobile ? "1 1 30%" : "0 0 auto" }}><Select size="sm" value={filter} onChange={setFilter} options={brandOpts} /></div>
        <div style={{ width: app.isMobile ? "30%" : 172, flex: app.isMobile ? "1 1 30%" : "0 0 auto" }}><Select size="sm" value={platFilter} onChange={setPlatFilter} options={platOpts} /></div>
        <div style={{ width: app.isMobile ? "30%" : 172, flex: app.isMobile ? "1 1 30%" : "0 0 auto" }}><Select size="sm" value={statFilter} onChange={setStatFilter} options={statOpts} /></div>
        {(platFilter !== "all" || statFilter !== "all" || filter !== "all") && <button onClick={() => { setFilter("all"); setPlatFilter("all"); setStatFilter("all"); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FCa, fontSize: 12, fontWeight: 600, color: "var(--ink-400)", padding: "0 4px" }}>Reset</button>}
      </div>

      {totalItems === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 12, background: "rgba(140,144,158,.07)", marginBottom: 14, fontFamily: FCa, fontSize: 12.5, color: "var(--ink-500)" }}>
          <Icons.calendar size={15} style={{ color: "var(--ink-400)", flex: "0 0 auto" }} />
          {statusActive || platFilter !== "all" ? "Tidak ada yang cocok dengan filter ini." : isCurrentMonth ? "Belum ada konten, jadwal otomatis, maupun postingan bulan ini." : `Tidak ada apa pun di ${MONTH}.`}
        </div>
      )}

      {useAgenda
        ? (totalItems === 0 ? null : (app.isMobile ? agendaBody : <div className="sc-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>{agendaBody}</div>))
        : gridBody}
    </Panel>
  );

  const summaryRail = (
    <SummaryRail compact={app.isMobile} monthLabel={MONTH} total={plansSummary.length} byStatus={byStatus} byPlatform={byPlatform}
      statFilter={statFilter} onPickStatus={(s) => setStatFilter(cur => cur === s ? "all" : s)} onClear={() => { setStatFilter("all"); setPlatFilter("all"); }}
      onCreate={() => app.go("contentEditor", { brand: app.brand })} />
  );

  return (
    <div style={app.isMobile ? undefined : { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Topbar title="Kalender" sub={`${app.activeBrand?.name || "Semua"} · rencana, jadwal otomatis & postingan · WIB`}
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!app.isMobile && <Segmented options={[{ value: "month", label: "Bulan" }, { value: "week", label: "Minggu" }]} value={mode} onChange={setMode} />}
          <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("contentEditor", { brand: app.brand })}>Buat konten</Button>
          <Button variant="secondary" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: filter === "all" ? app.channel : filter })}>Buat postingan</Button>
        </div>} />

      {phase === "loading" && <Panel style={{ height: 520 }}><Skeleton h={28} w="30%" /><div style={{ height: 16 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} h={80} r={12} />)}</div></Panel>}

      {phase === "ready" && (app.isMobile
        ? <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{summaryRail}{calendarPanel}</div>
        : <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>{calendarPanel}<div style={{ width: 248, flex: "0 0 auto", overflowY: "auto" }} className="sc-scroll">{summaryRail}</div></div>)}

      <DayModal sel={sel} ym={ym} monthLabel={MONTH} onClose={() => setSel(null)} openItem={openItem} createForDay={createForDay} />
    </div>
  );
}

function Legend({ c, t, sq }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: sq ? 2 : "50%", background: c, boxShadow: `0 0 0 3px color-mix(in srgb, ${c} 16%, transparent)` }} />{t}</span>; }

// Right-rail (desktop) / top strip (mobile): "Konten bulan ini" + status & platform breakdowns.
function SummaryRail({ compact, monthLabel, total, byStatus, byPlatform, statFilter, onPickStatus, onClear, onCreate }) {
  const hasFilter = statFilter !== "all";
  return (
    <Panel strong pad={compact ? 14 : 18} style={compact ? undefined : { position: "sticky", top: 0 }}>
      <div style={{ fontFamily: FCa, fontSize: 12, fontWeight: 600, color: "var(--ink-500)", letterSpacing: ".02em" }}>Konten bulan ini</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
        <span style={{ fontFamily: FCa, fontWeight: 800, fontSize: 30, color: "var(--ink-900)", letterSpacing: "-.02em" }}>{total}</span>
        <span style={{ fontFamily: FCa, fontSize: 12.5, color: "var(--ink-400)" }}>direncanakan · {monthLabel}</span>
      </div>

      {total === 0 ? (
        <div style={{ fontFamily: FCa, fontSize: 12.5, color: "var(--ink-400)", marginTop: 12, lineHeight: 1.5 }}>Belum ada konten terencana. Mulai dengan satu ide.</div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            <div style={subhead}>Per status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {Object.entries(byStatus).map(([s, n]) => {
                const c = PLAN_ST_COLOR[s] || "var(--ink-400)", on = statFilter === s;
                return (
                  <button key={s} onClick={() => onPickStatus(s)}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", border: "none", borderRadius: 9, cursor: "pointer", background: on ? tint(c, 16) : "transparent", textAlign: "left", width: "100%" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "0 0 auto" }} />
                    <span style={{ flex: 1, fontFamily: FCa, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? "var(--ink-900)" : "var(--ink-600)" }}>{PLAN_LABEL[s]}</span>
                    <span style={{ fontFamily: FCa, fontSize: 12.5, fontWeight: 700, color: "var(--ink-700)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={subhead}>Per platform</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([p, n]) => {
                const m = platMeta(p);
                return (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px" }}>
                    <PlatIcon p={p} size={15} />
                    <span style={{ flex: 1, fontFamily: FCa, fontSize: 12.5, color: "var(--ink-600)" }}>{m.label}</span>
                    <span style={{ fontFamily: FCa, fontSize: 12.5, fontWeight: 700, color: "var(--ink-700)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {hasFilter && <Button size="sm" variant="ghost" full style={{ marginTop: 14 }} onClick={onClear}>Hapus filter</Button>}
      {!compact && <Button size="sm" variant="amber" full style={{ marginTop: 8 }} icon={<Icons.plus size={15} sw={2} />} onClick={onCreate}>Buat konten</Button>}
    </Panel>
  );
}
const subhead = { fontFamily: FCa, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-400)" };

function DayModal({ sel, ym, monthLabel, onClose, openItem, createForDay }) {
  const app = useApp();
  if (!sel) return null;
  return (
    <Modal open={!!sel} onClose={onClose} width={460}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`${sel.items.length} item`} right={
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="amber" icon={<Icons.plus size={15} />} onClick={() => { onClose(); createForDay(sel.day); }}>Buat konten</Button>
          </div>}>{pad2(sel.day)} {monthLabel}</SectionTitle>
        {sel.items.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", fontFamily: FCa, fontSize: 13, color: "var(--ink-400)" }}>Belum ada apa pun di hari ini. Buat konten untuk mulai merencanakan.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sel.items.map((it, i) => {
            const b = brandFor(it.ch, app.channels);
            const isPlan = it.kind === "plan";
            const pm = isPlan ? platMeta(it.platform) : null;
            const tag = isPlan ? pm.label : it.kind === "oneoff" ? `${it.type} · sekali` : "Rutin";
            const tagC = isPlan ? pm.accent : b.accent;
            return (
              <div key={i} onClick={() => { onClose(); openItem(it); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "#fff" }}>
                <BrandAvatar brand={b} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FCa, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                    <span style={{ fontFamily: FCa, fontSize: 9.5, fontWeight: 600, color: tagC, background: tint(tagC, 12), padding: "1px 7px", borderRadius: 999, flex: "0 0 auto" }}>{tag}</span>
                  </div>
                  <div style={{ fontFamily: FCa, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{it.time !== "—" ? `${it.time} WIB · ` : ""}{b.name}</div>
                </div>
                {isPlan
                  ? <span style={{ fontFamily: FCa, fontSize: 11, fontWeight: 600, color: PLAN_ST_COLOR[it.statusKey] || "var(--ink-500)", background: tint(PLAN_ST_COLOR[it.statusKey] || "var(--ink-500)", 14), padding: "3px 9px", borderRadius: 999, flex: "0 0 auto" }}>{it.statusUi}</span>
                  : <Status s={it.status} />}
                <Icons.chevRight size={16} style={{ color: "var(--ink-300)", flex: "0 0 auto" }} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
