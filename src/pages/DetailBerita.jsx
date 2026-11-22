import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { fetchBeritaById, KATEGORI_BERITA } from '../utils/berita';
import BeritaPageShell from '../components/berita/BeritaPageShell';
import MarkdownView from '../components/berita/MarkdownView';
import { Calendar, User, Loader2, AlertTriangle, Pencil } from 'lucide-react';

const KATEGORI_LABEL = Object.fromEntries(KATEGORI_BERITA.map((k) => [k.value, k.label]));

const DetailBerita = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) {
        setError('ID berita tidak ditemukan.');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchBeritaById(id);
        if (!active) return;
        if (!data) setError('Berita tidak ditemukan atau sudah dihapus.');
        else setItem(data);
      } catch (err) {
        if (!active) return;
        setError('Gagal memuat berita: ' + err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <BeritaPageShell theme={theme} title="Berita">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: isDark ? '#94A3B8' : '#64748B' }}>
          <Loader2 size={28} className="spin" />
        </div>
      </BeritaPageShell>
    );
  }

  if (error || !item) {
    return (
      <BeritaPageShell theme={theme} title="Berita" onBack={() => navigate('/berita')} backLabel="Kembali ke Daftar Berita">
        <div style={{
          padding: '40px 24px', textAlign: 'center', borderRadius: '18px',
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          color: isDark ? '#FCA5A5' : '#B91C1C', fontWeight: 700
        }}>
          <AlertTriangle size={28} style={{ marginBottom: '10px' }} />
          <p style={{ margin: 0 }}>{error || 'Berita tidak ditemukan.'}</p>
        </div>
      </BeritaPageShell>
    );
  }

  return (
    <BeritaPageShell
      theme={theme}
      title={item.title}
      onBack={() => navigate('/berita')}
      backLabel="Kembali ke Daftar Berita"
      maxWidth={860}
      actions={
        <button
          onClick={() => navigate(`/edit-berita?id=${item.id}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
            border: '2px solid #1D4ED8', backgroundColor: '#2563EB',
            color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800
          }}
        >
          <Pencil size={15} /> Edit
        </button>
      }
    >
      <div style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: '18px', padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '4px 10px', borderRadius: '999px',
            backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
            color: isDark ? '#BFDBFE' : '#1D4ED8'
          }}>
            {KATEGORI_LABEL[item.kategori] || item.kategori}
          </span>
          {!item.published && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, padding: '4px 10px', borderRadius: '999px',
              backgroundColor: isDark ? '#78350F' : '#FEF3C7',
              color: isDark ? '#FCD34D' : '#B45309'
            }}>Draf</span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
            <Calendar size={13} /> {item.dateLabel || '-'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
            <User size={13} /> {item.author || 'Anonim'}
          </span>
        </div>

        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '14px', marginBottom: '22px', display: 'block' }}
          />
        )}

        <MarkdownView>{item.content}</MarkdownView>
      </div>
    </BeritaPageShell>
  );
};

export default DetailBerita;
