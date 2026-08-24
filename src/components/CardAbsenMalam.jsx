import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, ClipboardCheck, Lock, Clock } from 'lucide-react';

const CardAbsenMalam = ({ userData, theme, navigate }) => {
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFE4E6'; // Rose/orange tint border
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';

  const isCalon = (userData?.statusPenghuni || userData?.status_penghuni) === 'CALON';

  // Time-based lock for Form: only open 22:00-22:30 WIB
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
        const remainingMinutes = closeTime - totalMinutes;
        const remainingSecs = 60 - now.getSeconds();
        if (remainingMinutes <= 1) {
          setTimeLeft(`${remainingSecs}d lagi`);
        } else {
          setTimeLeft(`${remainingMinutes}m lagi`);
        }
      } else {
        setIsOpen(false);
        if (totalMinutes < openTime) {
          const diff = openTime - totalMinutes;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`);
        } else {
          const diff = (24 * 60 - totalMinutes) + openTime;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`);
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: '24px', marginBottom: '24px' }}>
      {/* Main Card Content */}
      <div
        style={{
          backgroundColor: cardBg,
          borderRadius: '24px',
          padding: '24px',
          border: `2px solid ${cardBorder}`,
          boxShadow: `0 8px 0 ${cardBorder}, 0 10px 15px rgba(0, 0, 0, 0.05)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header with Title & Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardCheck size={24} color="#F43F5E" />
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: titleColor }}>
                Absen Malam
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: descColor, fontWeight: 600 }}>
              Pencatatan absensi malam otomatis berbasis GPS
            </p>
          </div>

          {/* Form Schedule Pill */}
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: isOpen
                ? isDark ? '#064E3B' : '#ECFDF5'
                : isDark ? '#3D291C' : '#FFF7ED',
              border: `1px solid ${isOpen ? '#10B981' : '#F97316'}`,
              color: isOpen ? '#10B981' : '#F97316',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Clock size={12} />
            <span>{isOpen ? `Buka (${timeLeft})` : `Buka 22:00 WIB`}</span>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: !isCalon ? '1fr 1fr' : '1fr', gap: '10px' }}>
          {/* Button 1: Isi Form (Only enabled/open 22:00-22:30, or clickable to see timer) */}
          <button
            onClick={() => navigate('/form-absen-malam')}
            style={{
              padding: '13px',
              backgroundColor: isOpen ? '#F97316' : isDark ? '#3D291C' : '#FFEDD5',
              color: isOpen ? 'white' : isDark ? '#FED7AA' : '#C2410C',
              border: `2px solid ${isOpen ? '#EA580C' : isDark ? '#4A2E1E' : '#FDBA74'}`,
              borderRadius: '16px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: isOpen ? '0 4px 0 #EA580C' : isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FDBA74',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'transform 0.1s, box-shadow 0.1s'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = isOpen ? '0 1px 0 #EA580C' : 'none';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = isOpen ? '0 4px 0 #EA580C' : isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FDBA74';
            }}
          >
            {isOpen ? <MapPin size={16} /> : <Lock size={16} />}
            <span>{isOpen ? 'Isi Form Absen' : 'Form (22:00)'}</span>
          </button>

          {/* Button 2: Verifikasi (Always open 24/7 for all non-CALON residents) */}
          {!isCalon && (
            <button
              onClick={() => navigate('/verification-absen-malam')}
              style={{
                padding: '13px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: '2px solid #2563EB',
                borderRadius: '16px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = '0 1px 0 #1D4ED8';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 0 #1D4ED8';
              }}
            >
              <ShieldCheck size={16} />
              <span>Verifikasi (24 Jam)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardAbsenMalam;
