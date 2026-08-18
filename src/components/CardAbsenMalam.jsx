import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, ClipboardCheck, Lock, Clock } from 'lucide-react';

const CardAbsenMalam = ({ userData, theme, navigate }) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFE4E6'; // Rose/orange tint border
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';

  const hasJabatan = userData?.jabatan && userData.jabatan.trim() !== '';

  // Time-based lock: only open 22:00-22:30 WIB
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 22:00 = 1320 minutes, 22:30 = 1350 minutes
      const openTime = 22 * 60; // 22:00
      const closeTime = 22 * 60 + 30; // 22:30

      if (totalMinutes >= openTime && totalMinutes < closeTime) {
        setIsOpen(true);
        // Calculate remaining time
        const remainingMinutes = closeTime - totalMinutes;
        const remainingSecs = 60 - now.getSeconds();
        if (remainingMinutes <= 1) {
          setTimeLeft(`${remainingSecs} detik lagi`);
        } else {
          setTimeLeft(`${remainingMinutes} menit lagi`);
        }
      } else {
        setIsOpen(false);
        // Calculate time until next opening
        if (totalMinutes < openTime) {
          const diff = openTime - totalMinutes;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`);
        } else {
          // After 22:30, next day
          const diff = (24 * 60 - totalMinutes) + openTime;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`);
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'relative',
      borderRadius: '24px',
      overflow: 'hidden',
    }}>
      {/* Main Card Content */}
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
        filter: !isOpen ? 'blur(2px)' : 'none',
        pointerEvents: !isOpen ? 'none' : 'auto',
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

      {/* Glassmorphism Lock Overlay */}
      {!isOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark
            ? 'rgba(30, 19, 12, 0.65)'
            : 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          border: `1px solid ${isDark ? 'rgba(74, 46, 30, 0.5)' : 'rgba(255, 237, 213, 0.7)'}`,
          zIndex: 2,
        }}>
          <div style={{
            backgroundColor: isDark ? 'rgba(45, 29, 19, 0.8)' : 'rgba(255, 255, 255, 0.85)',
            borderRadius: '20px',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            border: `1.5px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(249, 115, 22, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            textAlign: 'center',
            maxWidth: '280px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(135deg, #4A2E1E, #3D1A08)'
                : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark
                ? '0 4px 12px rgba(249, 115, 22, 0.2)'
                : '0 4px 12px rgba(249, 115, 22, 0.15)',
            }}>
              <Lock size={28} color="#F97316" />
            </div>
            <div>
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '1.1rem',
                fontWeight: 900,
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                Absen Malam Terkunci
              </h4>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: 700,
                color: isDark ? '#FED7AA' : '#6B7280',
                lineHeight: 1.4,
              }}>
                Dibuka pukul 22:00 – 22:30 WIB
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.08)',
              border: `1px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`,
            }}>
              <Clock size={14} color="#F97316" />
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#F97316',
              }}>
                Buka {timeLeft}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardAbsenMalam;
