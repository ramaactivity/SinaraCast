/* global React, Icons, useApp, useFetchState, BRANDS, BrandAvatar, MOCK, Panel, Button, IconButton, Status, EmptyState, Skeleton, Segmented, Modal, Select, SectionTitle */
const { useState: uCa } = React;
const FCa = "var(--font)";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH = "Juni 2025";
// June 2025: starts Sunday. Build Mon-first grid. 1 Jun 2025 = Sunday.
// Mon-first: first row leading blanks for Mon-Sat (6 blanks) then Sun=1.
const TODAY = 3;
const DAYS = 30;

// one-off scheduled posts
const ONEOFFS = [
  { day: 5, ch: "mahakan", type: "Feed", title: "Promo kopi susu", time: "15:00", status: "Scheduled" },
  { day: 12, ch: "tiska", type: "Story", title: "Event wedding", time: "10:00", status: "Scheduled" },
  { day: 8, ch: "outentika", type: "Feed", title: "Campaign launch", time: "19:00", status: "Draft" },
  { day: 2, ch: "mahakan", type: "Story", title: "Flash sale", time: "12:00", status: "Published" },
];

function cadenceHits(rule, dow) {
  // dow: 0=Mon..6=Sun
  if (!rule.active) return false;
  if (rule.cadence === "Setiap hari") return true;
  if (rule.cadence.startsWith("Setiap 2")) return dow % 2 === 0;
  if (rule.cadence.startsWith("Setiap 3")) return dow % 3 === 0;
  const map = { Sen: 0, Sel: 1, Rab: 2, Kam: 3, Jum: 4, Sab: 5, Min: 6 };
  return rule.cadence.split(", ").some(d => map[d] === dow);
}

function CalendarView() {
  const app = useApp();
  const phase = useFetchState();
  const [filter, setFilter] = uCa("all");
  const [mode, setMode] = uCa("month");
  const [sel, setSel] = uCa(null); // {day}

  const rules = app.rules.filter(r => filter === "all" || r.ch === filter);
  const oneoffs = ONEOFFS.filter(o => filter === "all" || o.ch === filter);

  const itemsFor = (day) => {
    const dow = (day + 5) % 7; // 1 Jun = Sunday(6); (1+5)%7=6 ✓
    const items = [];
    rules.forEach(r => { if (cadenceHits(r, dow)) items.push({ kind: "rule", ch: r.ch, title: r.name, time: r.mode === "schedule" ? (dow >= 5 ? "09:00" : "14:00") : r.time, status: day < TODAY ? (r.todayStatus === "Failed" && day === TODAY - 1 ? "Failed" : "Published") : "Scheduled", rule: r }); });
    oneoffs.filter(o => o.day === day).forEach(o => items.push({ kind: "oneoff", ...o }));
    return items.sort((a, b) => a.time.localeCompare(b.time));
  };

  const filters = [{ value: "all", label: "Semua" }, ...MOCK.CHANNELS.map(c => ({ value: c.id, label: BRANDS[c.brand].name.split(" ")[0] }))];

  const totalItems = Array.from({ length: DAYS }, (_, i) => itemsFor(i + 1)).flat().length;

  return (
    <div>
      <Topbar title="Calendar" sub="Konten terjadwal & terbit — semua waktu WIB"
        right={<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Segmented options={filters} value={filter} onChange={setFilter} />
          <Segmented options={[{ value: "month", label: "Bulan" }, { value: "week", label: "Minggu" }]} value={mode} onChange={setMode} />
          <Button variant="amber" size="sm" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: filter === "all" ? app.channel : filter })}>One-off</Button>
        </div>} />

      {phase === "loading" && <Panel style={{ height: 520 }}><Skeleton h={28} w="30%" /><div style={{ height: 16 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} h={80} r={12} />)}</div></Panel>}

      {phase === "ready" && totalItems === 0 && <Panel pad={0}><EmptyState icon={<Icons.calendar size={28} />} title="Belum ada konten terjadwal" body="Bulan ini belum ada run berulang maupun post one-off untuk filter ini." action={<Button variant="amber" icon={<Icons.plus size={17} sw={2} />} onClick={() => app.go("composer", { ch: app.channel })}>Buat one-off post</Button>} /></Panel>}

      {phase === "ready" && totalItems > 0 && (
        <Panel pad={18}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconButton icon={<Icons.chevLeft size={18} />} /><span style={{ fontFamily: FCa, fontWeight: 600, fontSize: 17, color: "var(--ink-900)" }}>{MONTH}</span><IconButton icon={<Icons.chevRight size={18} />} />
            </div>
            <div style={{ display: "flex", gap: 14, fontFamily: FCa, fontSize: 11, color: "var(--ink-400)" }}>
              <Legend c="var(--st-scheduled)" t="Terjadwal" /><Legend c="var(--st-success)" t="Terbit" /><Legend c="var(--st-failed)" t="Gagal" /><Legend c="var(--st-scheduled)" t="One-off" sq />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
            {DOW.map(d => <div key={d} style={{ textAlign: "center", fontFamily: FCa, fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em", color: "var(--ink-400)", paddingBottom: 4 }}>{d}</div>)}
            {Array.from({ length: 6 }).map((_, i) => <div key={"b" + i} />)}
            {Array.from({ length: mode === "week" ? 7 : DAYS }).map((_, idx) => {
              const day = mode === "week" ? idx + 2 : idx + 1; // week shows the current week
              const items = itemsFor(day);
              const isToday = day === TODAY;
              return (
                <button key={day} onClick={() => setSel({ day, items })} style={{ textAlign: "left", border: isToday ? "1.5px solid var(--primary-400)" : "1px solid var(--line)", cursor: "pointer",
                  background: isToday ? "var(--primary-100)" : "#fff", borderRadius: 12, padding: 9, minHeight: mode === "week" ? 320 : 86, display: "flex", flexDirection: "column", gap: 4, transition: "box-shadow .12s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"} onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  <span style={{ fontFamily: FCa, fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--primary-500)" : "var(--ink-500)" }}>{String(day).padStart(2, "0")}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                    {items.slice(0, mode === "week" ? 8 : 3).map((it, i) => {
                      const b = BRANDS[it.ch];
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
        </Panel>
      )}

      <DayModal sel={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function Legend({ c, t, sq }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: sq ? 1 : "50%", background: c }} />{t}</span>; }

function DayModal({ sel, onClose }) {
  const app = useApp();
  if (!sel) return null;
  return (
    <Modal open={!!sel} onClose={onClose} width={460}>
      <div style={{ padding: 24 }}>
        <SectionTitle sub={`${sel.items.length} item terjadwal`} right={<Button size="sm" variant="amber" icon={<Icons.plus size={15} />} onClick={() => { onClose(); app.go("composer", { ch: app.channel, day: sel.day }); }}>One-off</Button>}>{String(sel.day).padStart(2, "0")} Juni 2025</SectionTitle>
        {sel.items.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", fontFamily: FCa, fontSize: 13, color: "var(--ink-400)" }}>Tidak ada konten pada hari ini.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sel.items.map((it, i) => {
            const b = BRANDS[it.ch];
            return (
              <div key={i} onClick={() => { onClose(); it.kind === "oneoff" ? app.go("composer", { ch: it.ch, edit: true }) : app.go("rules"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: 13, cursor: "pointer", background: "#fff" }}>
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

window.CalendarView = CalendarView;
