/* global React, Icons, useApp, BRANDS, BrandAvatar, MOCK, Panel, Card, Button, IconButton, Status, Toggle, Field, Input, Select, TimeField, Segmented, MediaThumb, EmptyState, Progress, Chip, SectionTitle, Banner */
const { useState: uEd } = React;
const FE = "var(--font)";

const CADENCE = [
  { value: "daily", label: "Setiap hari" },
  { value: "everyN", label: "Setiap N hari" },
  { value: "weekdays", label: "Hari tertentu" },
];
const WD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function EditorView() {
  const app = useApp();
  const { id, ch: pCh, isNew } = app.params;
  const existing = id ? app.rules.find(r => r.id === id) : null;
  const chId = pCh || (existing && existing.ch) || app.channel;
  const b = BRANDS[chId];
  const channel = MOCK.CHANNELS.find(c => c.id === chId);

  const [name, setName] = uEd(existing ? existing.name : "");
  const [mode, setMode] = uEd(existing ? existing.mode : "schedule");
  const [cadence, setCadence] = uEd("daily");
  const [everyN, setEveryN] = uEd(2);
  const [days, setDays] = uEd([0, 1, 2, 3, 4]);
  const [time, setTime] = uEd(existing ? existing.time : "08:00");
  const [wdTime, setWdTime] = uEd("14:00");
  const [weTime, setWeTime] = uEd("09:00");
  const [grace, setGrace] = uEd(existing ? existing.grace : MOCK.SETTINGS.defaultGrace);
  const [holidays, setHolidays] = uEd(["17 Agu 2025"]);
  const [pool, setPool] = uEd({
    weekday: existing && existing.mode === "schedule" ? existing.pools.weekday : 6,
    weekend: existing && existing.mode === "schedule" ? existing.pools.weekend : 4,
    pool: existing && existing.mode === "pool" ? existing.pools.pool : 5,
  });
  const [tab, setTab] = uEd("weekday"); // which schedule pool is shown
  const [touched, setTouched] = uEd(false);

  // collision check (other rules on same channel near same time)
  const collision = app.rules.find(r => r.ch === chId && r.id !== id && Math.abs(toMin(r.time) - toMin(time)) < 10);

  // validation
  const reqPools = mode === "schedule" ? ["weekday", "weekend"] : ["pool"];
  const emptyPool = reqPools.find(p => pool[p] === 0);
  const errors = {};
  if (touched && !name.trim()) errors.name = "Beri nama rule.";
  if (emptyPool) errors.pool = `Pool ${emptyPool === "pool" ? "" : emptyPool + " "}masih kosong — minimal 1 gambar valid.`;
  const valid = name.trim() && !emptyPool;

  const save = () => {
    setTouched(true);
    if (!name.trim() || emptyPool) { app.toast("Lengkapi data yang wajib diisi", "error"); return; }
    if (isNew || !existing) {
      const newRule = { id: "r" + Date.now(), ch: chId, name, mode, active: true,
        cadence: cadenceLabel(cadence, everyN, days), time, grace,
        pools: mode === "schedule" ? { weekday: pool.weekday, weekend: pool.weekend } : { pool: pool.pool },
        cycle: { used: 0, total: mode === "schedule" ? pool.weekday : pool.pool }, nextRun: `Besok, ${time} WIB`, todayStatus: "Scheduled", lastImg: 0, runs7: [0,0,0,0,0,0,0] };
      app.setRules(rs => [...rs, newRule]);
    } else {
      app.updateRule(id, { name, mode, time, grace, cadence: cadenceLabel(cadence, everyN, days),
        pools: mode === "schedule" ? { weekday: pool.weekday, weekend: pool.weekend } : { pool: pool.pool } });
    }
    app.toast(`Rule “${name}” disimpan`, "success");
    app.go("rules");
  };

  return (
    <div>
      <Topbar title={existing ? "Edit rule" : "Buat rule"}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><BrandAvatar brand={b} size={18} /> {b.name} · {channel.handle}</span>}
        right={<div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" icon={<Icons.chevLeft size={17} />} onClick={() => app.go("rules")}>Kembali</Button>
          {existing && <Button variant="danger" icon={<Icons.trash size={16} />} onClick={() => app.confirm({
            title: `Hapus rule “${existing.name}”?`, confirmLabel: "Hapus rule",
            body: "Tindakan ini tidak bisa dibatalkan.",
            consequence: "Jadwal dihapus dan rule berhenti memposting. Gambar di pool tetap tersimpan.",
            onConfirm: () => { app.deleteRule(existing.id); app.toast("Rule dihapus", "success"); app.go("rules"); } })}>Hapus</Button>}
          <Button variant="primary" icon={<Icons.check size={17} />} onClick={save}>Simpan rule</Button>
        </div>} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* basics */}
          <Panel>
            <SectionTitle sub="Nama, mode, dan channel tujuan">Dasar</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Nama rule" error={errors.name}>
                <Input placeholder="cth. Jam buka" value={name} invalid={!!errors.name} onChange={e => setName(e.target.value)} />
              </Field>
              <Field label="Channel">
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 14px", background: "var(--line-soft)", borderRadius: 13, border: "1px solid var(--line)" }}>
                  <BrandAvatar brand={b} size={26} /><span style={{ fontFamily: FE, fontWeight: 500, fontSize: 13.5, color: "var(--ink-900)" }}>{b.name}</span>
                </div>
              </Field>
            </div>
            <Field label="Mode" hint={mode === "schedule" ? "Pool terpisah untuk weekday & weekend." : "Satu pool yang diacak tanpa ulang."} style={{ marginTop: 14 }}>
              <Segmented options={[{ value: "schedule", label: "Schedule (weekday/weekend)" }, { value: "pool", label: "Pool (satu pool)" }]} value={mode} onChange={setMode} />
            </Field>
          </Panel>

          {/* pools + media */}
          <Panel>
            <SectionTitle sub="Unggah gambar Story. Validasi: rasio 9:16, JPG/PNG, maks 8 MB." right={<Button size="sm" variant="secondary" icon={<Icons.upload size={16} />} onClick={() => { setPool(p => ({ ...p, [mode === "schedule" ? tab : "pool"]: p[mode === "schedule" ? tab : "pool"] + 1 })); app.toast("1 gambar diunggah & divalidasi (9:16) ✓", "success"); }}>Unggah gambar</Button>}>Pool media</SectionTitle>
            {errors.pool && <Banner tone="warn" icon={<Icons.warn size={17} />} title="Pool wajib berisi gambar" body={errors.pool} />}
            {mode === "schedule" && (
              <div style={{ marginBottom: 14 }}>
                <Segmented options={[{ value: "weekday", label: `Weekday · ${pool.weekday}` }, { value: "weekend", label: `Weekend · ${pool.weekend}` }]} value={tab} onChange={setTab} />
              </div>
            )}
            <PoolGrid count={mode === "schedule" ? pool[tab] : pool.pool}
              onAdd={() => { setPool(p => ({ ...p, [mode === "schedule" ? tab : "pool"]: p[mode === "schedule" ? tab : "pool"] + 1 })); app.toast("Gambar ditambahkan ✓", "success"); }}
              onRemove={() => setPool(p => ({ ...p, [mode === "schedule" ? tab : "pool"]: Math.max(0, p[mode === "schedule" ? tab : "pool"] - 1) }))} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontFamily: FE, fontSize: 12, color: "var(--ink-500)" }}>
              <Icons.shuffle size={15} style={{ color: b.accent }} /> Acak tanpa ulang: tiap gambar terpakai sekali per siklus sebelum diacak ulang.
            </div>
          </Panel>
        </div>

        {/* schedule sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel strong>
            <SectionTitle sub="Semua waktu WIB (UTC+7)">Jadwal</SectionTitle>
            <Field label="Kapan posting (cadence)">
              <Select options={CADENCE} value={cadence} onChange={setCadence} />
            </Field>
            {cadence === "everyN" && <Field label="Setiap berapa hari" style={{ marginTop: 12 }}><Input type="number" min={2} value={everyN} onChange={e => setEveryN(+e.target.value)} /></Field>}
            {cadence === "weekdays" && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                {WD.map((d, i) => (
                  <button key={d} onClick={() => setDays(ds => ds.includes(i) ? ds.filter(x => x !== i) : [...ds, i])}
                    style={{ flex: 1, height: 38, borderRadius: 10, border: "1px solid " + (days.includes(i) ? b.accent : "var(--line)"), cursor: "pointer",
                      background: days.includes(i) ? b.soft : "#fff", color: days.includes(i) ? b.accent : "var(--ink-400)", fontFamily: FE, fontSize: 11.5, fontWeight: 600 }}>{d}</button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              {mode === "schedule" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Jam weekday"><TimeField value={wdTime} onChange={setWdTime} /></Field>
                  <Field label="Jam weekend"><TimeField value={weTime} onChange={setWeTime} /></Field>
                </div>
              ) : (
                <Field label="Jam posting"><TimeField value={time} onChange={setTime} /></Field>
              )}
            </div>
            {collision && (
              <div style={{ display: "flex", gap: 9, marginTop: 12, background: "var(--st-publishing-bg)", borderRadius: 11, padding: "10px 12px" }}>
                <Icons.warn size={16} style={{ color: "var(--st-publishing)", flex: "0 0 auto", marginTop: 1 }} />
                <div style={{ fontFamily: FE, fontSize: 11.5, color: "#B07B22", lineHeight: 1.45 }}>Bentrok dengan “{collision.name}” ({collision.time}). Sistem akan memberi jeda otomatis antar posting.</div>
              </div>
            )}
            <Field label={`Grace window — ${grace} menit`} hint="Toleransi keterlambatan sebelum run ditandai terlewat." style={{ marginTop: 14 }}>
              <input type="range" min={10} max={60} step={5} value={grace} onChange={e => setGrace(+e.target.value)} style={{ width: "100%", accentColor: "var(--green-500)" }} />
            </Field>
          </Panel>

          <Panel>
            <SectionTitle sub="Rule otomatis dilewati pada tanggal ini">Hari libur</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {holidays.length === 0 && <span style={{ fontFamily: FE, fontSize: 12.5, color: "var(--ink-400)" }}>Belum ada tanggal libur.</span>}
              {holidays.map((h, i) => <Chip key={h} tone="lilac" icon={<Icons.calendar size={13} />} onRemove={() => setHolidays(hs => hs.filter((_, x) => x !== i))}>{h}</Chip>)}
            </div>
            <Button size="sm" variant="secondary" full icon={<Icons.plus size={16} />} onClick={() => setHolidays(hs => [...hs, "25 Des 2025"])}>Tambah tanggal libur</Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PoolGrid({ count, onAdd, onRemove }) {
  const app = useApp();
  if (count === 0) return (
    <div style={{ border: "1.5px dashed var(--line)", borderRadius: 16, padding: "30px 20px" }}>
      <EmptyState compact icon={<Icons.image size={26} />} title="Pool masih kosong" body="Unggah gambar Story (9:16) untuk mulai." action={<Button size="sm" variant="amber" icon={<Icons.upload size={16} />} onClick={onAdd}>Unggah gambar</Button>} />
    </div>
  );
  // first thumb shown invalid to demonstrate validation rejection
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ position: "relative" }}>
          <MediaThumb seed={i} w={84} invalid={i === count - 1 && count > 4} used={i < 2} />
          <button onClick={() => onRemove(i)} style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", background: "#fff", color: "var(--danger)", boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center" }}><Icons.x size={13} sw={2.4} /></button>
          {i === count - 1 && count > 4 && <div style={{ fontFamily: FE, fontSize: 9.5, color: "var(--danger)", marginTop: 4, textAlign: "center", lineHeight: 1.2 }}>Rasio salah (4:5)</div>}
        </div>
      ))}
      <button onClick={onAdd} style={{ aspectRatio: "9/16", borderRadius: 12, border: "1.5px dashed var(--line)", background: "rgba(255,255,255,.4)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><Icons.plus size={20} /><span style={{ fontFamily: FE, fontSize: 10 }}>Tambah</span></div>
      </button>
    </div>
  );
}

function toMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function cadenceLabel(c, n, days) {
  if (c === "daily") return "Setiap hari";
  if (c === "everyN") return `Setiap ${n} hari`;
  return days.map(i => WD[i]).join(", ");
}

window.EditorView = EditorView;
