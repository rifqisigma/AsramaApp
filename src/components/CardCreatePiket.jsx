import React from 'react';

const CardCreatePiket = ({ userData, theme }) => {
  const isDark = theme === 'dark';

  if (userData?.jabatan?.toLowerCase() !== 'lingpras') return null;

  const cardBg = isDark ? '#3D291C' : '#FFF7ED';
  const cardBorder = isDark ? '#F97316' : '#FDBA74';
  const titleColor = isDark ? '#FFEDD5' : '#9A3412';
  const descColor = isDark ? '#FED7AA' : '#C2410C';
  
  const btnBg = isDark ? '#EA580C' : '#9A3412';
  const btnShadow = isDark ? '#C2410C' : 'rgba(154, 52, 18, 0.2)';

  return (
    <div style={{
      backgroundColor: cardBg,
      borderRadius: '24px',
      padding: '20px',
      border: `2px dashed ${cardBorder}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.3s ease'
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: titleColor, transition: 'color 0.3s' }}>
          Buat Jadwal Piket
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: descColor, fontWeight: 600, transition: 'color 0.3s' }}>
          Khusus Lingpras (via CSV)
        </p>
      </div>
      <button
        onClick={() => window.location.href = '/create-piket'}
        style={{
          padding: '10px 16px',
          backgroundColor: btnBg,
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '0.85rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: isDark ? '0 4px 0 #9A3412' : `0 4px 10px ${btnShadow}`,
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        Buat
      </button>
    </div>
  );
};

export default CardCreatePiket;
