import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAbsenMalamGamification } from '../hooks/useAbsenMalamGamification';
import {
  formatNightKey, formatMonthKey, formatJamWib, getTodayNightKey,
  hitungPoinPeringkat, listAvailableMonths,
} from '../utils/absenMalamGamification';
import PodiumCard from '../components/absenMalam/PodiumCard';
import BeritaPageShell from '../components/berita/BeritaPageShell';
import {
  Crown, Trophy, Medal, Flame, Users, Calendar, RotateCw,
  Loader2, AlertTriangle, Info, TrendingUp, Clock, ChevronRight, Star
} from 'lucide-react';

const RANK_ICON = { 1: Crown, 2: Trophy, 3: Medal };

const AbsenMalamLeaderboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    rawRecords, loading, error, reload, months,
    tonightKey, latestNightKey, getRecapForMonth, getLeaderboardForMonth, getUser,
  } = useAbsenMalamGamification();

  // Malam terbaik: malam ini bila sudah ada data, jika tidak malam terakhir yang ada data.
  const defaultNight = useMemo(() => {
    const available = new Set(rawRecords.map((r) => r.nightKey));
    return available.has(tonightKey) ? tonightKey : latestNightKey;
  }, [rawRecords, tonightKey, latestNightKey]);

  const [selectedNight, setSelectedNight] = useState(null);
  const [monthKey, setMonthKey] = useState(null);
  const activeNight = selectedNight || defaultNight;
  const activeMonth = monthKey || (activeNight ? activeNight.slice(0, 7) : months[0] || null);

  const monthRecap = useMemo(
    () => (activeMonth ? getRecapForMonth(activeMonth) : new Map()),
    [activeMonth, getRecapForMonth]
  );

  const nightRecap = monthRecap.get(activeNight) || { entries: [], juara: [] };
  const leaderboard = useMemo(
    () => (activeMonth ? getLeaderboardForMonth(activeMonth) : []),
    [activeMonth, getLeaderboardForMonth]
  );

  // Daftar malam pada bulan aktif (terbaru dulu).
  const nightsInMonth = useMemo(
    () => [...monthRecap.keys()].sort().reverse(),
    [monthRecap]
  );

  const monthStats = useMemo(() => {
    const allEntries = [...monthRecap.values()].flatMap((n) => n.entries);
    const uniqueUsers = new Set(allEntries.map((e) => e.uid));
    return {
      totalMalam: monthRecap.size,
      totalPeserta: uniqueUsers.size,
      rataHadir: monthRecap.size ? Math.round((allEntries.length / monthRecap.size) * 10) / 10 : 0,
    };
  }, [monthRecap]);

  const podium = [1, 2, 3].map((rank) => {
    const entry = nightRecap.juara.find((e) => e.rank === rank);
    return entry ? { rank, entry, user: getUser(entry.uid) } : null;
  });

  const rankedEntries = nightRecap.entries.map((e) => ({
    ...e,
    jam: formatJamWib(e.at),
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
    const firstNight = listAvailableMonths(rawRecords).includes(mk)
      ? rawRecords
        .filter((r) => r.nightKey?.startsWith(mk))
        .map((r) => r.nightKey)
        .sort()
        .reverse()[0]
      : null;
    setSelectedNight(firstNight);
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
      title="Peringkat Absen Malam"
      subtitle="Juara tercepat setiap malam dan klasemen poin bulanan warga asrama."
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
          Memuat data absen malam...
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
          <Clock size={36} style={{ color: isDark ? '#475569' : '#CBD5E1', marginBottom: '12px' }} />
          <p style={{ margin: '0 0 4px', fontWeight: 800, color: isDark ? '#E2E8F0' : '#334155' }}>
            Belum ada data absen malam
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#94A3B8' : '#64748B' }}>
            Peringkat akan muncul otomatis setelah warga mulai mengisi form absen malam.
          </p>
        </div>
      ) : (
        <>
          {/* Filter bulan */}
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
              value={activeNight || ''}
              onChange={(e) => setSelectedNight(e.target.value)}
              style={{ ...inputStyle, flex: '2 1 220px', width: 'auto' }}
            >
              {nightsInMonth.length === 0 && <option value="">Belum ada malam</option>}
              {nightsInMonth.map((n) => (
                <option key={n} value={n}>
                  {formatNightKey(n)}{n === getTodayNightKey() ? ' (malam ini)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Statistik bulan */}
          <div className="rs-grid rs-grid-3" style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Malam tercatat', value: monthStats.totalMalam, icon: Calendar, color: '#2563EB' },
              { label: 'Warga berpartisipasi', value: monthStats.totalPeserta, icon: Users, color: '#059669' },
              { label: 'Rata-rata hadir/malam', value: monthStats.rataHadir, icon: TrendingUp, color: '#D97706' },
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

          {/* Podium malam terpilih */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  <Flame size={20} color="#F97316" /> Absen Tercepat
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                  {activeNight ? formatNightKey(activeNight) : '-'} • {rankedEntries.length} warga absen
                </p>
              </div>
              {activeNight === getTodayNightKey() && (
                <span style={{
                  padding: '5px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                  backgroundColor: isDark ? '#7C2D12' : '#FFEDD5', color: isDark ? '#FDBA74' : '#C2410C'
                }}>
                  Malam ini
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
                    <PodiumCard
                      key={p.rank}
                      rank={p.rank}
                      entry={{ ...p.entry, jam: formatJamWib(p.entry.at) }}
                      user={p.user}
                      theme={theme}
                      onClick={activeNight ? () => navigate(`/detail-person-absen-malam?id=${p.entry.uid}`) : undefined}
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
                Belum ada absen tercatat pada malam ini.
              </div>
            )}

            {/* Urutan lengkap malam itu */}
            {rankedEntries.length > 0 && (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isDark ? '#64748B' : '#94A3B8' }}>
                  Urutan absen lengkap
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rankedEntries.map((e) => {
                    const isPodium = e.rank <= 3;
                    return (
                      <button
                        key={`${e.id}-${e.uid}`}
                        onClick={() => navigate(`/detail-person-absen-malam?id=${e.uid}`)}
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
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8' }}>
                            {e.jam} WIB{e.user?.kamar && e.user.kamar !== '-' ? ` • Kamar ${e.user.kamar}` : ''}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800, padding: '3px 9px', borderRadius: '999px',
                          backgroundColor: isPodium ? (isDark ? '#1E3A8A' : '#DBEAFE') : (isDark ? '#1E293B' : '#F1F5F9'),
                          color: isPodium ? (isDark ? '#BFDBFE' : '#1D4ED8') : (isDark ? '#94A3B8' : '#64748B'),
                          flexShrink: 0
                        }}>
                          {e.poin} poin
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
                Peringkat berdasarkan total poin dari urutan absen tercepat sepanjang bulan.
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
                      onClick={() => navigate(`/detail-person-absen-malam?id=${row.uid}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '13px', cursor: 'pointer',
                        border: `1px solid ${isTop3 ? (isDark ? '#334155' : '#E2E8F0') : 'transparent'}`,
                        backgroundColor: isTop3
                          ? (rank === 1
                            ? (isDark ? '#422006' : '#FFFBEB')
                            : (isDark ? '#0F172A' : '#F8FAFC'))
                          : 'transparent',
                        width: '100%', textAlign: 'left'
                      }}
                    >
                      {rankBadge(rank)}
                      <img
                        src={user?.fotoProfil || user?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Warga')}&background=3B82F6&color=fff&size=100&bold=true`}
                        alt=""
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rs-wrap-text" style={{ fontSize: '0.87rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {user?.name || user?.username || 'Warga Asrama'}
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8' }}>
                          {row.hadir}× hadir • {row.juara1} juara 1 • {row.juara2} juara 2 • {row.juara3} juara 3
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: rank === 1 ? '#B45309' : (isDark ? '#E2E8F0' : '#0F172A'), lineHeight: 1.1 }}>
                          {row.totalPoin}
                        </div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#64748B' : '#94A3B8' }}>
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

          {/* Riwayat juara harian */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}>
              <Star size={20} color="#8B5CF6" /> Riwayat Juara Harian
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
              Tiga tercepat setiap malam pada {formatMonthKey(activeMonth)}.
            </p>

            {nightsInMonth.length === 0 ? (
              <div style={{
                padding: '28px 16px', textAlign: 'center', borderRadius: '14px',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                border: `2px dashed ${isDark ? '#334155' : '#E2E8F0'}`,
                color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem', fontWeight: 600
              }}>
                Belum ada riwayat pada bulan ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nightsInMonth.map((nightKey) => {
                  const night = monthRecap.get(nightKey);
                  const juara = night?.juara || [];
                  return (
                    <div
                      key={nightKey}
                      style={{
                        padding: '12px', borderRadius: '13px',
                        border: `1px solid ${nightKey === activeNight ? (isDark ? '#3B82F6' : '#BFDBFE') : (isDark ? '#334155' : '#F1F5F9')}`,
                        backgroundColor: nightKey === activeNight
                          ? (isDark ? '#0F1A2E' : '#EFF6FF')
                          : (isDark ? '#0F172A' : '#FFFFFF')
                      }}
                    >
                      <button
                        onClick={() => setSelectedNight(nightKey)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: '8px', width: '100%', border: 'none', background: 'none',
                          cursor: 'pointer', padding: 0, marginBottom: juara.length ? '8px' : 0,
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#E2E8F0' : '#0F172A' }}>
                          {formatNightKey(nightKey)}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isDark ? '#64748B' : '#94A3B8', flexShrink: 0 }}>
                          {night?.entries.length || 0} peserta
                        </span>
                      </button>
                      {juara.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {juara.map((j) => {
                            const u = getUser(j.uid);
                            return (
                              <div key={j.uid} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 600 }}>
                                <span style={{
                                  width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.62rem', fontWeight: 800,
                                  backgroundColor: j.rank === 1 ? '#FEF3C7' : j.rank === 2 ? '#F1F5F9' : '#FFEDD5',
                                  color: j.rank === 1 ? '#B45309' : j.rank === 2 ? '#475569' : '#C2410C'
                                }}>
                                  {j.rank}
                                </span>
                                <span className="rs-wrap-text" style={{ flex: 1, minWidth: 0, color: isDark ? '#CBD5E1' : '#334155' }}>
                                  {u?.name || u?.username || 'Warga Asrama'}
                                </span>
                                <span style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '0.7rem', flexShrink: 0 }}>
                                  {formatJamWib(j.at)} WIB
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aturan poin */}
          <div style={{
            ...cardStyle, padding: '16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            backgroundColor: isDark ? '#0F1A2E' : '#EFF6FF',
            borderColor: isDark ? '#1E3A8A' : '#BFDBFE'
          }}>
            <Info size={17} style={{ color: isDark ? '#93C5FD' : '#2563EB', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', lineHeight: 1.65, fontWeight: 600, color: isDark ? '#BFDBFE' : '#1E40AF' }}>
              <strong>Aturan poin:</strong>{' '}
              juara 1 = {hitungPoinPeringkat(1)} poin, juara 2 = {hitungPoinPeringkat(2)} poin,
              juara 3 = {hitungPoinPeringkat(3)} poin, lalu peringkat 4 dan seterusnya menurun
              berurutan ({hitungPoinPeringkat(4)}, {hitungPoinPeringkat(5)}, {hitungPoinPeringkat(6)}, ...).
              Poin dihitung ulang setiap malam dari urutan absen, lalu dijumlahkan untuk klasemen bulanan.
              Satu orang hanya dihitung sekali per malam (input paling awal), dan malam dihitung berdasarkan tanggal kalender WIB.
            </div>
          </div>
        </>
      )}
    </BeritaPageShell>
  );
};

export default AbsenMalamLeaderboard;
