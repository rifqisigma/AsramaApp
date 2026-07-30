import React from 'react';
import { MapPin, ShieldCheck, ClipboardCheck } from 'lucide-react';

const CardAbsenMalam = ({ userData, theme, navigate }) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFE4E6'; // Rose/orange tint border
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';

  const hasJabatan = userData?.jabatan && userData.jabatan.trim() !== '';

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
          <ClipboardCheck size={24} color="#F43F5E" />
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: titleColor, transition: 'color 0.3s' }}>
            Absen Malam
          </h3>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: descColor, fontWeight: 600, transition: 'color 0.3s' }}>
          Pencatatan absensi malam otomatis menggunakan lokasi (GPS) dan verifikasi admin.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/form-absen-malam')}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '14px',
            backgroundColor: '#F97316',
            color: 'white',
            border: '2px solid #EA580C',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 0 #EA580C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
          }}
        >
          <MapPin size={18} />
          <span>Isi Form</span>
        </button>

        {hasJabatan && (
          <button
            onClick={() => navigate('/verification-absen-malam')}
            style={{
              flex: 1,
              minWidth: '120px',
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
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #2563EB';
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
            <ShieldCheck size={18} />
            <span>Verifikasi</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CardAbsenMalam;
