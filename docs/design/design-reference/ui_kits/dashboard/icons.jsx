/* global React */
// Clean line-icon set matching the reference's thin, round-capped style.
// Stroke 1.7, round joins — consistent across the kit.

const Ic = ({ d, size = 20, sw = 1.7, fill = 'none', children, vb = 24, ...p }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  dashboard: (p) => (
    <Ic {...p}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </Ic>
  ),
  calendar: (p) => (
    <Ic {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </Ic>
  ),
  task: (p) => (
    <Ic {...p}>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8.5 9l1.5 1.5L13 7.5M8.5 15l1.5 1.5L13 13.5" />
    </Ic>
  ),
  project: (p) => (
    <Ic {...p}>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M6 8.4v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3M12 13.4v2.2" />
    </Ic>
  ),
  chat: (p) => (
    <Ic {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 9 9 0 0 1-3.7-.7L3 21l1.3-4.2A8.3 8.3 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5z" />
    </Ic>
  ),
  settings: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Ic>
  ),
  search: (p) => (
    <Ic {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Ic>
  ),
  bell: (p) => (
    <Ic {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Ic>
  ),
  pin: (p) => (
    <Ic {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </Ic>
  ),
  clock: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </Ic>
  ),
  cal2: (p) => (
    <Ic {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </Ic>
  ),
  user: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Ic>
  ),
  check: (p) => (
    <Ic {...p}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Ic>
  ),
  chevDown: (p) => (
    <Ic {...p}>
      <path d="M6 9l6 6 6-6" />
    </Ic>
  ),
  refresh: (p) => (
    <Ic {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </Ic>
  ),
  close: (p) => (
    <Ic {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Ic>
  ),
  plus: (p) => (
    <Ic {...p}>
      <path d="M12 5v14M5 12h14" />
    </Ic>
  ),
};

window.Icons = Icons;
