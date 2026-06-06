"use client";
import React from "react";
import { Icons } from "./icons";
import { loadAll, setRuleActive, setChannelPaused, setPauseAll, saveSettingsFields, markNotifRead, markAllNotifsRead, renameChannel, archiveChannel, deleteAllData, setDayOverride, clearDayOverride, todayWibKey } from "./dataLayer";
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
import { ContentEditorView } from "./views/contentEditor";
import { PlannerView } from "./views/planner";
import { RingkasanView } from "./views/ringkasan";

const { useState: uA, useCallback } = React;

const DEFAULT_SETTINGS = { pauseAll: false, resumeDate: "", timezone: "Asia/Jakarta (WIB, UTC+7)",
  defaultGrace: 30, telegram: { connected: false, handle: "" }, failAlerts: true, dailyPing: true,
  storage: { used: 0, total: 1024 } };
const DEFAULT_PROFILE = { name: "Rama", email: "", method: "Magic link", joined: "—" };

export default function SinaraCast() {
  const [view, setView] = uA("rules");
  const [params, setParams] = uA({});
  const [channel, setChannel] = uA("");      // active account (channel) within the active brand
  const [brands, setBrands] = uA([]);
  const [brand, setBrand] = uA("");          // active brand (workspace) id
  const brandRef = React.useRef("");          // survives reload() (useCallback []) so we keep the user's pick
  const [rules, setRules] = uA([]);
  const [runs, setRuns] = uA([]);
  const [oneoffs, setOneoffs] = uA([]);
  const [plans, setPlans] = uA([]);
  const [followerSeries, setFollowerSeries] = uA({});
  const [library, setLibrary] = uA({});
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

  // Load real data once per signed-in user. Keyed on the user id (stable) — NOT
  // the session object — so Supabase token refreshes (which fire on every tab
  // refocus and hand back a fresh session object) don't trigger a full reload /
  // spinner. The session itself still updates above to keep the access token fresh.
  // Resolve the active brand (keep the user's pick across reloads via brandRef, else
  // first brand) + the active account within it (keep if still in that brand, else its first).
  const applyScope = useCallback((brandsArr, channelsArr) => {
    setBrands(brandsArr);
    const vb = brandsArr.some((b) => b.id === brandRef.current) ? brandRef.current : (brandsArr[0]?.id || "");
    brandRef.current = vb; setBrand(vb);
    const acct = brandsArr.find((b) => b.id === vb)?.accounts || [];
    setChannel((cur) => acct.some((a) => a.id === cur) ? cur : (acct[0]?.id || channelsArr[0]?.id || ""));
  }, []);

  const loadedFor = React.useRef(null);
  React.useEffect(() => {
    const uid = session?.user?.id || null;
    if (!uid) { loadedFor.current = null; setDataLoading(false); return; }
    if (loadedFor.current === uid) return; // already loaded for this user; ignore token refreshes
    loadedFor.current = uid;
    let active = true;
    setDataLoading(true);
    loadAll().then((d) => {
      if (!active) return;
      setChannels(d.channels); setRules(d.rules); setRuns(d.runs); setOneoffs(d.oneoffs || []); setPlans(d.plans || []); setLibrary(d.library || {}); setNotifs(d.notifs); setFollowerSeries(d.followerSeries || {});
      setSettings(d.settings); setProfile(d.profile);
      applyScope(d.brands || [], d.channels);
      setDataLoading(false);
    }).catch((e) => { console.error("loadAll failed", e); if (active) { loadedFor.current = null; setDataLoading(false); } });
    return () => { active = false; };
  }, [session?.user?.id]);

  const reload = useCallback(async () => {
    const d = await loadAll();
    setChannels(d.channels); setRules(d.rules); setRuns(d.runs); setOneoffs(d.oneoffs || []); setPlans(d.plans || []); setLibrary(d.library || {}); setNotifs(d.notifs); setFollowerSeries(d.followerSeries || {});
    setSettings(d.settings); setProfile(d.profile);
    applyScope(d.brands || [], d.channels);
  }, [applyScope]);

  // Refresh data when the tab regains focus / becomes visible, so server-side
  // publishes (the per-minute cron) show up in Riwayat/Kalender without a manual
  // reload. Throttled so rapid focus changes don't hammer the database.
  const lastRefresh = React.useRef(0);
  React.useEffect(() => {
    if (!session?.user?.id) return;
    const maybe = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefresh.current < 15000) return; // at most once / 15s
      lastRefresh.current = now;
      reload().catch((e) => console.error("focus reload failed", e));
    };
    window.addEventListener("focus", maybe);
    document.addEventListener("visibilitychange", maybe);
    return () => { window.removeEventListener("focus", maybe); document.removeEventListener("visibilitychange", maybe); };
  }, [session?.user?.id, reload]);

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

  // Switch the active brand (workspace) → reset the active account to that brand's first.
  const activeBrand = brands.find((b) => b.id === brand) || null;
  const brandAccounts = activeBrand?.accounts || [];
  const selectBrand = (bid) => {
    brandRef.current = bid; setBrand(bid);
    const acct = (brands.find((b) => b.id === bid)?.accounts) || [];
    setChannel(acct[0]?.id || "");
  };

  const updateRule = (id, patch) => setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const deleteRule = (id) => setRules(rs => rs.filter(r => r.id !== id));
  const markRead = (id) => { setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n)); markNotifRead(id).catch((e) => console.error("markNotifRead failed", e)); };
  const markAllRead = () => { setNotifs(ns => ns.map(n => ({ ...n, read: true }))); markAllNotifsRead().catch((e) => console.error("markAllNotifsRead failed", e)); };

  // Start Instagram Business Login in a popup so the SinaraCast tab stays open.
  // The popup is opened synchronously (inside the click) to dodge popup blockers,
  // then pointed at the authorize URL once /connect/start returns it. The popup
  // closes itself and posts the result back (handled by the listener below).
  // Shared OAuth-popup launcher. `provider` picks the start endpoint + label;
  // both Instagram and TikTok callbacks post the result back the same way.
  const startConnect = async (startUrl, label) => {
    const w = 600, h = 760;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open("about:blank", "sinara_oauth", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { showToast("Popup diblokir browser — izinkan popup untuk situs ini lalu coba lagi.", "error"); return; }
    try {
      popup.document.write(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f6f5fb;color:#8c909e">Menyiapkan otorisasi ${label}…</body>`);
      const res = await fetch(startUrl, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!j.ok || !j.url) throw new Error(j.error || "Gagal memulai OAuth");
      popup.location.href = j.url;
    } catch (e) {
      try { popup.close(); } catch {}
      showToast(`Gagal: ${e.message || e}`, "error");
    }
  };
  const connectChannel = () => startConnect("/connect/start", "Instagram");
  const connectTikTokChannel = () => startConnect("/connect/tiktok/start", "TikTok");

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
  // Telegram linking: open the bot deep link, then poll app_settings until the
  // webhook flips telegram_connected (user pressed Start in Telegram).
  const connectTelegram = async () => {
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!j.ok || !j.url) throw new Error(j.error || "Gagal memulai");
      window.open(j.url, "_blank");
      showToast("Buka Telegram & tekan Start…", "info");
      let tries = 0;
      const iv = setInterval(async () => {
        tries++;
        try {
          const { data } = await supabase.from("app_settings").select("telegram_connected, telegram_handle").maybeSingle();
          if (data?.telegram_connected) {
            clearInterval(iv);
            setSettings(p => ({ ...p, telegram: { connected: true, handle: data.telegram_handle || "" } }));
            showToast("Telegram tersambung ✓", "success");
          }
        } catch { /* keep polling */ }
        if (tries >= 20) clearInterval(iv);
      }, 3000);
    } catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); }
  };
  const disconnectTelegram = () => saveSettings({ telegram: { connected: false, handle: "" } });
  const testTelegram = async () => {
    try {
      const res = await fetch("/api/telegram/test", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) throw new Error(j.error || "Gagal");
      showToast("Pesan tes dikirim ke Telegram ✓", "success");
    } catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); }
  };

  // Per-day overrides for a rule (persisted so the engine actually honors them).
  const skipToday = async (r) => {
    updateRule(r.id, { todayStatus: "Skipped", nextRun: "Dilewati hari ini", todayOverride: "skip" });
    try { await setDayOverride(r.id, todayWibKey(), "skip"); showToast(`“${r.name}” dilewati hari ini`, "info"); }
    catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); await reload(); }
  };
  const unskipToday = async (r) => {
    updateRule(r.id, { todayStatus: "Scheduled", todayOverride: null });
    try { await clearDayOverride(r.id, todayWibKey()); await reload(); showToast(`“${r.name}” diaktifkan lagi hari ini`, "info"); }
    catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); await reload(); }
  };
  const swapToday = async (r, imageId, url) => {
    updateRule(r.id, { thumbUrl: url || r.thumbUrl, todayOverride: "swap" });
    try { await setDayOverride(r.id, todayWibKey(), "swap", imageId); showToast("Gambar untuk hari ini diganti", "success"); }
    catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); await reload(); }
  };

  // Rename a channel's display name (optimistic + persist).
  const renameChannelFn = async (c, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return showToast("Nama tidak boleh kosong", "error");
    setChannels(cs => cs.map(x => x.id === c.id ? { ...x, name: trimmed } : x));
    try { await renameChannel(c._id, trimmed); showToast("Nama channel diperbarui", "success"); }
    catch (e) { showToast(`Gagal: ${e.message || e}`, "error"); await reload(); }
  };
  // Archive (remove) a channel — disappears from the app, its rules stop firing.
  const archiveChannelFn = async (c) => {
    setChannels(cs => cs.filter(x => x.id !== c.id));
    try { await archiveChannel(c._id); showToast(`${c.name} dihapus — rule-nya berhenti memposting`, "success"); }
    catch (e) { showToast(`Gagal menghapus: ${e.message || e}`, "error"); await reload(); }
  };
  // Export the user's data as a downloadable JSON file (client-side).
  const exportData = () => {
    try {
      const payload = { app: "SinaraCast", exportedAt: new Date().toISOString(), profile, channels, rules, runs, oneoffs, settings };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `sinaracast-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      showToast("Data diekspor — JSON terunduh", "success");
    } catch (e) { showToast(`Gagal ekspor: ${e.message || e}`, "error"); }
  };
  // Wipe all of the user's content (channels cascade + notifications).
  const deleteEverything = async () => {
    try {
      await deleteAllData();
      await reload();
      setView("connections");
      showToast("Semua data dihapus", "success");
    } catch (e) { showToast(`Gagal menghapus: ${e.message || e}`, "error"); }
  };

  // Persist Settings-view preference fields (telegram, daily ping, grace).
  // Optimistic: apply the patch, write it, revert to the prior snapshot on error.
  const saveSettings = async (patch, { toast: t = false } = {}) => {
    let prev;
    setSettings(p => { prev = p; return { ...p, ...patch }; });
    try {
      await saveSettingsFields(patch);
      if (t) showToast("Pengaturan disimpan", "success");
    } catch (e) {
      if (prev) setSettings(prev);
      showToast(`Gagal menyimpan: ${e.message || e}`, "error");
    }
  };

  const ctx = { view, params, go, channel, setChannel, brands, brand, activeBrand, brandAccounts, selectBrand, rules, setRules, runs, setRuns, oneoffs, plans, followerSeries, library, notifs, setNotifs,
    channels, setChannels, settings, setSettings, profile, pauseAll: settings.pauseAll, toast: showToast, confirm,
    updateRule, deleteRule, markRead, markAllRead, postNow, session, signOut, dataLoading, reload,
    toggleRuleActive, toggleChannelPause, togglePauseAll, connectChannel, connectTikTokChannel, saveSettings,
    connectTelegram, disconnectTelegram, testTelegram, renameChannel: renameChannelFn, archiveChannel: archiveChannelFn, exportData, deleteEverything,
    skipToday, unskipToday, swapToday,
    isMobile, openMenu: () => setDrawerOpen(true) };

  // Auth gate
  if (session === undefined || (session && dataLoading)) {
    return <div id="sc-stage"><div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Spinner size={34} /></div></div>;
  }
  if (!session) {
    return <div id="sc-stage"><div style={{ width: "100%", height: "100%" }}><SignInView /></div></div>;
  }

  const VIEWS = {
    rules: RulesView, editor: EditorView, connections: ConnectionsView,
    activity: ActivityView, notifications: NotificationsView, settings: SettingsView,
    profile: ProfileView, onboarding: OnboardingView, calendar: CalendarView,
    composer: ComposerView, library: MediaLibraryView, contentEditor: ContentEditorView, planner: PlannerView, ringkasan: RingkasanView,
  };
  const View = VIEWS[view];

  return (
    <div id="sc-stage">
      <div id="sc-root">
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
                  <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(62,67,81,.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", zIndex: 65, animation: "scFade .15s" }} />
                )}
                <main id="content" className="sc-scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "24px var(--content-pad) 40px" }}>
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
