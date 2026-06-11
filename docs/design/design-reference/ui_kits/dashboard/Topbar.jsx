/* global React, Icons, Avatar */
function Topbar() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 6 }}>
      {/* search */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 12, height: 50,
        padding: '0 20px', background: 'var(--glass-solid)', borderRadius: 'var(--r-pill)',
        boxShadow: 'var(--shadow-sm)', color: 'var(--ink-400)',
      }}>
        <Icons.search size={19} />
        <span style={{ fontFamily: 'Poppins', fontSize: 14 }}>Search</span>
      </div>

      {/* bell */}
      <button style={{
        width: 50, height: 50, flex: '0 0 auto', borderRadius: 15, border: 'none', cursor: 'pointer',
        background: 'var(--primary-grad)', color: '#fff', display: 'grid', placeItems: 'center',
        boxShadow: 'var(--shadow-primary)', position: 'relative',
      }}>
        <Icons.bell size={20} sw={2} />
        <span style={{ position: 'absolute', top: 13, right: 14, width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 2px var(--primary-400)' }} />
      </button>

      {/* profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingLeft: 4 }}>
        <Avatar name="Theresa Webb" size={42} bg="linear-gradient(135deg,#FBC04C,#F9A826)" />
        <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>
          Theresa Webb
        </span>
        <Icons.chevDown size={16} style={{ color: 'var(--ink-400)' }} />
      </div>
    </header>
  );
}

window.Topbar = Topbar;
