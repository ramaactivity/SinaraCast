"use client";
import React from "react";
import { Icons } from "./icons";
import { loadAll, setRuleActive, setChannelPaused, setPauseAll } from "./dataLayer";
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
  const [isMobile, setIsMobile] = uA(false);
  const [drawerOpen, setDrawerOpen] = uA(false);

  // Responsive: below 860px the sidebar becomes an off-canvas drawer.
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => { setIsMobile(mq.matches); if (!mq.matches) setDrawerOpen(false); };
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

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

  // Handle the OAuth result coming back from the popup (postMessage) — the
  // common path: SinaraCast tab stays open, popup closes itself.
  React.useEffect(() => {
    const onMsg = (ev) => {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data;
      if (!d || d.type !== "sinara-oauth") return;
      if (d.status === "error") { setToast({ msg: `Gagal menyambungkan: ${d.error}`, type: "error", k: Date.now() }); return; }
      setToast({ msg: d.status === "reconnected" ? `@${d.name} tersambung kembali ✓` : `Channel @${d.name} tersambung ✓`, type: "success", k: Date.now() });
      setView("connections");
      reload().catch((e) => console.error("reload after connect failed", e));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [reload]);

  // Same-tab fallback: if the popup was blocked and the callback redirected the
  // whole tab to "/?connected=…", surface that on load too.
  React.useEffect(() => {
    if (!session) return;
    const sp = new URLSearchParams(window.location.search);
    const connected = sp.get("connected"), reconnected = sp.get("reconnected"), err = sp.get("connect_error");
    if (!connected && !reconnected && !err) return;
    window.history.replaceState({}, "", window.location.pathname); // clean the URL
    if (err) { setToast({ msg: `Gagal menyambungkan: ${err}`, type: "error", k: Date.now() }); return; }
    const name = connected || reconnected;
    setToast({ msg: connected ? `Channel @${name} tersambung ✓` : `@${name} tersambung kembali ✓`, type: "success", k: Date.now() });
    setView("connections");
    reload().catch((e) => console.error("reload after connect failed", e));
  }, [session]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const go = useCallback((v, p = {}) => { setView(v); setParams(p); setDrawerOpen(false); window.scrollTo(0, 0); document.querySelector("#content")?.scrollTo(0, 0); }, []);
  const showToast = useCallback((msg, type = "info") => { setToast({ msg, type, k: Date.now() }); setTimeout(() => setToast(t => (t && t.k ? null : t)), 2600); }, []);
  const confirm = useCallback((cfg) => setConfirmCfg(cfg), []);

  const updateRule = (id, patch) => setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const deleteRule = (id) => setRules(rs => rs.filter(r => r.id !== id));
  const markRead = (id) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));

  // Start Instagram Business Login in a popup so the SinaraCast tab stays open.
  // The popup is opened synchronously (inside the click) to dodge popup blockers,
  // then pointed at the authorize URL once /connect/start returns it. The popup
  // closes itself and posts the result back (handled by the listener below).
  const connectChannel = async () => {
    const w = 600, h = 760;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open("about:blank", "sinara_oauth", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { showToast("Popup diblokir browser — izinkan popup untuk situs ini lalu coba lagi.", "error"); return; }
    try {
      popup.document.write('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f6f5fb;color:#8c909e">Menyiapkan otorisasi Instagram…</body>');
      const res = await fetch("/connect/start", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!j.ok || !j.url) throw new Error(j.error || "Gagal memulai OAuth");
      popup.location.href = j.url;
    } catch (e) {
      try { popup.close(); } catch {}
      showToast(`Gagal: ${e.message || e}`, "error");
    }
  };

  const postNow = async (r) => {
    showToast(`Menerbitkan “${r.name}” ke Instagram…`, "info");
    updateRule(r.id, { todayStatus: "Publishing" });
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ruleId: r.id }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Gagal menerbitkan");
      showToast(`“${r.name}” terbit ✓`, "success");
      await reload();
    } catch (e) {
      updateRule(r.id, { todayStatus: "Failed", failReason: String(e.message || e) });
      showToast(`Gagal: ${e.message || e}`, "error");
    }
  };

  // --- kill-switch toggles: update UI optimistically, persist to DB, revert on error ---
  const toggleRuleActive = async (r, v) => {
    updateRule(r.id, { active: v, todayStatus: v ? "Scheduled" : "Inactive", nextRun: v ? "Menghitung…" : "Nonaktif" });
    try {
      await setRuleActive(r.id, v);
      showToast(v ? `“${r.name}” diaktifkan` : `“${r.name}” dinonaktifkan`, "info");
      await reload();
    } catch (e) {
      updateRule(r.id, { active: !v });
      showToast(`Gagal menyimpan: ${e.message || e}`, "error");
    }
  };
  const toggleChannelPause = async (c, label) => {
    const next = !c.paused;
    setChannels(cs => cs.map(x => x.id === c.id ? { ...x, paused: next, resumeDate: next ? x.resumeDate : "" } : x));
    try {
      await setChannelPaused(c._id, next);
      showToast(next ? `${label || c.name} dijeda` : `${label || c.name} dilanjutkan`, "info");
    } catch (e) {
      setChannels(cs => cs.map(x => x.id === c.id ? { ...x, paused: c.paused } : x));
      showToast(`Gagal menyimpan: ${e.message || e}`, "error");
    }
  };
  const togglePauseAll = async (v) => {
    setSettings(p => ({ ...p, pauseAll: v }));
    try {
      await setPauseAll(v);
      showToast(v ? "Semua posting dijeda" : "Posting dilanjutkan", "info");
    } catch (e) {
      setSettings(p => ({ ...p, pauseAll: !v }));
      showToast(`Gagal menyimpan: ${e.message || e}`, "error");
    }
  };

  const ctx = { view, params, go, channel, setChannel, rules, setRules, runs, setRuns, notifs, setNotifs,
    channels, setChannels, settings, setSettings, profile, pauseAll: settings.pauseAll, toast: showToast, confirm,
    updateRule, deleteRule, markRead, markAllRead, postNow, session, signOut, dataLoading, reload,
    toggleRuleActive, toggleChannelPause, togglePauseAll, connectChannel,
    isMobile, openMenu: () => setDrawerOpen(true) };

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
    <div id="cos-stage">
      <div id="cos-root">
        <AppCtx.Provider value={ctx}>
          {view === "signin" ? (
            <>
              <SignInView />
              <Toast toast={toast} />
            </>
          ) : (
            <>
              <div className="app-shell">
                <Sidebar mobile={isMobile} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
                {isMobile && drawerOpen && (
                  <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(62,67,81,.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", zIndex: 65, animation: "cosFade .15s" }} />
                )}
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
      </div>
    </div>
  );
}

function Stub({ name }) {
  return <Panel pad={0} style={{ marginTop: 40 }}><EmptyState icon={<Icons.layers size={28} />} title={`View “${name}”`} body="Sedang dibangun pada langkah berikutnya." /></Panel>;
}
