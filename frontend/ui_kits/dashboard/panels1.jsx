/* global React, Icons, Glass, Tag, AvatarStack, MetaIcon */

/* ---------------- Calendar ---------------- */
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// Aug 2021 grid: leading blank-ish prev-month days then 1..31 then trailing
const CAL = [
  [null, null, null, null, null, null, '01'],
  ['02', '03', '04', '05', '06', '07', '08'],
  ['09', '10', '11', '12', '13', '14', '15'],
  ['16', '17', '18', '19', '20', '21', '22'],
  ['23', '24', '25', '26', '27', '28', '29'],
  ['30', '31', 'x01', 'x02', 'x03', 'x04', 'x05'],
];
function Calendar() {
  const selected = '05';
  return (
    <Glass style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)' }}>August, 2021</span>
        <div style={{ display: 'flex', gap: 6, color: 'var(--primary-500)' }}>
          <button style={navBtn}><Icons.chevDown size={15} style={{ transform: 'rotate(90deg)' }} /></button>
          <button style={navBtn}><Icons.chevDown size={15} style={{ transform: 'rotate(-90deg)' }} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'Poppins', fontWeight: 500, fontSize: 10.5, letterSpacing: '.04em', color: 'var(--ink-400)', paddingBottom: 8 }}>{d}</div>
        ))}
        {CAL.flat().map((c, i) => {
          if (c == null) return <div key={i} />;
          const muted = c.startsWith('x');
          const label = muted ? c.slice(1) : c;
          const on = c === selected;
          return (
            <div key={i} style={{ display: 'grid', placeItems: 'center', padding: '5px 0' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
                fontFamily: 'Poppins', fontWeight: on ? 600 : 500, fontSize: 13,
                background: on ? 'var(--primary-grad)' : 'transparent',
                color: on ? '#fff' : muted ? 'var(--ink-300)' : 'var(--ink-700)',
                boxShadow: on ? 'var(--shadow-primary)' : 'none',
              }}>{label}</div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}
const navBtn = { width: 24, height: 24, borderRadius: 8, border: '1px solid var(--primary-200)', background: 'transparent', color: 'var(--primary-500)', cursor: 'pointer', display: 'grid', placeItems: 'center' };

/* ---------------- My Task ---------------- */
const TASKS = ['Landing Page Design', 'Mobile Exploration', 'Stationary Design', 'Dashboard Design', 'Music App', 'Quran App', 'Joya Logo Design', 'Tracking App'];
function MyTask() {
  return (
    <Glass style={{ padding: '22px 20px' }}>
      <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)', marginBottom: 16 }}>My Task</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {TASKS.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 12, color: 'var(--ink-400)', width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ flex: 1, fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: 'var(--ink-700)' }}>{t}</span>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--green-300)', display: 'grid', placeItems: 'center', color: 'var(--green-500)' }}>
              <Icons.check size={12} sw={2.2} />
            </span>
          </div>
        ))}
      </div>
    </Glass>
  );
}

/* ---------------- Scheduled ---------------- */
function Scheduled() {
  return (
    <Glass strong style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)' }}>Scheduled</span>
        <button style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(140,144,158,.12)', color: 'var(--ink-400)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icons.close size={13} sw={2} />
        </button>
      </div>

      <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 15, color: 'var(--ink-900)' }}>Introduction to UX Design</div>
      <div style={{ fontFamily: 'Poppins', fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>Public</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', margin: '14px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: 'var(--ink-500)' }}>Price :</span>
        <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 15, color: 'var(--ink-900)' }}>$0</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <MetaRow icon={<Icons.cal2 size={16} />} text="08 - 05 - 21" />
        <MetaRow icon={<Icons.clock size={16} />} text="8.00pm - 9.15pm" tone="green" />
        <MetaRow icon={<Icons.pin size={16} />} text="Joya Hotel, Kaliurang" tone="lilac" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MetaIcon bg="var(--card-mint)" fg="#5FBE6B"><Icons.user size={15} /></MetaIcon>
          <AvatarStack people={[{ name: 'A B', bg: '#FBC04C' }, { name: 'C D', bg: '#82CF7E' }]} plus={3} size={26} />
        </div>
      </div>

      <button style={{
        width: '100%', marginTop: 20, height: 48, border: 'none', cursor: 'pointer',
        borderRadius: 14, background: 'var(--green-grad)', color: '#fff',
        fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, boxShadow: 'var(--shadow-green)',
      }}>Reschedule</button>
    </Glass>
  );
}
function MetaRow({ icon, text, tone = 'yellow' }) {
  const map = {
    yellow: ['var(--primary-100)', 'var(--primary-500)'],
    green: ['var(--green-100)', '#5FBE6B'],
    lilac: ['var(--card-lilac)', '#9579C4'],
  };
  const [bg, fg] = map[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <MetaIcon bg={bg} fg={fg}>{icon}</MetaIcon>
      <span style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 13, color: 'var(--ink-700)' }}>{text}</span>
    </div>
  );
}

window.Calendar = Calendar;
window.MyTask = MyTask;
window.Scheduled = Scheduled;
