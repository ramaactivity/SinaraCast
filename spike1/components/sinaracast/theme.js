// Color themes for SinaraCast. The whole app draws its color from the CSS
// tokens in app/globals.css; a theme just re-declares those tokens under
// <html data-sc-theme="…">. This module is the single source of truth for
// the theme list + the browser-local persistence of the user's pick.
//
// Personalization only — layout, spacing, type never change. Keep the ids +
// swatch colors in sync with the [data-sc-theme="…"] blocks in globals.css.

export const THEME_KEY = "sc.theme.v1";
export const DEFAULT_THEME = "sinar";

// `swatch` = 3 representative colors shown in the Settings picker.
export const THEMES = [
  { id: "sinar",    name: "Sinar",    sub: "Hangat & cerah",        swatch: ["#F9A826", "#FCC04C", "#82CF7E"] },
  { id: "lavender", name: "Lavender", sub: "Ungu yang segar",       swatch: ["#7A5CE8", "#9A85F1", "#AEDB56"] },
  { id: "hutan",    name: "Hutan",    sub: "Hijau yang menenangkan", swatch: ["#189E66", "#3EBE85", "#26A69A"] },
];

export const THEME_IDS = THEMES.map((t) => t.id);

// Read the saved theme (defaults to Sinar). Guarded for SSR / private mode.
export function readTheme() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return THEME_IDS.includes(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeTheme(id) {
  try { window.localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
}
