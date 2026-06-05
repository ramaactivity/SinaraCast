"use client";
import React from "react";
import { Icons } from "../icons";
import { useApp } from "../store";
import { Topbar } from "../shell";
import { BRANDS, BrandAvatar, Panel, Button, IconButton, Status, EmptyState, Skeleton, Segmented, Modal, SectionTitle } from "../ui";
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

// Status → { dot, bg } for the in-cell event pills (soft tints, solid markers).
const ST_C = {
  Failed: { dot: "var(--st-failed)", bg: "var(--st-failed-bg)" },
  Published: { dot: "var(--st-success)", bg: "var(--st-success-bg)" },
  Draft: { dot: "var(--st-skipped)", bg: "var(--st-skipped-bg)" },
  Skipped: { dot: "var(--st-skipped)", bg: "var(--st-skipped-bg)" },
};
const stColor = (s) => ST_C[s] || { dot: "var(--st-scheduled)", bg: "var(--st-scheduled-bg)" };

export function CalendarView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [filter, setFilter] = uCa("all");
  const [mode, setMode] = uCa("month");
  const [sel, setSel] = uCa(null); // {day, items}
  const [monthOffset, setMonthOffset] = uCa(0); // 0 = current month

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

  const rules = app.rules.filter(r => filter === "all" || r.ch === filter);
  const oneoffs = app.oneoffs.filter(o => o.ym === ym && (filter === "all" || o.ch === filter));

  // ground truth from real runs this month: ruleId|day → {status, time}
  const runByRuleDay = {};
  app.runs.forEach(r => {
    if (!r.dateWib || !r.dateWib.startsWith(ym)) return;
    if (filter !== "all" && r.ch !== filter) return;
    const day = parseInt(r.dateWib.slice(8, 10), 10);
    const time = (r.actual !== "—" ? r.actual : r.sched).split(", ")[1] || "";
    runByRuleDay[`${r.ruleId}|${day}`] = { status: r.status, time, ch: r.ch, rule: r.rule, ruleId: r.ruleId };
  });

  const itemsFor = (day) => {
    const items = [];
    // real run history (past + today)
    Object.entries(runByRuleDay).forEach(([key, v]) => {
      if (parseInt(key.split("|")[1], 10) !== day) return;
      items.push({ kind: "rule", ch: v.ch, title: v.rule, time: v.time || "—", status: v.status, ruleId: v.ruleId });
    });
    // projected schedule for active rules that haven't already run that day
    if (day >= projectFrom) {
      rules.forEach(r => {
        if (!r.active) return;
        if (!ruleFires(r, Y, M, day)) return;
        if (runByRuleDay[`${r.id}|${day}`]) return; // already shown from history
        items.push({ kind: "rule", ch: r.ch, title: r.name, time: ruleTime(r, Y, M, day), status: "Scheduled", rule: r });
      });
    }
    // one-off scheduled posts
    oneoffs.filter(o => o.day === day).forEach(o => items.push({ kind: "oneoff", ...o }));
    return items.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  };

  const filters = [{ value: "all", label: "Semua" }, ...app.channels.map(c => ({ value: c.id, label: brandFor(c.id, app.channels).name.split(" ")[0] }))];
  const totalItems = Array.from({ length: DAYS }, (_, i) => itemsFor(i + 1)).flat().length;

  // Build the grid cells: month = full weeks (with faded prev/next-month days);
  // week = the seven days of the current week.
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
  const cap = mode === "week" ? 8 : 3;
  const rows = cells.length / 7; // grid week-rows (DOW header is a separate 'auto' row)

  return (
    <div style={app.isMobile ? undefined : { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Topbar title="Kalender" sub="Jadwal & postingan yang akan terbit · waktu WIB"
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Segmented options={filters} value={filter} onChange={setFilter} />
          {!app.isMobile && <Segmented options={[{ value: "month", label: "Bulan" }, { value: "week", label: "Minggu" }]} value={mode} onChange={setMode} />}
          <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: filter === "all" ? app.channel : filter })}>Buat postingan</Button>
        </div>} />

      {phase === "loading" && <Panel style={{ height: 520 }}><Skeleton h={28} w="30%" /><div style={{ height: 16 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} h={80} r={12} />)}</div></Panel>}

      {phase === "ready" && (
        <Panel pad={app.isMobile ? 14 : 18} style={app.isMobile ? undefined : { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* header: month nav · today reset · legend */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap", flex: "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <IconButton size={34} icon={<Icons.chevLeft size={18} />} tip="Bulan sebelumnya" onClick={() => setMonthOffset(o => o - 1)} />
              <span style={{ fontFamily: FCa, fontWeight: 700, fontSize: 18, color: "var(--ink-900)", minWidth: 132, textAlign: "center", letterSpacing: "-.01em" }}>{MONTH}</span>
              <IconButton size={34} icon={<Icons.chevRight size={18} />} tip="Bulan berikutnya" onClick={() => setMonthOffset(o => o + 1)} />
              {!isCurrentMonth && <Button size="sm" variant="ghost" onClick={() => setMonthOffset(0)} style={{ marginLeft: 4 }}>Hari ini</Button>}
            </div>
            {!app.isMobile && <div style={{ display: "flex", gap: 15, fontFamily: FCa, fontSize: 11, fontWeight: 500, color: "var(--ink-400)" }}>
              <Legend c="var(--st-scheduled)" t="Terjadwal" /><Legend c="var(--st-success)" t="Terbit" /><Legend c="var(--st-failed)" t="Gagal" /><Legend c="var(--st-scheduled)" t="Sekali" sq />
            </div>}
          </div>

          {totalItems === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 12, background: "rgba(140,144,158,.07)", marginBottom: 14, fontFamily: FCa, fontSize: 12.5, color: "var(--ink-500)" }}>
              <Icons.calendar size={15} style={{ color: "var(--ink-400)", flex: "0 0 auto" }} />
              {isCurrentMonth ? "Belum ada jadwal otomatis maupun postingan sekali bulan ini." : `Tidak ada yang dijadwalkan di ${MONTH}.`}
            </div>
          )}

          {/* Mobile: agenda list (native-feeling) instead of a cramped 7-col grid */}
          {app.isMobile ? (
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
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((it, i) => {
                        const b = brandFor(it.ch, app.channels);
                        return (
                          <button key={i} onClick={() => { it.kind === "oneoff" ? app.go("composer", { ch: it.ch, postId: it.id }) : app.go("rules"); }}
                            style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", border: "1px solid var(--line)", borderLeft: it.kind === "oneoff" ? `3px solid ${b.accent}` : "1px solid var(--line)", borderRadius: 13, background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}>
                            <BrandAvatar brand={b} size={30} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: FCa, fontWeight: 600, fontSize: 13, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                              <div style={{ fontFamily: FCa, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.time} WIB · {b.name}{it.kind === "oneoff" ? ` · ${it.type}` : ""}</div>
                            </div>
                            <Status s={it.status} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {isToday
                      ? <span style={{ minWidth: 23, height: 23, padding: "0 6px", borderRadius: 8, background: "var(--primary-grad)", color: "#fff", display: "inline-grid", placeItems: "center", fontFamily: FCa, fontWeight: 700, fontSize: 12, boxShadow: "var(--shadow-primary)" }}>{pad2(day)}</span>
                      : <span style={{ fontFamily: FCa, fontSize: 12.5, fontWeight: 600, color: weekend ? "var(--ink-300)" : "var(--ink-500)" }}>{pad2(day)}</span>}
                    {items.length > 0 && <span style={{ fontFamily: FCa, fontSize: 10, fontWeight: 600, color: "var(--ink-300)" }}>{items.length}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                    {items.slice(0, cap).map((it, i) => {
                      const b = brandFor(it.ch, app.channels);
                      const sc = stColor(it.status);
                      const oneoff = it.kind === "oneoff";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: sc.bg, borderRadius: 7, padding: "3px 7px 3px 6px", borderLeft: oneoff ? `2.5px solid ${b.accent}` : "none", overflow: "hidden" }}>
                          <span style={{ width: 6, height: 6, borderRadius: oneoff ? 1.5 : "50%", background: sc.dot, flex: "0 0 auto" }} />
                          <span style={{ fontFamily: FCa, fontSize: 10.5, color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                            <b style={{ fontWeight: 700, color: "var(--ink-700)" }}>{it.time}</b> {it.title}
                          </span>
                        </div>
                      );
                    })}
                    {items.length > cap && <span style={{ fontFamily: FCa, fontSize: 10, fontWeight: 600, color: "var(--ink-400)", paddingLeft: 6, marginTop: 1 }}>+{items.length - cap} lagi</span>}
                  </div>
                </button>
              );
            })}
          </div>
          )}
        </Panel>
      )}

      <DayModal sel={sel} onClose={() => setSel(null)} monthLabel={MONTH} />
    </div>
  );
}

function Legend({ c, t, sq }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: sq ? 2 : "50%", background: c, boxShadow: `0 0 0 3px color-mix(in srgb, ${c} 16%, transparent)` }} />{t}</span>; }

function DayModal({ sel, onClose, monthLabel }) {
  const app = useApp();
  if (!sel) return null;
  return (
    <Modal open={!!sel} onClose={onClose} width={460}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`${sel.items.length} item terjadwal`} right={<Button size="sm" variant="amber" icon={<Icons.plus size={15} />} onClick={() => { onClose(); app.go("composer", { ch: app.channel, day: sel.day }); }}>Buat postingan</Button>}>{pad2(sel.day)} {monthLabel}</SectionTitle>
        {sel.items.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", fontFamily: FCa, fontSize: 13, color: "var(--ink-400)" }}>Tidak ada konten pada hari ini.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sel.items.map((it, i) => {
            const b = brandFor(it.ch, app.channels);
            return (
              <div key={i} onClick={() => { onClose(); it.kind === "oneoff" ? app.go("composer", { ch: it.ch, postId: it.id }) : app.go("rules"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "#fff" }}>
                <BrandAvatar brand={b} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FCa, fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>{it.title}</span>
                    <span style={{ fontFamily: FCa, fontSize: 9.5, fontWeight: 600, color: b.accent, background: b.soft, padding: "1px 7px", borderRadius: 999 }}>{it.kind === "oneoff" ? it.type + " · sekali" : "Rutin"}</span>
                  </div>
                  <div style={{ fontFamily: FCa, fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{it.time} WIB · {b.name}</div>
                </div>
                <Status s={it.status} />
                <Icons.chevRight size={16} style={{ color: "var(--ink-300)" }} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
