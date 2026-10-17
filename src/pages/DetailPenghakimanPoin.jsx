import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import {
  ArrowLeft,
  Scale,
  Sparkles,
  Tag,
  Layers,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  BookOpen,
  Search,
  X,
  Target
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DetailPenghakimanPoin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const historyId = searchParams.get('id');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Access & Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Target Resident & Original Data
  const [originalHistory, setOriginalHistory] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [judgeUser, setJudgeUser] = useState(null);

  // Form States (pre-filled with current data)
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('RINGAN');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [point, setPoint] = useState(0);
  const [target, setTarget] = useState('Seluruh penghuni');
  const [timestamp, setTimestamp] = useState('');
  const [pointRefId, setPointRefId] = useState('');

  // Master system points for optional quick rule switch
  const [allSystemPoints, setAllSystemPoints] = useState([]);
  const [showRulePicker, setShowRulePicker] = useState(false);
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');

  // 1. Auth & Permission Check
  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        setIsAuthorized(false);
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
          const cleanJabatan = (uData.jabatan || '').toLowerCase().replace(/\s+/g, '').trim();
          setUserRole(uData.jabatan || '');

          const allowedJabatan = ['kepenghunian', 'presiden', 'wakilpresiden', 'wapres'];
          const allowed = allowedJabatan.includes(cleanJabatan);

          if (allowed) {
            setIsAuthorized(true);
            await loadHistoryAndUserData();
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error verifying authorization:', err);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [historyId]);

  // Helper to extract doc id
  const extractId = (ref, prefix) => {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return ref.replace(new RegExp(`^/?${prefix}/`), '');
    }
    if (ref.id) return ref.id;
    if (ref.path) return ref.path.split('/').pop();
    return null;
  };

  // 2. Load History, User, and System Points
  const loadHistoryAndUserData = async () => {
    if (!historyId) {
      alert('ID riwayat poin tidak valid.');
      navigate('/list-penghakiman-poin', { replace: true });
      return;
    }

    try {
      const historyDocRef = doc(db, 'historyPoint', historyId);
      const historySnap = await getDoc(historyDocRef);

      if (!historySnap.exists()) {
        alert('Data riwayat poin tidak ditemukan di database.');
        navigate('/list-penghakiman-poin', { replace: true });
        return;
      }

      const hData = historySnap.data();
      setOriginalHistory(hData);

      // Pre-fill form state with current data
      setCode(hData.code || '');
      setCategory((hData.category || 'RINGAN').toUpperCase());
      setName(hData.name || '');
      setDesc(hData.desc || '');
      setPoint(typeof hData.point === 'number' ? hData.point : 0);
      setTarget(hData.target || 'Seluruh penghuni');

      // Pre-fill timestamp
      if (hData.timestamp) {
        const d = hData.timestamp.toDate ? hData.timestamp.toDate() : new Date(hData.timestamp);
        if (!isNaN(d.getTime())) {
          // Format for datetime-local: YYYY-MM-DDTHH:mm
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setTimestamp(localIso);
        }
      }

      // Fetch linked target user
      const uId = extractId(hData.userref, 'users');
      setTargetUserId(uId || '');
      if (uId) {
        const targetSnap = await getDoc(doc(db, 'users', uId));
        if (targetSnap.exists()) {
          setTargetUser({ id: uId, ...targetSnap.data() });
        }
      }

      // Fetch linked judge user
      const jId = extractId(hData.whoJudge, 'users');
      if (jId) {
        const judgeSnap = await getDoc(doc(db, 'users', jId));
        if (judgeSnap.exists()) {
          setJudgeUser({ id: jId, ...judgeSnap.data() });
        }
      }

      // Fetch linked system point ID
      const pId = extractId(hData.pointref, 'systemPoint');
      setPointRefId(pId || '');

      // Also load all system points in background for rule switcher
      const sysSnap = await getDocs(collection(db, 'systemPoint'));
      const sysList = [];
      sysSnap.forEach((d) => sysList.push({ id: d.id, ...d.data() }));
      sysList.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      setAllSystemPoints(sysList);
    } catch (err) {
      console.error('Error loading history point:', err);
      alert('Gagal memuat detail riwayat poin.');
      navigate('/list-penghakiman-poin');
    }
  };

  // Category Styling Helper
  const getCategoryColor = (cat) => {
    const c = (cat || '').toUpperCase();
    if (c === 'BERAT') return { bg: isDark ? '#4C1D1D' : '#FEE2E2', border: '#EF4444', text: '#EF4444' };
    if (c === 'SEDANG') return { bg: isDark ? '#452A14' : '#FFEDD5', border: '#F97316', text: '#EA580C' };
    if (c === 'RINGAN') return { bg: isDark ? '#3D2F14' : '#FEF9C3', border: '#EAB308', text: '#CA8A04' };
    if (c === 'PRESTASI') return { bg: isDark ? '#143823' : '#DCFCE7', border: '#22C55E', text: '#16A34A' };
    return { bg: isDark ? '#2D1D13' : '#F3F4F6', border: '#9CA3AF', text: isDark ? '#FED7AA' : '#4B5563' };
  };

  // Pick rule from master systemPoint
  const handleSelectSystemPoint = (sys) => {
    setCode(sys.code || '');
    setCategory((sys.category || 'RINGAN').toUpperCase());
    setName(sys.name || '');
    setDesc(sys.desc || '');
    setPoint(typeof sys.point === 'number' ? sys.point : 0);
    setTarget(sys.target || 'Seluruh penghuni');
    setPointRefId(sys.id);
    setShowRulePicker(false);
  };

  // Calculations for Point Preview
  const currentResidentScore = typeof targetUser?.point === 'number' ? targetUser.point : 110;
  const originalPointVal = typeof originalHistory?.point === 'number' ? originalHistory.point : 0;
  const numPoint = Number(point) || 0;
  const pointDelta = numPoint - originalPointVal;
  const projectedScore = Math.min(110, Math.max(0, currentResidentScore + pointDelta));

  // 3. Confirm Edit / Save Handler
  const handleConfirmEdit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Harap masukkan nama pasal/pelanggaran.');
      return;
    }

    if (isNaN(numPoint)) {
      alert('Nilai poin harus berupa angka valid.');
      return;
    }

    const confirmMsg = `Konfirmasi pembaruan riwayat poin?\n- Poin awal: ${originalPointVal}\n- Poin baru: ${numPoint}\n- Selisih: ${pointDelta > 0 ? '+' : ''}${pointDelta}\n- Proyeksi total skor ${targetUser?.name || 'santri'}: ${currentResidentScore} ➔ ${projectedScore} Poin.`;
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      // 1. Update historyPoint doc
      const historyRef = doc(db, 'historyPoint', historyId);
      const updateData = {
        code: code.trim(),
        category: category.trim().toUpperCase(),
        name: name.trim(),
        desc: desc.trim(),
        point: numPoint,
        type: numPoint < 0 ? 'pengurangan' : 'penambahan',
        target: target.trim() || 'Seluruh penghuni',
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: doc(db, 'users', auth.currentUser ? auth.currentUser.uid : 'staff')
      };

      if (timestamp) {
        updateData.timestamp = new Date(timestamp).toISOString();
      }

      if (pointRefId) {
        updateData.pointref = doc(db, 'systemPoint', pointRefId);
      }

      await updateDoc(historyRef, updateData);

      // 2. Adjust target user total point in `users` collection if point changed
      if (pointDelta !== 0 && targetUserId) {
        const userDocRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const latestScore = userSnap.data().point ?? 110;
          const newTotalScore = Math.min(110, Math.max(0, latestScore + pointDelta));
          await updateDoc(userDocRef, { point: newTotalScore });
        }
      }

      alert('Riwayat poin berhasil diperbarui dan skor santri telah disesuaikan!');
      navigate('/list-penghakiman-poin');
    } catch (err) {
      console.error('Error confirming point edit:', err);
      alert('Terjadi kesalahan saat menyimpan perubahan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: isDark ? '#1E130C' : '#FFF9F5',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#F97316',
          fontWeight: 800,
          fontFamily: '"Nunito", "Inter", sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
          <span style={{ fontSize: '1.05rem' }}>Memuat Detail Riwayat Poin...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div
        style={{
          background: isDark ? '#1E130C' : '#FFF9F5',
          minHeight: '100vh',
          fontFamily: '"Nunito", "Inter", sans-serif',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '28px',
            padding: '36px 24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FECACA'}`,
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#4C1D1D' : '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '2px solid #EF4444'
            }}
          >
            <Scale size={34} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Ditolak 🔒
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: 650, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Halaman ini <strong>hanya dapat diakses oleh jabatan Kepenghunian, Presiden, atau Wakil Presiden</strong>. Jabatan Anda saat ini: <strong>{userRole || 'Umum'}</strong>.
          </p>
          <button
            onClick={() => navigate('/list-penghakiman-poin')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C'
            }}
          >
            Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  const filteredMasterRules = allSystemPoints.filter((sp) => {
    if (!ruleSearchQuery.trim()) return true;
    const q = ruleSearchQuery.toLowerCase().trim();
    return (
      (sp.code || '').toLowerCase().includes(q) ||
      (sp.name || '').toLowerCase().includes(q) ||
      (sp.category || '').toLowerCase().includes(q) ||
      (sp.desc || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        fontFamily: '"Nunito", "Inter", sans-serif',
        padding: '1.75rem 1.25rem 120px 1.25rem',
        maxWidth: '480px',
        margin: '0 auto',
        boxSizing: 'border-box',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/list-penghakiman-poin')}
          style={{
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderRadius: '14px',
            padding: '9px',
            cursor: 'pointer',
            color: '#F97316',
            boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none'
          }}
        >
          <ArrowLeft size={19} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#F97316', margin: 0 }}>
            Detail & Edit Poin
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '2px 0 0 0', fontWeight: 650, fontSize: '0.82rem' }}>
            Perbarui data poin dan penyesuaian skor
          </p>
        </div>
      </div>

      <form onSubmit={handleConfirmEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* TARGET RESIDENT PROFILE CARD (READ ONLY) */}
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '22px',
            padding: '16px 18px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              👤 Santri Penerima Poin
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#3D291C' : '#FEF3C7',
                color: '#D97706'
              }}
            >
              Tidak Dapat Diubah
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FDE047'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              {targetUser?.fotoProfil ? (
                <img src={targetUser.fotoProfil} alt="Foto Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.3rem' }}>👤</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                {targetUser?.name || targetUser?.username || 'Penghuni'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 650 }}>
                @{targetUser?.username || 'user'} {targetUser?.nim ? `| NIM: ${targetUser.nim}` : ''} {targetUser?.angkatan ? `| ' ${targetUser.angkatan}` : ''}
              </p>
            </div>

            <div
              style={{
                padding: '6px 10px',
                borderRadius: '12px',
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFDBB5'}`,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.65rem', color: isDark ? '#FED7AA' : '#9CA3AF', fontWeight: 800 }}>SKOR SAAT INI</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#F97316' }}>
                {currentResidentScore} <span style={{ fontSize: '0.7rem' }}>/ 110</span>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK OPTION: SWITCH TO MASTER SYSTEM RULE */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowRulePicker(true)}
            style={{
              background: 'none',
              border: `1.5px dashed ${isDark ? '#4A2E1E' : '#FB923C'}`,
              borderRadius: '12px',
              padding: '7px 12px',
              color: '#F97316',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={14} />
            <span>Pilih dari Master Aturan Poin</span>
          </button>
        </div>

        {/* FORM INPUTS */}
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '22px',
            padding: '20px 18px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* 1. Kode Poin & Kategori */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
                Kode Poin
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: B-01, P-02"
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: '14px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: '14px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              >
                <option value="BERAT">BERAT (Pelanggaran)</option>
                <option value="SEDANG">SEDANG (Pelanggaran)</option>
                <option value="RINGAN">RINGAN (Pelanggaran)</option>
                <option value="PRESTASI">PRESTASI (Penambahan)</option>
              </select>
            </div>
          </div>

          {/* 2. Nama Pelanggaran / Prestasi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
              Nama Pelanggaran / Prestasi *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Terlambat Apel Malam, Juara Lomba"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1F2937',
                fontWeight: 750,
                fontSize: '0.92rem',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {/* 3. Deskripsi Detail */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
              Deskripsi / Keterangan
            </label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Penjelasan detail pasal atau catatan pelanggaran..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1F2937',
                fontWeight: 650,
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif'
              }}
            />
          </div>

          {/* 4. Nilai Poin (+ / -) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151' }}>
                Nilai Poin (Gunakan minus untuk pengurangan)
              </label>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: numPoint < 0 ? (isDark ? '#4C1D1D' : '#FEE2E2') : (isDark ? '#143823' : '#DCFCE7'),
                  color: numPoint < 0 ? '#EF4444' : '#10B981'
                }}
              >
                {numPoint < 0 ? 'Pengurangan Poin (-)' : 'Penambahan Poin (+)'}
              </span>
            </div>

            <input
              type="number"
              value={point}
              onChange={(e) => setPoint(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `2px solid ${numPoint < 0 ? '#EF4444' : '#10B981'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: numPoint < 0 ? '#EF4444' : '#10B981',
                fontWeight: 900,
                fontSize: '1.25rem',
                boxSizing: 'border-box',
                outline: 'none',
                textAlign: 'center'
              }}
            />

            {/* Quick Adjustment Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
              {[-20, -15, -10, -5, +5, +10, +15].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPoint(val)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: `1px solid ${val < 0 ? '#EF4444' : '#10B981'}`,
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    color: val < 0 ? '#EF4444' : '#10B981'
                  }}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Target & Tanggal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
                Target Berlakunya
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Seluruh penghuni"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#374151', marginBottom: '5px' }}>
                Waktu Transaksi
              </label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* REAL-TIME SCORE IMPACT PREVIEW BOX */}
        <div
          style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            borderRadius: '20px',
            padding: '16px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFDBB5'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316', fontWeight: 800, fontSize: '0.88rem' }}>
            <Scale size={18} />
            <span>Simulasi Perubahan Skor Santri</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div style={{ padding: '8px', backgroundColor: isDark ? '#2D1D13' : '#FFFFFF', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: isDark ? '#FED7AA' : '#9CA3AF', fontWeight: 800 }}>POIN AWAL</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: originalPointVal < 0 ? '#EF4444' : '#10B981' }}>
                {originalPointVal > 0 ? '+' : ''}{originalPointVal}
              </div>
            </div>

            <div style={{ padding: '8px', backgroundColor: isDark ? '#2D1D13' : '#FFFFFF', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: isDark ? '#FED7AA' : '#9CA3AF', fontWeight: 800 }}>POIN BARU</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: numPoint < 0 ? '#EF4444' : '#10B981' }}>
                {numPoint > 0 ? '+' : ''}{numPoint}
              </div>
            </div>

            <div style={{ padding: '8px', backgroundColor: isDark ? '#2D1D13' : '#FFFFFF', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: isDark ? '#FED7AA' : '#9CA3AF', fontWeight: 800 }}>SELISIH (DELTA)</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: pointDelta > 0 ? '#10B981' : pointDelta < 0 ? '#EF4444' : '#9CA3AF' }}>
                {pointDelta > 0 ? `+${pointDelta}` : pointDelta}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 750,
              color: isDark ? '#FED7AA' : '#4B5563',
              lineHeight: 1.45
            }}
          >
            Total skor <strong>{targetUser?.name || 'santri'}</strong> akan disesuaikan:
            <br />
            Dari <strong>{currentResidentScore} Poin</strong> ➔{' '}
            <strong style={{ color: '#F97316', fontSize: '0.9rem' }}>{projectedScore} Poin</strong>{' '}
            (Ketetapan asrama: min 0, maks 110 poin).
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate('/list-penghakiman-poin')}
            style={{
              padding: '14px',
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              color: isDark ? '#FED7AA' : '#6B7280',
              border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              borderRadius: '16px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              outline: 'none'
            }}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '14px',
              backgroundColor: '#F97316',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '16px',
              fontSize: '0.95rem',
              fontWeight: 900,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              outline: 'none'
            }}
          >
            <CheckCircle2 size={18} strokeWidth={2.5} />
            <span>{submitting ? 'Menyimpan...' : 'Konfirmasi Edit'}</span>
          </button>
        </div>
      </form>

      {/* MASTER SYSTEM POINT PICKER MODAL */}
      {showRulePicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
          onClick={() => setShowRulePicker(false)}
        >
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316', fontWeight: 900, fontSize: '1rem' }}>
                <BookOpen size={18} />
                <span>Pilih dari Master Aturan Poin</span>
              </div>
              <button
                onClick={() => setShowRulePicker(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search rule */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                placeholder="Cari kode (B-01), kategori, pasal..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 34px',
                  borderRadius: '12px',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* List of system points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '50vh' }}>
              {filteredMasterRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  Tidak ada aturan poin yang sesuai.
                </div>
              ) : (
                filteredMasterRules.map((sys) => {
                  const isNeg = (sys.point || 0) < 0;
                  const catStyle = getCategoryColor(sys.category);
                  return (
                    <div
                      key={sys.id}
                      onClick={() => handleSelectSystemPoint(sys)}
                      style={{
                        padding: '12px',
                        borderRadius: '14px',
                        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
                        border: `1.5px solid ${isDark ? '#3D291C' : '#FFEDD5'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#3D291C' : '#FFEDD5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#1E130C' : '#FFF9F5'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {sys.code && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F97316', color: 'white' }}>
                              {sys.code}
                            </span>
                          )}
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', padding: '1px 5px', borderRadius: '4px', backgroundColor: catStyle.bg, color: catStyle.text }}>
                            {sys.category}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isNeg ? '#EF4444' : '#10B981' }}>
                          {isNeg ? '' : '+'}{sys.point} Poin
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                        {sys.name}
                      </div>
                      {sys.desc && (
                        <div style={{ fontSize: '0.72rem', color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.3 }}>
                          {sys.desc}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPenghakimanPoin;
