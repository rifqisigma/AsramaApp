import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Brush, 
  Moon, 
  DollarSign, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User, 
  CheckCircle2, 
  HelpCircle,
  Eye,
  ImageIcon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const HistoryActivity = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [unifiedHistory, setUnifiedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, piket, jamal, spa, point
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [zoomImgUrl, setZoomImgUrl] = useState(null);

  // Filters setup
  const filters = [
    { id: 'all', label: 'Semua', emoji: '✨' },
    { id: 'piket', label: 'Piket', emoji: '🧹' },
    { id: 'jamal', label: 'Jamal', emoji: '🌙' },
    { id: 'spa', label: 'SPA', emoji: '💸' },
    { id: 'point', label: 'Poin', emoji: '🏆' }
  ];

  useEffect(() => {
    const fetchUnifiedHistory = async () => {
      if (!auth.currentUser) return;
      const currentUid = auth.currentUser.uid;

      try {
        // Parallel queries to all relevant collections
        const [usersSnap, piketSnap, jamalSnap, spaSnap, historySnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'piket')),
          getDocs(collection(db, 'jamal')),
          getDocs(collection(db, 'Spa')),
          getDocs(collection(db, 'historyPoint'))
        ]);

        // Build user map for fast local lookup
        const usersMap = {};
        usersSnap.forEach(d => {
          usersMap[d.id] = { id: d.id, ...d.data() };
        });

        const normalizedList = [];

        // 1. PIKET Normalization & Filtering
        piketSnap.forEach(d => {
          const data = d.data();
          const userPiketId = data.userPiket?.id || (typeof data.userPiket === 'string' ? data.userPiket : '');
          const laporToId = data.laporTo?.id || (typeof data.laporTo === 'string' ? data.laporTo : '');

          if (userPiketId === currentUid || laporToId === currentUid) {
            const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || 0);
            const supervisorName = usersMap[laporToId]?.username || 'Staff';
            normalizedList.push({
              id: d.id,
              type: 'piket',
              title: `Piket: ${data.place || 'Asrama'}`,
              subtitle: `Lapor ke: ${supervisorName}`,
              badge: data.verification ? 'Terverifikasi' : 'Menunggu Verifikasi',
              statusType: data.verification ? 'success' : 'pending',
              timestamp: t,
              bukti: data.buktiLink?.[0] || null,
              meta: {
                place: data.place || '-',
                supervisor: supervisorName,
                isAuthor: userPiketId === currentUid
              }
            });
          }
        });

        // 2. JAMAL Normalization & Filtering
        jamalSnap.forEach(d => {
          const data = d.data();
          const teamRefs = data.usertoJamal || [];
          const isRelated = teamRefs.some(ref => ref.id === currentUid || ref.path?.includes(currentUid));

          if (isRelated) {
            const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || 0);
            const teamNames = teamRefs.map(ref => {
              const rId = ref.id || ref.path?.split('/').pop() || '';
              return usersMap[rId]?.username || 'Penghuni';
            });

            normalizedList.push({
              id: d.id,
              type: 'jamal',
              title: 'Laporan Jam Malam',
              subtitle: `Tim: ${teamNames.join(', ') || 'Anda'}`,
              badge: data.verification ? 'Terverifikasi' : 'Menunggu Verifikasi',
              statusType: data.verification ? 'success' : 'pending',
              timestamp: t,
              bukti: data.buktiLink?.[0] || null,
              meta: {
                team: teamNames.join(', ')
              }
            });
          }
        });

        // 3. SPA Normalization & Filtering
        spaSnap.forEach(d => {
          const data = d.data();
          const authorId = data.author?.id || (typeof data.author === 'string' && data.author.startsWith('/users/') ? data.author.split('/')[2] : '');

          if (data.tipe === 'form' && (authorId === currentUid || data.author?.path?.includes(currentUid))) {
            const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || 0);
            normalizedList.push({
              id: d.id,
              type: 'spa',
              title: `SPA Bulan ${data.bulan || '-'}`,
              subtitle: `Pembayaran ${data.statusBayar === 'lunas' ? 'Lunas' : 'Cicil'}`,
              badge: data.verification ? 'Diverifikasi Bendahara' : 'Proses Verifikasi',
              statusType: data.verification ? 'success' : 'pending',
              timestamp: t,
              bukti: data.bukti || null,
              meta: {
                bulan: data.bulan || '-',
                statusBayar: data.statusBayar || 'lunas'
              }
            });
          }
        });

        // 4. POINT Normalization & Filtering
        historySnap.forEach(d => {
          const data = d.data();
          const userrefId = data.userref?.id || (typeof data.userref === 'string' ? data.userref : data.userref?.path?.split('/').pop() || '');

          if (userrefId === currentUid) {
            const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || 0);
            const isNeg = (data.point || 0) < 0;
            normalizedList.push({
              id: d.id,
              type: 'point',
              title: data.name || 'Transaksi Poin',
              subtitle: isNeg ? `Pelanggaran: Mengurangi ${data.point} Poin` : `Prestasi: Menambah +${data.point} Poin`,
              badge: isNeg ? 'Pengurangan Poin ⚠️' : 'Tambahan Poin 🏆',
              statusType: isNeg ? 'danger' : 'success',
              timestamp: t,
              points: data.point,
              meta: {
                name: data.name || '-'
              }
            });
          }
        });

        // Sort by timestamp descending (newest first)
        normalizedList.sort((a, b) => b.timestamp - a.timestamp);
        setUnifiedHistory(normalizedList);
      } catch (error) {
        console.error("Error creating unified activity history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUnifiedHistory();
  }, []);

  const formatDate = (dateObj) => {
    if (!dateObj) return '-';
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  const toggleExpand = (itemId) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  const filteredHistory = unifiedHistory.filter(h => {
    if (activeFilter === 'all') return true;
    return h.type === activeFilter;
  });

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/me')}
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
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#F97316',
            margin: 0
          }}>
            Riwayat Aktivitas
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 650, fontSize: '0.9rem' }}>
            Linimasa riwayat kegiatan asrama kamu
          </p>
        </div>
      </div>

      {/* Category Pills (Filter pills Gojek Style) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '16px',
        marginBottom: '20px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="no-scrollbar">
        {filters.map(filter => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id);
                setExpandedItemId(null);
              }}
              style={{
                backgroundColor: isActive ? '#F97316' : (isDark ? '#2D1D13' : '#FFFFFF'),
                color: isActive ? '#FFFFFF' : (isDark ? '#FED7AA' : '#4B5563'),
                border: `2px solid ${isActive ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                boxShadow: `0 3px 0 ${isActive ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
                borderRadius: '16px',
                padding: '8px 16px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                transition: 'all 0.1s',
                outline: 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = `0 1px 0 ${isActive ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 3px 0 ${isActive ? '#EA580C' : (isDark ? '#4A2E1E' : '#FFEDD5')}`;
              }}
            >
              <span>{filter.emoji}</span>
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Timeline Feed */}
      {loading ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '60px 0', 
          color: '#F97316' 
        }}>
          <div style={{
            border: '6px solid #FFF7ED',
            borderTop: '6px solid #F97316',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px'
          }}></div>
          <span style={{ fontWeight: 800 }}>Menyusun Linimasa Kamu...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '48px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          <span style={{ fontSize: '3rem' }}>📭</span>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Linimasa Kosong
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#9CA3AF' : '#6B7280', lineHeight: 1.5 }}>
            {activeFilter === 'all' 
              ? 'Kamu belum memiliki aktivitas atau data log yang terdaftar di sistem.' 
              : `Tidak ditemukan riwayat untuk kategori ini.`}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative'
        }}>
          {/* Vertical timeline connector line */}
          <div style={{
            position: 'absolute',
            left: '26px',
            top: '20px',
            bottom: '20px',
            width: '4px',
            backgroundColor: isDark ? '#3D291C' : '#FFEDD5',
            borderRadius: '2px',
            zIndex: 1
          }}></div>

          {filteredHistory.map((item) => {
            const isExpanded = expandedItemId === item.id;
            
            // Icon mapping
            let itemIcon = <HelpCircle size={18} strokeWidth={2.5} />;
            let iconBg = '#9CA3AF';
            if (item.type === 'piket') {
              itemIcon = <Brush size={18} strokeWidth={2.5} />;
              iconBg = '#22C55E'; // Green
            } else if (item.type === 'jamal') {
              itemIcon = <Moon size={18} strokeWidth={2.5} />;
              iconBg = '#8B5CF6'; // Purple
            } else if (item.type === 'spa') {
              itemIcon = <DollarSign size={18} strokeWidth={2.5} />;
              iconBg = '#3B82F6'; // Blue
            } else if (item.type === 'point') {
              itemIcon = <Award size={18} strokeWidth={2.5} />;
              iconBg = '#EAB308'; // Gold
            }

            // Colors setup
            let badgeBg = isDark ? '#2D1D13' : '#F3F4F6';
            let badgeText = isDark ? '#FED7AA' : '#4B5563';
            let badgeBorder = isDark ? '#4A2E1E' : '#E5E7EB';

            if (item.statusType === 'success') {
              badgeBg = isDark ? '#1C3D27' : '#E6F4EA';
              badgeText = '#10B981';
              badgeBorder = '#10B981';
            } else if (item.statusType === 'pending') {
              badgeBg = isDark ? '#3D291C' : '#FFF7ED';
              badgeText = '#F97316';
              badgeBorder = '#F97316';
            } else if (item.statusType === 'danger') {
              badgeBg = isDark ? '#3C1C1C' : '#FEF2F2';
              badgeText = '#EF4444';
              badgeBorder = '#EF4444';
            }

            return (
              <div 
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {/* Timeline Icon Node */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: iconBg,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  border: `4px solid ${isDark ? '#1E130C' : '#FFF9F5'}`,
                  flexShrink: 0
                }}>
                  {itemIcon}
                </div>

                {/* Timeline Card */}
                <div 
                  onClick={() => toggleExpand(item.id)}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    borderRadius: '24px',
                    padding: '16px 20px',
                    boxShadow: isDark ? '0 5px 0 #4A2E1E' : '0 5px 0 #FFEDD5',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        lineHeight: 1.3
                      }}>
                        {item.title}
                      </h4>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                        {item.subtitle}
                      </span>
                    </div>
                    <div style={{ color: isDark ? '#FED7AA' : '#9CA3AF', flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Badges & Date line */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: badgeBg,
                      color: badgeText,
                      border: `1.5px solid ${badgeBorder}`
                    }}>
                      {item.badge}
                    </span>

                    <span style={{ fontSize: '0.72rem', fontWeight: 650, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {item.timestamp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Expanded Accordion Area with details */}
                  {isExpanded && (
                    <div 
                      onClick={e => e.stopPropagation()} // Prevent closing card when tapping inside details
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'slideDown 0.2s ease-out'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Detail Transaksi
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#E5E7EB' : '#4B5563' }}>
                          {item.type === 'piket' && (
                            <>
                              <div>📍 Tempat Piket: <strong style={{ color: '#F97316' }}>{item.meta.place}</strong></div>
                              <div>👤 Supervisor Pembimbing: <strong>{item.meta.supervisor}</strong></div>
                              <div>{item.meta.isAuthor ? '✅ Anda pengirim laporan' : '📝 Anda ditunjuk dalam laporan'}</div>
                            </>
                          )}

                          {item.type === 'jamal' && (
                            <>
                              <div>👥 Anggota Tim Jamal: <strong style={{ color: '#8B5CF6' }}>{item.meta.team}</strong></div>
                            </>
                          )}

                          {item.type === 'spa' && (
                            <>
                              <div>📅 Bulan Target: <strong style={{ color: '#3B82F6' }}>{item.meta.bulan}</strong></div>
                              <div>💰 Mode Setoran: <strong>{item.meta.statusBayar === 'lunas' ? 'Lunas Sepenuhnya' : 'Cicilan (Nyicil)'}</strong></div>
                            </>
                          )}

                          {item.type === 'point' && (
                            <>
                              <div>📝 Deskripsi: <strong style={{ color: '#EAB308' }}>{item.meta.name}</strong></div>
                              <div>⚖️ Perubahan Nilai: <strong>{item.points < 0 ? `${item.points}` : `+${item.points}`} Poin</strong></div>
                            </>
                          )}

                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                            📅 Waktu Submit: {formatDate(item.timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* Display receipt if any */}
                      {item.bukti && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Bukti File / Struk
                          </span>
                          <div 
                            onClick={() => setZoomImgUrl(item.bukti)}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              border: '1.5px solid #F97316',
                              position: 'relative',
                              backgroundColor: '#000000',
                              cursor: 'pointer'
                            }}
                          >
                            <img 
                              src={item.bukti} 
                              alt="bukti" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              top: 0, left: 0, width: '100%', height: '100%',
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: 0, transition: 'opacity 0.2s'
                            }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >
                              <Eye size={16} color="#FFFFFF" strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-down animation css */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Picture Zoom Modal Overlay */}
      {zoomImgUrl && (
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
            borderRadius: '28px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1F2937' }}>
              Bukti Dokumentasi
            </h3>
            
            <img 
              src={zoomImgUrl} 
              alt="zoom-receipt" 
              style={{
                width: '100%',
                maxHeight: '320px',
                objectFit: 'contain',
                borderRadius: '16px',
                border: '1.5px solid #E5E7EB'
              }}
            />

            <button
              onClick={() => setZoomImgUrl(null)}
              style={{
                width: '100%',
                backgroundColor: '#F97316',
                color: '#FFFFFF',
                border: '2px solid #EA580C',
                borderRadius: '18px',
                padding: '12px',
                fontSize: '0.95rem',
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
          `}</style>
        </div>
      )}

    </div>
    </div>
  );
};

export default HistoryActivity;
