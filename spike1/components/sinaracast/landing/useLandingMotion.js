"use client";
import { useEffect, useRef } from "react";

// Single client-side animation engine for the landing page. GSAP + ScrollTrigger +
// Lenis are dynamically imported so none of this ships in the logged-in app bundle.
// Everything is scoped to `rootRef` via gsap.context and torn down on unmount, so
// logout -> login -> logout never leaks ScrollTriggers, a Lenis instance, or a ticker
// callback. A reduced-motion / coarse fallback skips Lenis and all scrub/pin/parallax
// and just leaves elements at their final, fully-visible state.
//
// Markup contract (data-attributes the landing sets):
//   [data-reveal]            -> fade/rise in when scrolled into view (staggered in batches)
//   [data-parallax="0.18"]   -> vertical parallax, factor = fraction of its travel
//   [data-hsection]          -> the section that pins for the horizontal showcase
//   [data-htrack]            -> the horizontal track translated inside [data-hsection]
//   [data-count] (+ optional data-snap) -> count-up to that integer on first enter
//   [data-nav]               -> gets `lp-nav-solid` class after 40px of scroll
export function useLandingMotion(rootRef, { enabled = true } = {}) {
  const api = useRef({ lenis: null, reduced: false, scrollTo: null, refresh: null });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    api.current.reduced = reduced;

    let cancelled = false;
    let lenis = null, ctx = null, rafCb = null, gsapRef = null, STRef = null;
    const cleanups = [];

    // Fallback nav-condense + anchor scroll that work even with no GSAP/Lenis.
    const nav = root.querySelector("[data-nav]");
    const onNativeScroll = () => { if (nav) nav.classList.toggle("lp-nav-solid", window.scrollY > 40); };

    if (reduced) {
      // No smooth scroll, no scrub. Native scroll + simple nav toggle + native anchors.
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      onNativeScroll();
      api.current.scrollTo = (sel) => {
        const el = typeof sel === "string" ? document.querySelector(sel) : sel;
        el?.scrollIntoView({ behavior: "auto", block: "start" });
      };
      api.current.refresh = () => {};
      return () => window.removeEventListener("scroll", onNativeScroll);
    }

    // Hide reveal targets up front (CSS) so they don't flash before GSAP arms them.
    root.classList.add("lp-armed");

    (async () => {
      try {
        const [{ gsap }, stMod, lenisMod] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("lenis"),
        ]);
        if (cancelled) return;
        const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
        const Lenis = lenisMod.default || lenisMod.Lenis;
        gsapRef = gsap; STRef = ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        // --- smooth scroll (window) wired to ScrollTrigger ---
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
        api.current.lenis = lenis;
        lenis.on("scroll", ScrollTrigger.update);
        rafCb = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(rafCb);
        gsap.ticker.lagSmoothing(0);

        api.current.scrollTo = (sel, opts = {}) => {
          const el = typeof sel === "string" ? document.querySelector(sel) : sel;
          if (el) lenis.scrollTo(el, { offset: -72, duration: 1.0, ...opts });
        };
        api.current.refresh = () => ScrollTrigger.refresh();

        // keyboard accessibility: keep tab focus visible + standard keys scroll smoothly
        const onKey = (e) => {
          const t = e.target;
          if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
          const vh = window.innerHeight;
          const map = { PageDown: vh * 0.9, PageUp: -vh * 0.9, ArrowDown: 80, ArrowUp: -80, " ": vh * 0.9 };
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
            if (r.top < 80 || r.bottom > window.innerHeight - 40) lenis.scrollTo(el, { offset: -120, immediate: false });
          }
        };
        window.addEventListener("focusin", onFocusIn);
        cleanups.push(() => window.removeEventListener("focusin", onFocusIn));

        // --- all scroll-driven tweens scoped to root ---
        ctx = gsap.context(() => {
          // nav condense
          if (nav) {
            ScrollTrigger.create({
              start: "40px top", end: "max",
              onUpdate: (self) => nav.classList.toggle("lp-nav-solid", self.scroll() > 40),
              onLeaveBack: () => nav.classList.remove("lp-nav-solid"),
            });
          }

          // reveal on scroll (batched stagger)
          const reveals = gsap.utils.toArray("[data-reveal]");
          gsap.set(reveals, { opacity: 0, y: 26 });
          ScrollTrigger.batch(reveals, {
            start: "top 86%",
            onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08, overwrite: true }),
          });

          // parallax layers
          gsap.utils.toArray("[data-parallax]").forEach((el) => {
            const f = parseFloat(el.getAttribute("data-parallax")) || 0.15;
            gsap.fromTo(el, { yPercent: -f * 50 }, {
              yPercent: f * 50, ease: "none",
              scrollTrigger: { trigger: el.closest("[data-parallax-scope]") || el, start: "top bottom", end: "bottom top", scrub: true },
            });
          });

          // pinned horizontal showcase (desktop only)
          const hsection = root.querySelector("[data-hsection]");
          const htrack = root.querySelector("[data-htrack]");
          if (hsection && htrack && window.innerWidth >= 880) {
            const getScroll = () => Math.max(0, htrack.scrollWidth - window.innerWidth + 80);
            gsap.to(htrack, {
              x: () => -getScroll(), ease: "none",
              scrollTrigger: {
                trigger: hsection, start: "top top", end: () => "+=" + getScroll(),
                scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
              },
            });
          }

          // count-up (honest numbers)
          gsap.utils.toArray("[data-count]").forEach((el) => {
            const target = parseFloat(el.getAttribute("data-count")) || 0;
            const snap = el.getAttribute("data-snap") || "1";
            ScrollTrigger.create({
              trigger: el, start: "top 88%", once: true,
              onEnter: () => {
                const o = { v: 0 };
                gsap.to(o, {
                  v: target, duration: 1.4, ease: "power2.out", snap: { v: parseFloat(snap) },
                  onUpdate: () => { el.textContent = String(Math.round(o.v)); },
                });
              },
            });
          });
        }, root);

        // settle measurements after fonts load + first paint
        const refreshSoon = () => { if (!cancelled) ScrollTrigger.refresh(); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(refreshSoon));
        requestAnimationFrame(() => requestAnimationFrame(refreshSoon));
      } catch (err) {
        // If the libs fail to load, leave the page static and fully visible.
        console.warn("landing motion init failed:", err);
        window.addEventListener("scroll", onNativeScroll, { passive: true });
        onNativeScroll();
        api.current.scrollTo = (sel) => {
          const el = typeof sel === "string" ? document.querySelector(sel) : sel;
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
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
      api.current = { lenis: null, reduced, scrollTo: null, refresh: null };
    };
  }, [enabled, rootRef]);

  return api;
}
