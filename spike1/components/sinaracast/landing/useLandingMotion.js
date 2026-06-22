"use client";
import { useEffect, useRef } from "react";

// Single client-side animation engine for the landing. GSAP + ScrollTrigger + Lenis
// are dynamically imported (kept out of the app bundle), scoped to rootRef, and torn
// down on unmount. Reduced-motion / touch fully bypasses smooth scroll, scrub, parallax
// and pointer effects, leaving everything visible and statically laid out.
//
// Markup contract:
//   [data-reveal]                 staggered fade/rise/scale in on enter
//   [data-parallax="0.16"]        vertical parallax (smoothed), factor = travel
//   [data-hsection] / [data-htrack]  pinned horizontal showcase (desktop)
//   [data-count] (+data-snap)     count-up on first enter
//   [data-nav]                    gets `lp-nav-solid` past 40px
//   [data-tilt-scope] + [data-tilt="14"]   cursor parallax inside the hero
//   [data-cardtilt]               3D tilt + lift on hover (pointer)
//   [data-magnetic]               element drifts toward the cursor
export function useLandingMotion(rootRef) {
  const api = useRef({ scrollTo: null, refresh: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    let cancelled = false, lenis = null, ctx = null, rafCb = null, gsapRef = null, STRef = null;
    const cleanups = [];
    const nav = root.querySelector("[data-nav]");
    const onNativeScroll = () => { if (nav) nav.classList.toggle("lp-nav-solid", window.scrollY > 40); };

    if (reduced) {
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      onNativeScroll();
      api.current.scrollTo = (sel) => { const el = typeof sel === "string" ? document.querySelector(sel) : sel; el?.scrollIntoView({ block: "start" }); };
      api.current.refresh = () => {};
      return () => window.removeEventListener("scroll", onNativeScroll);
    }

    root.classList.add("lp-armed");

    (async () => {
      try {
        const [{ gsap }, stMod, lenisMod] = await Promise.all([
          import("gsap"), import("gsap/ScrollTrigger"), import("lenis"),
        ]);
        if (cancelled) return;
        const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
        const Lenis = lenisMod.default || lenisMod.Lenis;
        gsapRef = gsap; STRef = ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        // smooth scroll — slightly snappier lerp, wired to ScrollTrigger
        lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
        lenis.on("scroll", ScrollTrigger.update);
        rafCb = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(rafCb);
        gsap.ticker.lagSmoothing(0);

        api.current.scrollTo = (sel, opts = {}) => { const el = typeof sel === "string" ? document.querySelector(sel) : sel; if (el) lenis.scrollTo(el, { offset: -72, duration: 1.0, ...opts }); };
        api.current.refresh = () => ScrollTrigger.refresh();

        const onKey = (e) => {
          const t = e.target;
          if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
          const vh = window.innerHeight;
          const map = { PageDown: vh * 0.9, PageUp: -vh * 0.9, ArrowDown: 90, ArrowUp: -90, " ": vh * 0.9 };
          if (e.key === "Home") { e.preventDefault(); lenis.scrollTo(0); }
          else if (e.key === "End") { e.preventDefault(); lenis.scrollTo(document.body.scrollHeight); }
          else if (map[e.key] != null) { e.preventDefault(); lenis.scrollTo(lenis.scroll + map[e.key]); }
        };
        window.addEventListener("keydown", onKey);
        cleanups.push(() => window.removeEventListener("keydown", onKey));

        const onFocusIn = (e) => {
          const el = e.target;
          if (el && el.closest && el.closest("[data-lp]")) {
            const r = el.getBoundingClientRect();
            if (r.top < 80 || r.bottom > window.innerHeight - 40) lenis.scrollTo(el, { offset: -120 });
          }
        };
        window.addEventListener("focusin", onFocusIn);
        cleanups.push(() => window.removeEventListener("focusin", onFocusIn));

        ctx = gsap.context(() => {
          // nav condense
          if (nav) ScrollTrigger.create({ start: "40px top", end: "max", onUpdate: (s) => nav.classList.toggle("lp-nav-solid", s.scroll() > 40), onLeaveBack: () => nav.classList.remove("lp-nav-solid") });

          // reveal on scroll (batched, smooth, slight scale)
          const reveals = gsap.utils.toArray("[data-reveal]");
          gsap.set(reveals, { opacity: 0, y: 22, scale: 0.985 });
          ScrollTrigger.batch(reveals, {
            start: "top 88%",
            onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out", stagger: 0.07, overwrite: true }),
          });

          // parallax (smoothed scrub, gentle travel)
          gsap.utils.toArray("[data-parallax]").forEach((el) => {
            const f = parseFloat(el.getAttribute("data-parallax")) || 0.12;
            gsap.set(el, { willChange: "transform" });
            gsap.fromTo(el, { yPercent: -f * 28 }, { yPercent: f * 28, ease: "none",
              scrollTrigger: { trigger: el.closest("[data-parallax-scope]") || el, start: "top bottom", end: "bottom top", scrub: 1 } });
          });

          // pinned horizontal showcase (desktop only) — full last panel, smoother scrub
          const hsection = root.querySelector("[data-hsection]");
          const htrack = root.querySelector("[data-htrack]");
          if (hsection && htrack && window.innerWidth >= 880) {
            const dist = () => Math.max(0, htrack.scrollWidth - window.innerWidth);
            gsap.to(htrack, { x: () => -dist(), ease: "none",
              scrollTrigger: { trigger: hsection, start: "top top", end: () => "+=" + dist(), scrub: 0.8, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
          }

          // count-up
          gsap.utils.toArray("[data-count]").forEach((el) => {
            const target = parseFloat(el.getAttribute("data-count")) || 0;
            const snap = parseFloat(el.getAttribute("data-snap") || "1");
            ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => {
              const o = { v: 0 };
              gsap.to(o, { v: target, duration: 1.5, ease: "power2.out", snap: { v: snap }, onUpdate: () => { el.textContent = String(Math.round(o.v)); } });
            } });
          });

          // ---- pointer interactivity (skip on touch) ----
          if (!coarse) {
            // magnetic CTAs
            gsap.utils.toArray("[data-magnetic]").forEach((el) => {
              const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
              const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
              const move = (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * 0.32); yTo((e.clientY - (r.top + r.height / 2)) * 0.4); };
              const leave = () => { xTo(0); yTo(0); };
              el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
              cleanups.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
            });

            // hero cursor parallax (x only; vertical owned by scroll-parallax)
            const scope = root.querySelector("[data-tilt-scope]");
            if (scope) {
              const layers = gsap.utils.toArray("[data-tilt]", scope).map((el) => ({
                depth: parseFloat(el.getAttribute("data-tilt")) || 10,
                xTo: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }),
                rTo: gsap.quickTo(el, "rotation", { duration: 0.8, ease: "power3" }),
              }));
              const move = (e) => { const r = scope.getBoundingClientRect(); const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2); layers.forEach((l) => { l.xTo(-nx * l.depth); l.rTo(-nx * l.depth * 0.12); }); };
              const leave = () => layers.forEach((l) => { l.xTo(0); l.rTo(0); });
              scope.addEventListener("pointermove", move); scope.addEventListener("pointerleave", leave);
              cleanups.push(() => { scope.removeEventListener("pointermove", move); scope.removeEventListener("pointerleave", leave); });
            }

            // card 3D tilt + lift on hover (gsap owns transform so no CSS conflict)
            gsap.utils.toArray("[data-cardtilt]").forEach((el) => {
              gsap.set(el, { transformPerspective: 900, transformOrigin: "center" });
              const rX = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
              const rY = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
              const yT = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
              const sT = gsap.quickTo(el, "scale", { duration: 0.5, ease: "power3" });
              const enter = () => { yT(-6); sT(1.025); };
              const move = (e) => { const r = el.getBoundingClientRect(); const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2); const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2); rY(nx * 6); rX(-ny * 6); };
              const leave = () => { rX(0); rY(0); yT(0); sT(1); };
              el.addEventListener("pointerenter", enter); el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
              cleanups.push(() => { el.removeEventListener("pointerenter", enter); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
            });
          }
        }, root);

        const refreshSoon = () => { if (!cancelled) ScrollTrigger.refresh(); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(refreshSoon));
        requestAnimationFrame(() => requestAnimationFrame(refreshSoon));
      } catch (err) {
        console.warn("landing motion init failed:", err);
        root.classList.remove("lp-armed");
        window.addEventListener("scroll", onNativeScroll, { passive: true });
        onNativeScroll();
        api.current.scrollTo = (sel) => { const el = typeof sel === "string" ? document.querySelector(sel) : sel; el?.scrollIntoView({ behavior: "smooth", block: "start" }); };
        api.current.refresh = () => {};
      }
    })();

    return () => {
      cancelled = true;
      try { root.classList.remove("lp-armed"); } catch {}
      cleanups.forEach((fn) => { try { fn(); } catch {} });
      try { ctx && ctx.revert(); } catch {}
      try { STRef && STRef.getAll().forEach((t) => t.kill()); } catch {}
      try { gsapRef && rafCb && gsapRef.ticker.remove(rafCb); } catch {}
      try { lenis && lenis.destroy(); } catch {}
      api.current = { scrollTo: null, refresh: null };
    };
  }, [rootRef]);

  return api;
}
