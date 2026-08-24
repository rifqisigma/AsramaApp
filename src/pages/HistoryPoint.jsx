import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Clock, User, Shield, Tag, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const HistoryPoint = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        if (!auth.currentUser) {
          setAuthorized(false);
          setLoading(false);
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().statusPenghuni === 'CALON') {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const [snap, systemSnap] = await Promise.all([
          getDocs(collection(db, 'historyPoint')),
          getDocs(collection(db, 'systemPoint'))
        ]);

        const systemMap = {};
        systemSnap.forEach(d => {
          systemMap[d.id] = { id: d.id, ...d.data() };
        });

        const raw = [];
        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

        // Resolve userref → username & systemPoint metadata
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

            let pointrefId = '';
            if (h.pointref) {
              if (typeof h.pointref === 'string') {
                pointrefId = h.pointref.startsWith('/systemPoint/') ? h.pointref.split('/')[2] : h.pointref.replace('systemPoint/', '');
              } else {
                pointrefId = h.pointref.id || h.pointref.path?.split('/').pop() || '';
              }
            }
            const linkedPoint = systemMap[pointrefId] || {};

            const code = h.code || linkedPoint.code || '';
            const category = h.category || linkedPoint.category || '';
            const desc = h.desc || linkedPoint.desc || '';
            const target = h.target || linkedPoint.target || '';

            return {
              ...h,
              resolvedUsername: username,
              code,
              category,
              desc,
              target
            };
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
    }) + ' WIB';
  };

  const getCategoryColor = (cat) => {
    const c = (cat || '').toUpperCase();
    if (c === 'BERAT') return { bg: isDark ? '#4C1D1D' : '#FEE2E2', border: '#EF4444', text: '#EF4444' };
    if (c === 'SEDANG') return { bg: isDark ? '#452A14' : '#FFEDD5', border: '#F97316', text: '#EA580C' };
    if (c === 'RINGAN') return { bg: isDark ? '#3D2F14' : '#FEF9C3', border: '#EAB308', text: '#CA8A04' };
    if (c === 'PRESTASI') return { bg: isDark ? '#143823' : '#DCFCE7', border: '#22C55E', text: '#16A34A' };
    return { bg: isDark ? '#2D1D13' : '#F3F4F6', border: '#9CA3AF', text: isDark ? '#FED7AA' : '#4B5563' };
  };

  const filtered = histories.filter(h => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (h.code || '').toLowerCase().includes(q) ||
      (h.category || '').toLowerCase().includes(q) ||
      (h.name || '').toLowerCase().includes(q) ||
      (h.resolvedUsername || '').toLowerCase().includes(q)
    );
  });

  if (!authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '"Nunito", "Inter", sans-serif'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: `2.5px solid ${isDark ? '#4A2E1E' : '#FECACA'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: isDark ? '#4C1D1D' : '#FEE2E2',
            color: '#EF4444',
            padding: '16px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.15)'
          }}>
            <Shield size={48} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Ditolak 🔒
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Mohon maaf, halaman riwayat poin ini hanya dapat diakses oleh Penghuni Asrama.
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: '#FFFFFF',
              border: '2px solid #EA580C',
              borderRadius: '20px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              outline: 'none',
              marginTop: '10px'
            }}
          >
            Kembali ke Home
          </button>
        </div>
      </div>
    );
  }

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
      {/* Header */}
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari kode (B-01), kategori, atau nama..."
          style={{
            width: '100%',
            padding: '14px 14px 14px 44px',
            borderRadius: '16px',
            border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
            fontSize: '0.95rem',
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

      {/* List */}
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
            const catStyle = getCategoryColor(h.category);

            return (
              <div
                key={h.id}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '22px',
                  padding: '16px 18px',
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
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Badges: Kode & Kategori */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    {h.code && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        backgroundColor: '#F97316',
                        color: 'white',
                        letterSpacing: '0.04em'
                      }}>
                        🏷️ {h.code}
                      </span>
                    )}

                    {h.category && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`
                      }}>
                        {h.category}
                      </span>
                    )}
                  </div>

                  {/* Nama pelanggaran/prestasi */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 850,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    lineHeight: 1.3,
                    transition: 'color 0.3s'
                  }}>
                    {h.name || '-'}
                  </h3>

                  {/* Kepada user */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <User size={13} color="#9CA3AF" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#D1D5DB' : '#6B7280', transition: 'color 0.3s' }}>
                      kepada <strong style={{ color: '#F97316' }}>{h.resolvedUsername}</strong>
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} color="#9CA3AF" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF' }}>
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Right: point badge */}
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '14px',
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  color: accentColor,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  flexShrink: 0,
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
