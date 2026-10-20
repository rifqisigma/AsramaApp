import { useNavigate } from 'react-router-dom';
import PodiumCard from './absenMalam/PodiumCard';
import {
  formatNightKey, formatMonthKey, formatJamWib, hitungPoinPeringkat, POIN_PODIUM,
} from '../utils/absenMalamGamification';
import {
  Flame, Crown, Trophy, Medal, ChevronRight, Clock, Ship,
} from 'lucide-react';

/** Warna penanda peringkat 1-3. */
const PODIUM_COLORS = {
  1: { bgLight: '#FEF3C7', bgDark: '#422006', fg: '#B45309', fgDark: '#FCD34D' },
  2: { bgLight: '#F1F5F9', bgDark: '#1E293B', fg: '#475569', fgDark: '#CBD5E1' },
  3: { bgLight: '#FFEDD5', bgDark: '#431407', fg: '#C2410C', fgDark: '#FDBA74' },
};

const RankBadge = ({ rank, isDark, size = 26 }) => {
  const c = PODIUM_COLORS[rank] || { bgLight: '#F8FAFC', bgDark: '#1E293B', fg: '#64748B', fgDark: '#94A3B8' };
  const Icon = rank === 1 ? Crown : rank === 2 ? Trophy : rank === 3 ? Medal : null;
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '9px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.72rem', fontWeight: 800,
      backgroundColor: isDark ? c.bgDark : c.bgLight,
      color: isDark ? c.fgDark : c.fg
    }}>
      {Icon ? <Icon size={Math.round(size * 0.55)} /> : rank}
    </div>
  );
};

const avatarOf = (user, color = 'F97316', size = 100) =>
  user?.fotoProfil || user?.foto ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Warga')}&background=${color}&color=fff&size=${size}&bold=true`;

/**
 * Section gamifikasi absen malam (juara malam ini + top-3 klasemen bulan).
 * Dipakai di halaman Form Absen Malam.
 */
const AbsenMalamGamificationSection = ({
  nightRecap,
  leaderboard,
  getUser,
  nightKey,
  monthKey,
  loading,
  theme,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFEDD5';
  const titleColor = isDark ? '#FFFFFF' : '#1F2937';
  const mutedColor = isDark ? '#FED7AA' : '#6B7280';

  const rankedAll = (nightRecap?.entries || []).map((e) => ({
    ...e,
    jam: formatJamWib(e.at),
    user: getUser(e.uid),
  }));
  const juara = rankedAll.slice(0, 3);
  const top3Month = (leaderboard || []).slice(0, 3);

  if (loading) {
    return (
      <div style={{
        marginTop: '28px', padding: '20px',
        backgroundColor: cardBg, borderRadius: '28px',
        border: `2px solid ${cardBorder}`,
        color: mutedColor, fontSize: '0.88rem', fontWeight: 700, textAlign: 'center'
      }}>
        Memuat peringkat absen malam...
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '28px',
      backgroundColor: cardBg,
      borderRadius: '28px',
      padding: '24px 20px',
      border: `2px solid ${cardBorder}`,
      borderTop: '6px solid #F97316',
      boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: `1.5px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              padding: '7px', borderRadius: '12px',
              backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
              color: '#F97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`
            }}>
              <Flame size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: titleColor }}>
              Juara Absen Malam
            </h3>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px',
            fontSize: '0.8rem', color: mutedColor, fontWeight: 700
          }}>
            <Clock size={13} />
            <span>{nightKey ? formatNightKey(nightKey) : '-'}</span>
            <span style={{ opacity: 0.75 }}>• {rankedAll.length} orang absen</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/absen-malam-leaderboard')}
          style={{
            padding: '7px 12px',
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            color: '#F97316',
            border: `1.5px solid ${isDark ? '#4A2E1E' : '#FDBA74'}`,
            borderRadius: '12px',
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
            outline: 'none'
          }}
        >
          Peringkat Lengkap <ChevronRight size={13} />
        </button>
      </div>

      {rankedAll.length === 0 ? (
        <div style={{
          padding: '28px 16px', textAlign: 'center', borderRadius: '16px',
          backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
          border: `1.5px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
          color: mutedColor, fontSize: '0.85rem', fontWeight: 700
        }}>
          <Ship size={26} style={{ marginBottom: '8px', opacity: 0.7 }} />
          <div>Belum ada yang absen malam ini.</div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '2px', opacity: 0.85 }}>
            Jadi yang tercepat dan raih {POIN_PODIUM[1]} poin!
          </div>
        </div>
      ) : (
        <>
          {/* Podium 3 tercepat */}
          {juara.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px', alignItems: 'end', marginBottom: '16px'
            }}>
              {/* Urutan visual: juara 2, juara 1, juara 3 */}
              {[juara[1], juara[0], juara[2]].map((e, i) => (
                e ? (
                  <PodiumCard
                    key={e.uid}
                    rank={e.rank}
                    entry={e}
                    user={e.user}
                    theme={theme}
                  />
                ) : <div key={`empty-${i}`} style={{ height: '1px' }} />
              ))}
            </div>
          )}

          {/* Peringkat 4 dan seterusnya */}
          {rankedAll.length > 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {rankedAll.slice(3).map((e) => (
                <div key={e.uid} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 4px'
                }}>
                  <RankBadge rank={e.rank} isDark={isDark} size={24} />
                  <img
                    src={avatarOf(e.user, '94A3B8', 80)}
                    alt=""
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rs-wrap-text" style={{
                      fontSize: '0.82rem', fontWeight: 700, color: titleColor,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {e.user?.name || e.user?.username || 'Warga Asrama'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: mutedColor, flexShrink: 0 }}>
                    {e.jam} WIB
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                    minWidth: '46px', textAlign: 'right',
                    color: isDark ? '#FDBA74' : '#C2410C'
                  }}>
                    +{e.poin}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Top 3 klasemen bulan ini */}
      {top3Month.length > 0 && (
        <div style={{
          paddingTop: '14px',
          borderTop: `1.5px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
            fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.04em', color: '#EA580C'
          }}>
            <Trophy size={13} /> Klasemen {formatMonthKey(monthKey)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {top3Month.map((row, idx) => {
              const u = getUser(row.uid);
              return (
                <div key={row.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RankBadge rank={idx + 1} isDark={isDark} size={22} />
                  <span className="rs-wrap-text" style={{
                    flex: 1, minWidth: 0, fontSize: '0.8rem', fontWeight: 700, color: titleColor,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {u?.name || u?.username || 'Warga Asrama'}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F97316', flexShrink: 0 }}>
                    {row.totalPoin} poin
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aturan poin singkat */}
      <div style={{
        marginTop: '14px', padding: '10px 12px', borderRadius: '12px',
        backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
        border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
        fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.6,
        color: isDark ? '#FED7AA' : '#9A3412'
      }}>
        Poin per malam: juara 1 = {hitungPoinPeringkat(1)}, juara 2 = {hitungPoinPeringkat(2)},
        juara 3 = {hitungPoinPeringkat(3)}, lalu {hitungPoinPeringkat(4)}, {hitungPoinPeringkat(5)}, {hitungPoinPeringkat(6)}, ... berurutan.
      </div>
    </div>
  );
};

export default AbsenMalamGamificationSection;
