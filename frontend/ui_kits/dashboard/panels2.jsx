/* global React, Icons, Glass, Tag */

/* ---------------- Info Bar (location / date / time pills) ---------------- */
function InfoBar() {
  const cell = (icon, text, tone) => {
    const map = { yellow: ['var(--primary-100)', 'var(--primary-500)'], lilac: ['var(--card-lilac)', '#9579C4'] };
    const [bg, fg] = map[tone] || map.yellow;
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: bg, color: fg, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{icon}</span>
        <span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: 'var(--ink-700)' }}>{text}</span>
      </div>
    );
  };
  return (
    <Glass style={{ padding: '14px 20px', display: 'flex', alignItems: 'center' }}>
      {cell(<Icons.pin size={16} />, 'Joya Hotel, Kaliurang', 'lilac')}
      <span style={divStyle} />
      {cell(<Icons.cal2 size={16} />, 'Oct, 05 20', 'yellow')}
      <span style={divStyle} />
      {cell(<Icons.clock size={16} />, '8.00pm - 9.15pm', 'yellow')}
    </Glass>
  );
}
const divStyle = { width: 1, height: 28, background: 'var(--line)', margin: '0 18px' };

/* ---------------- Time Selector ---------------- */
const TIMES = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 PM', '10:00 PM',
  '09:15 AM', '07:15 AM', '08:15 AM', '09:15 PM', '10:15 PM',
  '06:30 AM', '07:30 AM', '08:30 PM', '09:30 PM', '10:30 PM',
  '06:45 AM', '07:45 AM', '08:45 PM', '09:45 PM', '10:45 PM',
];
function TimeSelector() {
  const selected = ['07:15 AM', '09:30 PM'];
  return (
    <Glass style={{ padding: '20px 22px' }}>
      <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)', marginBottom: 16 }}>Time Selector</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 11 }}>
        {TIMES.map((t, i) => {
          const on = selected.includes(t);
          return (
            <div key={i} style={{
              height: 40, borderRadius: 11, display: 'grid', placeItems: 'center',
              fontFamily: 'Poppins', fontWeight: 500, fontSize: 12.5,
              background: on ? 'var(--green-100)' : 'rgba(255,255,255,.55)',
              color: on ? 'var(--green-500)' : 'var(--ink-400)',
              border: on ? '1px solid var(--green-200)' : '1px solid var(--line)',
            }}>{t}</div>
          );
        })}
      </div>
    </Glass>
  );
}

/* ---------------- Upcoming Events ---------------- */
const EVENTS = [
  { bg: 'var(--card-yellow)', dot: '#E0922A', title: 'Introduction to UX Design', time: '8.00pm - 9.15pm', loc: 'Joya Hotel, Kaliurang' },
  { bg: 'var(--card-mint)', dot: '#5FBE6B', title: 'Introduction to UI Design', time: '10.00pm - 11.00pm', loc: 'Queen Hotel, Yogyakarta' },
  { bg: 'var(--card-lilac)', dot: '#9579C4', title: 'UX Design Basic', time: '6.00pm - 8.00pm', loc: 'Joya Hotel, Kaliurang' },
];
function UpcomingEvents() {
  return (
    <div>
      <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)', marginBottom: 14 }}>Upcoming Events</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {EVENTS.map((e, i) => (
          <div key={i} style={{ background: e.bg, borderRadius: 16, padding: '15px 17px', boxShadow: '0 8px 20px rgba(90,96,120,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.dot }} />
              <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 13.5, color: 'var(--ink-900)' }}>{e.title}</span>
            </div>
            <div style={{ fontFamily: 'Poppins', fontSize: 10.5, color: 'rgba(62,67,81,.55)', margin: '3px 0 11px 16px' }}>Public</div>
            <div style={{ display: 'flex', gap: 16, marginLeft: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Poppins', fontSize: 10.5, color: 'rgba(62,67,81,.7)' }}>
                <Icons.clock size={13} style={{ color: e.dot }} />{e.time}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, marginTop: 5, fontFamily: 'Poppins', fontSize: 10.5, color: 'rgba(62,67,81,.7)' }}>
              <Icons.pin size={13} style={{ color: e.dot }} />{e.loc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.InfoBar = InfoBar;
window.TimeSelector = TimeSelector;
window.UpcomingEvents = UpcomingEvents;
