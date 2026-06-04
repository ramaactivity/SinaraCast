"use client";
import React from "react";
/* ============================================================
   Content OS — global store (context + hook).
   Holds: active view, active channel, notifications, pause
   state, toasts. Consumed by all views via useApp().
   ============================================================ */
export const AppCtx = React.createContext(null);
export const useApp = () => React.useContext(AppCtx);

// loading/empty/error demo control
export function useFetchState(realDelay = 650) {
  const [phase, setPhase] = React.useState("loading");
  React.useEffect(() => {
    const t = setTimeout(() => setPhase("ready"), realDelay);
    return () => clearTimeout(t);
  }, []);
  return phase;
}
