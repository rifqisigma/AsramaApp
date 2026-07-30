import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Clock, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const HistoryPoint = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const snap = await getDocs(collection(db, 'historyPoint'));
        const raw = [];
        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

        // Resolve userref → username untuk setiap record
        const resolved = await Promise.all(
          raw.map(async (h) => {
            let username = 'Unknown';
            try {
              if (h.userref && h.userref.path) {
                const userSnap = await getDoc(doc(db, h.userref.path));
                if (userSnap.exists()) {
                  const ud = userSnap.data();
                  username = ud.username || ud.name || 'Unknown';
                }
              }
            } catch (_) {}
            return { ...h, resolvedUsername: username };
          })
        );

        // Urutkan terbaru dulu
        resolved.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setHistories(resolved);
      } catch (err) {
        console.error('Error fetching historyPoint:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filtered = histories.filter(h => {
    const q = searchQuery.toLowerCase();
    return (
      (h.name || '').toLowerCase().includes(q) ||
      (h.resolvedUsername || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        padding: '2rem 1.5rem 120px 1.5rem',
        fontFamily: '"Nunito", "Inter", sans-serif',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
            borderRadius: '16px',
            padding: '10px',
            cursor: 'pointer',
            color: '#F97316',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'; }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F97316', margin: 0 }}>
            Riwayat Poin
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '0.9rem' }}>
            Semua transaksi poin penghuni
          </p>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama pelanggaran atau penghuni..."
          style={{
            width: '100%',
            padding: '14px 14px 14px 44px',
            borderRadius: '16px',
            border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: '"Nunito", "Inter", sans-serif',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            fontWeight: 650,
            color: isDark ? '#FFFFFF' : '#1F2937',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease'
          }}
        />
        <Search
          size={20}
          color="#FB923C"
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </div>

      {/* ─── List ─── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#F97316', fontWeight: 800 }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          Memuat riwayat poin...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 0',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          border: isDark ? '2px dashed #4A2E1E' : '2px dashed #FFEDD5',
          color: '#FB923C',
          fontWeight: 700,
          transition: 'all 0.3s ease'
        }}>
          {searchQuery ? 'Tidak ada riwayat yang cocok.' : 'Belum ada riwayat poin.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(h => {
            const isNeg = (h.point || 0) < 0;
            const accentColor = isNeg ? '#EF4444' : '#10B981';
            const bgColor = isNeg ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4');
            const borderColor = isNeg ? (isDark ? '#5C2222' : '#FCA5A5') : (isDark ? '#1C3D27' : '#86EFAC');
            const shadowColor = isNeg ? (isDark ? '#5C2222' : '#FCA5A5') : (isDark ? '#1C3D27' : '#86EFAC');

            return (
              <div
                key={h.id}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  border: `2px solid ${borderColor}`,
                  boxShadow: `0 6px 0 ${shadowColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Left info */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {/* Nama pelanggaran/prestasi */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 0.3s'
                  }}>
                    {h.name || '-'}
                  </h3>

                  {/* Kepada user */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                    <User size={13} color="#9CA3AF" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#D1D5DB' : '#6B7280', transition: 'color 0.3s' }}>
                      kepada {h.resolvedUsername}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <Clock size={13} color="#9CA3AF" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Right: point badge */}
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '14px',
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  color: accentColor,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  flexShrink: 0,
                  minWidth: '60px',
                  textAlign: 'center',
                }}>
                  {isNeg ? '' : '+'}{h.point}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
};

export default HistoryPoint;
