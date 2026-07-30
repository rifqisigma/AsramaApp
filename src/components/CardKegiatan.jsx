import React, { useRef } from 'react';

const CardKegiatan = ({
  kegiatanList,
  loadingKegiatan,
  selectedDate,
  setSelectedDate,
  getNext7Days,
  formatKegiatanTime,
  navigate,
  theme,
  userData
}) => {
  const isDark = theme === 'dark';
  const dateInputRef = useRef(null);

  const days7 = getNext7Days();

  // Check if selectedDate matches any of the 7 days
  const isSelectedDateIn7Days = days7.some(d => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === selDate.getTime();
  });

  // Match closest kegiatan
  const closestKegiatan = (() => {
    if (kegiatanList.length === 0) return null;
    
    const targetMidnight = new Date(selectedDate);
    targetMidnight.setHours(0, 0, 0, 0);
    
    // Filter activities starting on or after selected date (inclusive)
    const upcoming = kegiatanList.filter(k => {
      const kTime = new Date(k.waktuMulai).getTime();
      return kTime >= targetMidnight.getTime();
    });
    
    if (upcoming.length > 0) {
      // Sort ascending by waktuMulai
      return upcoming.sort((a, b) => new Date(a.waktuMulai).getTime() - new Date(b.waktuMulai).getTime())[0];
    }
    
    // Fallback: closest past activity
    const past = kegiatanList.filter(k => {
      const kTime = new Date(k.waktuMulai).getTime();
      return kTime < targetMidnight.getTime();
    });
    if (past.length > 0) {
      // Sort descending by waktuMulai and pick most recent
      return past.sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime())[0];
    }
    
    return null;
  })();

  // Dark/Light styles
  const cardBg = isDark ? '#2D1D13' : '#FFFFFF';
  const cardBorder = isDark ? '#4A2E1E' : '#FFEDD5';
  const titleColor = isDark ? '#FFFFFF' : '#1F2937';
  const descColor = isDark ? '#D1D5DB' : '#6B7280';
  const labelColor = isDark ? '#9CA3AF' : '#9CA3AF';
  const pillBg = isDark ? '#1E293B' : '#F0FDF4';
  const pillBorder = isDark ? '#334155' : '#86EFAC';
  const pillText = isDark ? '#38BDF8' : '#10B981';

  const scrollItemBg = isDark ? '#3D291C' : '#FFFFFF';
  const scrollItemBorder = isDark ? '#4A2E1E' : '#FFEDD5';
  const scrollItemText = isDark ? '#E2E8F0' : '#4B5563';

  const activityBg = isDark ? '#352216' : '#FFFDFB';
  const activityBorder = isDark ? '#4A2E1E' : '#FED7AA';

  return (
    <div style={{
      backgroundColor: cardBg,
      borderRadius: '24px',
      padding: '24px',
      border: `2px solid ${cardBorder}`,
      boxShadow: `0 8px 0 ${cardBorder}, 0 10px 15px rgba(0, 0, 0, 0.05)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '24px',
      transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: titleColor, transition: 'color 0.3s' }}>
            Agenda Kegiatan
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: descColor, fontWeight: 600, transition: 'color 0.3s' }}>
            Jadwal kementerian asrama
          </p>
        </div>
        <div style={{
          backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
          padding: '12px',
          borderRadius: '20px',
          border: `2px solid ${isDark ? '#F97316' : '#F97316'}`,
          boxShadow: `0 3px 0 ${cardBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F97316',
          transition: 'all 0.3s'
        }}>
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📅</span>
        </div>
      </div>

      {/* Date Picker Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pilih Tanggal
          </span>
          
          {/* Custom Date Pill */}
          {!isSelectedDateIn7Days && (
            <div style={{
              backgroundColor: pillBg,
              color: pillText,
              padding: '4px 10px',
              borderRadius: '12px',
              border: `1.5px solid ${pillBorder}`,
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.3s'
            }}>
              <span>📅 {selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span onClick={() => {
                const today = new Date();
                today.setHours(0,0,0,0);
                setSelectedDate(today);
              }} style={{ cursor: 'pointer', fontWeight: 900, marginLeft: '2px', color: '#EF4444' }}>×</span>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Horizontal Day Scroller */}
          <div className="no-scrollbar" style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {days7.map((d, idx) => {
              const isSelected = new Date(d.date).setHours(0,0,0,0) === new Date(selectedDate).setHours(0,0,0,0);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    const newD = new Date(d.date);
                    newD.setHours(0,0,0,0);
                    setSelectedDate(newD);
                  }}
                  style={{
                    flexShrink: 0,
                    width: '56px',
                    padding: '10px 4px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? '#F97316' : scrollItemBg,
                    border: isSelected ? '2px solid #EA580C' : `2px solid ${scrollItemBorder}`,
                    boxShadow: isSelected ? '0 3px 0 #C2410C' : `0 3px 0 ${scrollItemBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
                    color: isSelected ? '#FFFFFF' : scrollItemText
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.transform = 'translateY(2px)';
                    e.currentTarget.style.boxShadow = isSelected ? '0 1px 0 #C2410C' : `0 1px 0 ${scrollItemBorder}`;
                  }}
                  onMouseUp={e => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = isSelected ? '0 3px 0 #C2410C' : `0 3px 0 ${scrollItemBorder}`;
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.6 }}>{d.dayName}</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{d.dayNum}</span>
                </div>
              );
            })}
          </div>

          {/* Custom Date Selector Button - REVISED TO BE BELOW SCROLLER */}
          <div style={{ position: 'relative', alignSelf: 'stretch' }}>
            <input
              type="date"
              ref={dateInputRef}
              onChange={(e) => {
                if (e.target.value) {
                  const newD = new Date(e.target.value);
                  newD.setHours(0,0,0,0);
                  setSelectedDate(newD);
                }
              }}
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                opacity: 0,
                pointerEvents: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (dateInputRef.current) {
                  try {
                    dateInputRef.current.showPicker();
                  } catch (err) {
                    dateInputRef.current.click();
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '16px',
                backgroundColor: isDark ? '#3D291C' : '#FFFFFF',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                color: '#F97316',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                outline: 'none',
                transition: 'transform 0.1s, background-color 0.3s, border-color 0.3s'
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
              onMouseUp={e => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
            >
              <span>🗓️ Pilih Tanggal Lain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kegiatan Terdekat Info Block */}
      <div style={{
        marginTop: '4px',
        borderTop: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        paddingTop: '16px',
        transition: 'border-color 0.3s'
      }}>
        {loadingKegiatan ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#9CA3AF', fontWeight: 650, fontSize: '0.9rem' }}>
            ⏳ Memuat kegiatan terdekat...
          </div>
        ) : closestKegiatan ? (
          <div style={{
            backgroundColor: activityBg,
            border: `2px solid ${activityBorder}`,
            borderRadius: '20px',
            padding: '16px',
            boxShadow: `0 4px 0 ${activityBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s'
          }}>
            {/* Jabatan Pembuat Badge */}
            <div style={{ alignSelf: 'flex-start' }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#3D291C' : '#FFEFD5',
                color: '#D97706',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FDBA74'}`,
                transition: 'all 0.3s'
              }}>
                👑 {closestKegiatan.authorJabatan}
              </span>
            </div>

            {/* Judul Kegiatan */}
            <h4 style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 900,
              color: titleColor,
              lineHeight: 1.3,
              transition: 'color 0.3s'
            }}>
              {closestKegiatan.judul}
            </h4>

            {/* Waktu Mulai & Waktu Selesai */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: descColor, fontWeight: 650, transition: 'color 0.3s' }}>
                <span style={{ fontSize: '0.9rem' }}>🟢</span>
                <span>Mulai: {formatKegiatanTime(closestKegiatan.waktuMulai)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: descColor, fontWeight: 650, transition: 'color 0.3s' }}>
                <span style={{ fontSize: '0.9rem' }}>🔴</span>
                <span>Selesai: {closestKegiatan.waktuSelesai.toLowerCase() === 'selesai' ? 'Selesai' : formatKegiatanTime(closestKegiatan.waktuSelesai)}</span>
              </div>
            </div>

            {/* Action Button: Detail Kegiatan */}
            <button
              onClick={() => navigate(`/see-kegiatan?id=${closestKegiatan.id}`)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                color: '#F97316',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FDBA74'}`,
                borderRadius: '14px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FDBA74'}`,
                transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                outline: 'none',
                marginTop: '4px'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 0px 0 #FDBA74'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FDBA74'}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FDBA74'}`; }}
            >
              <span>🔍 Lihat Detail Kegiatan</span>
            </button>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            backgroundColor: isDark ? '#352216' : '#F9FAFB',
            borderRadius: '20px',
            border: `2px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
            color: '#6B7280',
            fontSize: '0.85rem',
            fontWeight: 650,
            transition: 'all 0.3s'
          }}>
            <span>📭 Tidak ada agenda terdekat untuk tanggal ini.</span>
          </div>
        )}
      </div>

      {/* Bottom Create Button - Only visible for users with a jabatan */}
      {userData?.jabatan && (
        <button
          onClick={() => navigate('/create-kegiatan')}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 0 #059669',
            transition: 'transform 0.1s, box-shadow 0.1s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '4px'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 #059669'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = '0 4px 0 #059669'; }}
        >
          <span>Buat Kegiatan Kementerian ➕</span>
        </button>
      )}
    </div>
  );
};

export default CardKegiatan;
