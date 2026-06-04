"use client";
import React from "react";
// Content OS icon set — thin line icons, 1.7 stroke, round caps (DS style).
const I = ({ size = 20, sw = 1.7, children, vb = 24, ...p }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);

export const Icons = {
  rules: (p) => <I {...p}><path d="M4 7h11M4 12h16M4 17h8"/><circle cx="19" cy="7" r="1.6"/><circle cx="14" cy="17" r="1.6"/></I>,
  calendar: (p) => <I {...p}><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></I>,
  activity: (p) => <I {...p}><path d="M3 12h4l2.5 6 5-15L17 12h4"/></I>,
  connections: (p) => <I {...p}><path d="M9.5 14.5l5-5"/><path d="M7.5 11.5l-1.7 1.7a3.2 3.2 0 0 0 4.5 4.5l1.7-1.7"/><path d="M16.5 12.5l1.7-1.7a3.2 3.2 0 0 0-4.5-4.5l-1.7 1.7"/></I>,
  settings: (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0 1.6 1.6 0 0 0-2.7-1.1 2 2 0 1 1-2.8-2.8A1.6 1.6 0 0 0 4 13.5a2 2 0 0 1 0-4 1.6 1.6 0 0 0 1.1-2.7 2 2 0 1 1 2.8-2.8A1.6 1.6 0 0 0 10.5 4a2 2 0 0 1 4 0 1.6 1.6 0 0 0 2.7 1.1 2 2 0 1 1 2.8 2.8 1.6 1.6 0 0 0 .4 2.6"/></I>,
  bell: (p) => <I {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></I>,
  plus: (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  play: (p) => <I {...p}><path d="M7 5.5l11 6.5-11 6.5z"/></I>,
  pause: (p) => <I {...p}><rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/></I>,
  skip: (p) => <I {...p}><path d="M5 5l9 7-9 7zM18 5v14"/></I>,
  swap: (p) => <I {...p}><path d="M7 4l-3 3 3 3"/><path d="M4 7h12a4 4 0 0 1 0 8h-1"/><path d="M17 20l3-3-3-3"/><path d="M20 17H8"/></I>,
  retry: (p) => <I {...p}><path d="M20 11a8 8 0 1 0-1.5 5.5"/><path d="M20 5v5h-5"/></I>,
  upload: (p) => <I {...p}><path d="M12 16V5M8 9l4-4 4 4"/><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></I>,
  image: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-4-7 6"/></I>,
  trash: (p) => <I {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></I>,
  edit: (p) => <I {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></I>,
  check: (p) => <I {...p}><path d="M5 12.5l4.2 4.2L19 7"/></I>,
  checkCircle: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.3 2.3L16 9.5"/></I>,
  x: (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18"/></I>,
  chevDown: (p) => <I {...p}><path d="M6 9l6 6 6-6"/></I>,
  chevRight: (p) => <I {...p}><path d="M9 6l6 6-6 6"/></I>,
  chevLeft: (p) => <I {...p}><path d="M15 6l-6 6 6 6"/></I>,
  alert: (p) => <I {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></I>,
  warn: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></I>,
  clock: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></I>,
  pin: (p) => <I {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/></I>,
  link: (p) => <I {...p}><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></I>,
  external: (p) => <I {...p}><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></I>,
  search: (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></I>,
  filter: (p) => <I {...p}><path d="M4 5h16l-6 7v6l-4 2v-8z"/></I>,
  telegram: (p) => <I {...p}><path d="M21 4 3 11l5 2 2 6 3-4 5 4z"/><path d="M8 13l9-6-6 8"/></I>,
  storage: (p) => <I {...p}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></I>,
  user: (p) => <I {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></I>,
  mail: (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></I>,
  logout: (p) => <I {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4M6 12h11"/></I>,
  more: (p) => <I {...p}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></I>,
  grid: (p) => <I {...p}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></I>,
  layers: (p) => <I {...p}><path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></I>,
  shuffle: (p) => <I {...p}><path d="M3 5h3.5l11 14H21M21 5h-3.5L14 9.5M3 19h3.5L9.5 15"/><path d="M18 3l3 2-3 2M18 17l3 2-3 2"/></I>,
  sun: (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></I>,
  moon: (p) => <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/></I>,
  film: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/></I>,
  sparkle: (p) => <I {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></I>,
  tag: (p) => <I {...p}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-7 7z"/><circle cx="8" cy="8" r="1.4"/></I>,
  drag: (p) => <I {...p}><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></I>,
  info: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></I>,
  power: (p) => <I {...p}><path d="M12 4v8M7.5 7a7 7 0 1 0 9 0"/></I>,
};
