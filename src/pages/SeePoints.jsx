import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, User, Info, X, Target, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SeePoints = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Bottom Sheet State
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [loadingCreator, setLoadingCreator] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const snap = await getDocs(collection(db, 'systemPoint'));
        const list = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });

        // Urutkan berdasarkan timestamp desc (terbaru dulu)
        list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        setPoints(list);
      } catch (error) {
        console.error("Error fetching system points:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  // Fetch creator name when a point is selected for Bottom Sheet
  useEffect(() => {
    const resolveCreator = async () => {
      if (!selectedPoint || !selectedPoint.whoCreate) {
        setCreatorName('Kepenghunian');
        return;
      }
      setLoadingCreator(true);
      setCreatorName('');
      try {
        const ref = selectedPoint.whoCreate;
        // Check if whoCreate is a standard DocumentReference
        if (ref && typeof ref.get === 'function' || (ref.path)) {
          const docSnap = await getDoc(doc(db, ref.path));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCreatorName(data.name || data.username || 'Kepenghunian');
          } else {
            setCreatorName('Kepenghunian (Akun dihapus)');
          }
        } else {
          setCreatorName('Kepenghunian');
        }
      } catch (error) {
        console.error("Error resolving creator name:", error);
        setCreatorName('Kepenghunian');
      } finally {
        setLoadingCreator(false);
      }
    };
    resolveCreator();
  }, [selectedPoint]);

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPoints = points.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.desc || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      fontFamily: '"Nunito", "Inter", sans-serif',
      transition: 'background-color 0.3s ease'
    }}>
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '2rem 1.5rem 120px 1.5rem',
      position: 'relative',
    }}>

      {/* Header Halaman */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => navigate('/home')}
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
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
          }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F97316',
            margin: 0
          }}>
            Jenis Poin Asrama
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Ketentuan poin penambahan & pengurangan
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        position: 'relative',
        marginBottom: '20px',
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari jenis pelanggaran atau prestasi..."
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
            transition: 'all 0.3s ease'
          }}
        />
        <Search
          size={20}
          color="#FB923C"
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* List Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#F97316', fontWeight: 800 }}>
          Memuat daftar poin...
        </div>
      ) : filteredPoints.length === 0 ? (
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
          Tidak ada ketentuan poin ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPoints.map((point) => {
            const isNegative = point.point < 0;
            return (
              <div
                key={point.id}
                onClick={() => setSelectedPoint(point)}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
                  boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'transform 0.15s ease, background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              >
                <div style={{ flex: 1, paddingRight: '12px', overflow: 'hidden' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'color 0.3s'
                  }}>
                    {point.name}
                  </h3>

                  {/* Badge Tipe */}
                  <span style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    backgroundColor: isNegative ? (isDark ? '#5C2222' : '#FEE2E2') : (isDark ? '#1C3D27' : '#E6F4EA'),
                    color: isNegative ? '#EF4444' : '#10B981'
                  }}>
                    {point.type === 'pengurangan' ? 'Pengurangan' : 'Penambahan'}
                  </span>
                </div>

                {/* Point Display Pill */}
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: isNegative ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4'),
                  border: `2px solid ${isNegative ? '#FCA5A5' : '#86EFAC'}`,
                  color: isNegative ? '#EF4444' : '#10B981',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  {isNegative ? '' : '+'}{point.point}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Detail Poin */}
      {selectedPoint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end'
        }}
          onClick={() => setSelectedPoint(null)}
        >
          {/* Bottom Sheet Container */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            width: '100%',
            maxWidth: '480px',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            padding: '32px 24px 40px 24px',
            boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '85vh',
            overflowY: 'auto',
            animation: 'slideUp 0.25s ease-out forwards',
            border: `3px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderBottom: 'none',
            transition: 'all 0.3s ease'
          }}
            onClick={(e) => e.stopPropagation()} // Prevent close on card click
          >
            {/* Handle Bar */}
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: isDark ? '#4A2E1E' : '#E5E7EB',
              borderRadius: '2px',
              alignSelf: 'center',
              marginBottom: '4px'
            }}></div>

            {/* Header Bottom Sheet */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  backgroundColor: selectedPoint.point < 0 ? (isDark ? '#5C2222' : '#FEE2E2') : (isDark ? '#1C3D27' : '#E6F4EA'),
                  color: selectedPoint.point < 0 ? '#EF4444' : '#10B981',
                  display: 'inline-block',
                  marginBottom: '8px'
                }}>
                  {selectedPoint.type === 'pengurangan' ? 'Pengurangan Poin' : 'Penambahan Poin'}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937', lineHeight: 1.2 }}>
                  {selectedPoint.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                style={{
                  background: isDark ? '#3D291C' : '#F3F4F6',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '8px',
                  cursor: 'pointer',
                  color: isDark ? '#D1D5DB' : '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* Point Large Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              borderRadius: '24px',
              backgroundColor: selectedPoint.point < 0 ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4'),
              border: `2px solid ${selectedPoint.point < 0 ? '#FCA5A5' : '#86EFAC'}`,
              color: selectedPoint.point < 0 ? '#EF4444' : '#10B981',
              fontWeight: 900,
              fontSize: '2.5rem',
              gap: '4px',
              boxShadow: `0 6px 0 ${selectedPoint.point < 0 ? '#FCA5A5' : '#86EFAC'}`
            }}>
              <span>{selectedPoint.point < 0 ? '' : '+'}{selectedPoint.point}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', marginTop: '12px' }}>Poin</span>
            </div>

            {/* Description Card */}
            <div style={{
              backgroundColor: isDark ? '#3D291C' : '#FFF9F5',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              gap: '12px',
              transition: 'all 0.3s ease'
            }}>
              <Info size={22} color="#F97316" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</span>
                <p style={{ margin: 0, fontSize: '0.95rem', color: isDark ? '#E5E7EB' : '#4B5563', fontWeight: 600, lineHeight: 1.4 }}>
                  {selectedPoint.desc || 'Tidak ada deskripsi detail.'}
                </p>
              </div>
            </div>

            {/* Meta Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {/* Creator Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '8px', borderRadius: '12px', color: '#F97316' }}>
                  <User size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dibuat Oleh</span>
                  <span style={{ fontSize: '0.95rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                    {loadingCreator ? 'Memuat nama...' : creatorName}
                  </span>
                </div>
              </div>

              {/* Target - hanya untuk tipe pengurangan */}
              {selectedPoint.type === 'pengurangan' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ backgroundColor: isDark ? '#3C1C1C' : '#FEE2E2', padding: '8px', borderRadius: '12px', color: '#EF4444' }}>
                    <Target size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</span>
                    <span style={{ fontSize: '0.95rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                      {selectedPoint.target || '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* PIC - hanya untuk tipe penambahan */}
              {selectedPoint.type === 'penambahan' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ backgroundColor: isDark ? '#1C3D27' : '#E6F4EA', padding: '8px', borderRadius: '12px', color: '#10B981' }}>
                    <Shield size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIC</span>
                    <span style={{ fontSize: '0.95rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                      {selectedPoint.pic || '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* Timestamp Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '8px', borderRadius: '12px', color: '#F97316' }}>
                  <Calendar size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal Dibuat</span>
                  <span style={{ fontSize: '0.95rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                    {formatDate(selectedPoint.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Style for slide animation in JSX */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

    </div>
    </div>
  );
};

export default SeePoints;
