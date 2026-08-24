import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Calendar,
  User,
  Filter,
  RotateCcw,
  Layers,
  ShieldAlert,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MonitoringAll = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Access state
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Filter States
  const [namaFilter, setNamaFilter] = useState('');
  const [angkatanFilter, setAngkatanFilter] = useState('ALL');
  const [tanggalFilter, setTanggalFilter] = useState('');

  // Results State
  const [hasQueried, setHasQueried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aggregatedUsers, setAggregatedUsers] = useState([]);
  const [availableAngkatan, setAvailableAngkatan] = useState([]);

  // Check user permission on mount
  useEffect(() => {
    const checkUserAccess = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.statusPenghuni === 'CALON') {
            setIsAuthorized(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Access check warning:', err);
      }
      fetchAngkatanList();
    };

    checkUserAccess();
  }, []);

  const fetchAngkatanList = async () => {
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const angkatanSet = new Set();
      userSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.angkatan) {
          angkatanSet.add(String(data.angkatan).trim());
        }
      });
      const sorted = Array.from(angkatanSet).sort((a, b) => Number(b) - Number(a));
      setAvailableAngkatan(sorted);
    } catch (err) {
      console.warn('Gagal memuat daftar angkatan:', err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasQueried(true);

    try {
      const [usersSnap, piketSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'piket'))
      ]);

      const userMap = new Map();
      usersSnap.forEach((d) => {
        const uData = d.data();
        userMap.set(d.id, {
          id: d.id,
          username: uData.username || uData.name || 'Unknown',
          name: uData.name || uData.username || 'Unknown',
          angkatan: uData.angkatan ? String(uData.angkatan) : '?',
          prodi: uData.prodi || '',
          fotoProfil: uData.fotoProfil || null,
          jabatan: uData.jabatan || '',
          totalPiket: 0,
          verifiedCount: 0,
          pendingCount: 0
        });
      });

      piketSnap.forEach((docSnap) => {
        const pData = docSnap.data();

        let targetUid = null;
        if (pData.userPiket) {
          if (typeof pData.userPiket === 'string') {
            targetUid = pData.userPiket.replace(/^\/?users\//, '');
          } else if (pData.userPiket.id) {
            targetUid = pData.userPiket.id;
          } else if (pData.userPiket.path) {
            const parts = pData.userPiket.path.split('/');
            targetUid = parts[parts.length - 1];
          }
        }

        if (!targetUid) return;

        let piketDateObj = null;
        if (pData.timestamp?.toDate) {
          piketDateObj = pData.timestamp.toDate();
        } else if (pData.timestamp) {
          piketDateObj = new Date(pData.timestamp);
        } else if (pData.timestampMaxPiket?.toDate) {
          piketDateObj = pData.timestampMaxPiket.toDate();
        } else if (pData.timestampMaxPiket) {
          piketDateObj = new Date(pData.timestampMaxPiket);
        }

        if (tanggalFilter) {
          if (!piketDateObj) return;
          const piketDateStr = piketDateObj.toISOString().slice(0, 10);
          if (piketDateStr !== tanggalFilter) return;
        }

        const isVerified = pData.verification === true;

        if (userMap.has(targetUid)) {
          const u = userMap.get(targetUid);
          u.totalPiket += 1;
          if (isVerified) {
            u.verifiedCount += 1;
          } else {
            u.pendingCount += 1;
          }
        } else {
          userMap.set(targetUid, {
            id: targetUid,
            username: 'User (' + targetUid.slice(0, 5) + ')',
            name: 'User (' + targetUid.slice(0, 5) + ')',
            angkatan: '?',
            prodi: '',
            fotoProfil: null,
            jabatan: '',
            totalPiket: 1,
            verifiedCount: isVerified ? 1 : 0,
            pendingCount: isVerified ? 0 : 1
          });
        }
      });

      const results = [];
      const queryName = namaFilter.trim().toLowerCase();

      userMap.forEach((user) => {
        const hasPikets = user.totalPiket > 0;
        const matchesName =
          !queryName ||
          user.username.toLowerCase().includes(queryName) ||
          user.name.toLowerCase().includes(queryName);
        const matchesAngkatan =
          angkatanFilter === 'ALL' || String(user.angkatan).trim() === angkatanFilter.trim();

        if (tanggalFilter && user.totalPiket === 0) return;

        if (matchesName && matchesAngkatan && (hasPikets || queryName.length > 0)) {
          results.push(user);
        }
      });

      results.sort((a, b) => {
        if (b.pendingCount !== a.pendingCount) {
          return b.pendingCount - a.pendingCount;
        }
        if (b.totalPiket !== a.totalPiket) {
          return b.totalPiket - a.totalPiket;
        }
        return a.name.localeCompare(b.name);
      });

      setAggregatedUsers(results);
    } catch (error) {
      console.error('Error querying piket monitoring data:', error);
      alert('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setNamaFilter('');
    setAngkatanFilter('ALL');
    setTanggalFilter('');
    setHasQueried(false);
    setAggregatedUsers([]);
  };

  const handleGoToDetail = (personId) => {
    window.location.href = `/piket-person-detail?userId=${personId}`;
  };

  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Nunito", "Inter", sans-serif',
          padding: '24px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '40px 28px',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              marginBottom: '16px',
              border: '2px solid #EF4444'
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Dibatasi
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Fitur <b>Monitoring Piket Penghuni</b> hanya dapat diakses oleh penghuni tetap asrama (bukan calon penghuni).
          </p>
          <button
            onClick={() => (window.location.href = '/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#F97316',
              color: 'white',
              border: '2px solid #EA580C',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer'
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
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        fontFamily: '"Nunito", "Inter", sans-serif',
        padding: '24px 16px 80px 16px',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link
          to="/home"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: isDark ? '#F97316' : '#4B5563',
            textDecoration: 'none',
            fontWeight: 800,
            marginBottom: '20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FFEDD5'
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Kembali ke Home
        </Link>

        {/* Hero Header Card */}
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderTop: '10px solid #F97316',
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                border: '2px solid #F97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}
            >
              🧹
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: isDark ? '#FFFFFF' : '#1C1C1E',
                  margin: 0
                }}
              >
                Monitoring Piket Penghuni
              </h1>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: isDark ? '#FED7AA' : '#6B7280'
                }}
              >
                Pilih kueri dan klik tombol Lihat untuk memuat data
              </p>
            </div>
          </div>
        </div>

        {/* Filter Form */}
        <form
          onSubmit={handleSearch}
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '22px 20px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316', fontWeight: 800, fontSize: '0.95rem' }}>
              <Filter size={18} strokeWidth={2.5} />
              <span>Opsi Pencarian</span>
            </div>
            {(namaFilter || angkatanFilter !== 'ALL' || tanggalFilter || hasQueried) && (
              <button
                type="button"
                onClick={handleResetForm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#FED7AA' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          {/* Nama */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: isDark ? '#FED7AA' : '#374151',
                marginBottom: '6px'
              }}
            >
              Nama Penghuni
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }}
              />
              <input
                type="text"
                value={namaFilter}
                onChange={(e) => setNamaFilter(e.target.value)}
                placeholder="Semua atau ketik nama/username..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '14px',
                  border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  color: isDark ? '#FFFFFF' : '#111827',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Angkatan & Tanggal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: isDark ? '#FED7AA' : '#374151',
                  marginBottom: '6px'
                }}
              >
                Angkatan
              </label>
              <div style={{ position: 'relative' }}>
                <Layers
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    pointerEvents: 'none'
                  }}
                />
                <select
                  value={angkatanFilter}
                  onChange={(e) => setAngkatanFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    borderRadius: '14px',
                    border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    color: isDark ? '#FFFFFF' : '#111827',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">Semua Angkatan</option>
                  {availableAngkatan.map((akt) => (
                    <option key={akt} value={akt}>
                      Angkatan {akt}
                    </option>
                  ))}
                  {!availableAngkatan.includes('62') && <option value="62">Angkatan 62</option>}
                  {!availableAngkatan.includes('61') && <option value="61">Angkatan 61</option>}
                  {!availableAngkatan.includes('60') && <option value="60">Angkatan 60</option>}
                  {!availableAngkatan.includes('59') && <option value="59">Angkatan 59</option>}
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: isDark ? '#FED7AA' : '#374151',
                  marginBottom: '6px'
                }}
              >
                Tanggal Piket
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="date"
                  value={tanggalFilter}
                  onChange={(e) => setTanggalFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 8px 11px 36px',
                    borderRadius: '14px',
                    border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    color: isDark ? '#FFFFFF' : '#111827',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px',
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#FB923C' : '#F97316',
              color: 'white',
              border: `2px solid ${loading ? '#FB923C' : '#EA580C'}`,
              borderRadius: '16px',
              fontSize: '1.05rem',
              fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 5px 0 #C2410C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <Search size={20} strokeWidth={2.8} />
            {loading ? 'Memuat Data...' : 'Lihat Data Piket'}
          </button>
        </form>

        {/* Results */}
        {!hasQueried ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '36px 24px',
              textAlign: 'center',
              border: `2px dashed ${isDark ? '#4A2E1E' : '#FED7AA'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: '16px',
                border: '2px solid #F97316'
              }}
            >
              🔍
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              Belum Ada Data yang Ditampilkan
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
              Pilih filter di atas lalu klik tombol <b>"Lihat Data Piket"</b>.
            </p>
          </div>
        ) : loading ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '40px 24px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #F97316',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '16px'
              }}
            />
            <h3 style={{ margin: 0, color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>
              Mengambil Data Piket...
            </h3>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : aggregatedUsers.length === 0 ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '36px 24px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEE2E2'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍂</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              Tidak Ditemukan Data
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
              Tidak ada data piket yang cocok dengan filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isDark ? '#FED7AA' : '#374151' }}>
                Daftar Penghuni ({aggregatedUsers.length})
              </span>
            </div>

            {/* REBUILT FROM 0: Resident Cards */}
            {aggregatedUsers.map((person) => {
              return (
                <div
                  key={person.id}
                  style={{
                    backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    boxShadow: isDark ? '0 5px 0 #4A2E1E' : '0 5px 0 #FFEDD5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  {/* Top: Avatar, Name, Angkatan */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '16px',
                          backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                          border: '2px solid #F97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#F97316',
                          fontWeight: 900,
                          fontSize: '1.2rem',
                          overflow: 'hidden'
                        }}
                      >
                        {person.fotoProfil ? (
                          <img
                            src={person.fotoProfil}
                            alt={person.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          (person.name || person.username).charAt(0).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#111827' }}>
                            {person.name || person.username}
                          </h3>
                          <span
                            style={{
                              backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                              border: '1.5px solid #F97316',
                              color: '#F97316',
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}
                          >
                            Angkatan {person.angkatan}
                          </span>
                        </div>
                        {person.prodi && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                            {person.prodi.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 Metric Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                        border: `1.5px solid ${isDark ? '#334155' : '#BFDBFE'}`,
                        borderRadius: '12px',
                        padding: '8px 10px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#3B82F6' }}>{person.totalPiket}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#2563EB' }}>TOTAL</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                        border: `1.5px solid ${isDark ? '#047857' : '#A7F3D0'}`,
                        borderRadius: '12px',
                        padding: '8px 10px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10B981' }}>{person.verifiedCount}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#059669' }}>DIVERIFIKASI</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                        border: `1.5px solid ${isDark ? '#92400E' : '#FDE68A'}`,
                        borderRadius: '12px',
                        padding: '8px 10px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#F59E0B' }}>{person.pendingCount}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#FCD34D' : '#D97706' }}>MENUNGGU</div>
                    </div>
                  </div>

                  {/* Direct Native Button to Open Detail */}
                  <button
                    type="button"
                    onClick={() => handleGoToDetail(person.id)}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '14px',
                      backgroundColor: '#F97316',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 0 #EA580C'
                    }}
                  >
                    <span>Lihat Detail Piket</span>
                    <ChevronRight size={18} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringAll;
