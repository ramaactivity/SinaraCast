/* global React */
// Shared primitives: glass panels, avatars, tags, soft buttons.

const Avatar = ({ name = '', size = 28, src, bg = '#FBC04C', ring = false }) => {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const style = {
    width: size, height: size, borderRadius: '50%', flex: '0 0 auto',
    display: 'grid', placeItems: 'center', overflow: 'hidden',
    fontFamily: 'Poppins', fontWeight: 600, fontSize: size * 0.36, color: '#fff',
    background: src ? `center/cover url(${src})` : bg,
    boxShadow: ring ? '0 0 0 2.5px #fff' : 'none',
  };
  return <div style={style}>{!src && initials}</div>;
};

const AvatarStack = ({ people = [], size = 26, plus }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {people.map((p, i) => (
      <div key={i} style={{ marginLeft: i === 0 ? 0 : -9, position: 'relative', zIndex: people.length - i }}>
        <Avatar {...p} size={size} ring />
      </div>
    ))}
    {plus != null && (
      <div style={{
        marginLeft: -9, width: size, height: size, borderRadius: '50%',
        display: 'grid', placeItems: 'center', background: '#fff', color: '#A6ABB6',
        boxShadow: '0 0 0 2.5px #fff, 0 4px 10px rgba(90,96,120,.12)',
        fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, zIndex: 0,
      }}>+{plus}</div>
    )}
  </div>
);

const Tag = ({ children, tone = 'muted' }) => {
  const tones = {
    muted: { bg: 'rgba(140,144,158,.12)', fg: '#8A909E' },
    green: { bg: 'var(--green-100)', fg: '#5FBE6B' },
    yellow: { bg: 'var(--primary-100)', fg: '#E0922A' },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, fontFamily: 'Poppins', fontWeight: 500,
      fontSize: 10, padding: '2px 9px', borderRadius: 999,
    }}>{children}</span>
  );
};

// Frosted glass panel
const Glass = ({ children, style, strong, ...p }) => (
  <div {...p} style={{
    background: strong ? 'var(--glass-strong)' : 'var(--glass)',
    backdropFilter: 'blur(var(--blur))',
    WebkitBackdropFilter: 'blur(var(--blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-md)',
    ...style,
  }}>{children}</div>
);

// Small round soft-icon chip (used for date/time/pin meta rows)
const MetaIcon = ({ children, bg = 'var(--primary-100)', fg = 'var(--primary-500)' }) => (
  <span style={{
    width: 30, height: 30, borderRadius: 9, flex: '0 0 auto',
    display: 'grid', placeItems: 'center', background: bg, color: fg,
  }}>{children}</span>
);

window.Avatar = Avatar;
window.AvatarStack = AvatarStack;
window.Tag = Tag;
window.Glass = Glass;
window.MetaIcon = MetaIcon;
