import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { usePiketGamification } from '../hooks/usePiketGamification';
import {
  formatDayKey, formatMonthKey, formatJamWib, getTodayDayKey,
  hitungPoinPeringkat, listAvailableMonths,
} from '../utils/piketGamification';
import PiketPodiumCard from '../components/piket/PiketPodiumCard';
import BeritaPageShell from '../components/berita/BeritaPageShell';
import {
  Crown, Trophy, Medal, Sparkles, Users, Calendar, RotateCw,
  Loader2, AlertTriangle, TrendingUp, Clock, ChevronRight, Star, MapPin, CheckCircle2
} from 'lucide-react';

const RANK_ICON = { 1: Crown, 2: Trophy, 3: Medal };

const PiketLeaderboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    rawRecords, loading, error, reload, months,
    todayKey, latestDayKey, getRecapForMonth, getLeaderboardForMonth, getUser,
  } = usePiketGamification();

  // Hari terbaik: hari ini bila sudah ada data, jika tidak hari terakhir yang ada data.
  const defaultDay = useMemo(() => {
    const available = new Set(rawRecords.map((r) => r.dayKey));
    return available.has(todayKey) ? todayKey : latestDayKey;
  }, [rawRecords, todayKey, latestDayKey]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [monthKey, setMonthKey] = useState(null);
  const activeDay = selectedDay || defaultDay;
  const activeMonth = monthKey || (activeDay ? activeDay.slice(0, 7) : months[0] || null);

  const monthRecap = useMemo(
    () => (activeMonth ? getRecapForMonth(activeMonth) : new Map()),
    [activeMonth, getRecapForMonth]
  );

  const dayRecap = monthRecap.get(activeDay) || { entries: [], juara: [] };
  const leaderboard = useMemo(
    () => (activeMonth ? getLeaderboardForMonth(activeMonth) : []),
    [activeMonth, getLeaderboardForMonth]
  );

  // Daftar hari pada bulan aktif (terbaru dulu).
  const daysInMonth = useMemo(
    () => [...monthRecap.keys()].sort().reverse(),
    [monthRecap]
  );

  const monthStats = useMemo(() => {
    const allEntries = [...monthRecap.values()].flatMap((n) => n.entries);
    const uniqueUsers = new Set(allEntries.map((e) => e.uid));
    return {
      totalHari: monthRecap.size,
      totalPeserta: uniqueUsers.size,
      rataHadir: monthRecap.size ? Math.round((allEntries.length / monthRecap.size) * 10) / 10 : 0,
    };
  }, [monthRecap]);

  const podium = [1, 2, 3].map((rank) => {
    const entry = dayRecap.juara.find((e) => e.rank === rank);
    return entry ? { rank, entry, user: getUser(entry.uid) } : null;
  });

  const rankedEntries = dayRecap.entries.map((e) => ({
    ...e,
    user: getUser(e.uid),
  }));

  const cardStyle = {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '18px',
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '12px',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    color: isDark ? '#F1F5F9' : '#0F172A',
    fontSize: '0.88rem', fontWeight: 700, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer'
  };

  const selectMonth = (mk) => {
    setMonthKey(mk);
    const firstDay = listAvailableMonths(rawRecords).includes(mk)
      ? rawRecords
        .filter((r) => r.dayKey?.startsWith(mk))
        .map((r) => r.dayKey)
        .sort()
        .reverse()[0]
      : null;
    setSelectedDay(firstDay);
  };

  const rankBadge = (rank) => {
    const Icon = RANK_ICON[rank];
    const colors = {
      1: { bg: isDark ? '#422006' : '#FEF3C7', fg: '#B45309' },
      2: { bg: isDark ? '#1E293B' : '#F1F5F9', fg: isDark ? '#CBD5E1' : '#475569' },
      3: { bg: isDark ? '#431407' : '#FFEDD5', fg: '#C2410C' },
    };
    const c = colors[rank] || { bg: isDark ? '#1E293B' : '#F8FAFC', fg: isDark ? '#94A3B8' : '#64748B' };
    return (
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.bg, color: c.fg,
        fontSize: '0.85rem', fontWeight: 800
      }}>
        {Icon ? <Icon size={18} /> : rank}
      </div>
    );
  };

  return (
    <BeritaPageShell
      theme={theme}
      title="Peringkat Piket Asrama"
      subtitle="Juara piket tercepat setiap hari dan klasemen poin bulanan piket warga asrama."
      onBack={() => navigate('/home')}
      backLabel="Kembali ke Beranda"
      maxWidth={1080}
      actions={
        <button
          onClick={reload}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '11px 16px', borderRadius: '12px',
            cursor: loading ? 'wait' : 'pointer',
            border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            color: isDark ? '#E2E8F0' : '#334155',
            fontSize: '0.82rem', fontWeight: 800
          }}
        >
          <RotateCw size={15} className={loading ? 'spin' : ''} />
          Segarkan
        </button>
      }
    >
      {loading ? (
        <div style={{ ...cardStyle, padding: '64px', textAlign: 'center', color: isDark ? '#94A3B8' : '#64748B' }}>
          <Loader2 size={28} className="spin" style={{ display: 'block', margin: '0 auto 12px' }} />
          Memuat data peringkat piket...
        </div>
      ) : error ? (
        <div style={{
          ...cardStyle, padding: '18px', display: 'flex', gap: '10px', alignItems: 'center',
          borderColor: isDark ? '#7F1D1D' : '#FECACA',
          backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
          color: isDark ? '#FCA5A5' : '#B91C1C', fontWeight: 700, fontSize: '0.88rem'
        }}>
          <AlertTriangle size={18} /> {error}
        </div>
      ) : rawRecords.length === 0 ? (
        <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center' }}>
          <Sparkles size={36} style={{ color: isDark ? '#475569' : '#CBD5E1', marginBottom: '12px' }} />
          <p style={{ margin: '0 0 4px', fontWeight: 800, color: isDark ? '#E2E8F0' : '#334155' }}>
            Belum ada data piket
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#94A3B8' : '#64748B' }}>
            Peringkat akan muncul otomatis setelah warga mulai melaporkan piket.
          </p>
        </div>
      ) : (
        <>
          {/* Filter bulan & hari */}
          <div style={{ ...cardStyle, padding: '14px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <Calendar size={16} style={{ color: isDark ? '#94A3B8' : '#64748B', flexShrink: 0 }} />
            <select
              value={activeMonth || ''}
              onChange={(e) => selectMonth(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 180px', width: 'auto' }}
            >
              {months.length === 0 && <option value="">Belum ada data</option>}
              {months.map((m) => (
                <option key={m} value={m}>{formatMonthKey(m)}</option>
              ))}
            </select>
            <select
              value={activeDay || ''}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{ ...inputStyle, flex: '2 1 220px', width: 'auto' }}
            >
              {daysInMonth.length === 0 && <option value="">Belum ada hari</option>}
              {daysInMonth.map((d) => (
                <option key={d} value={d}>
                  {formatDayKey(d)}{d === getTodayDayKey() ? ' (hari ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Statistik bulan */}
          <div className="rs-grid rs-grid-3" style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Hari tercatat', value: monthStats.totalHari, icon: Calendar, color: '#2563EB' },
              { label: 'Warga berpartisipasi', value: monthStats.totalPeserta, icon: Users, color: '#059669' },
              { label: 'Rata-rata piket/hari', value: monthStats.rataHadir, icon: TrendingUp, color: '#D97706' },
            ].map((s) => (
              <div key={s.label} style={{ ...cardStyle, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDark ? `${s.color}2E` : `${s.color}14`, color: s.color
                }}>
                  <s.icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Podium hari terpilih */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  <Sparkles size={20} color="#F97316" /> Lapor Piket Tercepat
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                  {activeDay ? formatDayKey(activeDay) : '-'} • {rankedEntries.length} warga piket
                </p>
              </div>
              {activeDay === getTodayDayKey() && (
                <span style={{
                  padding: '5px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                  backgroundColor: isDark ? '#7C2D12' : '#FFEDD5', color: isDark ? '#FDBA74' : '#C2410C'
                }}>
                  Hari ini
                </span>
              )}
            </div>

            {podium.some(Boolean) ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '10px', alignItems: 'end', marginBottom: '20px'
              }}>
                {/* Urutan visual: juara 2, juara 1, juara 3 */}
                {[podium[1], podium[0], podium[2]].map((p, i) => (
                  p ? (
                    <PiketPodiumCard
                      key={p.rank}
                      rank={p.rank}
                      entry={p.entry}
                      user={p.user}
                      theme={theme}
                      onClick={activeDay ? () => navigate(`/piket-person-detail?id=${p.entry.uid}`) : undefined}
                    />
                  ) : (
                    <div key={`empty-${i}`} style={{ height: '1px' }} />
                  )
                ))}
              </div>
            ) : (
              <div style={{
                padding: '32px 16px', textAlign: 'center', borderRadius: '14px',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                border: `2px dashed ${isDark ? '#334155' : '#E2E8F0'}`,
                color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem', fontWeight: 600,
                marginBottom: '20px'
              }}>
                Belum ada piket tercatat pada hari ini.
              </div>
            )}

            {/* Urutan lengkap hari itu */}
            {rankedEntries.length > 0 && (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isDark ? '#64748B' : '#94A3B8' }}>
                  Urutan piket lengkap
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rankedEntries.map((e) => {
                    const isPodium = e.rank <= 3;
                    return (
                      <button
                        key={`${e.id}-${e.uid}`}
                        onClick={() => navigate(`/piket-person-detail?id=${e.uid}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 12px', borderRadius: '12px', cursor: 'pointer',
                          border: `1px solid ${isPodium ? (isDark ? '#334155' : '#E2E8F0') : 'transparent'}`,
                          backgroundColor: isPodium
                            ? (isDark ? '#0F172A' : '#F8FAFC')
                            : 'transparent',
                          width: '100%', textAlign: 'left'
                        }}
                      >
                        {rankBadge(e.rank)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="rs-wrap-text" style={{ fontSize: '0.86rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#0F172A' }}>
                            {e.user?.name || e.user?.username || 'Warga Asrama'}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{e.jam} WIB</span>
                            {e.place && <span>• Tempat: {e.place}</span>}
                            {e.verified ? (
                              <span style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                • <CheckCircle2 size={11} /> Disetujui
                              </span>
                            ) : (
                              <span style={{ color: '#F59E0B' }}>
                                • Menunggu TTD
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800, padding: '3px 9px', borderRadius: '999px',
                          backgroundColor: isPodium ? (isDark ? '#1E3A8A' : '#DBEAFE') : (isDark ? '#1E293B' : '#F1F5F9'),
                          color: isPodium ? (isDark ? '#BFDBFE' : '#1D4ED8') : (isDark ? '#94A3B8' : '#64748B'),
                          flexShrink: 0
                        }}>
                          +{e.poin} poin
                        </span>
                        <ChevronRight size={16} style={{ color: isDark ? '#475569' : '#CBD5E1', flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Klasemen bulanan */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                <Trophy size={20} color="#F59E0B" /> Klasemen {formatMonthKey(activeMonth)}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                Peringkat berdasarkan total poin dari urutan lapor piket tercepat sepanjang bulan.
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center', borderRadius: '14px',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                border: `2px dashed ${isDark ? '#334155' : '#E2E8F0'}`,
                color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem', fontWeight: 600
              }}>
                Belum ada data pada bulan ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {leaderboard.map((row, idx) => {
                  const rank = idx + 1;
                  const user = getUser(row.uid);
                  const isTop3 = rank <= 3;
                  return (
                    <button
                      key={row.uid}
                      onClick={() => navigate(`/piket-person-detail?id=${row.uid}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                        border: `1px solid ${isTop3 ? (isDark ? '#334155' : '#E2E8F0') : 'transparent'}`,
                        backgroundColor: isTop3
                          ? (isDark ? '#0F172A' : '#F8FAFC')
                          : 'transparent',
                        width: '100%', textAlign: 'left'
                      }}
                    >
                      {rankBadge(rank)}
                      <img
                        src={user?.fotoProfil || user?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Warga')}&background=F97316&color=fff&size=80&bold=true`}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rs-wrap-text" style={{ fontSize: '0.86rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#0F172A' }}>
                          {user?.name || user?.username || 'Warga Asrama'}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8' }}>
                          Angkatan {user?.angkatan || '-'} • {row.hadir}x piket
                          {(row.juara1 > 0 || row.juara2 > 0 || row.juara3 > 0) && (
                            <span style={{ marginLeft: '6px' }}>
                              {row.juara1 > 0 && `🥇${row.juara1} `}
                              {row.juara2 > 0 && `🥈${row.juara2} `}
                              {row.juara3 > 0 && `🥉${row.juara3}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F97316' }}>
                          {row.totalPoin}
                        </div>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: isDark ? '#64748B' : '#94A3B8', textTransform: 'uppercase' }}>
                          poin
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: isDark ? '#475569' : '#CBD5E1', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aturan poin */}
          <div style={{
            ...cardStyle, padding: '16px 20px',
            backgroundColor: isDark ? '#1C2E4A' : '#EFF6FF',
            borderColor: isDark ? '#2563EB' : '#BFDBFE'
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={16} /> Sistem Poin Piket
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: isDark ? '#BFDBFE' : '#1E3A8A' }}>
              Setiap hari, urutan lapor piket menentukan poin harian:
              Juara 1 mendapat <strong>25 poin</strong>, Juara 2 mendapat <strong>20 poin</strong>, Juara 3 mendapat <strong>15 poin</strong>,
              lalu peringkat 4 dan seterusnya mendapat <strong>12, 11, 10, ... poin</strong> secara menurun. Poin bulanan diakumulasi dari seluruh poin harian yang didapatkan.
            </p>
          </div>
        </>
      )}
    </BeritaPageShell>
  );
};

export default PiketLeaderboard;
