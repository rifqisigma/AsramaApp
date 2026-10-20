import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getAuthorizedBeritaUser } from '../utils/beritaAuth';
import {
  fetchBeritaById, createBerita, updateBerita, uploadBeritaImage,
  toDateInputValue, KATEGORI_BERITA
} from '../utils/berita';
import BeritaPageShell from '../components/berita/BeritaPageShell';
import RichTextEditor from '../components/berita/RichTextEditor';
import MarkdownView from '../components/berita/MarkdownView';
import {
  Upload, X, Loader2, Save, Eye, EyeOff, AlertTriangle,
  CheckCircle2, ImagePlus, Type, Tags, Calendar
} from 'lucide-react';

const emptyForm = {
  title: '',
  kategori: 'umum',
  dateInput: toDateInputValue(new Date()),
  content: '',
  imageUrl: '',
  author: '',
  published: true,
};

const BeritaForm = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = Boolean(editId);

  const coverInputRef = useRef(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

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
      setForm((f) => ({ ...f, author: data.username || data.name || data.email || '' }));

      if (!isEdit) return;
      try {
        const b = await fetchBeritaById(editId);
        if (!b) {
          alert('Berita tidak ditemukan.');
          navigate('/berita');
          return;
        }
        setForm({
          title: b.title,
          kategori: b.kategori,
          dateInput: toDateInputValue(b.date),
          content: b.content,
          imageUrl: b.imageUrl,
          author: b.author || data.username || '',
          published: b.published,
        });
      } catch (err) {
        alert('Gagal memuat berita: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editId, isEdit, navigate]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (jpg, png, webp, dll).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5 MB.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      set('imageUrl', await uploadBeritaImage(file));
    } catch (err) {
      setError('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Judul berita wajib diisi.'); return; }
    if (!form.content.trim()) { setError('Isi berita wajib diisi.'); return; }
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateBerita(editId, form);
      } else {
        await createBerita(form);
      }
      navigate('/berita');
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan berita: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    color: isDark ? '#F1F5F9' : '#0F172A',
    fontSize: '0.9rem', fontWeight: 600, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };

  const cardStyle = {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '18px', padding: '18px'
  };

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px',
    color: isDark ? '#CBD5E1' : '#334155',
    textTransform: 'uppercase', letterSpacing: '0.03em'
  };

  if (checking || loading) {
    return (
      <BeritaPageShell theme={theme} title={isEdit ? 'Edit Berita' : 'Tulis Berita'}>
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
      title={isEdit ? 'Edit Berita' : 'Tulis Berita'}
      subtitle={isEdit
        ? 'Perbarui berita yang sudah ada. Perubahan langsung tersinkron ke website.'
        : 'Berita yang diterbitkan akan tampil di website asrama.'}
      onBack={() => navigate('/berita')}
      backLabel="Kembali ke Daftar Berita"
      maxWidth={900}
      actions={
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 18px', borderRadius: '14px',
            cursor: saving || uploading ? 'wait' : 'pointer',
            border: '2px solid #047857', backgroundColor: '#059669',
            color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 800,
            boxShadow: '0 4px 0 #047857',
            opacity: saving || uploading ? 0.7 : 1
          }}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Berita'}
        </button>
      }
    >
      {error && (
        <div style={{
          ...cardStyle, marginBottom: '16px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderColor: isDark ? '#7F1D1D' : '#FECACA',
          backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
          color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: '0.85rem', fontWeight: 700
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Judul */}
        <div style={cardStyle}>
          <label style={labelStyle}><Type size={14} /> Judul berita</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Contoh: Penerimaan Warga Baru Asrama Sukasari 2026"
            style={{ ...inputStyle, fontSize: '1.05rem', fontWeight: 700 }}
          />
        </div>

        {/* Meta: kategori, tanggal, status */}
        <div className="rs-grid" style={{ display: 'grid', gap: '16px' }}>
          <div style={cardStyle}>
            <label style={labelStyle}><Tags size={14} /> Kategori</label>
            <select
              value={form.kategori}
              onChange={(e) => set('kategori', e.target.value)}
              style={inputStyle}
            >
              {KATEGORI_BERITA.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div style={cardStyle}>
            <label style={labelStyle}><Calendar size={14} /> Tanggal terbit</label>
            <input
              type="date"
              value={form.dateInput}
              onChange={(e) => set('dateInput', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Cover */}
        <div style={cardStyle}>
          <label style={labelStyle}><ImagePlus size={14} /> Gambar utama <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: isDark ? '#94A3B8' : '#94A3B8' }}>(opsional, maks 5 MB)</span></label>
          {form.imageUrl ? (
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
              <img
                src={form.imageUrl}
                alt="Gambar utama"
                style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    border: 'none', borderRadius: '10px', padding: '8px 12px',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800,
                    backgroundColor: 'rgba(15,23,42,0.8)', color: '#FFFFFF'
                  }}
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => set('imageUrl', '')}
                  title="Hapus gambar"
                  style={{
                    border: 'none', borderRadius: '10px', padding: '8px 10px',
                    cursor: 'pointer', backgroundColor: 'rgba(220,38,38,0.9)', color: '#FFFFFF'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '36px 16px', borderRadius: '14px',
                border: `2px dashed ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                color: isDark ? '#94A3B8' : '#64748B',
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                fontSize: '0.85rem', fontWeight: 700
              }}
            >
              {uploading ? <Loader2 size={26} className="spin" /> : <Upload size={26} />}
              {uploading ? 'Mengunggah gambar...' : 'Klik untuk memilih gambar utama'}
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCover} style={{ display: 'none' }} />
        </div>

        {/* Isi berita */}
        <div style={cardStyle}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '12px', flexWrap: 'wrap', marginBottom: '10px'
          }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}><Type size={14} /> Isi berita</label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                color: isDark ? '#93C5FD' : '#2563EB',
                fontSize: '0.75rem', fontWeight: 800
              }}
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Sembunyikan pratinjau' : 'Pratinjau'}
            </button>
          </div>

          <RichTextEditor
            key={isEdit ? editId : 'new'}
            value={form.content}
            onChange={(md) => set('content', md)}
            theme={theme}
          />

          <p style={{
            margin: '8px 0 0', fontSize: '0.72rem', lineHeight: 1.5,
            color: isDark ? '#64748B' : '#94A3B8', fontWeight: 600
          }}>
            Gunakan toolbar untuk judul, tebal/miring, daftar, kutipan, tautan, gambar, tabel, dan blok kode.
            Tombol &lt;/&gt; di kanan toolbar membuka sumber Markdown untuk edit manual.
          </p>

          {showPreview && (
            <div style={{
              marginTop: '14px', padding: '18px', borderRadius: '14px',
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
            }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isDark ? '#64748B' : '#94A3B8' }}>
                Pratinjau tampilan di website
              </p>
              <MarkdownView>{form.content || ''}</MarkdownView>
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{
          ...cardStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap'
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#059669', cursor: 'pointer' }}
            />
            <span>
              <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                {form.published ? 'Terbitkan ke website' : 'Simpan sebagai draf'}
              </span>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                {form.published
                  ? 'Berita akan langsung tampil di halaman berita website asrama.'
                  : 'Berita hanya tersimpan di database dan tidak tampil di website.'}
              </span>
            </span>
          </label>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', fontWeight: 800,
            color: form.published ? '#059669' : '#D97706'
          }}>
            {form.published ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
            {form.published ? 'Terbit' : 'Draf'}
          </div>
        </div>

        {/* Aksi bawah (mobile) */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{
              flex: '1 1 200px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', borderRadius: '14px',
              cursor: saving || uploading ? 'wait' : 'pointer',
              border: '2px solid #047857', backgroundColor: '#059669',
              color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 800,
              boxShadow: '0 4px 0 #047857',
              opacity: saving || uploading ? 0.7 : 1
            }}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Berita'}
          </button>
          <button
            onClick={() => navigate('/berita')}
            style={{
              flex: '0 0 auto', padding: '14px 22px', borderRadius: '14px', cursor: 'pointer',
              border: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              color: isDark ? '#E2E8F0' : '#334155',
              fontSize: '0.9rem', fontWeight: 800
            }}
          >
            Batal
          </button>
        </div>
      </div>
    </BeritaPageShell>
  );
};

export default BeritaForm;
