import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Check, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  Eye,
  ImageIcon,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  ExternalLink,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Lock,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logToGoogleSheets, formatVerificationData } from '../context/sheetsService';

const DEFAULT_SPREADSHEET_LINK = "https://docs.google.com/spreadsheets/d/1wq1hgs4hcorAGDgNIUpXkWj3Mn7Crd7a/edit?usp=drivesdk&ouid=106100032729984546553&rtpof=true&sd=true";
const ALLOWED_ROLES = ['bendahara', 'sekretaris', 'wakil presiden', 'wapres', 'presiden'];

const AcceptingSpa = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentUserData, setCurrentUserData] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data & Spreadsheet state
  const [allPayments, setAllPayments] = useState([]);
  const [spreadsheetData, setSpreadsheetData] = useState({
    header: "Link Spreadsheet SPA",
    link: DEFAULT_SPREADSHEET_LINK
  });

  // Filters & Search
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAngkatan, setSelectedAngkatan] = useState('ALL');
  const [selectedStatusBayar, setSelectedStatusBayar] = useState('ALL'); // 'ALL' | 'lunas' | 'cicil'
  const [selectedTahun, setSelectedTahun] = useState('ALL');

  // Modal states
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);

  // Check if current logged in user has approval (write) privilege
  const userRole = (currentUserData?.jabatan || '').toLowerCase().trim();
  const isBendahara = userRole === 'bendahara';

  // 1. Check user authorization
  useEffect(() => {
    const authorizeUser = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setCurrentUserData(uData);
          const role = (uData.jabatan || '').toLowerCase().trim();
          if (ALLOWED_ROLES.includes(role)) {
            setAuthorized(true);
            await Promise.all([
              fetchAllPayments(),
              fetchSpreadsheetLink()
            ]);
          } else {
            setAuthorized(false);
            setLoading(false);
          }
        } else {
          setAuthorized(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error authorizing user:", error);
        setAuthorized(false);
        setLoading(false);
      }
    };
    authorizeUser();
  }, []);

  // 2. Fetch Spreadsheet link from Firestore collection 'databaseSPA'
  const fetchSpreadsheetLink = async () => {
    try {
      const dbSpaRef = collection(db, 'databaseSPA');
      // Query where about == 'SPA'
      const q = query(dbSpaRef, where('about', '==', 'SPA'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setSpreadsheetData({
          header: docData.header || "Link Spreadsheet SPA",
          link: docData.link || DEFAULT_SPREADSHEET_LINK
        });
        return;
      }

      // Fallback query all docs in databaseSPA
      const allDocsSnap = await getDocs(dbSpaRef);
      if (!allDocsSnap.empty) {
        const docData = allDocsSnap.docs[0].data();
        setSpreadsheetData({
          header: docData.header || "Link Spreadsheet SPA",
          link: docData.link || DEFAULT_SPREADSHEET_LINK
        });
        return;
      }
    } catch (err) {
      console.warn("Could not fetch databaseSPA, using default link:", err);
    }
  };

  // 3. Fetch all SPA payments (all verification statuses)
  const fetchAllPayments = async () => {
    setLoading(true);
    try {
      // Lookup map for users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnap.forEach(d => {
        usersMap[d.id] = { id: d.id, ...d.data() };
      });

      // Fetch all Spa submissions
      const spaSnap = await getDocs(collection(db, 'Spa'));
      const list = [];

      spaSnap.forEach(d => {
        const data = d.data();
        // Check if tipe is 'form' or if it contains payment data
        if (data.tipe === 'form' || data.bukti || data.statusBayar || data.bulan) {
          // Resolve author ID
          let authorId = '';
          if (data.author) {
            if (typeof data.author === 'string') {
              if (data.author.startsWith('/users/')) {
                authorId = data.author.split('/')[2];
              } else {
                authorId = data.author;
              }
            } else if (data.author.id) {
              authorId = data.author.id;
            } else if (data.author.path) {
              const parts = data.author.path.split('/');
              authorId = parts[parts.length - 1];
            }
          }

          const authorInfo = usersMap[authorId] || {
            username: data.authorName || 'Siswa Asrama',
            angkatan: data.angkatan || '?',
            jabatan: data.jabatan || 'Warga'
          };

          // Standardize verification status boolean
          const isVerified = data.verification === true;

          list.push({
            id: d.id,
            ...data,
            authorInfo,
            isVerified
          });
        }
      });

      // Sort newest first
      list.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });

      setAllPayments(list);
    } catch (error) {
      console.error("Error fetching SPA payments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAllPayments(),
      fetchSpreadsheetLink()
    ]);
  };

  // 4. Verification action (Only Bendahara is permitted to accept/verify)
  const handleAcceptPayment = async (payId) => {
    if (!isBendahara) {
      alert("Akses Ditolak: Hanya Bendahara yang berwenang menyetujui / memverifikasi pembayaran SPA. Peran Anda saat ini adalah Monitoring (Read-Only).");
      return;
    }

    setSubmitting(true);
    try {
      const payment = allPayments.find(p => p.id === payId);
      const docRef = doc(db, 'Spa', payId);
      
      await updateDoc(docRef, {
        verification: true
      });

      // Log to Google Sheets
      if (auth.currentUser && payment) {
        const bulanFormatted = Array.isArray(payment.bulan) ? payment.bulan.join(', ') : (payment.bulan || '-');
        const formattedData = formatVerificationData('spa', {
          kategori: `SPA ${bulanFormatted}`,
          deskripsi: `Pembayaran SPA Bulan ${bulanFormatted} (${payment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil'})`,
          pengusulName: payment.authorInfo?.username || payment.authorName || '-',
          statusPersetujuan: 'Disetujui',
          timestamp: payment.tanggalPelaporan || new Date().toISOString(),
          id: payId
        });
        logToGoogleSheets({
          type: 'spa',
          verificationData: formattedData,
          verifierName: currentUserData?.username || auth.currentUser.displayName || auth.currentUser.email || 'Bendahara',
          verifierId: auth.currentUser.uid
        }).catch(err => console.warn('Sheets logging error:', err));
      }

      alert("Pembayaran SPA berhasil diverifikasi oleh Bendahara!");
      
      // Update local state
      setAllPayments(prev => prev.map(p => {
        if (p.id === payId) {
          return { ...p, verification: true, isVerified: true };
        }
        return p;
      }));

      if (selectedPayment && selectedPayment.id === payId) {
        setSelectedPayment(prev => ({ ...prev, verification: true, isVerified: true }));
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Gagal memverifikasi pembayaran. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return String(ts);
    }
  };

  const formatBulanDisplay = (bulanData) => {
    if (!bulanData) return '-';
    if (Array.isArray(bulanData)) {
      if (bulanData.length === 0) return '-';
      return bulanData.join(', ');
    }
    return String(bulanData);
  };

  // Dynamic filter lists
  const availableAngkatan = Array.from(
    new Set(allPayments.map(p => String(p.authorInfo?.angkatan || '')).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const availableTahun = Array.from(
    new Set(allPayments.map(p => String(p.tahun || '')).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  // Filtered Payments
  const filteredPayments = allPayments.filter(item => {
    // Tab filter
    if (statusTab === 'PENDING' && item.isVerified) return false;
    if (statusTab === 'VERIFIED' && !item.isVerified) return false;

    // Search query (username, name, angkatan)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const uName = (item.authorInfo?.username || '').toLowerCase();
      const angk = String(item.authorInfo?.angkatan || '').toLowerCase();
      const thn = String(item.tahun || '').toLowerCase();
      const bln = Array.isArray(item.bulan) ? item.bulan.join(' ').toLowerCase() : String(item.bulan || '').toLowerCase();
      if (!uName.includes(q) && !angk.includes(q) && !thn.includes(q) && !bln.includes(q)) {
        return false;
      }
    }

    // Angkatan filter
    if (selectedAngkatan !== 'ALL' && String(item.authorInfo?.angkatan) !== selectedAngkatan) {
      return false;
    }

    // Status Bayar filter (lunas / cicil)
    if (selectedStatusBayar !== 'ALL') {
      const payStatus = (item.statusBayar || '').toLowerCase();
      if (selectedStatusBayar === 'lunas' && payStatus !== 'lunas') return false;
      if (selectedStatusBayar === 'cicil' && payStatus === 'lunas') return false;
    }

    // Tahun filter
    if (selectedTahun !== 'ALL' && String(item.tahun) !== selectedTahun) {
      return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = allPayments.length;
  const pendingCount = allPayments.filter(p => !p.isVerified).length;
  const verifiedCount = allPayments.filter(p => p.isVerified).length;
  const lunasCount = allPayments.filter(p => (p.statusBayar || '').toLowerCase() === 'lunas').length;
  const cicilCount = totalCount - lunasCount;

  // Render Loading Screen
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        fontFamily: '"Nunito", "Inter", sans-serif',
        color: '#F97316'
      }}>
        <div style={{
          border: '6px solid #FFF7ED',
          borderTop: '6px solid #F97316',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <span style={{ fontWeight: 800 }}>Memeriksa Otorisasi Pengurus...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Access Denied Screen for Unauthorized users
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
            <ShieldAlert size={48} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Dibatasi 🛡️
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Halaman Monitoring SPA ini khusus untuk pengguna dengan jabatan <strong>Bendahara</strong>, <strong>Sekretaris</strong>, <strong>Wakil Presiden</strong>, atau <strong>Presiden</strong>.
          </p>
          <div style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#F97316'
          }}>
            Jabatan Anda: {currentUserData?.jabatan || 'Warga/Penghuni'}
          </div>
          <button
            onClick={() => navigate('/spa')}
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
              transition: 'all 0.1s',
              outline: 'none',
              marginTop: '6px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
            }}
          >
            Kembali ke SPA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      padding: '2rem 1.5rem 80px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '520px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease'
    }}>

      {/* Header Page */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '12px', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={() => navigate('/spa')}
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
              transition: 'all 0.1s',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#F97316',
                margin: 0
              }}>
                Monitoring SPA
              </h1>
              <ShieldCheck size={22} color="#EAB308" strokeWidth={2.5} />
            </div>
            <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '2px 0 0 0', fontWeight: 700, fontSize: '0.8rem' }}>
              Status Pembayaran & Rekap
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Segarkan Data"
          style={{
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
            borderRadius: '16px',
            padding: '10px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            color: '#F97316',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            if (!refreshing) {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5';
            }
          }}
          onMouseUp={(e) => {
            if (!refreshing) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
            }
          }}
        >
          <RotateCcw size={18} strokeWidth={2.5} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Role Badge Indicator with Clear Permission Note */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        borderRadius: '18px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        marginBottom: '18px',
        boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>{isBendahara ? '🛡️' : '👁️'}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              Peran: <span style={{ color: '#F97316', textTransform: 'capitalize' }}>{currentUserData?.jabatan || 'Pengurus'}</span>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isBendahara ? '#10B981' : '#6B7280' }}>
              {isBendahara ? '✅ Akses Verifikasi & Monitoring' : '🔍 Mode Monitoring (Read-Only)'}
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
          color: '#F97316',
          padding: '4px 10px',
          borderRadius: '10px',
          border: '1px solid #F97316',
          flexShrink: 0
        }}>
          {currentUserData?.username || 'User'}
        </span>
      </div>

      {/* 📊 SPREADSHEET QUICK ACTION CARD (From databaseSPA) */}
      <div 
        onClick={() => window.open(spreadsheetData.link, '_blank', 'noopener,noreferrer')}
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' 
            : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          border: '2.5px solid #047857',
          borderRadius: '24px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: isDark ? '0 6px 0 #022C22' : '0 6px 0 #047857',
          marginBottom: '20px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0px)'}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'translateY(2px)';
          e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #022C22' : '0 2px 0 #047857';
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark ? '0 6px 0 #022C22' : '0 6px 0 #047857';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            color: '#059669',
            padding: '10px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
          }}>
            <FileSpreadsheet size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#FFFFFF' }}>
              {spreadsheetData.header || "Buka Spreadsheet SPA"}
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#D1FAE5' }}>
              Akses & kelola data rekap spreadsheet resmi
            </p>
          </div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: '#FFFFFF',
          padding: '8px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ExternalLink size={18} strokeWidth={2.5} />
        </div>
      </div>

      {/* 📈 SUMMARY STATS METRICS (Duolingo 3D Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {/* Total */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          border: `2px solid ${isDark ? '#4A2E1E' : '#E0E7FF'}`,
          borderRadius: '20px',
          padding: '12px 10px',
          textAlign: 'center',
          boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #E0E7FF'
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>Total</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            {totalCount}
          </h3>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF' }}>Pengajuan</span>
        </div>

        {/* Menunggu */}
        <div 
          onClick={() => setStatusTab('PENDING')}
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${statusTab === 'PENDING' ? '#F97316' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
            borderRadius: '20px',
            padding: '12px 10px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
            transition: 'transform 0.1s'
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase' }}>Menunggu</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#F97316' }}>
            {pendingCount}
          </h3>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF' }}>Perlu dicek</span>
        </div>

        {/* Terverifikasi */}
        <div 
          onClick={() => setStatusTab('VERIFIED')}
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${statusTab === 'VERIFIED' ? '#10B981' : (isDark ? '#4A2E1E' : '#D1FAE5')}`,
            borderRadius: '20px',
            padding: '12px 10px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #D1FAE5',
            transition: 'transform 0.1s'
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Disetujui</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#10B981' }}>
            {verifiedCount}
          </h3>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF' }}>Selesai</span>
        </div>
      </div>

      {/* 🔍 SEARCH AND FILTERS */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '24px',
        padding: '16px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Search input */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={18} color="#F97316" style={{ position: 'absolute', left: '14px' }} />
          <input
            type="text"
            placeholder="Cari nama siswa, angkatan, atau bulan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '16px',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontFamily: '"Nunito", "Inter", sans-serif',
              fontWeight: 700,
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Semua, Menunggu, Terverifikasi) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'ALL', label: `Semua (${totalCount})` },
            { key: 'PENDING', label: `Menunggu (${pendingCount})` },
            { key: 'VERIFIED', label: `Terverifikasi (${verifiedCount})` }
          ].map(tab => {
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: '14px',
                  fontSize: '0.75rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  border: isActive ? '2px solid #F97316' : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isActive 
                    ? '#F97316' 
                    : (isDark ? '#3D291C' : '#FFF9F5'),
                  color: isActive ? '#FFFFFF' : (isDark ? '#FED7AA' : '#6B7280'),
                  boxShadow: isActive ? '0 3px 0 #EA580C' : 'none',
                  transition: 'all 0.1s',
                  outline: 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {/* Status Bayar */}
          <select
            value={selectedStatusBayar}
            onChange={(e) => setSelectedStatusBayar(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '12px',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontFamily: '"Nunito", "Inter", sans-serif',
              fontWeight: 800,
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Bayar: Semua</option>
            <option value="lunas">Lunas ({lunasCount})</option>
            <option value="cicil">Cicil ({cicilCount})</option>
          </select>

          {/* Angkatan Filter */}
          <select
            value={selectedAngkatan}
            onChange={(e) => setSelectedAngkatan(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '12px',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontFamily: '"Nunito", "Inter", sans-serif',
              fontWeight: 800,
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Angkatan: Semua</option>
            {availableAngkatan.map(a => (
              <option key={a} value={a}>Angkatan {a}</option>
            ))}
          </select>

          {/* Tahun Filter */}
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '12px',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontFamily: '"Nunito", "Inter", sans-serif',
              fontWeight: 800,
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tahun: Semua</option>
            {availableTahun.map(t => (
              <option key={t} value={t}>Tahun {t}</option>
            ))}
          </select>
        </div>

        {/* Reset Filters button if any filter is active */}
        {(searchQuery || statusTab !== 'ALL' || selectedAngkatan !== 'ALL' || selectedStatusBayar !== 'ALL' || selectedTahun !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusTab('ALL');
              setSelectedAngkatan('ALL');
              setSelectedStatusBayar('ALL');
              setSelectedTahun('ALL');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#F97316',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '4px'
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>

      {/* 📋 LIST TITLE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: isDark ? '#E5E7EB' : '#4B5563' }}>
          Daftar Konfirmasi SPA ({filteredPayments.length})
        </span>
      </div>

      {/* 📭 EMPTY STATE OR LIST */}
      {filteredPayments.length === 0 ? (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          <span style={{ fontSize: '3rem' }}>🔍</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Tidak Ada Data Ditemukan
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Tidak ada transaksi SPA yang sesuai dengan filter atau kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="rs-grid" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              style={{
                backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                borderRadius: '24px',
                padding: '16px 18px',
                border: `2px solid ${payment.isVerified ? (isDark ? '#1C3D27' : '#D1FAE5') : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                
                {/* Header: Nama Siswa & Verification Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: '1.02rem', 
                    fontWeight: 900, 
                    color: isDark ? '#FFFFFF' : '#1F2937', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {payment.authorInfo?.username || 'Siswa Asrama'}
                  </span>

                  {/* Verification status badge */}
                  {payment.isVerified ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 850,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#1C3D27' : '#D1FAE5',
                      color: '#10B981',
                      border: '1.5px solid #10B981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={11} strokeWidth={3} />
                      Terverifikasi
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 850,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      color: '#F97316',
                      border: '1.5px solid #F97316',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={11} strokeWidth={3} />
                      Menunggu
                    </span>
                  )}
                </div>
                
                {/* Metadata badges: Angkatan, Status Bayar, Tahun */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                    color: '#F97316',
                    border: '1px solid #F97316'
                  }}>
                    Angkatan {payment.authorInfo?.angkatan || '?'}
                  </span>
                  
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: payment.statusBayar === 'lunas' 
                      ? (isDark ? '#1C3D27' : '#E6F4EA') 
                      : (isDark ? '#3D291C' : '#FEF3C7'),
                    color: payment.statusBayar === 'lunas' ? '#10B981' : '#D97706',
                    border: `1px solid ${payment.statusBayar === 'lunas' ? '#10B981' : '#F59E0B'}`
                  }}>
                    {payment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil'}
                  </span>

                  {payment.tahun && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#2D1D13' : '#F3F4F6',
                      color: isDark ? '#FED7AA' : '#4B5563',
                      border: `1px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`
                    }}>
                      {payment.tahun}
                    </span>
                  )}
                </div>

                {/* Months Chips / Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Calendar size={13} color="#F97316" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    color: isDark ? '#FED7AA' : '#4B5563',
                    lineHeight: 1.3
                  }}>
                    {formatBulanDisplay(payment.bulan)}
                  </span>
                </div>
              </div>

              {/* Action Button: Detail */}
              <button
                onClick={() => setSelectedPayment(payment)}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  border: '2.5px solid #F97316',
                  borderRadius: '16px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#F97316',
                  boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  flexShrink: 0,
                  transition: 'all 0.1s'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)';
                  e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                }}
              >
                <Eye size={14} strokeWidth={3} />
                <span>Detail</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 🖼️ DETAILS MODAL OVERLAY */}
      {selectedPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="rs-modal" style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '32px',
            padding: '24px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
          }}>
            
            {/* Modal Title & Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                Detail Transaksi SPA
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Banner in Modal */}
            <div style={{
              backgroundColor: selectedPayment.isVerified 
                ? (isDark ? '#1C3D27' : '#D1FAE5') 
                : (isDark ? '#3D291C' : '#FFF7ED'),
              border: `2px solid ${selectedPayment.isVerified ? '#10B981' : '#F97316'}`,
              borderRadius: '16px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedPayment.isVerified ? (
                  <CheckCircle2 size={18} color="#10B981" strokeWidth={2.5} />
                ) : (
                  <Clock size={18} color="#F97316" strokeWidth={2.5} />
                )}
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 850,
                  color: selectedPayment.isVerified ? '#10B981' : '#F97316'
                }}>
                  {selectedPayment.isVerified ? 'Telah Diverifikasi' : 'Menunggu Konfirmasi'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                {selectedPayment.statusBayar === 'lunas' ? 'Lunas' : 'Cicilan'}
              </span>
            </div>

            {/* Frame Bukti Image */}
            <div 
              onClick={() => selectedPayment.bukti && setZoomImage(true)}
              style={{
                backgroundColor: '#000000',
                borderRadius: '20px',
                overflow: 'hidden',
                height: '220px',
                border: '2px solid #E5E7EB',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: selectedPayment.bukti ? 'pointer' : 'default'
              }}
            >
              {selectedPayment.bukti ? (
                <>
                  <img 
                    src={selectedPayment.bukti} 
                    alt="Struk Receipt" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Maximize2 size={14} strokeWidth={2.5} />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#9CA3AF' }}>
                  <ImageIcon size={40} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Foto tidak tersedia</span>
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
              
              {/* User details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>Pengirim</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  <User size={14} color="#F97316" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedPayment.authorInfo?.username}
                  </span>
                </div>
              </div>

              {/* Angkatan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>Angkatan</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  Angkatan {selectedPayment.authorInfo?.angkatan || '-'}
                </span>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>Status Bayar</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  <DollarSign size={14} color="#F97316" />
                  <span style={{ textTransform: 'capitalize' }}>
                    {selectedPayment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil / Nyicil'}
                  </span>
                </div>
              </div>

              {/* Tahun */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>Tahun</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  {selectedPayment.tahun || '-'}
                </span>
              </div>

              {/* Bulan Target */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>
                  Bulan Target {Array.isArray(selectedPayment.bulan) ? `(${selectedPayment.bulan.length} Bulan)` : ''}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Array.isArray(selectedPayment.bulan) ? (
                    selectedPayment.bulan.map((b, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                        color: '#F97316',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
                        borderRadius: '10px',
                        padding: '3px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        📅 {b}
                      </span>
                    ))
                  ) : (
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 850,
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      color: '#F97316',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
                      borderRadius: '10px',
                      padding: '3px 10px'
                    }}>
                      📅 {selectedPayment.bulan || '-'}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase' }}>Waktu Pelaporan</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                  <Clock size={14} color="#F97316" />
                  <span>{formatTimestamp(selectedPayment.timestamp)}</span>
                </div>
              </div>

            </div>

            {/* Read-Only Notice for Non-Bendahara when unverified */}
            {!selectedPayment.isVerified && !isBendahara && (
              <div style={{
                backgroundColor: isDark ? '#3D291C' : '#FEF3C7',
                border: `1.5px solid ${isDark ? '#B45309' : '#F59E0B'}`,
                borderRadius: '16px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Lock size={18} color="#D97706" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.76rem', fontWeight: 750, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.35 }}>
                  Hanya <strong>Bendahara</strong> yang berwenang menyetujui verifikasi pembayaran. Anda sedang dalam mode <strong>Monitoring (Read-Only)</strong>.
                </span>
              </div>
            )}

            {/* Action Buttons: Accept & Close */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#3D291C' : '#FFFFFF',
                  color: isDark ? '#D1D5DB' : '#6B7280',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                  borderRadius: '20px',
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                  transition: 'all 0.1s',
                  outline: 'none'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)';
                  e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`;
                }}
              >
                Tutup
              </button>

              {/* Only show verification button if payment is not yet verified AND user is Bendahara */}
              {!selectedPayment.isVerified && isBendahara && (
                <button
                  onClick={() => handleAcceptPayment(selectedPayment.id)}
                  disabled={submitting}
                  style={{
                    flex: 1.5,
                    backgroundColor: '#22C55E',
                    color: '#FFFFFF',
                    border: '2px solid #16A34A',
                    borderRadius: '20px',
                    padding: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 0 #16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.1s',
                    outline: 'none'
                  }}
                  onMouseDown={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(2px)', e.currentTarget.style.boxShadow = '0 2px 0 #16A34A')}
                  onMouseUp={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(0px)', e.currentTarget.style.boxShadow = '0 4px 0 #16A34A')}
                >
                  <Check size={18} strokeWidth={3} />
                  <span>{submitting ? 'Menyimpan...' : 'Verifikasi'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 🔍 FULLSCREEN IMAGE ZOOM MODAL */}
      {zoomImage && selectedPayment?.bukti && (
        <div 
          onClick={() => setZoomImage(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={selectedPayment.bukti} 
            alt="Bukti Zoom" 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '16px'
            }}
          />
        </div>
      )}

      {/* Animations style */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default AcceptingSpa;
