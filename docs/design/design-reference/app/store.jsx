/* global React */
/* ============================================================
   Content OS — global store (context + hook).
   Holds: active view, active channel, notifications, pause
   state, toasts. Loaded before views so all can consume it.
   ============================================================ */
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

// loading/empty/error demo control: ?state=loading|empty|error on a view
function useFetchState(realDelay = 650) {
  const [phase, setPhase] = React.useState("loading");
  React.useEffect(() => {
    const t = setTimeout(() => setPhase("ready"), realDelay);
    return () => clearTimeout(t);
  }, []);
  return phase;
}

window.AppCtx = AppCtx;
window.useApp = useApp;
window.useFetchState = useFetchState;
