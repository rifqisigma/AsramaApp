import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserCheck, Scale, Sparkles } from 'lucide-react';

// CardPoint component – shown at the top of the Home page
const CardPoint = ({ userData, theme }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FEF08A';
  const shadow = isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEF08A, 0 10px 15px rgba(250, 204, 21, 0.05)';
  const titleColor = isDark ? '#FFFFFF' : '#1F2937';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';
  
  const trophyBg = isDark ? '#3D291C' : '#FEF9C3';
  const trophyBorder = isDark ? '#F97316' : '#F59E0B';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const dashBorder = isDark ? '2px dashed #4A2E1E' : '2px dashed #FEF08A';

  const isCalon = userData?.statusPenghuni === 'CALON';

  return (
    <div style={{ position: 'relative', marginBottom: '24px' }}>
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '24px',
        padding: '24px',
        border: `2px solid ${cardBorder}`,
        boxShadow: shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.3s ease',
        ...(isCalon ? {
          filter: 'blur(2px)',
          opacity: 0.7,
          pointerEvents: 'none',
          userSelect: 'none'
        } : {})
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: titleColor }}>Skor Poin Asrama</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: descColor, fontWeight: 600 }}>Poin kelayakan huni kamu</p>
          </div>
          {/* Trophy badge */}
          <div style={{
            backgroundColor: trophyBg,
            padding: '12px',
            borderRadius: '20px',
            border: `2px solid ${trophyBorder}`,
            boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#F59E0B'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B',
            transition: 'all 0.3s'
          }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🏆</span>
          </div>
        </div>

        {/* Point value */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Angka poin + label */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: getPointColor(userData?.point ?? 0),
              fontFamily: '"Nunito", "Inter", sans-serif',
              transition: 'color 0.3s'
            }}>
              {userData?.point ?? 0}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: labelColor }}>/ 110 Poin</span>
          </div>

          {/* Badge kategori */}
          <div style={{
            alignSelf: 'flex-start',
            backgroundColor: getPointBadgeBg(userData?.point ?? 0, isDark),
            border: `2px solid ${getPointColor(userData?.point ?? 0)}`,
            borderRadius: '20px',
            padding: '4px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: `0 3px 0 ${getPointColor(userData?.point ?? 0)}33`
          }}>
            <span style={{ fontSize: '0.85rem' }}>{getPointEmoji(userData?.point ?? 0)}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: getPointColor(userData?.point ?? 0) }}>
              {getPointLabel(userData?.point ?? 0)}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, ((userData?.point ?? 0) / 110) * 100))}%`,
              backgroundColor: getPointColor(userData?.point ?? 0),
              borderRadius: '8px',
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => navigate('/see-points')}
              style={{
                padding: '13px',
                backgroundColor: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #D97706',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #D97706'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #D97706'; }}
            >
              <span>🔍 Lihat Aturan</span>
            </button>
            <button
              onClick={() => navigate('/all-person-point')}
              style={{
                padding: '13px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #1D4ED8',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #1D4ED8'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #1D4ED8'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #1D4ED8'; }}
            >
              <span>📊 Rekap Poin</span>
            </button>
          </div>
          {/* Staff‑only buttons – rendered conditionally in Home */}
          {(userData?.jabatan?.toLowerCase() === 'kepenghunian' || userData?.jabatan?.toLowerCase() === 'proteksi') && (
            <div style={{
              marginTop: '8px',
              borderTop: dashBorder,
              paddingTop: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px'
            }}>
              <button
                onClick={() => navigate('/create-point')}
                style={{
                  padding: '12px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #059669',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #059669'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
              >
                <span>➕ Buat Jenis Poin</span>
              </button>
              <button
                onClick={() => navigate('/penghakiman-point')}
                style={{
                  padding: '12px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #DC2626',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #DC2626'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #DC2626'; }}
              >
                <span>⚖️ Penghakiman</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isCalon && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isDark ? 'rgba(45, 29, 19, 0.3)' : 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)'}`
        }}>
          <div style={{
            backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
            padding: '12px 24px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: titleColor }}>Khusus Penghuni</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Helper: warna berdasarkan range poin ─────────────────────────────────
// Hijau : 100 – 115
// Oranye: 75  – 99
// Merah : 0   – 74
const getPointColor = (point) => {
  if (point >= 100) return '#10B981'; // hijau
  if (point >= 75)  return '#F97316'; // oranye
  return '#EF4444';                   // merah
};

const getPointLabel = (point) => {
  if (point >= 100) return 'Poin Aman 🟢';
  if (point >= 75)  return 'Perlu Perhatian 🟡';
  return 'Kritis! 🔴';
};

const getPointEmoji = (point) => {
  if (point >= 100) return '✅';
  if (point >= 75)  return '⚠️';
  return '🚨';
};

const getPointBadgeBg = (point, isDark) => {
  if (point >= 100) return isDark ? '#0D2E22' : '#ECFDF5';
  if (point >= 75)  return isDark ? '#3D1F0A' : '#FFF7ED';
  return isDark ? '#2C0F0F' : '#FEF2F2';
};

export default CardPoint;
