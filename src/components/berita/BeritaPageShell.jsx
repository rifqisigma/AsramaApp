import { ArrowLeft } from 'lucide-react';

/**
 * Kerangka halaman berita: latar, header dengan tombol kembali, judul & aksi.
 * Menjaga tampilan list/form/detail konsisten dan responsif.
 */
const BeritaPageShell = ({
  theme,
  title,
  subtitle,
  onBack,
  backLabel = 'Kembali',
  actions,
  children,
  maxWidth = 1000,
}) => {
  const isDark = theme === 'dark';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      padding: '24px 16px 64px',
      transition: 'background-color 0.3s'
    }}>
      <div style={{ maxWidth: `${maxWidth}px`, margin: '0 auto' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginBottom: '16px', padding: '8px 14px',
              borderRadius: '12px', cursor: 'pointer',
              border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              color: isDark ? '#E2E8F0' : '#334155',
              fontSize: '0.85rem', fontWeight: 700
            }}
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>
        )}

        <div className="rs-row-wrap" style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', gap: '16px', marginBottom: '24px'
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontSize: '1.75rem', fontWeight: 800,
              color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                margin: '6px 0 0', fontSize: '0.9rem', fontWeight: 500,
                color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1.5
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>{actions}</div>}
        </div>

        {children}
      </div>
    </div>
  );
};

export default BeritaPageShell;
