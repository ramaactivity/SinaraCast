"use client";
import React from "react";
import { Icons } from "./icons";
import { loadAll } from "./dataLayer";
import { AppCtx } from "./store";
import { Sidebar } from "./shell";
import { Panel, EmptyState, Toast, ConfirmDialog, Spinner } from "./ui";
import { supabase } from "./supabaseClient";
import { RulesView } from "./views/rules";
import { EditorView } from "./views/editor";
import { ConnectionsView } from "./views/connections";
import { ActivityView } from "./views/activity";
import { NotificationsView } from "./views/notifications";
import { SettingsView, ProfileView } from "./views/settings";
import { OnboardingView } from "./views/onboarding";
import { SignInView } from "./views/signin";
import { CalendarView } from "./views/calendar";
import { ComposerView } from "./views/composer";
import { MediaLibraryView } from "./views/library";

const { useState: uA, useCallback } = React;

const DEFAULT_SETTINGS = { pauseAll: false, resumeDate: "", timezone: "Asia/Jakarta (WIB, UTC+7)",
  defaultGrace: 30, telegram: { connected: false, handle: "" }, failAlerts: true, dailyPing: true,
  storage: { used: 0, total: 1024 } };
const DEFAULT_PROFILE = { name: "Rama", email: "", method: "Magic link", joined: "—" };

export default function ContentOS() {
  const [view, setView] = uA("rules");
  const [params, setParams] = uA({});
  const [channel, setChannel] = uA("");
  const [rules, setRules] = uA([]);
  const [runs, setRuns] = uA([]);
  const [notifs, setNotifs] = uA([]);
  const [channels, setChannels] = uA([]);
  const [settings, setSettings] = uA(DEFAULT_SETTINGS);
  const [profile, setProfile] = uA(DEFAULT_PROFILE);
  const [toast, setToast] = uA(null);
  const [confirmCfg, setConfirmCfg] = uA(null);
  const [session, setSession] = uA(undefined); // undefined = loading, null = signed out
  const [dataLoading, setDataLoading] = uA(true);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load real data once signed in
  React.useEffect(() => {
    if (!session) { setDataLoading(false); return; }
    let active = true;
    setDataLoading(true);
    loadAll().then((d) => {
      if (!active) return;
      setChannels(d.channels); setRules(d.rules); setRuns(d.runs); setNotifs(d.notifs);
      setSettings(d.settings); setProfile(d.profile);
      setChannel((cur) => cur || d.channels[0]?.id || "");
      setDataLoading(false);
    }).catch((e) => { console.error("loadAll failed", e); if (active) setDataLoading(false); });
    return () => { active = false; };
  }, [session]);

  const reload = useCallback(async () => {
    const d = await loadAll();
    setChannels(d.channels); setRules(d.rules); setRuns(d.runs); setNotifs(d.notifs);
    setSettings(d.settings); setProfile(d.profile);
    setChannel((cur) => cur || d.channels[0]?.id || "");
  }, []);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

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
        link: `instagram.com/stories/${(channels.find(c=>c.id===r.ch)?.handle||"@x").slice(1)}/${Math.floor(Math.random()*900+100)}`,
        attempts: [{ t: "00:00", o: retry ? "Coba lagi manual" : "Dijalankan manual (post-now)" }, { t: "00:02", o: "Dipublikasikan ✓" }] }, ...rs]);
      showToast(`“${r.name}” berhasil diposting`, "success");
    }, 1700);
  };

  const ctx = { view, params, go, channel, setChannel, rules, setRules, runs, setRuns, notifs, setNotifs,
    channels, setChannels, settings, setSettings, profile, pauseAll: settings.pauseAll, toast: showToast, confirm,
    updateRule, deleteRule, markRead, markAllRead, postNow, session, signOut, dataLoading, reload };

  // Auth gate
  if (session === undefined || (session && dataLoading)) {
    return <div id="cos-stage"><div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Spinner size={34} /></div></div>;
  }
  if (!session) {
    return <div id="cos-stage"><div style={{ width: "100%", height: "100%" }}><SignInView /></div></div>;
  }

  const VIEWS = {
    rules: RulesView, editor: EditorView, connections: ConnectionsView,
    activity: ActivityView, notifications: NotificationsView, settings: SettingsView,
    profile: ProfileView, onboarding: OnboardingView, calendar: CalendarView,
    composer: ComposerView, library: MediaLibraryView,
  };
  const View = VIEWS[view];

  return (
    <Stage>
      <AppCtx.Provider value={ctx}>
          {view === "signin" ? (
            <>
              <SignInView />
              <Toast toast={toast} />
            </>
          ) : (
            <>
              <div className="app-shell">
                <Sidebar />
                <main id="content" className="cos-scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "24px var(--content-pad) 40px" }}>
                  {View ? <View key={view + (params.id || params.ch || "")} /> : <Stub name={view} />}
                </main>
              </div>
              <Toast toast={toast} />
              <ConfirmDialog open={!!confirmCfg} onClose={() => setConfirmCfg(null)} {...(confirmCfg || {})}
                onConfirm={() => { confirmCfg?.onConfirm?.(); setConfirmCfg(null); }} />
            </>
          )}
      </AppCtx.Provider>
    </Stage>
  );
}

// Fixed logical canvas scaled to fit the viewport width: desktop fills (scale 1),
// narrow screens (phones/tablets) shrink the whole layout proportionally so nothing
// is clipped. Replaces the old fixed 1320×860 fit() trick.
function Stage({ children }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const DW = 1320, PAD = 12;
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const availW = Math.max(1, window.innerWidth - PAD * 2);
      const availH = Math.max(1, window.innerHeight - PAD * 2);
      const s = Math.min(1, availW / DW);
      el.style.width = availW / s + "px";
      el.style.height = availH / s + "px";
      el.style.transform = "scale(" + s + ")";
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return <div id="cos-stage"><div id="cos-root" ref={ref}>{children}</div></div>;
}

function Stub({ name }) {
  return <Panel pad={0} style={{ marginTop: 40 }}><EmptyState icon={<Icons.layers size={28} />} title={`View “${name}”`} body="Sedang dibangun pada langkah berikutnya." /></Panel>;
}
