import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, User, Info, X, Target, Shield, Tag, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SeePoints = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [authorized, setAuthorized] = useState(true);

  // Bottom Sheet State
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [loadingCreator, setLoadingCreator] = useState(false);

  const filterOptions = [
    { id: 'ALL', label: 'Semua' },
    { id: 'BERAT', label: 'Berat 🚨' },
    { id: 'SEDANG', label: 'Sedang ⚠️' },
    { id: 'RINGAN', label: 'Ringan ℹ️' },
    { id: 'PRESTASI', label: 'Prestasi 🏆' },
    { id: 'pengurangan', label: 'Pengurangan (-)' },
    { id: 'penambahan', label: 'Penambahan (+)' },
  ];

  useEffect(() => {
    const fetchPoints = async () => {
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

        const snap = await getDocs(collection(db, 'systemPoint'));
        const list = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });

        // Urutkan berdasarkan code asc atau timestamp desc
        list.sort((a, b) => {
          if (a.code && b.code) return a.code.localeCompare(b.code);
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });

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
        if (ref && (typeof ref.get === 'function' || ref.path)) {
          const docSnap = await getDoc(doc(db, ref.path));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCreatorName(data.name || data.username || 'Kepenghunian');
          } else {
            setCreatorName('Kepenghunian (Akun dihapus)');
          }
        } else if (typeof ref === 'string') {
          const cleanPath = ref.startsWith('/users/') ? ref.replace('/users/', 'users/') : ref;
          const docSnap = await getDoc(doc(db, cleanPath));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCreatorName(data.name || data.username || 'Kepenghunian');
          } else {
            setCreatorName('Kepenghunian');
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

  const filteredPoints = points.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (p.target || '').toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'pengurangan' || selectedFilter === 'penambahan') {
      return p.type === selectedFilter;
    }
    return (p.category || '').toUpperCase() === selectedFilter.toUpperCase();
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
            Mohon maaf, halaman poin ini hanya dapat diakses oleh Penghuni Asrama.
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
            Ketentuan Poin
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Daftar kode pasal & poin asrama
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        position: 'relative',
        marginBottom: '14px',
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Category Filter Horizontal Scroll */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="no-scrollbar">
        {filterOptions.map((f) => {
          const active = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              style={{
                backgroundColor: active ? '#F97316' : (isDark ? '#2D1D13' : '#FFFFFF'),
                color: active ? '#FFFFFF' : (isDark ? '#FED7AA' : '#4B5563'),
                border: `2px solid ${active ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                boxShadow: `0 3px 0 ${active ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                borderRadius: '14px',
                padding: '6px 14px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.1s',
                outline: 'none'
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* List Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#F97316', fontWeight: 800 }}>
          Memuat daftar ketentuan poin...
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredPoints.map((point) => {
            const isNegative = point.point < 0;
            const catStyle = getCategoryColor(point.category);

            return (
              <div
                key={point.id}
                onClick={() => setSelectedPoint(point)}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '22px',
                  padding: '16px 18px',
                  border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
                  boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'transform 0.15s ease, background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Badges Header: Kode + Kategori + Tipe */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    {point.code && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                        color: '#F97316',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`
                      }}>
                        🏷️ {point.code}
                      </span>
                    )}

                    {point.category && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`
                      }}>
                        {point.category}
                      </span>
                    )}

                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: isNegative ? (isDark ? '#5C2222' : '#FEE2E2') : (isDark ? '#1C3D27' : '#E6F4EA'),
                      color: isNegative ? '#EF4444' : '#10B981'
                    }}>
                      {point.type === 'pengurangan' ? 'Pengurangan' : 'Penambahan'}
                    </span>
                  </div>

                  {/* Nama Poin */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 850,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    lineHeight: 1.3
                  }}>
                    {point.name}
                  </h3>

                  {/* Target info */}
                  {point.target && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 650, color: isDark ? '#FED7AA' : '#6B7280' }}>
                      Target: {point.target}
                    </span>
                  )}
                </div>

                {/* Point Display Pill */}
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '14px',
                  backgroundColor: isNegative ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4'),
                  border: `2px solid ${isNegative ? '#FCA5A5' : '#86EFAC'}`,
                  color: isNegative ? '#EF4444' : '#10B981',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  boxShadow: `0 3px 0 ${isNegative ? '#FCA5A5' : '#86EFAC'}`
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
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
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
            padding: '28px 24px 40px 24px',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxHeight: '88vh',
            overflowY: 'auto',
            animation: 'slideUp 0.25s ease-out forwards',
            border: `3px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderBottom: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div style={{
              width: '44px',
              height: '5px',
              backgroundColor: isDark ? '#4A2E1E' : '#E5E7EB',
              borderRadius: '3px',
              alignSelf: 'center',
              marginBottom: '2px'
            }}></div>

            {/* Header Bottom Sheet */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedPoint.code && (
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#F97316',
                      color: 'white',
                      letterSpacing: '0.05em'
                    }}>
                      KODE: {selectedPoint.code}
                    </span>
                  )}
                  {selectedPoint.category && (
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      ...getCategoryColor(selectedPoint.category)
                    }}>
                      {selectedPoint.category}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: selectedPoint.point < 0 ? (isDark ? '#5C2222' : '#FEE2E2') : (isDark ? '#1C3D27' : '#E6F4EA'),
                    color: selectedPoint.point < 0 ? '#EF4444' : '#10B981'
                  }}>
                    {selectedPoint.type === 'pengurangan' ? 'Pengurangan Poin' : 'Penambahan Poin'}
                  </span>
                </div>

                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', lineHeight: 1.25 }}>
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
                  justifyContent: 'center',
                  flexShrink: 0
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
              padding: '16px',
              borderRadius: '24px',
              backgroundColor: selectedPoint.point < 0 ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4'),
              border: `2px solid ${selectedPoint.point < 0 ? '#FCA5A5' : '#86EFAC'}`,
              color: selectedPoint.point < 0 ? '#EF4444' : '#10B981',
              fontWeight: 900,
              fontSize: '2.4rem',
              gap: '6px',
              boxShadow: `0 6px 0 ${selectedPoint.point < 0 ? '#FCA5A5' : '#86EFAC'}`
            }}>
              <span>{selectedPoint.point < 0 ? '' : '+'}{selectedPoint.point}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', marginTop: '10px' }}>Poin</span>
            </div>

            {/* Description Card */}
            <div style={{
              backgroundColor: isDark ? '#3D291C' : '#FFF9F5',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '20px',
              padding: '16px 18px',
              display: 'flex',
              gap: '12px',
              transition: 'all 0.3s ease'
            }}>
              <Info size={22} color="#F97316" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi Lengkap</span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: isDark ? '#E5E7EB' : '#4B5563', fontWeight: 650, lineHeight: 1.45 }}>
                  {selectedPoint.desc || 'Tidak ada deskripsi detail.'}
                </p>
              </div>
            </div>

            {/* Grid Metadata Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              {/* Kode Poin */}
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Tag size={18} color="#F97316" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Kode Poin</span>
                  <span style={{ fontSize: '0.9rem', color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 900 }}>
                    {selectedPoint.code || '-'}
                  </span>
                </div>
              </div>

              {/* Kategori */}
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Layers size={18} color="#3B82F6" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Kategori</span>
                  <span style={{ fontSize: '0.9rem', color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 900 }}>
                    {selectedPoint.category || '-'}
                  </span>
                </div>
              </div>

              {/* Target */}
              <div style={{
                gridColumn: 'span 2',
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Target size={18} color="#EF4444" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Target Berlakunya Poin</span>
                  <span style={{ fontSize: '0.9rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                    {selectedPoint.target || 'Seluruh penghuni'}
                  </span>
                </div>
              </div>

              {/* PIC jika ada */}
              {selectedPoint.pic && (
                <div style={{
                  gridColumn: 'span 2',
                  backgroundColor: isDark ? '#1E130C' : '#F0FDF4',
                  border: `1.5px solid ${isDark ? '#065F46' : '#86EFAC'}`,
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Shield size={18} color="#10B981" style={{ flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>PIC (Penanggung Jawab)</span>
                    <span style={{ fontSize: '0.9rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                      {selectedPoint.pic}
                    </span>
                  </div>
                </div>
              )}

              {/* Dibuat Oleh */}
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <User size={18} color="#F97316" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Dibuat Oleh</span>
                  <span style={{ fontSize: '0.85rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
                    {loadingCreator ? 'Memuat...' : creatorName}
                  </span>
                </div>
              </div>

              {/* Tanggal Dibuat */}
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Calendar size={18} color="#F97316" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Tanggal Dibuat</span>
                  <span style={{ fontSize: '0.85rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 750 }}>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
