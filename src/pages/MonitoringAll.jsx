import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Calendar,
  CalendarDays,
  User,
  Filter,
  RotateCcw,
  Layers,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import MonitoringFilterForm from '../components/MonitoringFilterForm';

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

  // Date picker ref & helpers
  const dateInputRef = useRef(null);

  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const shiftDate = (days) => {
    const baseStr = tanggalFilter || getTodayStr();
    const parts = baseStr.split('-');
    const cur = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    cur.setDate(cur.getDate() + days);
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    setTanggalFilter(`${year}-${month}-${day}`);
  };

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return 'Semua Tanggal';
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

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
          const year = piketDateObj.getFullYear();
          const month = String(piketDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(piketDateObj.getDate()).padStart(2, '0');
          const piketDateStr = `${year}-${month}-${day}`;
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
        padding: '16px 12px 80px 12px',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link
          to="/home"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: isDark ? '#F97316' : '#4B5563',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            marginBottom: '16px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            padding: '7px 14px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FFEDD5'
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Kembali ke Home
        </Link>

        {/* Hero Header Card */}
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 16px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderTop: '8px solid #F97316',
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                border: '2px solid #F97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}
            >
              🧹
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: isDark ? '#FFFFFF' : '#1C1C1E',
                  margin: 0,
                  lineHeight: 1.25
                }}
              >
                Monitoring Piket Penghuni
              </h1>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isDark ? '#FED7AA' : '#6B7280'
                }}
              >
                Pantau laporan piket seluruh penghuni
              </p>
            </div>
          </div>
        </div>

        {/* Modular Filter Form */}
        <MonitoringFilterForm
          title="Opsi Pencarian"
          namaFilter={namaFilter}
          setNamaFilter={setNamaFilter}
          angkatanFilter={angkatanFilter}
          setAngkatanFilter={setAngkatanFilter}
          availableAngkatan={availableAngkatan}
          onSubmit={handleSearch}
          onReset={handleResetForm}
          loading={loading}
          submitLabel="Lihat Data Piket"
          accentColor="#F97316"
          accentBorderColor="#EA580C"
          accentShadowColor="#C2410C"
          hasActiveFilter={Boolean(namaFilter || angkatanFilter !== 'ALL' || tanggalFilter || hasQueried)}
          extraFilterComponent={
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: isDark ? '#FED7AA' : '#374151'
                  }}
                >
                  Tanggal Piket
                </label>
                {tanggalFilter && (
                  <button
                    type="button"
                    onClick={() => setTanggalFilter('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <X size={12} />
                    Reset Tgl
                  </button>
                )}
              </div>

              {/* Interactive Date Picker Trigger Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '4px 6px',
                  position: 'relative'
                }}
              >
                {/* Stepper Back (only if date selected) */}
                {tanggalFilter && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      shiftDate(-1);
                    }}
                    title="Hari Sebelumnya"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB',
                      backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                      color: isDark ? '#FED7AA' : '#F97316',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                )}

                {/* Date display & trigger native picker */}
                <div
                  onClick={() => {
                    if (dateInputRef.current) {
                      if (typeof dateInputRef.current.showPicker === 'function') {
                        dateInputRef.current.showPicker();
                      } else {
                        dateInputRef.current.focus();
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '6px 4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    minWidth: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <Calendar size={16} color="#F97316" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: tanggalFilter ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280'),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {formatSelectedDate(tanggalFilter)}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#F97316',
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      flexShrink: 0
                    }}
                  >
                    Pilih ▾
                  </span>
                </div>

                {/* Stepper Forward (only if date selected) */}
                {tanggalFilter && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      shiftDate(1);
                    }}
                    title="Hari Berikutnya"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB',
                      backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                      color: isDark ? '#FED7AA' : '#F97316',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                )}

                {/* Hidden native date input that syncs */}
                <input
                  ref={dateInputRef}
                  type="date"
                  value={tanggalFilter}
                  onChange={(e) => setTanggalFilter(e.target.value)}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* Quick shortcut pills */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTanggalFilter(getTodayStr())}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    borderRadius: '8px',
                    backgroundColor: tanggalFilter === getTodayStr() ? '#F97316' : (isDark ? '#1E130C' : '#FFF7ED'),
                    color: tanggalFilter === getTodayStr() ? '#FFFFFF' : '#F97316',
                    border: `1px solid ${tanggalFilter === getTodayStr() ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setTanggalFilter(getYesterdayStr())}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    borderRadius: '8px',
                    backgroundColor: tanggalFilter === getYesterdayStr() ? '#F97316' : (isDark ? '#1E130C' : '#FFF7ED'),
                    color: tanggalFilter === getYesterdayStr() ? '#FFFFFF' : '#F97316',
                    border: `1px solid ${tanggalFilter === getYesterdayStr() ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Kemarin
                </button>
              </div>
            </div>
          }
        />

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

            {/* Resident Cards */}
            {aggregatedUsers.map((person) => {
              return (
                <div
                  key={person.id}
                  style={{
                    backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 14px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top: Avatar, Name, Angkatan */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                          border: '2px solid #F97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#F97316',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          overflow: 'hidden',
                          flexShrink: 0
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

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '0.98rem',
                            fontWeight: 900,
                            color: isDark ? '#FFFFFF' : '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {person.name || person.username}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span
                            style={{
                              backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                              border: '1px solid #F97316',
                              color: '#F97316',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '1px 6px',
                              borderRadius: '8px'
                            }}
                          >
                            Akt {person.angkatan}
                          </span>
                          {person.prodi && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                              {person.prodi.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Metric Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <div
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                        border: `1.5px solid ${isDark ? '#334155' : '#BFDBFE'}`,
                        borderRadius: '10px',
                        padding: '6px 4px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#3B82F6' }}>{person.totalPiket}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#2563EB' }}>TOTAL</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                        border: `1.5px solid ${isDark ? '#047857' : '#A7F3D0'}`,
                        borderRadius: '10px',
                        padding: '6px 4px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10B981' }}>{person.verifiedCount}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#059669' }}>VALID</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                        border: `1.5px solid ${isDark ? '#92400E' : '#FDE68A'}`,
                        borderRadius: '10px',
                        padding: '6px 4px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#F59E0B' }}>{person.pendingCount}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#FCD34D' : '#D97706' }}>PENDING</div>
                    </div>
                  </div>

                  {/* Direct Native Button to Open Detail */}
                  <button
                    type="button"
                    onClick={() => handleGoToDetail(person.id)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      backgroundColor: '#F97316',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 0 #EA580C',
                      transition: 'transform 0.1s ease',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px)';
                      e.currentTarget.style.boxShadow = '0 1px 0 #EA580C';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 3px 0 #EA580C';
                    }}
                  >
                    <span>Lihat Detail Piket</span>
                    <ChevronRight size={16} strokeWidth={3} />
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
