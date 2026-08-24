import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Scale,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Award,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import MonitoringFilterForm from '../components/MonitoringFilterForm';

const AllPersonPoint = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Access state (Only statusPenghuni !== 'CALON')
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Filter States
  const [namaFilter, setNamaFilter] = useState('');
  const [angkatanFilter, setAngkatanFilter] = useState('ALL');
  const [statusPoinFilter, setStatusPoinFilter] = useState('ALL'); // ALL, AMAN, PERHATIAN, KRITIS, PELANGGARAN, PRESTASI

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
      const [usersSnap, historySnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'historyPoint'))
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
          point: typeof uData.point === 'number' ? uData.point : 110,
          pelanggaranCount: 0,
          prestasiCount: 0,
          totalTransactions: 0
        });
      });

      // Count point histories per user
      historySnap.forEach((docSnap) => {
        const hData = docSnap.data();
        let targetUid = null;

        if (hData.userref) {
          if (typeof hData.userref === 'string') {
            targetUid = hData.userref.replace(/^\/?users\//, '');
          } else if (hData.userref.id) {
            targetUid = hData.userref.id;
          } else if (hData.userref.path) {
            const parts = hData.userref.path.split('/');
            targetUid = parts[parts.length - 1];
          }
        }

        if (targetUid && userMap.has(targetUid)) {
          const u = userMap.get(targetUid);
          const pointVal = typeof hData.point === 'number' ? hData.point : Number(hData.point) || 0;
          const isNegative = pointVal < 0 || hData.type === 'pengurangan';

          u.totalTransactions += 1;
          if (isNegative) {
            u.pelanggaranCount += 1;
          } else {
            u.prestasiCount += 1;
          }
        }
      });

      const results = [];
      const queryName = namaFilter.trim().toLowerCase();

      userMap.forEach((user) => {
        const matchesName =
          !queryName ||
          user.username.toLowerCase().includes(queryName) ||
          user.name.toLowerCase().includes(queryName);

        const matchesAngkatan =
          angkatanFilter === 'ALL' || String(user.angkatan).trim() === angkatanFilter.trim();

        // Status Poin Filter
        let matchesStatus = true;
        if (statusPoinFilter === 'AMAN') {
          matchesStatus = user.point >= 100;
        } else if (statusPoinFilter === 'PERHATIAN') {
          matchesStatus = user.point >= 75 && user.point < 100;
        } else if (statusPoinFilter === 'KRITIS') {
          matchesStatus = user.point < 75;
        } else if (statusPoinFilter === 'PELANGGARAN') {
          matchesStatus = user.pelanggaranCount > 0;
        } else if (statusPoinFilter === 'PRESTASI') {
          matchesStatus = user.prestasiCount > 0;
        }

        if (matchesName && matchesAngkatan && matchesStatus) {
          results.push(user);
        }
      });

      // Sort by point ascending (lowest points first so critical ones stand out)
      results.sort((a, b) => a.point - b.point || a.name.localeCompare(b.name));

      setAggregatedUsers(results);
    } catch (err) {
      console.error('Error querying point monitoring:', err);
      alert('Gagal memuat data poin: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setNamaFilter('');
    setAngkatanFilter('ALL');
    setStatusPoinFilter('ALL');
    setHasQueried(false);
    setAggregatedUsers([]);
  };

  const handleGoToDetail = (personId) => {
    navigate(`/detail-person-point?userId=${personId}`);
  };

  const getPointColor = (point) => {
    if (point >= 100) return '#10B981'; // Green
    if (point >= 75) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getPointBadgeLabel = (point) => {
    if (point >= 100) return 'Aman 🟢';
    if (point >= 75) return 'Perlu Perhatian 🟡';
    return 'Kritis! 🔴';
  };

  // RESTRICTED ACCESS SCREEN FOR CALON
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
          padding: '20px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '36px 20px',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FEE2E2'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
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
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Dibatasi
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Fitur <b>Monitoring Poin Penghuni</b> hanya dapat diakses oleh penghuni tetap asrama (bukan calon penghuni).
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: '2px solid #D97706',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #D97706'
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
            color: isDark ? '#F59E0B' : '#4B5563',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '0.88rem',
            marginBottom: '16px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
            padding: '7px 14px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FEF08A'
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
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
            borderTop: '8px solid #F59E0B',
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FEF08A',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                border: '2px solid #F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}
            >
              🏆
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
                Monitoring Poin Penghuni
              </h1>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isDark ? '#FED7AA' : '#6B7280'
                }}
              >
                Pantau poin kelayakan huni seluruh asrama
              </p>
            </div>
          </div>
        </div>

        {/* Modular Filter Form Component */}
        <MonitoringFilterForm
          title="Opsi Pencarian Poin"
          namaFilter={namaFilter}
          setNamaFilter={setNamaFilter}
          angkatanFilter={angkatanFilter}
          setAngkatanFilter={setAngkatanFilter}
          availableAngkatan={availableAngkatan}
          onSubmit={handleSearch}
          onReset={handleResetForm}
          loading={loading}
          submitLabel="Lihat Data Poin"
          accentColor="#F59E0B"
          accentBorderColor="#D97706"
          accentShadowColor="#B45309"
          hasActiveFilter={Boolean(namaFilter || angkatanFilter !== 'ALL' || statusPoinFilter !== 'ALL' || hasQueried)}
          extraFilterComponent={
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: isDark ? '#FED7AA' : '#374151',
                  marginBottom: '5px'
                }}
              >
                Status Kelayakan
              </label>
              <div style={{ position: 'relative' }}>
                <Scale
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    pointerEvents: 'none'
                  }}
                />
                <select
                  value={statusPoinFilter}
                  onChange={(e) => setStatusPoinFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 8px 11px 34px',
                    borderRadius: '12px',
                    border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    color: isDark ? '#FFFFFF' : '#111827',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="AMAN">Poin Aman (≥100) 🟢</option>
                  <option value="PERHATIAN">Perhatian (75-99) 🟡</option>
                  <option value="KRITIS">Poin Kritis (&lt;75) 🔴</option>
                  <option value="PELANGGARAN">Punya Pelanggaran ⚠️</option>
                  <option value="PRESTASI">Punya Prestasi 🏆</option>
                </select>
              </div>
            </div>
          }
        />

        {/* Results Section */}
        {!hasQueried ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '20px',
              padding: '32px 16px',
              textAlign: 'center',
              border: `2px dashed ${isDark ? '#4A2E1E' : '#FEF08A'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEF08A'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                marginBottom: '12px',
                border: '2px solid #F59E0B'
              }}
            >
              🔍
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              Belum Ada Data yang Ditampilkan
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.4 }}>
              Pilih filter di atas lalu klik tombol <b>"Lihat Data Poin"</b>.
            </p>
          </div>
        ) : loading ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 16px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEF08A'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '36px',
                height: '36px',
                border: '4px solid #F59E0B',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '12px'
              }}
            />
            <h3 style={{ margin: 0, color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800, fontSize: '1rem' }}>
              Mengambil Data Poin Penghuni...
            </h3>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : aggregatedUsers.length === 0 ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '20px',
              padding: '32px 16px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEE2E2'
            }}
          >
            <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🍂</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              Tidak Ditemukan Data
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
              Tidak ada penghuni yang cocok dengan filter pencarian.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 900, color: isDark ? '#FED7AA' : '#374151' }}>
                Daftar Poin Penghuni ({aggregatedUsers.length})
              </span>
            </div>

            {/* Resident Point Cards */}
            {aggregatedUsers.map((person) => {
              const isKritis = person.point < 75;

              return (
                <div
                  key={person.id}
                  style={{
                    backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                    borderRadius: '18px',
                    padding: '14px 14px',
                    border: `2px solid ${
                      isKritis ? '#EF4444' : isDark ? '#4A2E1E' : '#FEF08A'
                    }`,
                    boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEF08A',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top: Avatar, Name & Score Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                          border: `2px solid ${getPointColor(person.point)}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: getPointColor(person.point),
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
                              backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                              border: '1px solid #F59E0B',
                              color: '#D97706',
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

                    {/* Point score Pill */}
                    <div
                      style={{
                        textAlign: 'right',
                        backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                        padding: '5px 10px',
                        borderRadius: '10px',
                        border: `1.5px solid ${getPointColor(person.point)}`,
                        flexShrink: 0
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: getPointColor(person.point), lineHeight: 1.1 }}>
                        {person.point} <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>Poin</span>
                      </div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: '2px' }}>
                        {getPointBadgeLabel(person.point)}
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
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#3B82F6' }}>
                        {person.totalTransactions}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#2563EB' }}>
                        TOTAL
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                        border: `1.5px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
                        borderRadius: '10px',
                        padding: '6px 4px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#EF4444' }}>
                        {person.pelanggaranCount}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#FCA5A5' : '#DC2626' }}>
                        MINUS
                      </div>
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
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10B981' }}>
                        {person.prestasiCount}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#059669' }}>
                        PLUS
                      </div>
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
                      backgroundColor: '#F59E0B',
                      border: 'none',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 0 #D97706',
                      transition: 'transform 0.1s ease',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px)';
                      e.currentTarget.style.boxShadow = '0 1px 0 #D97706';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 3px 0 #D97706';
                    }}
                  >
                    <span>Riwayat & Detail Poin</span>
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

export default AllPersonPoint;
