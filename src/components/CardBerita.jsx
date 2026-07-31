import React from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';

const CardBerita = ({ userData, theme, navigate }) => {
  const isDark = theme === 'dark';

  const hasJabatan = userData?.jabatan && userData.jabatan.trim() !== '';

  if (!hasJabatan) return null;

  return (
    <div style={{
      backgroundColor: isDark ? '#1A1F2E' : '#EFF6FF',
      borderRadius: '24px',
      padding: '24px',
      border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
      boxShadow: `0 8px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}, 0 10px 15px rgba(0,0,0,0.05)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Newspaper size={24} color="#3B82F6" />
          <h3 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 800,
            color: isDark ? '#FFFFFF' : '#1C1C1E',
            transition: 'color 0.3s'
          }}>
            Berita Asrama
          </h3>
        </div>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '0.9rem',
          color: isDark ? '#93C5FD' : '#3B82F6',
          fontWeight: 600,
          lineHeight: 1.4,
          transition: 'color 0.3s'
        }}>
          Publish berita & informasi terbaru ke website asrama
        </p>
      </div>

      {/* Button */}
      <button
        onClick={() => navigate('/create-berita')}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#3B82F6',
          color: 'white',
          border: '2px solid #2563EB',
          borderRadius: '16px',
          fontSize: '0.95rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 0 #2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'transform 0.1s'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = '0 0px 0 #2563EB';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 4px 0 #2563EB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 4px 0 #2563EB';
        }}
      >
        <ExternalLink size={18} />
        <span>Buat Berita</span>
      </button>
    </div>
  );
};

export default CardBerita;
