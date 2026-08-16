import React from 'react';
import { Moon } from 'lucide-react';

const CardJamal = ({ jamalStats, userData, theme }) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#F3E8FF';
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';

  const laporBg = isDark ? '#3D291C' : '#F9F8FD';
  const laporBorder = isDark ? '#4A2E1E' : '#E9D5FF';
  const ttdBg = isDark ? '#2D223C' : '#F5F3FF';
  const ttdBorder = isDark ? '#4C277E' : '#C4B5FD';

  const countColor = isDark ? '#F3F4F6' : '#1F2937';
  const labelColor = isDark ? '#9CA3AF' : '#9CA3AF';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '24px',
        padding: '24px',
        border: `2px solid ${cardBorder}`,
        boxShadow: `0 8px 0 ${cardBorder}, 0 10px 15px rgba(0, 0, 0, 0.05)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        transition: 'all 0.3s ease',
        filter: 'blur(2px)',
        opacity: 0.7,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Moon size={24} color="#8B5CF6" />
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: titleColor, transition: 'color 0.3s' }}>
              Manajemen Jam Malam
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: descColor, fontWeight: 600, transition: 'color 0.3s' }}>
            Laporan jam malam & verifikasi
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lapor Jamal Section */}
          <div style={{
            backgroundColor: laporBg,
            padding: '16px',
            borderRadius: '20px',
            border: `1px solid ${laporBorder}`,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: countColor }}>{jamalStats.laporTotal}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disubmit</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8B5CF6' }}>{jamalStats.laporVerified}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{jamalStats.laporUnverified}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menunggu</span>
              </div>
            </div>
            <button
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#8B5CF6',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.95rem',
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
              }}
            >
              Lapor Jam Malam
            </button>
          </div>

          {/* TTD Jamal Section */}
          {userData?.jabatan?.toLowerCase() === 'kepenghunian' && (
            <div style={{
              backgroundColor: ttdBg,
              padding: '16px',
              borderRadius: '20px',
              border: `1px solid ${ttdBorder}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: countColor }}>{jamalStats.ttdTotal}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Laporan</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{jamalStats.ttdVerified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{jamalStats.ttdUnverified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perlu TTD</span>
                </div>
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#7C3AED',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 10px rgba(124, 58, 237, 0.2)'
                }}
              >
                Tanda Tangan Jam Malam
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphism Lock Overlay */}
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
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: titleColor }}>Dikunci dulu yak</span>
        </div>
      </div>
    </div>
  );
};

export default CardJamal;
