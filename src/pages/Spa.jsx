import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  QrCode, 
  Landmark, 
  Wallet, 
  Sparkles, 
  CreditCard,
  Home as HomeIcon, 
  Brush, 
  User, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Spa = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [userData, setUserData] = useState(null);
  const [spaConfig, setSpaConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState('');
  const [showQrisModal, setShowQrisModal] = useState(false);

  // Fetch User Data and role
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  // Fetch Spa Configuration (document id: nDlizClFIhEWxml3qHfj)
  useEffect(() => {
    const fetchSpaConfig = async () => {
      try {
        const docRef = doc(db, 'Spa', 'nDlizClFIhEWxml3qHfj');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSpaConfig(snap.data());
        } else {
          // Fallback static data if document doesn't exist yet
          setSpaConfig({
            Qris: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
            pilihanMetodePembayaran: [
              {
                Bank: [
                  "BCA - An. Asrama Putra (1234567890)",
                  "BRI - An. Asrama Putra (0987654321)"
                ],
                "E-Wallet": [
                  "Gopay - An. Bendahara (08123456789)"
                ]
              }
            ]
          });
        }
      } catch (error) {
        console.error("Error fetching SPA configuration:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpaConfig();
  }, []);

  const handleCopy = (text) => {
    // Extract account number from text (e.g. "BCA - An. X (12345)") or copy the whole text
    let numOnly = text;
    const match = text.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      numOnly = match[1];
    } else {
      const parts = text.split(' - ');
      if (parts.length > 1) {
        numOnly = parts[1].replace(/[^\d]/g, '');
      }
    }
    navigator.clipboard.writeText(numOnly);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const isBendahara = userData?.jabatan?.toLowerCase() === 'bendahara';

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
        <span style={{ fontWeight: 800 }}>Memuat Informasi SPA...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const bankMethods = spaConfig?.pilihanMetodePembayaran?.[0]?.Bank || [];
  const ewalletMethods = spaConfig?.pilihanMetodePembayaran?.[0]?.['E-Wallet'] || [];
  const qrisUrl = spaConfig?.Qris || '';

  return (
    <div style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      padding: '2rem 1.5rem 120px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease'
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
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F97316',
            margin: 0
          }}>
            Pembayaran SPA
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 650 }}>
            Sumbangan Pembinaan Asrama
          </p>
        </div>
      </div>

      {/* Golden Staff Banner for Bendahara */}
      {isBendahara && (
        <div 
          onClick={() => navigate('/accepting-spa')}
          style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            border: '2.5px solid #EAB308',
            borderRadius: '24px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: isDark ? '0 6px 0 #2A1C12' : '0 6px 0 #FEF08A',
            marginBottom: '28px',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              backgroundColor: '#EAB308',
              color: '#FFFFFF',
              padding: '10px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(234, 179, 8, 0.3)'
            }}>
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: isDark ? '#F59E0B' : '#A16207' }}>
                Halaman Bendahara
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#FCD34D' : '#CA8A04' }}>
                Ada pembayaran yang butuh verifikasi
              </p>
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#EAB308' }}>➔</span>
        </div>
      )}

      {/* QRIS Code Card (Theme Gojek/Duolingo) */}
      {qrisUrl && (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316', alignSelf: 'flex-start' }}>
            <QrCode size={22} strokeWidth={2.5} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metode QRIS</span>
          </div>

          <div 
            onClick={() => setShowQrisModal(true)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              backgroundColor: '#FFFFFF',
              border: '3px solid #F97316',
              borderRadius: '24px',
              padding: '16px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
              width: '180px',
              height: '180px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img 
              src={qrisUrl} 
              alt="QRIS Asrama" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              onError={(e) => {
                // If invalid link, show generic QR placeholder
                e.target.src = "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg";
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              backgroundColor: '#F97316',
              color: '#FFFFFF',
              borderRadius: '50%',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
            }}>
              <Maximize2 size={12} strokeWidth={3} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textAlign: 'center' }}>
            Ketuk kode QR untuk memperbesar dan memindai
          </span>
        </div>
      )}

      {/* bank transfer methods */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '28px',
        padding: '24px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316' }}>
          <Landmark size={22} strokeWidth={2.5} />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transfer Bank</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bankMethods.map((bank, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: isDark ? '#3D291C' : '#FFF9F5',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '20px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {bank}
                </span>
              </div>
              <button
                onClick={() => handleCopy(bank)}
                style={{
                  background: copiedText === bank ? '#10B981' : (isDark ? '#2D1D13' : '#FFFFFF'),
                  border: `2.5px solid ${copiedText === bank ? '#059669' : '#F97316'}`,
                  borderRadius: '14px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: copiedText === bank ? '#FFFFFF' : '#F97316',
                  boxShadow: `0 3px 0 ${copiedText === bank ? '#059669' : '#FFEDD5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 0.1s'
                }}
              >
                {copiedText === bank ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>Salin</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={3} />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* e-wallet methods */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '28px',
        padding: '24px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316' }}>
          <Wallet size={22} strokeWidth={2.5} />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-Wallet</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ewalletMethods.map((wallet, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: isDark ? '#3D291C' : '#FFF9F5',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '20px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {wallet}
                </span>
              </div>
              <button
                onClick={() => handleCopy(wallet)}
                style={{
                  background: copiedText === wallet ? '#10B981' : (isDark ? '#2D1D13' : '#FFFFFF'),
                  border: `2.5px solid ${copiedText === wallet ? '#059669' : '#F97316'}`,
                  borderRadius: '14px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: copiedText === wallet ? '#FFFFFF' : '#F97316',
                  boxShadow: `0 3px 0 ${copiedText === wallet ? '#059669' : '#FFEDD5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 0.1s'
                }}
              >
                {copiedText === wallet ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>Salin</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={3} />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pay Now Button - Duolingo Green 3D */}
      <button
        onClick={() => navigate('/form-spa')}
        style={{
          width: '100%',
          backgroundColor: '#22C55E',
          color: '#FFFFFF',
          border: '2px solid #16A34A',
          borderRadius: '24px',
          padding: '16px',
          fontSize: '1.1rem',
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 6px 0 #16A34A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.1s',
          outline: 'none',
          marginBottom: '20px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = '0 2px 0 #16A34A';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #16A34A';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #16A34A';
        }}
      >
        <CreditCard size={22} strokeWidth={3} />
        <span>Kirim Bukti Bayar</span>
      </button>

      {/* QRIS Full Preview Modal */}
      {showQrisModal && (
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
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '32px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1F2937' }}>
              QRIS Asrama
            </h3>
            
            <img 
              src={qrisUrl} 
              alt="QRIS Asrama" 
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '16px',
                border: '2px solid #E5E7EB'
              }}
            />

            <button
              onClick={() => setShowQrisModal(false)}
              style={{
                width: '100%',
                backgroundColor: '#F97316',
                color: '#FFFFFF',
                border: '2px solid #EA580C',
                borderRadius: '18px',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #EA580C',
                transition: 'all 0.1s',
                outline: 'none'
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
              Tutup
            </button>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Bottom Navigation Navbar - Style Duolingo */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: isDark ? '#2D1D13' : 'white',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '1.25rem 1rem 1.5rem 1rem',
        borderTop: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 -10px 25px rgba(0, 0, 0, 0.2)' : '0 -10px 25px rgba(251, 146, 60, 0.08)',
        zIndex: 10,
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        transition: 'all 0.3s ease'
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ color: isDark ? '#6B7280' : '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <HomeIcon size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Home</span>
        </div>
        <div style={{ color: '#F97316', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Brush size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SPA</span>
        </div>
        <div 
          onClick={() => navigate('/me')}
          style={{ color: isDark ? '#6B7280' : '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <User size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Profile</span>
        </div>
      </div>

    </div>
  );
};

export default Spa;
