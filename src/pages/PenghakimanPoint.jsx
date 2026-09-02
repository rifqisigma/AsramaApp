import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Scale, Sparkles, Tag, Layers, User, Target } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logToGoogleSheets, formatVerificationData } from '../context/sheetsService';

const PenghakimanPoint = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Search User State
  const [userQuery, setUserQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Search Point State
  const [pointQuery, setPointQuery] = useState('');
  const [allPoints, setAllPoints] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [selectedPoints, setSelectedPoints] = useState([]); // [{ uniqueId, id, code, category, name, desc, point, type, target }]

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      if (!auth.currentUser) {
        setIsAuthorized(true);
        setUserRole('kepenghunian');
        await loadAllDatabaseData();
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        let role = '';
        let hasPointAccess = false;
        if (docSnap.exists()) {
          const uData = docSnap.data();
          role = (uData.jabatan || '').toLowerCase().trim();
          setUserRole(uData.jabatan || '');

          const allowedRoles = ['kepenghunian', 'proteksi', 'presiden', 'wakil presiden'];
          hasPointAccess = uData.pointAcces === true ||
            uData.pointAccess === true ||
            uData.point_access === true ||
            allowedRoles.includes(role);
        }

        if (hasPointAccess) {
          setIsAuthorized(true);
          await loadAllDatabaseData();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error verifying authorization:", error);
        setIsAuthorized(true);
        await loadAllDatabaseData();
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, []);

  const loadAllDatabaseData = async () => {
    try {
      // Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList = [];
      usersSnap.forEach(d => {
        uList.push({ id: d.id, ...d.data() });
      });
      setAllUsers(uList);

      // Fetch all system points
      const pointsSnap = await getDocs(collection(db, 'systemPoint'));
      const pList = [];
      pointsSnap.forEach(d => {
        pList.push({ id: d.id, ...d.data() });
      });
      // Sort by code or name
      pList.sort((a, b) => {
        if (a.code && b.code) return a.code.localeCompare(b.code);
        return (a.name || '').localeCompare(b.name || '');
      });
      setAllPoints(pList);
    } catch (err) {
      console.error("Error pre-loading database data:", err);
    }
  };

  // User Search handler
  useEffect(() => {
    if (!userQuery.trim()) {
      setFilteredUsers([]);
      return;
    }
    const queryLower = userQuery.toLowerCase().trim();
    const matches = allUsers.filter(u => {
      const nameMatch = (u.name || '').toLowerCase().includes(queryLower);
      const unameMatch = (u.username || '').toLowerCase().includes(queryLower);
      const angkatanMatch = (u.angkatan || '').toString().includes(queryLower);
      const isAlreadySelected = selectedUsers.some(sel => sel.id === u.id);
      return (nameMatch || unameMatch || angkatanMatch) && !isAlreadySelected;
    });
    setFilteredUsers(matches.slice(0, 5));
  }, [userQuery, allUsers, selectedUsers]);

  // Point Search handler (Support code, name, category, desc)
  useEffect(() => {
    if (!pointQuery.trim()) {
      setFilteredPoints([]);
      return;
    }
    const queryLower = pointQuery.toLowerCase().trim();
    const matches = allPoints.filter(p => {
      const codeMatch = (p.code || '').toLowerCase().includes(queryLower);
      const nameMatch = (p.name || '').toLowerCase().includes(queryLower);
      const catMatch = (p.category || '').toLowerCase().includes(queryLower);
      const descMatch = (p.desc || '').toLowerCase().includes(queryLower);
      return codeMatch || nameMatch || catMatch || descMatch;
    });
    setFilteredPoints(matches.slice(0, 6));
  }, [pointQuery, allPoints]);

  const selectUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setUserQuery('');
    setFilteredUsers([]);
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const selectPoint = (point) => {
    const uniqueId = `${point.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSelectedPoints(prev => [...prev, { ...point, uniqueId }]);
    setPointQuery('');
    setFilteredPoints([]);
  };

  const removePoint = (uniqueId) => {
    setSelectedPoints(prev => prev.filter(p => p.uniqueId !== uniqueId));
  };

  const totalDelta = selectedPoints.reduce((sum, p) => sum + (p.point || 0), 0);

  const getCategoryColor = (cat) => {
    const c = (cat || '').toUpperCase();
    if (c === 'BERAT') return { bg: isDark ? '#4C1D1D' : '#FEE2E2', border: '#EF4444', text: '#EF4444' };
    if (c === 'SEDANG') return { bg: isDark ? '#452A14' : '#FFEDD5', border: '#F97316', text: '#EA580C' };
    if (c === 'RINGAN') return { bg: isDark ? '#3D2F14' : '#FEF9C3', border: '#EAB308', text: '#CA8A04' };
    if (c === 'PRESTASI') return { bg: isDark ? '#143823' : '#DCFCE7', border: '#22C55E', text: '#16A34A' };
    return { bg: isDark ? '#2D1D13' : '#F3F4F6', border: '#9CA3AF', text: isDark ? '#FED7AA' : '#4B5563' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      alert("Harap pilih minimal 1 penghuni.");
      return;
    }
    if (selectedPoints.length === 0) {
      alert("Harap pilih minimal 1 jenis poin.");
      return;
    }

    const confirmMessage = `Apakah Anda yakin ingin memberikan ${selectedPoints.length} poin dengan total akumulasi ${totalDelta > 0 ? '+' : ''}${totalDelta} kepada ${selectedUsers.length} penghuni?`;
    if (!window.confirm(confirmMessage)) return;

    setSubmitting(true);

    try {
      const batch = writeBatch(db);

      for (const u of selectedUsers) {
        // Calculate new point score — clamp ketat antara 0 (min) dan 110 (max)
        const currentPoint = u.point ?? 0;
        const rawPoint = currentPoint + totalDelta;
        const newPoint = Math.min(110, Math.max(0, rawPoint));

        // 1. Update users point in database
        const userDocRef = doc(db, 'users', u.id);
        batch.update(userDocRef, { point: newPoint });

        // 2. Create history entries for each selected point with complete details (code, category, desc, etc.)
        for (const p of selectedPoints) {
          const historyRef = doc(collection(db, 'historyPoint'));
          const historyData = {
            code: p.code || '',
            category: p.category || '',
            name: p.name,
            desc: p.desc || '',
            point: p.point,
            type: p.type || (p.point < 0 ? 'pengurangan' : 'penambahan'),
            target: p.target || 'Seluruh penghuni',
            pointref: doc(db, 'systemPoint', p.id),
            timestamp: new Date().toISOString(),
            userref: doc(db, 'users', u.id),
            whoJudge: doc(db, 'users', auth.currentUser ? auth.currentUser.uid : 'mock-uid')
          };
          batch.set(historyRef, historyData);
        }
      }

      await batch.commit();

      // Log ke Google Sheets (async, non-blocking)
      if (auth.currentUser) {
        const formattedData = formatVerificationData('poin', {
          selectedUsers: selectedUsers,
          selectedPoints: selectedPoints,
          totalDelta: totalDelta,
          timestamp: new Date().toISOString()
        });
        logToGoogleSheets({
          type: 'poin',
          verificationData: formattedData,
          verifierName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          verifierId: auth.currentUser.uid
        }).catch(err => console.warn('Sheets logging error:', err));
      }

      alert("Penghakiman poin berhasil diproses!");
      navigate('/home');
    } catch (error) {
      console.error("Error executing mass point adjustment:", error);
      alert("Terjadi kesalahan saat memproses data. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#EF4444',
        fontWeight: 800,
        fontFamily: '"Nunito", sans-serif',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <span>Memuat Sistem Penghakiman...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        fontFamily: '"Nunito", "Inter", sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1.5rem',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: '2px solid #FCA5A5',
          boxShadow: '0 8px 0 #FCA5A5',
          textAlign: 'center',
          width: '100%',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            border: '3px solid #FCA5A5',
            boxShadow: '0 4px 0 #FCA5A5'
          }}>
            <Scale size={36} strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 12px 0' }}>
            Akses Ditolak
          </h1>
          <p style={{ color: isDark ? '#D1D5DB' : '#6B7280', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 32px 0' }}>
            Halaman ini khusus untuk Staff **Kepenghunian**, **Proteksi**, **Presiden**, **Wakil Presiden**, atau akun dengan izin **pointAcces**. Jabatan Anda saat ini adalah: **{userRole || 'Umum'}**.
          </p>

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #DC2626',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = '0 0px 0 #DC2626';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #DC2626';
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
        padding: '2rem 1.5rem 100px 1.5rem',
        position: 'relative',
      }}>

        {/* Header Halaman */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: isDark ? '#2D1D13' : '#FFFFFF',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '16px',
              padding: '10px',
              cursor: 'pointer',
              color: '#EF4444',
              boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s',
              outline: 'none'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
            }}
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#EF4444',
              margin: 0
            }}>
              Penghakiman Poin
            </h1>
            <p style={{ color: isDark ? '#FED7AA' : '#C2410C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
              Tindak pelanggaran & prestasi santri
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* SECTION 1: SEARCH USERS */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '20px 24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Langkah 1</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 850, color: isDark ? '#FFFFFF' : '#1F2937' }}>Pilih Penghuni</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>Cari dan tambahkan satu atau beberapa penghuni sekaligus</p>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Cari nama, username, atau angkatan..."
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '16px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  fontWeight: 650,
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
              <Search
                size={18}
                color="#F97316"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* User Autocomplete Results */}
            {filteredUsers.length > 0 && (
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {filteredUsers.map((user, idx) => (
                  <div
                    key={user.id}
                    onClick={() => selectUser(user)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: idx === filteredUsers.length - 1 ? 'none' : `1px solid ${isDark ? '#3D291C' : '#FFF3E0'}`,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: isDark ? '#E5E7EB' : '#374151',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 700,
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#3D291C' : '#FFF7ED'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>{user.name || user.username}</span>
                      <span style={{ fontSize: '0.75rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>NIM: {user.nim || '-'} | Angkatan {user.angkatan}</span>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#F97316', fontWeight: 900 }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '8px',
                borderTop: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                paddingTop: '12px'
              }}>
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    style={{
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      border: `2px solid ${isDark ? '#4A2E1E' : '#FFDBB5'}`,
                      borderRadius: '12px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#F97316',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      boxShadow: isDark ? '0 2px 0 #4A2E1E' : '0 3px 0 #FFDBB5'
                    }}
                  >
                    <span>👤 {user.name || user.username} ({user.point ?? 0} Poin)</span>
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: SEARCH POINTS (With Code & Category Support) */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '20px 24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Langkah 2</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 850, color: isDark ? '#FFFFFF' : '#1F2937' }}>Pilih Kategori Pelanggaran / Prestasi</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>Cari berdasarkan kode (B-01), kategori, atau nama pasal</p>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={pointQuery}
                onChange={(e) => setPointQuery(e.target.value)}
                placeholder="Cari kode (B-01), kategori, atau nama..."
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '16px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  fontWeight: 650,
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
              <Search
                size={18}
                color="#3B82F6"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* Point Autocomplete Results */}
            {filteredPoints.length > 0 && (
              <div style={{
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {filteredPoints.map((point, idx) => {
                  const isNeg = point.point < 0;
                  const catColor = getCategoryColor(point.category);

                  return (
                    <div
                      key={point.id}
                      onClick={() => selectPoint(point)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx === filteredPoints.length - 1 ? 'none' : `1px solid ${isDark ? '#3D291C' : '#EFF6FF'}`,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 700,
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#3D291C' : '#EFF6FF'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {point.code && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: '#F97316',
                              color: 'white'
                            }}>
                              {point.code}
                            </span>
                          )}
                          {point.category && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: catColor.bg,
                              color: catColor.text,
                              border: `1px solid ${catColor.border}`
                            }}>
                              {point.category}
                            </span>
                          )}
                          <span style={{ color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>{point.name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {point.desc || 'Tidak ada deskripsi'}
                        </span>
                      </div>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: isNeg ? (isDark ? '#3C1C1C' : '#FEE2E2') : (isDark ? '#1C3D27' : '#E6F4EA'),
                        color: isNeg ? '#EF4444' : '#10B981',
                        border: `1px solid ${isNeg ? '#FCA5A5' : '#86EFAC'}`,
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        {isNeg ? '' : '+'}{point.point}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Points (List format with code details) */}
            {selectedPoints.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '8px',
                borderTop: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                paddingTop: '12px'
              }}>
                {selectedPoints.map(p => {
                  const isNeg = p.point < 0;
                  const catColor = getCategoryColor(p.category);

                  return (
                    <div
                      key={p.uniqueId}
                      style={{
                        backgroundColor: isNeg ? (isDark ? '#3C1C1C' : '#FFF5F5') : (isDark ? '#1C3D27' : '#F6FDF9'),
                        border: `2px solid ${isNeg ? '#FCA5A5' : '#86EFAC'}`,
                        borderRadius: '14px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: `0 3px 0 ${isNeg ? '#FCA5A5' : '#86EFAC'}`
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {p.code && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: '#F97316',
                              color: 'white'
                            }}>
                              {p.code}
                            </span>
                          )}
                          {p.category && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: catColor.bg,
                              color: catColor.text,
                              border: `1px solid ${catColor.border}`
                            }}>
                              {p.category}
                            </span>
                          )}
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>{p.name}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.95rem',
                          fontWeight: 900,
                          color: isNeg ? '#EF4444' : '#10B981'
                        }}>
                          {isNeg ? '' : '+'}{p.point}
                        </span>

                        <button
                          type="button"
                          onClick={() => removePoint(p.uniqueId)}
                          style={{
                            background: isDark ? '#2D1D13' : '#FFFFFF',
                            border: `2px solid ${isNeg ? '#FCA5A5' : '#86EFAC'}`,
                            borderRadius: '8px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#EF4444',
                            outline: 'none'
                          }}
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: REAL-TIME PREVIEW & MATHS */}
          {selectedUsers.length > 0 && selectedPoints.length > 0 && (
            <div style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              border: '2px solid #EF4444',
              boxShadow: '0 8px 0 #EF4444',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'all 0.3s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
                  <Scale size={20} strokeWidth={2.5} />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Kalkulasi & Hasil Sidang</h3>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>Simulasi perubahan skor poin untuk setiap penghuni</p>
              </div>

              {/* Total Accumulation display */}
              <div style={{
                backgroundColor: totalDelta < 0 ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4'),
                border: `2px solid ${totalDelta < 0 ? '#FCA5A5' : '#86EFAC'}`,
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>Total Delta Poin:</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: totalDelta < 0 ? '#EF4444' : '#10B981'
                }}>
                  {totalDelta > 0 ? '+' : ''}{totalDelta} Poin
                </span>
              </div>

              {/* User Calculation list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedUsers.map(user => {
                  const currentScore = user.point ?? 0;
                  const rawScore = currentScore + totalDelta;
                  const nextScore = Math.min(110, Math.max(0, rawScore));

                  return (
                    <div
                      key={user.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
                        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                        borderRadius: '14px',
                        fontWeight: 700
                      }}
                    >
                      <span style={{ color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>👤 {user.name || user.username}</span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#9CA3AF', textDecoration: 'line-through', fontSize: '0.9rem' }}>
                          {currentScore}
                        </span>
                        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>➡️</span>
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: 900,
                          color: nextScore >= 75 ? '#10B981' : (nextScore >= 50 ? '#F97316' : '#EF4444')
                        }}>
                          {nextScore} Poin
                        </span>
                        {rawScore > 115 && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            backgroundColor: isDark ? '#3D291C' : '#FEF3C7',
                            color: '#D97706',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            border: '1px solid #F59E0B'
                          }}>
                            Maks 115
                          </span>
                        )}
                        {rawScore < 0 && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            backgroundColor: isDark ? '#3C1C1C' : '#FEE2E2',
                            color: '#EF4444',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            border: '1px solid #EF4444'
                          }}>
                            Min 0
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting || selectedUsers.length === 0 || selectedPoints.length === 0}
            style={{
              width: '100%',
              padding: '18px',
              backgroundColor: submitting ? '#FCA5A5' : (selectedUsers.length === 0 || selectedPoints.length === 0 ? '#E5E7EB' : '#EF4444'),
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '1.1rem',
              fontWeight: 900,
              cursor: (submitting || selectedUsers.length === 0 || selectedPoints.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: (submitting || selectedUsers.length === 0 || selectedPoints.length === 0) ? 'none' : '0 6px 0 #B91C1C',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px'
            }}
            onMouseDown={(e) => {
              if (!submitting && selectedUsers.length > 0 && selectedPoints.length > 0) {
                e.currentTarget.style.transform = 'translateY(6px)';
                e.currentTarget.style.boxShadow = '0 0px 0 #B91C1C';
              }
            }}
            onMouseUp={(e) => {
              if (!submitting && selectedUsers.length > 0 && selectedPoints.length > 0) {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 6px 0 #B91C1C';
              }
            }}
          >
            <Scale size={22} strokeWidth={2.5} />
            <span>{submitting ? 'Memproses Sidang...' : 'Terapkan Penghakiman Poin'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};

export default PenghakimanPoint;
