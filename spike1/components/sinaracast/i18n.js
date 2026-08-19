"use client";
/* ============================================================
   SinaraCast — i18n (Bahasa Indonesia ⇄ English)

   Design: the Indonesian copy IS the key. `t("Simpan")` looks the
   string up in the English dictionary and falls back to the
   Indonesian source when there is no entry — so a string that has
   not been translated yet still reads correctly, and a raw key can
   never leak onto the screen.

   `t()` is a plain module-level function (no hook, no context), so
   any file can `import { t }` and use it inside or outside a
   component. The active language lives in a module variable that
   SinaraCast.jsx sets during render, before any child renders; a
   state bump on the root then re-renders the whole tree. Nothing is
   memoized in this app, so the switch is instant and no component
   state is lost.

   Placeholders: `{0}`, `{1}` (array) or `{name}` (object).
     t("Gagal menyimpan: {0}", [err.message])
     t("{n} akun sosial media", { n: 4 })

   Plurals: Indonesian has none, so only the English side needs them. Write the
   translation as "singular|plural" and the form is picked from {0}.
   ============================================================ */
import React from "react";
import { EN } from "./locales/en";

export const LANG_KEY = "sc.lang.v1";
export const DEFAULT_LANG = "id";

export const LANGS = [
  { id: "id", name: "Indonesia", short: "ID", native: "Bahasa Indonesia" },
  { id: "en", name: "English",   short: "EN", native: "English" },
];
export const LANG_IDS = LANGS.map((l) => l.id);

// Dictionaries. `id` has none — it is the source language.
const DICT = { en: EN };

let CURRENT = DEFAULT_LANG;

// Called by SinaraCast during render, before children render.
export function setCurrentLang(id) {
  CURRENT = LANG_IDS.includes(id) ? id : DEFAULT_LANG;
  return CURRENT;
}

// Read the saved language. Guarded for SSR / private mode.
export function readLang() {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return LANG_IDS.includes(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(id) {
  try { window.localStorage.setItem(LANG_KEY, id); } catch { /* ignore */ }
}

const fill = (s, vars) =>
  s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));

// Plural forms. Indonesian has none, so the KEY never carries one — only a
// translation may, written as "singular|plural". The form is chosen from {0}.
//   "{0} akun sosial media" -> "{0} social account|{0} social accounts"
const choosePlural = (s, vars) => {
  if (!s.includes("|")) return s;
  // Driven by the first numeric value passed — usually {0}, but in a sentence
  // like "Jalan {0} sampai {1} · {2} hari" the count is the third one.
  const n = Object.values(vars).map(Number).find(Number.isFinite);
  const [one, many] = s.split("|");
  return Math.abs(n) === 1 ? one : many;
};

/** Translate `s` into the active language, interpolating `vars` if given. */
export function t(s, vars) {
  if (typeof s !== "string") return s;
  let out = s;
  if (CURRENT !== DEFAULT_LANG) {
    const d = DICT[CURRENT];
    const hit = d && d[s];
    if (hit !== undefined) out = hit;
  }
  if (!vars) return out;
  return fill(choosePlural(out, vars), vars);
}



/* ---------------------------------------------------------------
   React glue. The `lang` STATE deliberately lives in SinaraCast, not
   in a provider component: a provider that owns the state re-renders
   with the same `children` element and React bails out of the subtree,
   so nothing below would ever repaint. Owning it at the root means the
   whole tree is rebuilt on every switch — and since nothing in this app
   is memoized, every t() call re-evaluates with no remount and no lost
   component state.
   --------------------------------------------------------------- */
export const LangCtx = React.createContext({ lang: DEFAULT_LANG, setLang: () => {} });
export const useLang = () => React.useContext(LangCtx);
