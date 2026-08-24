import React from 'react';
import { Search, User, Filter, RotateCcw, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Mobile-responsive Reusable Filter Form Component for Monitoring pages (Piket & Points)
 */
const MonitoringFilterForm = ({
  title = 'Opsi Pencarian',
  namaFilter = '',
  setNamaFilter,
  angkatanFilter = 'ALL',
  setAngkatanFilter,
  availableAngkatan = [],
  extraFilterComponent = null,
  onSubmit,
  onReset,
  loading = false,
  submitLabel = 'Lihat Data',
  accentColor = '#F97316',
  accentBorderColor = '#EA580C',
  accentShadowColor = '#C2410C',
  hasActiveFilter = false,
  namaPlaceholder = 'Semua atau ketik nama...'
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <form
      onSubmit={onSubmit}
      style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '20px',
        padding: '18px 16px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 5px 0 #4A2E1E' : '0 5px 0 #FFEDD5',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Top Header: Title & Reset Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: accentColor, fontWeight: 800, fontSize: '0.92rem' }}>
          <Filter size={17} strokeWidth={2.5} />
          <span>{title}</span>
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: isDark ? '#FED7AA' : '#9CA3AF',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px'
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>

      {/* 1. Nama Penghuni Filter */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: isDark ? '#FED7AA' : '#374151',
            marginBottom: '5px'
          }}
        >
          Nama Penghuni
        </label>
        <div style={{ position: 'relative' }}>
          <User
            size={17}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF'
            }}
          />
          <input
            type="text"
            value={namaFilter}
            onChange={(e) => setNamaFilter && setNamaFilter(e.target.value)}
            placeholder={namaPlaceholder}
            style={{
              width: '100%',
              padding: '11px 12px 11px 38px',
              borderRadius: '12px',
              border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              color: isDark ? '#FFFFFF' : '#111827',
              fontSize: '0.9rem',
              fontWeight: 700,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 2. Responsive Grid Row: Angkatan & Extra Filter */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: extraFilterComponent ? 'repeat(auto-fit, minmax(130px, 1fr))' : '1fr',
          gap: '10px'
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: isDark ? '#FED7AA' : '#374151',
              marginBottom: '5px'
            }}
          >
            Angkatan
          </label>
          <div style={{ position: 'relative' }}>
            <Layers
              size={17}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
                pointerEvents: 'none'
              }}
            />
            <select
              value={angkatanFilter}
              onChange={(e) => setAngkatanFilter && setAngkatanFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 8px 11px 34px',
                borderRadius: '12px',
                border: isDark ? '2px solid #4A2E1E' : '2px solid #E5E7EB',
                backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                color: isDark ? '#FFFFFF' : '#111827',
                fontSize: '0.85rem',
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
                textOverflow: 'ellipsis'
              }}
            >
              <option value="ALL">Semua Angkatan</option>
              {availableAngkatan.map((akt) => (
                <option key={akt} value={akt}>
                  Angkatan {akt}
                </option>
              ))}
              {!availableAngkatan.includes('62') && <option value="62">Angkatan 62</option>}
              {!availableAngkatan.includes('61') && <option value="61">Angkatan 61</option>}
              {!availableAngkatan.includes('60') && <option value="60">Angkatan 60</option>}
              {!availableAngkatan.includes('59') && <option value="59">Angkatan 59</option>}
            </select>
          </div>
        </div>

        {/* Extra Filter Slot */}
        {extraFilterComponent && <div>{extraFilterComponent}</div>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: '4px',
          width: '100%',
          padding: '13px',
          backgroundColor: loading ? '#FB923C' : accentColor,
          color: 'white',
          border: `2px solid ${loading ? '#FB923C' : accentBorderColor}`,
          borderRadius: '14px',
          fontSize: '0.98rem',
          fontWeight: 900,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: `0 4px 0 ${accentShadowColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'transform 0.1s ease',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseDown={(e) => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = `0 2px 0 ${accentShadowColor}`;
          }
        }}
        onMouseUp={(e) => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 0 ${accentShadowColor}`;
          }
        }}
      >
        <Search size={18} strokeWidth={2.8} />
        {loading ? 'Memuat Data...' : submitLabel}
      </button>
    </form>
  );
};

export default MonitoringFilterForm;
