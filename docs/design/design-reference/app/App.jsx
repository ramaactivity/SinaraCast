/* global React, ReactDOM, Icons, MOCK, Sidebar, Toast, ConfirmDialog, useApp, Panel, EmptyState, Button */
const { useState: uA, useCallback } = React;

function App() {
  const [view, setView] = uA("rules");
  const [params, setParams] = uA({});
  const [channel, setChannel] = uA("mahakan");
  const [rules, setRules] = uA(MOCK.RULES);
  const [runs, setRuns] = uA(MOCK.RUNS);
  const [notifs, setNotifs] = uA(MOCK.NOTIFS);
  const [channels, setChannels] = uA(MOCK.CHANNELS);
  const [settings, setSettings] = uA(MOCK.SETTINGS);
  const [toast, setToast] = uA(null);
  const [confirmCfg, setConfirmCfg] = uA(null);

  const go = useCallback((v, p = {}) => { setView(v); setParams(p); window.scrollTo(0, 0); document.querySelector("#content")?.scrollTo(0, 0); }, []);
  const showToast = useCallback((msg, type = "info") => { setToast({ msg, type, k: Date.now() }); setTimeout(() => setToast(t => (t && t.k ? null : t)), 2600); }, []);
  const confirm = useCallback((cfg) => setConfirmCfg(cfg), []);

  const updateRule = (id, patch) => setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const deleteRule = (id) => setRules(rs => rs.filter(r => r.id !== id));
  const markRead = (id) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  const postNow = (r, retry = false) => {
    showToast(`Menjalankan “${r.name}”…`, "info");
    updateRule(r.id, { todayStatus: "Publishing" });
    setTimeout(() => {
      updateRule(r.id, { todayStatus: "Published", failReason: null, nextRun: r.nextRun });
      const id = "p" + Math.floor(Math.random() * 9000 + 1000);
      setRuns(rs => [{ id, ch: r.ch, rule: r.name, status: "Published", trigger: retry ? "retry" : "manual",
        sched: "Baru saja", actual: "Baru saja", img: r.lastImg, pool: r.mode === "schedule" ? "Weekday" : "Pool",
        link: `instagram.com/stories/${MOCK.CHANNELS.find(c=>c.id===r.ch).handle.slice(1)}/${Math.floor(Math.random()*900+100)}`,
        attempts: [{ t: "00:00", o: retry ? "Coba lagi manual" : "Dijalankan manual (post-now)" }, { t: "00:02", o: "Dipublikasikan ✓" }] }, ...rs]);
      showToast(`“${r.name}” berhasil diposting`, "success");
    }, 1700);
  };

  const ctx = { view, params, go, channel, setChannel, rules, setRules, runs, setRuns, notifs, setNotifs,
    channels, setChannels, settings, setSettings, pauseAll: settings.pauseAll, toast: showToast, confirm,
    updateRule, deleteRule, markRead, markAllRead, postNow };

  // standalone (no shell) views
  if (view === "signin") return <AppCtx.Provider value={ctx}><SignInView /><Toast toast={toast} /></AppCtx.Provider>;

  const VIEWS = {
    rules: window.RulesView, editor: window.EditorView, connections: window.ConnectionsView,
    activity: window.ActivityView, notifications: window.NotificationsView, settings: window.SettingsView,
    profile: window.ProfileView, onboarding: window.OnboardingView, calendar: window.CalendarView,
    composer: window.ComposerView, library: window.MediaLibraryView, campaigns: window.CampaignsView,
  };
  const View = VIEWS[view];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app-shell">
        <Sidebar />
        <main id="content" className="cos-scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "24px var(--content-pad) 40px" }}>
          {View ? <View key={view + (params.id || params.ch || "")} /> : <Stub name={view} />}
        </main>
      </div>
      <Toast toast={toast} />
      <ConfirmDialog open={!!confirmCfg} onClose={() => setConfirmCfg(null)} {...(confirmCfg || {})}
        onConfirm={() => { confirmCfg?.onConfirm?.(); setConfirmCfg(null); }} />
    </AppCtx.Provider>
  );
}

function Stub({ name }) {
  return <Panel pad={0} style={{ marginTop: 40 }}><EmptyState icon={<Icons.layers size={28} />} title={`View “${name}”`} body="Sedang dibangun pada langkah berikutnya." /></Panel>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
requestAnimationFrame(() => typeof window.fit === "function" && window.fit());
