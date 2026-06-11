/* global React, Icons, useApp, useFetchState, BRANDS, BrandAvatar, MOCK, Panel, Card, Button, IconButton, Status, MediaThumb, EmptyState, Skeleton, Spinner, Progress, SectionTitle, Modal, Segmented */
const { useState: uAc } = React;
const FA = "var(--font)";

const FILTERS = [{ value: "all", label: "Semua" }, ...MOCK.CHANNELS.map(c => ({ value: c.id, label: BRANDS[c.brand].name.split(" ")[0] }))];
const TRIGGER = { scheduled: "Terjadwal", manual: "Manual", retry: "Coba lagi", swap: "Swap" };

function ActivityView() {
  const app = useApp();
  const phase = useFetchState();
  const [filter, setFilter] = uAc("all");
  const [open, setOpen] = uAc(null);

  const runs = app.runs.filter(r => filter === "all" || r.ch === filter);
  const openRun = app.runs.find(r => r.id === open);

  return (
    <div>
      <Topbar title="Activity" sub="Riwayat run lintas channel — semua waktu WIB"
        right={<Segmented options={FILTERS} value={filter} onChange={setFilter} />} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 18, alignItems: "start" }}>
        <Panel flush style={{ overflow: "hidden" }}>
          {phase === "loading" && <div style={{ padding: 20 }}>{[0,1,2,3,4].map(i => <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}><Skeleton w={34} h={48} r={9} /><div style={{ flex: 1 }}><Skeleton w="30%" h={14} /><div style={{ height: 7 }} /><Skeleton w="50%" h={11} /></div><Skeleton w={80} h={24} r={999} /></div>)}</div>}

          {phase === "ready" && runs.length === 0 && <EmptyState icon={<Icons.activity size={28} />} title="Belum ada aktivitas" body="Run akan muncul di sini setelah rule berjalan atau kamu post-now." />}

          {phase === "ready" && runs.length > 0 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 120px", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--line)", fontFamily: FA, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--ink-400)" }}>
                <span></span><span>RULE · CHANNEL</span><span>WAKTU (WIB)</span><span style={{ textAlign: "right" }}>STATUS</span>
              </div>
              {runs.map(r => {
                const b = BRANDS[r.ch];
                return (
                  <div key={r.id} onClick={() => setOpen(r.id)} style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 120px", gap: 12, padding: "13px 20px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(140,144,158,.06)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <MediaThumb seed={r.img} w={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 13.5, color: "var(--ink-900)" }}>{r.rule}</span>
                        <span style={{ fontFamily: FA, fontSize: 10, fontWeight: 600, color: b.accent, background: b.soft, padding: "1px 7px", borderRadius: 999 }}>{TRIGGER[r.trigger]}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontFamily: FA, fontSize: 11.5, color: "var(--ink-400)" }}>
                        <BrandAvatar brand={b} size={14} />{b.name}{r.fail ? <span style={{ color: "var(--danger)" }}>· {r.fail}</span> : null}
                      </div>
                    </div>
                    <span style={{ fontFamily: FA, fontSize: 12, color: "var(--ink-500)" }}>{r.actual !== "—" ? r.actual.split(", ")[1] || r.actual : r.sched.split(", ")[1] || r.sched}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      {r.status === "Failed" && <IconButton size={30} icon={<Icons.retry size={15} />} tone="green" tip="Coba lagi" onClick={e => { e.stopPropagation(); app.toast(`Mencoba ulang “${r.rule}”…`, "info"); }} />}
                      <Status s={r.status} pulse={r.status === "Publishing"} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <StorageCard />
      </div>

      <RunDetail run={openRun} onClose={() => setOpen(null)} />
    </div>
  );
}

function StorageCard() {
  const app = useApp();
  const { used, total } = app.settings.storage;
  const pct = Math.round((used / total) * 100);
  return (
    <Panel strong>
      <SectionTitle sub="Media tersimpan">Penyimpanan</SectionTitle>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 22, color: "var(--ink-900)" }}>{used} MB</span>
        <span style={{ fontFamily: FA, fontSize: 12, color: "var(--ink-400)" }}>/ {total} MB</span>
      </div>
      <Progress value={pct} showWarn h={9} />
      <div style={{ fontFamily: FA, fontSize: 11.5, color: pct >= 80 ? "var(--danger)" : "var(--ink-400)", marginTop: 9 }}>{pct}% terpakai{pct >= 80 ? " — mendekati batas" : ""}</div>
      <div style={{ height: 1, background: "var(--line)", margin: "16px 0" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {MOCK.CHANNELS.map(c => { const b = BRANDS[c.brand]; const mb = [220, 150, 130, 112][MOCK.CHANNELS.indexOf(c)]; return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandAvatar brand={b} size={22} />
            <span style={{ flex: 1, fontFamily: FA, fontSize: 12, color: "var(--ink-600)" }}>{b.name.split(" ")[0]}</span>
            <span style={{ fontFamily: FA, fontSize: 11.5, color: "var(--ink-400)" }}>{mb} MB</span>
          </div>
        ); })}
      </div>
    </Panel>
  );
}

function RunDetail({ run, onClose }) {
  const app = useApp();
  if (!run) return null;
  const b = BRANDS[run.ch];
  const row = (label, val, mono) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontFamily: FA, fontSize: 12.5, color: "var(--ink-400)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "ui-monospace,monospace" : FA, fontSize: 12.5, fontWeight: 500, color: "var(--ink-900)", textAlign: "right" }}>{val}</span>
    </div>
  );
  return (
    <Modal open={!!run} onClose={onClose} width={540}>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ fontFamily: FA, fontWeight: 600, fontSize: 18, color: "var(--ink-900)" }}>Detail run</span>
            <Status s={run.status} pulse={run.status === "Publishing"} />
          </div>
          <IconButton icon={<Icons.x size={18} />} onClick={onClose} />
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ position: "relative" }}>
            <MediaThumb seed={run.img} w={120} label="9:16" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {row("Channel", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><BrandAvatar brand={b} size={18} /> {b.name}</span>)}
            {row("Rule", run.rule)}
            {row("Pool / gambar", `${run.pool} · #${run.img + 1}`)}
            {row("Trigger", TRIGGER[run.trigger])}
            {row("Dijadwalkan", run.sched, true)}
            {row("Aktual", run.actual, true)}
          </div>
        </div>

        {run.fail && <div style={{ marginTop: 16, background: "var(--danger-bg)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 9 }}><Icons.alert size={17} style={{ color: "var(--danger)", flex: "0 0 auto" }} /><span style={{ fontFamily: FA, fontSize: 12.5, color: "var(--danger)", lineHeight: 1.45 }}>{run.fail}</span></div>}

        {run.link && <a href={"https://" + run.link} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, textDecoration: "none", background: "var(--green-100)", borderRadius: 12, padding: "12px 14px", fontFamily: FA, fontSize: 12.5, fontWeight: 500, color: "var(--green-500)" }}><Icons.external size={16} />{run.link}</a>}

        <div style={{ fontFamily: FA, fontWeight: 600, fontSize: 12.5, color: "var(--ink-500)", margin: "20px 0 10px" }}>Log percobaan</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {run.attempts.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < run.attempts.length - 1 ? 14 : 0, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: a.fail ? "var(--danger-bg)" : "var(--green-100)", color: a.fail ? "var(--danger)" : "var(--green-500)" }}>{a.fail ? <Icons.x size={12} sw={2.4} /> : <Icons.check size={12} sw={2.4} />}</span>
                {i < run.attempts.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 2 }} />}
              </div>
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--ink-400)" }}>{a.t}</span>
                <div style={{ fontFamily: FA, fontSize: 12.5, color: "var(--ink-700)", marginTop: 1 }}>{a.o}</div>
              </div>
            </div>
          ))}
        </div>

        {run.status === "Failed" && <Button variant="primary" full icon={<Icons.retry size={16} />} style={{ marginTop: 20 }} onClick={() => { app.toast(`Mencoba ulang “${run.rule}”…`, "info"); onClose(); }}>Coba lagi sekarang</Button>}
      </div>
    </Modal>
  );
}

window.ActivityView = ActivityView;
