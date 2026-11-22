import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getAuthorizedBeritaUser } from '../utils/beritaAuth';
import {
  fetchBerita, deleteBerita, updateBerita, toExcerpt,
  toDateInputValue, KATEGORI_BERITA
} from '../utils/berita';
import BeritaPageShell from '../components/berita/BeritaPageShell';
import MarkdownView from '../components/berita/MarkdownView';
import {
  Newspaper, Plus, Pencil, Trash2, Eye, EyeOff, Search,
  RotateCw, FileText, Calendar, User, Loader2, AlertTriangle
} from 'lucide-react';

const KATEGORI_LABEL = Object.fromEntries(KATEGORI_BERITA.map((k) => [k.value, k.label]));

const Berita = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PUBLISHED | DRAFT
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchBerita({ includeDrafts: true }));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat berita: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getAuthorizedBeritaUser();
      if (!active) return;
      if (!data) {
        alert('Akses ditolak. Hanya pengguna dengan jabatan yang dapat mengelola berita.');
        navigate('/home');
        return;
      }
      setAuthorized(true);
      setChecking(false);
      load();
    })();
    return () => { active = false; };
  }, [navigate, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((b) => {
      if (kategoriFilter !== 'ALL' && b.kategori !== kategoriFilter) return false;
      if (statusFilter === 'PUBLISHED' && !b.published) return false;
      if (statusFilter === 'DRAFT' && b.published) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        toExcerpt(b.content, 5000).toLowerCase().includes(q)
      );
    });
  }, [items, search, kategoriFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((b) => b.published).length,
    draft: items.filter((b) => !b.published).length,
  }), [items]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus berita "${item.title}"?\n\nBerita yang sudah terbit juga akan hilang dari website.`)) {
      return;
    }
    setBusyId(item.id);
    try {
      await deleteBerita(item.id);
      setItems((prev) => prev.filter((b) => b.id !== item.id));
      if (preview?.id === item.id) setPreview(null);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (item) => {
    setBusyId(item.id);
    try {
      await updateBerita(item.id, {
        title: item.title,
        kategori: item.kategori,
        content: item.content,
        imageUrl: item.imageUrl,
        author: item.author,
        published: !item.published,
        dateInput: toDateInputValue(item.date),
      });
      setItems((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, published: !b.published } : b))
      );
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '12px',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    color: isDark ? '#F1F5F9' : '#0F172A',
    fontSize: '0.88rem', fontWeight: 600, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };

  const cardBase = {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '18px',
  };

  const iconButton = (color) => ({
    width: '38px', height: '38px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '10px', cursor: 'pointer',
    border: '1px solid transparent',
    backgroundColor: isDark ? `${color}33` : `${color}14`,
    color, transition: 'opacity 0.15s'
  });

  if (checking) {
    return (
      <BeritaPageShell theme={theme} title="Kelola Berita">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: isDark ? '#94A3B8' : '#64748B' }}>
          <Loader2 size={28} className="spin" />
        </div>
      </BeritaPageShell>
    );
  }

  if (!authorized) return null;

  return (
    <BeritaPageShell
      theme={theme}
      title="Kelola Berita"
      subtitle="Tulis, edit, dan terbitkan berita untuk website asrama. Isi berita mendukung format Markdown."
      onBack={() => navigate('/home')}
      backLabel="Kembali ke Beranda"
      actions={
        <button
          onClick={() => navigate('/create-berita')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 18px', borderRadius: '14px', cursor: 'pointer',
            border: '2px solid #1D4ED8', backgroundColor: '#2563EB',
            color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 800,
            boxShadow: '0 4px 0 #1D4ED8', transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(3px)';
            e.currentTarget.style.boxShadow = '0 1px 0 #1D4ED8';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 0 #1D4ED8';
          }}
        >
          <Plus size={18} />
          Tulis Berita
        </button>
      }
    >
      {/* Ringkasan */}
      <div className="rs-grid rs-grid-3" style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total berita', value: stats.total, icon: Newspaper, color: '#2563EB' },
          { label: 'Terbit', value: stats.published, icon: Eye, color: '#059669' },
          { label: 'Draf', value: stats.draft, icon: EyeOff, color: '#D97706' },
        ].map((s) => (
          <div key={s.label} style={{ ...cardBase, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: isDark ? `${s.color}2E` : `${s.color}14`, color: s.color
            }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ ...cardBase, padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: isDark ? '#64748B' : '#94A3B8'
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau isi berita..."
            style={{ ...inputStyle, paddingLeft: '36px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', flex: '1 1 140px' }}
          >
            <option value="ALL">Semua kategori</option>
            {KATEGORI_BERITA.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', flex: '1 1 140px' }}
          >
            <option value="ALL">Semua status</option>
            <option value="PUBLISHED">Terbit</option>
            <option value="DRAFT">Draf</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            title="Muat ulang"
            style={{
              ...iconButton(isDark ? '#94A3B8' : '#475569'),
              width: '42px', height: '42px', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            <RotateCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          ...cardBase, padding: '14px 16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderColor: isDark ? '#7F1D1D' : '#FECACA',
          backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
          color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: '0.85rem', fontWeight: 600
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Daftar */}
      {loading ? (
        <div style={{ ...cardBase, padding: '56px', textAlign: 'center', color: isDark ? '#94A3B8' : '#64748B' }}>
          <Loader2 size={26} className="spin" style={{ display: 'block', margin: '0 auto 12px' }} />
          Memuat berita...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardBase, padding: '56px 24px', textAlign: 'center' }}>
          <FileText size={36} style={{ color: isDark ? '#475569' : '#CBD5E1', marginBottom: '12px' }} />
          <p style={{ margin: '0 0 4px', fontWeight: 800, color: isDark ? '#E2E8F0' : '#334155' }}>
            {items.length === 0 ? 'Belum ada berita' : 'Tidak ada berita yang cocok'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#94A3B8' : '#64748B' }}>
            {items.length === 0
              ? 'Klik "Tulis Berita" untuk membuat berita pertama.'
              : 'Coba ubah kata kunci atau filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item) => {
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  ...cardBase, padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s'
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      style={{
                        width: '84px', height: '84px', borderRadius: '12px',
                        objectFit: 'cover', flexShrink: 0,
                        backgroundColor: isDark ? '#0F172A' : '#F1F5F9'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '84px', height: '84px', borderRadius: '12px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                      color: isDark ? '#475569' : '#CBD5E1'
                    }}>
                      <Newspaper size={26} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
                        textTransform: 'uppercase', padding: '3px 8px', borderRadius: '999px',
                        backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
                        color: isDark ? '#BFDBFE' : '#1D4ED8'
                      }}>
                        {KATEGORI_LABEL[item.kategori] || item.kategori}
                      </span>
                      {item.published ? (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '999px',
                          backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                          color: isDark ? '#6EE7B7' : '#047857'
                        }}>Terbit</span>
                      ) : (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '999px',
                          backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                          color: isDark ? '#FCD34D' : '#B45309'
                        }}>Draf</span>
                      )}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.72rem', fontWeight: 600,
                        color: isDark ? '#94A3B8' : '#64748B'
                      }}>
                        <Calendar size={12} /> {item.dateLabel || '-'}
                      </span>
                    </div>
                    <h3 className="rs-wrap-text" style={{
                      margin: '0 0 4px', fontSize: '1rem', fontWeight: 800,
                      color: isDark ? '#F1F5F9' : '#0F172A', lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {item.title || '(tanpa judul)'}
                    </h3>
                    <p className="rs-wrap-text" style={{
                      margin: 0, fontSize: '0.8rem', lineHeight: 1.5,
                      color: isDark ? '#94A3B8' : '#64748B',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {toExcerpt(item.content, 160) || 'Belum ada isi.'}
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '8px', flexWrap: 'wrap',
                  paddingTop: '10px',
                  borderTop: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '0.75rem', fontWeight: 600,
                    color: isDark ? '#64748B' : '#94A3B8'
                  }}>
                    <User size={12} /> {item.author || 'Anonim'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => setPreview(item)} title="Pratinjau" style={iconButton('#8B5CF6')} disabled={busy}>
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => togglePublish(item)}
                      title={item.published ? 'Jadikan draf' : 'Terbitkan'}
                      style={iconButton(item.published ? '#D97706' : '#059669')}
                      disabled={busy}
                    >
                      {item.published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => navigate(`/edit-berita?id=${item.id}`)}
                      title="Edit"
                      style={iconButton('#2563EB')}
                      disabled={busy}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      title="Hapus"
                      style={iconButton('#DC2626')}
                      disabled={busy}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal pratinjau */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '24px 16px', overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rs-modal"
            style={{
              width: '100%', maxWidth: '720px',
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: '20px', padding: '24px',
              border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                color: isDark ? '#93C5FD' : '#2563EB'
              }}>
                Pratinjau — {KATEGORI_LABEL[preview.kategori] || preview.kategori}
              </span>
              <button
                onClick={() => setPreview(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 800 }}
              >
                Tutup
              </button>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.25, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {preview.title}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              {preview.dateLabel} • {preview.author || 'Anonim'}
            </p>
            {preview.imageUrl && (
              <img
                src={preview.imageUrl}
                alt=""
                style={{ width: '100%', borderRadius: '14px', marginBottom: '16px', objectFit: 'cover' }}
              />
            )}
            <MarkdownView>{preview.content}</MarkdownView>
          </div>
        </div>
      )}
    </BeritaPageShell>
  );
};

export default Berita;
