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

export function CalendarView() {
  const app = useApp();
  const phase = app.dataLoading ? "loading" : "ready";
  const [filter, setFilter] = uCa("all");
  const [mode, setMode] = uCa("month");
  const [sel, setSel] = uCa(null); // {day, items}

  // current month in WIB
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const Y = nowWib.getUTCFullYear(), M = nowWib.getUTCMonth(), TODAY = nowWib.getUTCDate();
  const DAYS = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  const ym = `${Y}-${pad2(M + 1)}`;
  const MONTH = `${MONTH_NAMES[M]} ${Y}`;
  const leadingBlanks = (new Date(Date.UTC(Y, M, 1)).getUTCDay() + 6) % 7; // Mon-first offset
  const weekStart = Math.max(1, TODAY - ((new Date(Date.UTC(Y, M, TODAY)).getUTCDay() + 6) % 7)); // Monday of current week

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
    // projected future schedule (today onward) for active rules that haven't already run that day
    if (day >= TODAY) {
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

  return (
    <div>
      <Topbar title="Calendar" sub="Konten terjadwal & terbit — semua waktu WIB"
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Segmented options={filters} value={filter} onChange={setFilter} />
          {!app.isMobile && <Segmented options={[{ value: "month", label: "Bulan" }, { value: "week", label: "Minggu" }]} value={mode} onChange={setMode} />}
          <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: filter === "all" ? app.channel : filter })}>One-off</Button>
        </div>} />

      {phase === "loading" && <Panel style={{ height: 520 }}><Skeleton h={28} w="30%" /><div style={{ height: 16 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} h={80} r={12} />)}</div></Panel>}

      {phase === "ready" && totalItems === 0 && <Panel pad={0}><EmptyState icon={<Icons.calendar size={28} />} title="Belum ada konten terjadwal" body="Bulan ini belum ada run berulang maupun post one-off untuk filter ini." action={<Button variant="amber" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: app.channel })}>Buat one-off post</Button>} /></Panel>}

      {phase === "ready" && totalItems > 0 && (
        <Panel pad={app.isMobile ? 14 : 18}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: FCa, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>{MONTH}</span>
            </div>
            {!app.isMobile && <div style={{ display: "flex", gap: 14, fontFamily: FCa, fontSize: 11, color: "var(--ink-400)" }}>
              <Legend c="var(--st-scheduled)" t="Terjadwal" /><Legend c="var(--st-success)" t="Terbit" /><Legend c="var(--st-failed)" t="Gagal" /><Legend c="var(--st-scheduled)" t="One-off" sq />
            </div>}
          </div>

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
            {DOW.map(d => <div key={d} style={{ textAlign: "center", fontFamily: FCa, fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em", color: "var(--ink-400)", paddingBottom: 4 }}>{d}</div>)}
            {mode === "month" && Array.from({ length: leadingBlanks }).map((_, i) => <div key={"b" + i} />)}
            {Array.from({ length: mode === "week" ? 7 : DAYS }).map((_, idx) => {
              const day = mode === "week" ? weekStart + idx : idx + 1;
              if (day > DAYS) return <div key={"o" + idx} />;
              const items = itemsFor(day);
              const isToday = day === TODAY;
              return (
                <button key={day} onClick={() => setSel({ day, items })} style={{ textAlign: "left", border: isToday ? "1.5px solid var(--primary-400)" : "1px solid var(--line)", cursor: "pointer",
                  background: isToday ? "var(--primary-100)" : "#fff", borderRadius: 12, padding: 9, minHeight: mode === "week" ? 320 : 86, display: "flex", flexDirection: "column", gap: 4, transition: "box-shadow .12s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"} onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  <span style={{ fontFamily: FCa, fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--primary-500)" : "var(--ink-500)" }}>{pad2(day)}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                    {items.slice(0, mode === "week" ? 8 : 3).map((it, i) => {
                      const b = brandFor(it.ch, app.channels);
                      const sc = it.status === "Failed" ? "var(--st-failed)" : it.status === "Published" ? "var(--st-success)" : it.status === "Draft" ? "var(--st-skipped)" : "var(--st-scheduled)";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: b.soft, borderRadius: 6, padding: "2px 5px", borderLeft: it.kind === "oneoff" ? `2px solid ${b.accent}` : "none" }}>
                          <span style={{ width: 5, height: 5, borderRadius: it.kind === "oneoff" ? 1 : "50%", background: sc, flex: "0 0 auto" }} />
                          <span style={{ fontFamily: FCa, fontSize: 9.5, fontWeight: 500, color: "var(--ink-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.time} {it.title}</span>
                        </div>
                      );
                    })}
                    {items.length > (mode === "week" ? 8 : 3) && <span style={{ fontFamily: FCa, fontSize: 9.5, color: "var(--ink-400)", paddingLeft: 5 }}>+{items.length - (mode === "week" ? 8 : 3)} lagi</span>}
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

function Legend({ c, t, sq }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: sq ? 1 : "50%", background: c }} />{t}</span>; }

function DayModal({ sel, onClose, monthLabel }) {
  const app = useApp();
  if (!sel) return null;
  return (
    <Modal open={!!sel} onClose={onClose} width={460}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`${sel.items.length} item terjadwal`} right={<Button size="sm" variant="amber" icon={<Icons.plus size={15} />} onClick={() => { onClose(); app.go("composer", { ch: app.channel, day: sel.day }); }}>One-off</Button>}>{pad2(sel.day)} {monthLabel}</SectionTitle>
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
                    <span style={{ fontFamily: FCa, fontSize: 9.5, fontWeight: 600, color: b.accent, background: b.soft, padding: "1px 7px", borderRadius: 999 }}>{it.kind === "oneoff" ? it.type + " · one-off" : "Recurring"}</span>
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
