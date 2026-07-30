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
    <div style={{
      backgroundColor: cardBg,
      borderRadius: '24px',
      padding: '24px',
      border: `2px solid ${cardBorder}`,
      boxShadow: `0 8px 0 ${cardBorder}, 0 10px 15px rgba(0, 0, 0, 0.05)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      transition: 'all 0.3s ease'
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
            onClick={() => window.location.href = '/lapor-jamal'}
            style={{
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#8B5CF6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontSize: '0.95rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)', 
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Lapor Jam Malam
          </button>
        </div>

        {/* TTD Jamal Section (Only visible if user is kepenghunian) */}
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
              onClick={() => window.location.href = '/ttd-jamal'}
              style={{
                width: '100%', 
                padding: '14px', 
                backgroundColor: '#7C3AED', 
                color: 'white', 
                border: 'none', 
                borderRadius: '16px', 
                fontSize: '0.95rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.2)', 
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Tanda Tangan Jam Malam
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardJamal;
