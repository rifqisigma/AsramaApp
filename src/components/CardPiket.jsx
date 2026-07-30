import React from 'react';

const CardPiket = ({ piketStats, userData, theme }) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFEDD5';
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';

  const laporBg = isDark ? '#3D291C' : '#FFF7ED';
  const laporBorder = isDark ? '#4A2E1E' : '#FDBA74';
  const ttdBg = isDark ? '#1E293B' : '#EFF6FF';
  const ttdBorder = isDark ? '#334155' : '#93C5FD';

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
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: titleColor, transition: 'color 0.3s' }}>
          Manajemen Piket
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: descColor, fontWeight: 600, transition: 'color 0.3s' }}>
          Pantau laporan dan verifikasi
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Lapor Section */}
        <div style={{ 
          backgroundColor: laporBg, 
          padding: '16px', 
          borderRadius: '20px', 
          border: `1px solid ${laporBorder}`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: countColor }}>{piketStats.laporTotal}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disubmit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{piketStats.laporVerified}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{piketStats.laporUnverified}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menunggu</span>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/lapor-piket'}
            style={{
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#F97316', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontSize: '0.95rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              boxShadow: '0 4px 10px rgba(249, 115, 22, 0.2)', 
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Lapor Piket
          </button>
        </div>

        {/* TTD Section */}
        {userData?.jabatan && userData.jabatan.trim() !== '' && (
          <div style={{ 
            backgroundColor: ttdBg, 
            padding: '16px', 
            borderRadius: '20px', 
            border: `1px solid ${ttdBorder}`,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: countColor }}>{piketStats.ttdTotal}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Laporan</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{piketStats.ttdVerified}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{piketStats.ttdUnverified}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perlu TTD</span>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/ttd-piket'}
              style={{
                width: '100%', 
                padding: '14px', 
                backgroundColor: '#3B82F6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '16px', 
                fontSize: '0.95rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)', 
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Tanda Tangan Piket
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPiket;
