import { Trophy, Crown, Medal } from 'lucide-react';

const PODIUM_STYLE = {
  1: { color: '#F59E0B', ring: '#FBBF24', bgLight: '#FEF3C7', bgDark: '#422006', label: 'Juara 1', Icon: Crown },
  2: { color: '#64748B', ring: '#94A3B8', bgLight: '#F1F5F9', bgDark: '#1E293B', label: 'Juara 2', Icon: Trophy },
  3: { color: '#B45309', ring: '#D97706', bgLight: '#FFEDD5', bgDark: '#431407', label: 'Juara 3', Icon: Medal },
};

const avatarUrl = (user, nama, color) =>
  user?.fotoProfil || user?.foto ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=${color.replace('#', '')}&color=fff&size=100&bold=true`;

/** Satu kartu pemenang (juara 1/2/3) untuk satu malam. */
const PodiumCard = ({ rank, entry, user, theme, onClick }) => {
  const isDark = theme === 'dark';
  const s = PODIUM_STYLE[rank];
  if (!s) return null;
  const { Icon } = s;
  const nama = user?.name || user?.username || 'Warga Asrama';
  const isFirst = rank === 1;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        padding: isFirst ? '22px 14px 18px' : '18px 14px 14px',
        borderRadius: '18px', cursor: onClick ? 'pointer' : 'default',
        border: `2px solid ${s.ring}`,
        backgroundColor: isDark ? s.bgDark : s.bgLight,
        boxShadow: isFirst ? `0 6px 0 ${s.ring}` : `0 4px 0 ${s.ring}`,
        transform: isFirst ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.15s',
        textAlign: 'center', minWidth: 0
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = isFirst ? 'translateY(0)' : 'translateY(2px)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = isFirst ? 'translateY(-4px)' : 'translateY(0)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = isFirst ? 'translateY(-4px)' : 'translateY(0)'; }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em',
        textTransform: 'uppercase', color: s.color
      }}>
        <Icon size={14} />
        {s.label}
      </div>

      <img
        src={avatarUrl(user, nama, s.color)}
        alt={nama}
        style={{
          width: isFirst ? '68px' : '56px',
          height: isFirst ? '68px' : '56px',
          borderRadius: '50%', objectFit: 'cover',
          border: `3px solid ${s.ring}`,
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF'
        }}
      />

      <div style={{ minWidth: 0, width: '100%' }}>
        <div className="rs-wrap-text" style={{
          fontSize: isFirst ? '0.92rem' : '0.84rem',
          fontWeight: 800, lineHeight: 1.3,
          color: isDark ? '#F8FAFC' : '#0F172A',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {nama}
        </div>
        <div style={{
          marginTop: '2px', fontSize: '0.7rem', fontWeight: 600,
          color: isDark ? '#94A3B8' : '#64748B'
        }}>
          {entry?.jam ? `Absen ${entry.jam} WIB` : '-'}
        </div>
      </div>

      <span style={{
        marginTop: '2px', padding: '3px 10px', borderRadius: '999px',
        fontSize: '0.68rem', fontWeight: 800,
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        color: s.color
      }}>
        +{entry?.poin ?? 0} poin
      </span>
    </button>
  );
};

export default PodiumCard;
