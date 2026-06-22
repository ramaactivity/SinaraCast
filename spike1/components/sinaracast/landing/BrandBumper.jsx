"use client";
import { useEffect, useRef, useState } from "react";
import { Icons } from "../icons";

// First-load brand intro. Plays once per browser session (sessionStorage), is
// skippable (click / any key), hard-capped at 2.2s, and is fully bypassed under
// prefers-reduced-motion or when already seen. Always calls onDone() exactly once so
// the hero reveal + ScrollTrigger.refresh can proceed. The hero is rendered beneath
// this overlay (not unmounted), so LCP is unaffected.
const F = "var(--font)";
const KEY = "sc.bumper.v1";

export function BrandBumper({ onDone }) {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);
  const ranDone = useRef(false);
  const wrapRef = useRef(null), glowRef = useRef(null), tileRef = useRef(null), wordRef = useRef(null);

  const finish = () => {
    if (ranDone.current) return;
    ranDone.current = true;
    setDone(true);
    try { onDone && onDone(); } catch {}
  };

  useEffect(() => {
    setMounted(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = !!sessionStorage.getItem(KEY); } catch {}
    if (reduced || seen) { finish(); return; }
    try { sessionStorage.setItem(KEY, "1"); } catch {}

    let tl = null, killed = false;
    const skip = () => { try { tl && tl.progress(1); } catch {} finish(); };
    const hard = setTimeout(finish, 2200);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (killed || !wrapRef.current) return;
        gsap.set(glowRef.current, { scale: 0.35, opacity: 0 });
        gsap.set(tileRef.current, { scale: 0.6, opacity: 0, rotate: -10, transformOrigin: "50% 50%" });
        gsap.set(wordRef.current, { clipPath: "inset(0 100% 0 0)", opacity: 1 });
        tl = gsap.timeline({ onComplete: finish });
        tl.to(glowRef.current, { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" }, 0)
          .to(tileRef.current, { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(1.7)" }, 0.05)
          .to(wordRef.current, { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power3.out" }, 0.4)
          .to({}, { duration: 0.25 })
          .to(wrapRef.current, { opacity: 0, y: -14, duration: 0.5, ease: "power2.in" });
      } catch {
        finish();
      }
    })();

    return () => {
      killed = true;
      clearTimeout(hard);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      try { tl && tl.kill(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || done) return null;

  return (
    <div ref={wrapRef} aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center",
      background: "var(--app-bg)", backgroundAttachment: "fixed", overflow: "hidden",
    }}>
      <span ref={glowRef} style={{
        position: "absolute", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(249,168,38,.32), transparent 64%)", filter: "blur(26px)",
      }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div ref={tileRef} style={{
          width: 84, height: 84, borderRadius: 26, background: "var(--primary-grad)",
          boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff",
        }}>
          <Icons.grid size={42} sw={2} />
        </div>
        <div ref={wordRef} style={{
          fontFamily: F, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", color: "var(--ink-900)", whiteSpace: "nowrap",
        }}>SinaraCast</div>
      </div>
    </div>
  );
}
