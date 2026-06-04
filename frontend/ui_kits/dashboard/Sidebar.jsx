/* global React, Icons */
const { useState } = React;

const NAV = [
  ['dashboard', 'Dashboard'],
  ['calendar', 'Calendar'],
  ['task', 'My Task'],
  ['project', 'Project'],
  ['chat', 'Group Chats'],
  ['settings', 'Settings'],
];

function Sidebar() {
  const [active, setActive] = useState('Dashboard');
  return (
    <aside style={{
      width: 248, flex: '0 0 248px', padding: '30px 22px',
      display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar-glass)',
      backdropFilter: 'blur(var(--blur))', WebkitBackdropFilter: 'blur(var(--blur))',
      borderRight: '1px solid rgba(255,255,255,.4)',
      borderTopLeftRadius: 'var(--r-xl)', borderBottomLeftRadius: 'var(--r-xl)',
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px', marginBottom: 38 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11, background: 'var(--primary-grad)',
          boxShadow: 'var(--shadow-primary)',
        }} />
        <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 18, color: 'var(--ink-900)' }}>
          Ca Schedule
        </span>
      </div>

      {/* nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(([icon, label]) => {
          const on = active === label;
          const I = Icons[icon];
          return (
            <button key={label} onClick={() => setActive(label)} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '11px 14px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              borderRadius: 12, position: 'relative', textAlign: 'left',
              color: on ? 'var(--primary-500)' : 'var(--ink-400)',
              fontFamily: 'Poppins', fontWeight: on ? 600 : 500, fontSize: 14,
              transition: 'color .15s',
            }}>
              <I size={20} sw={on ? 2 : 1.7} />
              <span>{label}</span>
              {on && <span style={{
                position: 'absolute', right: 12, width: 7, height: 7, borderRadius: '50%',
                background: 'var(--primary-500)',
              }} />}
            </button>
          );
        })}
      </nav>

      {/* premium upsell */}
      <div style={{ marginTop: 'auto', paddingTop: 28 }}>
        <div style={{
          position: 'relative', borderRadius: 'var(--r-xl)', padding: '22px 20px 18px',
          background: 'var(--teal-grad)', boxShadow: '0 18px 36px rgba(84,188,160,.4)',
          overflow: 'hidden',
        }}>
          <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 17, lineHeight: 1.2, color: '#fff', width: 110 }}>
            Upgrade to Premium
          </div>
          {/* illustration placeholder */}
          <div style={{
            marginTop: 14, height: 96, borderRadius: 14,
            background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 8px, rgba(255,255,255,.07) 8px 16px)',
            border: '1px dashed rgba(255,255,255,.5)', display: 'grid', placeItems: 'center',
            fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'rgba(255,255,255,.85)',
            textAlign: 'center', padding: 6,
          }}>3D mascot<br />illustration</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
