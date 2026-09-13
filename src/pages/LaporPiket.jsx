import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { getCookie, setCookie, getWeeklyResetTime } from '../utils/cookie';
import { getGlobalWibDate } from '../utils/time';
import { collection, getDocs, doc, addDoc, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, CheckCircle, Search, ExternalLink, Loader, Clock, RotateCw, MapPin, User, FileImage, X, AlertCircle, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const LaporPiket = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [pageLinks, setPageLinks] = useState([]);

  // Fetch links dari databaseSPS dengan filter header == 'piket'
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const q = query(collection(db, 'databaseSPS'), where('header', '==', 'piket'));
        const snap = await getDocs(q);
        const links = [];
        snap.forEach(d => links.push({ id: d.id, ...d.data() }));
        setPageLinks(links);
      } catch (err) {
        console.error('Gagal mengambil link piket:', err);
      }
    };
    fetchLinks();
  }, []);

  // Form State
  const [place, setPlace] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLaporToUser, setSelectedLaporToUser] = useState(null);
  const [searchLaporStatus, setSearchLaporStatus] = useState('');

  // Files — auto-upload on select
  // Each entry: { file, name, size, status: 'uploading'|'done'|'error', progress: 0-100, url: string|null }
  const [fileEntries, setFileEntries] = useState([]);
  const fileInputRef = useRef(null);

  // State untuk List Piket Belum Disetujui
  const [pendingPikets, setPendingPikets] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [filterPendingQuery, setFilterPendingQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  // Helper untuk ekstrak UID dari field Firestore
  const extractUid = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field.replace(/^\/?users\//, '');
    if (field.id) return field.id;
    if (field.path) {
      const parts = field.path.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  // Helper format tanggal piket
  const formatPiketDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Fetch daftar piket milik user aktif yang belum disetujui (verification == false)
  const fetchPendingPikets = useCallback(async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    setLoadingPending(true);
    try {
      // 1. Ambil seluruh user untuk lookup nama laporTo
      const usersSnap = await getDocs(collection(db, 'users'));
      const userMap = new Map();
      usersSnap.forEach(d => {
        userMap.set(d.id, { id: d.id, ...d.data() });
      });

      // 2. Ambil seluruh data piket
      const piketSnap = await getDocs(collection(db, 'piket'));
      const list = [];

      piketSnap.forEach(d => {
        const data = d.data();
        const userPiketId = extractUid(data.userPiket);

        // Hanya piket yang dibuat oleh user saat ini dan belum diverifikasi
        if (userPiketId === currentUid && data.verification !== true) {
          let reportDate = null;
          const rawDate = data.timestamp || data.createdAt;
          if (rawDate) {
            if (typeof rawDate.toDate === 'function') {
              reportDate = rawDate.toDate();
            } else {
              reportDate = new Date(rawDate);
            }
          }

          const laporToUid = extractUid(data.laporTo);
          const laporToUserData = laporToUid ? userMap.get(laporToUid) : null;

          let buktiList = [];
          if (Array.isArray(data.buktiLink)) {
            buktiList = data.buktiLink;
          } else if (typeof data.buktiLink === 'string' && data.buktiLink) {
            buktiList = [data.buktiLink];
          }

          const isRejected = data.status === 'rejected' || data.status === 'tidak_disetujui' || data.verification === 'rejected';

          list.push({
            id: d.id,
            place: data.place || 'Piket',
            timestamp: reportDate,
            buktiLink: buktiList,
            status: isRejected ? 'rejected' : 'pending',
            rejectionNote: data.rejectionNote || '',
            laporToName: laporToUserData?.name || laporToUserData?.username || 'Pengurus',
            laporToUsername: laporToUserData?.username || '-',
            laporToJabatan: laporToUserData?.jabatan || '',
            laporToAngkatan: laporToUserData?.angkatan || '-'
          });
        }
      });

      // Urutkan dari yang paling baru
      list.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

      setPendingPikets(list);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Gagal mengambil piket belum disetujui:', err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingPikets();
  }, [fetchPendingPikets]);

  // Derived: true if any file is still uploading
  const isUploading = fileEntries.some(f => f.status === 'uploading');
  const allUploaded = fileEntries.length > 0 && fileEntries.every(f => f.status === 'done');

  const searchLaporTo = async () => {
    if (!searchQuery.trim()) return;
    setSearchLaporStatus('Mencari...');
    setSearchResults([]);
    setSelectedLaporToUser(null);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const results = [];
      const queryLower = searchQuery.trim().toLowerCase();

      snap.forEach(d => {
        const data = d.data();
        const uname = (data.username || '').toLowerCase();
        const angkatan = (data.angkatan || '').toString().toLowerCase();

        if (uname.includes(queryLower) || angkatan.includes(queryLower)) {
          results.push({ id: d.id, ...data });
        }
      });

      if (results.length === 0) {
        setSearchLaporStatus('User tidak ditemukan');
      } else {
        setSearchLaporStatus('');
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchLaporStatus('Terjadi kesalahan saat mencari.');
    }
  };

  // Auto-upload each file immediately upon selection
  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    // Get username for filename
    let myUsername = auth.currentUser?.uid || 'unknown';
    try {
      const myUserSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (myUserSnap.exists()) myUsername = myUserSnap.data().username || myUsername;
    } catch (_) {}

    for (const file of selectedFiles) {
      const entryId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newEntry = { id: entryId, file, name: file.name, size: file.size, status: 'uploading', progress: 0, url: null };

      setFileEntries(prev => [...prev, newEntry]);

      // Start upload immediately
      const extension = file.name.split('.').pop();
      const customFileName = `${myUsername}_piket_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${extension}`;
      const fileRef = ref(storage, `piket/${customFileName}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setFileEntries(prev => prev.map(f => f.id === entryId ? { ...f, progress } : f));
        },
        (error) => {
          console.error('Upload error:', error);
          setFileEntries(prev => prev.map(f => f.id === entryId ? { ...f, status: 'error' } : f));
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setFileEntries(prev => prev.map(f => f.id === entryId ? { ...f, status: 'done', progress: 100, url } : f));
          } catch (err) {
            setFileEntries(prev => prev.map(f => f.id === entryId ? { ...f, status: 'error' } : f));
          }
        }
      );
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (entryId) => {
    setFileEntries(prev => prev.filter(f => f.id !== entryId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLaporToUser) {
      alert('Silakan cari dan pilih user Lapor Ke terlebih dahulu.');
      return;
    }

    if (fileEntries.length === 0) {
      alert('Harap unggah minimal 1 bukti foto/video.');
      return;
    }

    const failedFiles = fileEntries.filter(f => f.status === 'error');
    if (failedFiles.length > 0) {
      alert(`Ada ${failedFiles.length} file yang gagal diupload. Hapus file yang gagal dan coba lagi.`);
      return;
    }

    if (isUploading || !allUploaded) {
      alert('Upload file masih berlangsung. Harap tunggu hingga semua file selesai diupload.');
      return;
    }

    // --- Rule Enforcement (cookie-based, reset tiap minggu jam 23:59 WIB) ---
    const rules = getCookie('piketRules') || {};
    const targetId = selectedLaporToUser.id;
    const now = Date.now();
    const reportTimestamps = rules[targetId] || [];

    if (reportTimestamps.length >= 3) {
      alert('Anda telah mencapai batas laporan (3x) ke user ini minggu ini.');
      return;
    }
    if (reportTimestamps.length > 0) {
      const lastReport = reportTimestamps[reportTimestamps.length - 1];
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (now - lastReport < threeDaysMs) {
        const nextAllowed = new Date(lastReport + threeDaysMs);
        alert(`Harap tunggu minimal 3 hari sebelum melaporkan lagi ke user ini.\nBoleh lapor lagi mulai: ${nextAllowed.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
        return;
      }
    }

    setLoading(true);

    try {
      // Collect all uploaded URLs — final safety check
      const uploadedUrls = fileEntries.filter(f => f.status === 'done' && f.url).map(f => f.url);

      if (uploadedUrls.length !== fileEntries.length) {
        alert('Beberapa file belum selesai diupload atau gagal. Harap tunggu atau hapus file yang bermasalah.');
        setLoading(false);
        return;
      }

      // Ambil waktu global WIB
      const globalWibDate = await getGlobalWibDate();

      // Simpan ke Firestore
      const piketData = {
        buktiLink: uploadedUrls,
        createdAt: globalWibDate,
        jenisKegiatan: 'piket',
        laporTo: doc(db, 'users', selectedLaporToUser.id),
        place: place,
        timestamp: globalWibDate,
        userPiket: doc(db, 'users', auth.currentUser.uid),
        verification: false
      };

      await addDoc(collection(db, 'piket'), piketData);

      // Update rules cookie
      const updatedTimestamps = [...reportTimestamps, now];
      rules[targetId] = updatedTimestamps;
      const resetTime = getWeeklyResetTime();
      const daysUntilReset = Math.max(1, Math.ceil((resetTime - now) / 86400000));
      setCookie('piketRules', rules, daysUntilReset);

      addNotification({
        title: 'Laporan Piket Terkirim',
        body: `Laporan piket untuk ${place} berhasil dikirim kepada ${selectedLaporToUser.username}.`,
        type: 'piket_submission'
      });

      alert('Laporan piket berhasil dikirim!');
      // Reset form dan refresh list pending piket
      setPlace('');
      setSelectedLaporToUser(null);
      setFileEntries([]);
      fetchPendingPikets();
      navigate('/home');
    } catch (error) {
      console.error('Gagal mengirim laporan:', error);
      alert('Terjadi kesalahan saat mengirim laporan.');
      setLoading(false);
    }
  };

  // Filter daftar pending piket berdasarkan input
  const filteredPendingPikets = pendingPikets.filter(item => {
    if (!filterPendingQuery.trim()) return true;
    const q = filterPendingQuery.toLowerCase();
    return (
      item.place.toLowerCase().includes(q) ||
      item.laporToName.toLowerCase().includes(q) ||
      item.laporToUsername.toLowerCase().includes(q) ||
      item.laporToJabatan.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: isDark ? '#F97316' : '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px',
          backgroundColor: isDark ? '#2D1D13' : 'white',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: isDark ? '0 2px 5px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease'
        }}>
          <ArrowLeft size={18} />
          Kembali
        </Link>

        {/* Form Header */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '10px solid #F97316',
          boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
          marginBottom: '16px',
          transition: 'all 0.3s ease'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: '0 0 12px 0' }}>
            Laporan Piket
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#6B7280', margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Harap isi laporan piket Anda dengan bukti yang jelas. Form ini akan otomatis tersimpan di sistem.
          </p>

          {/* Link dari databaseSPS */}
          {pageLinks.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pageLinks.map(item => (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    backgroundColor: isDark ? '#3D1A08' : '#FFF7ED',
                    border: `1.5px solid ${isDark ? '#C2410C' : '#FB923C'}`,
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: isDark ? '#FB923C' : '#C2410C',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    boxShadow: isDark ? '0 2px 8px rgba(249,115,22,0.15)' : '0 2px 8px rgba(249,115,22,0.08)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = isDark ? '#4D2210' : '#FED7AA';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = isDark ? '#3D1A08' : '#FFF7ED';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <ExternalLink size={16} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.75, marginBottom: '2px' }}>
                      {item.about || 'Tautan'}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                      {item.link}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tempat Section */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1C1C1E', fontWeight: 700 }}>1. Tempat Piket</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#4B5563', marginBottom: '8px' }}>Tempat Piket *</label>
              <input
                type="text"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Contoh: Dapur Bawah"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: isDark ? '1px solid #4A2E1E' : '1px solid #D1D5DB',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#000000',
                  borderBottom: `3px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = '#F97316'}
                onBlur={(e) => e.target.style.borderBottomColor = isDark ? '#4A2E1E' : '#D1D5DB'}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#4B5563', marginBottom: '8px' }}>
                Waktu Pelaksanaan (Otomatis)
              </label>
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: isDark ? '#FED7AA' : '#C2410C',
                fontSize: '0.9rem',
                fontWeight: 700
              }}>
                <Clock size={18} color="#F97316" style={{ flexShrink: 0 }} />
                <span>Tercatat otomatis sesuai Waktu Indonesia Barat (WIB) saat laporan dikirim</span>
              </div>
            </div>
          </div>

          {/* Lapor Ke Section */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1C1C1E', fontWeight: 700 }}>2. Lapor Ke Siapa?</h3>
            <p style={{ color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.85rem', marginBottom: '12px' }}>Cari berdasarkan username atau angkatan.</p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLaporTo())}
                placeholder="Contoh: Budi atau 60"
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: isDark ? '1px solid #4A2E1E' : '1px solid #D1D5DB',
                  fontSize: '1rem',
                  outline: 'none',
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#000000',
                  borderBottom: `3px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                }}
              />
              <button
                type="button"
                onClick={searchLaporTo}
                style={{
                  padding: '0 20px',
                  backgroundColor: isDark ? '#3D291C' : '#E5E7EB',
                  color: isDark ? '#FED7AA' : '#4B5563',
                  border: isDark ? '2px solid #4A2E1E' : 'none',
                  boxShadow: isDark ? '0 3px 0 #4A2E1E' : 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <Search size={18} /> Cari
              </button>
            </div>

            {searchLaporStatus && (
              <div style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#DC2626' }}>
                {searchLaporStatus}
              </div>
            )}

            {searchResults.length > 0 && !selectedLaporToUser && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>Hasil Pencarian:</span>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedLaporToUser(user);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                      border: isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#2D1D13' : '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#1E130C' : '#F9FAFB'}
                  >
                    <span style={{ fontWeight: 700 }}>{user.name || user.username}</span> — {user.prodi || 'Prodi tidak diketahui'} — Angkatan {user.angkatan || '?'}
                  </div>
                ))}
              </div>
            )}

            {selectedLaporToUser && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: isDark ? '#1C3D27' : '#ECFDF5',
                border: '1px solid #10B981',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#10B981' : '#047857', fontWeight: 700, fontSize: '0.95rem' }}>
                  <CheckCircle size={18} />
                  Terpilih: {selectedLaporToUser.name || selectedLaporToUser.username} ({selectedLaporToUser.angkatan})
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLaporToUser(null)}
                  style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          {/* Upload Bukti Section */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1C1C1E', fontWeight: 700 }}>3. Upload Bukti Piket</h3>
            <p style={{ color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>
              Unggah foto atau video hasil piket Anda. File langsung di-upload saat dipilih.
            </p>

            {isUploading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderRadius: '12px',
                marginBottom: '12px',
                color: '#F97316',
                fontSize: '0.85rem',
                fontWeight: 700
              }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Sedang mengupload file... Harap tunggu sebelum submit.</span>
              </div>
            )}

            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
              border: isDark ? '2px dashed #4A2E1E' : '2px dashed #D1D5DB',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s',
            }}>
              <Upload size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
              <span style={{ fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>Tambah File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {fileEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fileEntries.map((entry) => {
                  const isVideo = entry.file?.type?.startsWith('video/');
                  const objectUrl = entry.file ? URL.createObjectURL(entry.file) : '';
                  const isDone = entry.status === 'done';
                  const isError = entry.status === 'error';
                  const isFileUploading = entry.status === 'uploading';

                  return (
                    <div key={entry.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                      border: isError ? '2px solid #FCA5A5' : isDone ? '2px solid #86EFAC' : (isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB'),
                      borderRadius: '12px',
                      color: isDark ? '#FFFFFF' : '#000000'
                    }}>
                      {isVideo ? (
                        <video src={objectUrl} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#000' }} />
                      ) : (
                        <img src={objectUrl} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      )}

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{entry.name}</p>
                          {isDone && <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />}
                          {isFileUploading && <Loader size={16} color="#F97316" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />}
                          {isError && <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', flexShrink: 0 }}>Gagal!</span>}
                        </div>
                        {isFileUploading && (
                          <div style={{ width: '100%', height: '4px', backgroundColor: isDark ? '#3D291C' : '#E5E7EB', borderRadius: '2px', marginTop: '6px' }}>
                            <div style={{ width: `${entry.progress}%`, height: '100%', backgroundColor: '#F97316', borderRadius: '2px', transition: 'width 0.2s' }}></div>
                          </div>
                        )}
                        {isDone && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981', marginTop: '2px', display: 'block' }}>✅ Upload selesai</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(entry.id)}
                        disabled={isFileUploading}
                        style={{ color: isFileUploading ? '#9CA3AF' : '#DC2626', background: 'none', border: 'none', fontWeight: 700, cursor: isFileUploading ? 'not-allowed' : 'pointer', padding: '8px' }}
                      >
                        Hapus
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={loading || !allUploaded}
              style={{
                padding: '16px 32px',
                backgroundColor: (loading || !allUploaded) ? '#FDBA74' : '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '32px',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: (loading || !allUploaded) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || !allUploaded) ? 'none' : '0 4px 12px rgba(249, 115, 22, 0.3)',
                transition: 'transform 0.1s',
                opacity: (loading || !allUploaded) ? 0.6 : 1
              }}
              onMouseDown={(e) => !(loading || !allUploaded) && (e.target.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.target.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            >
              {isUploading ? 'Menunggu Upload...' : loading ? 'Mengirim...' : fileEntries.length === 0 ? 'Upload Bukti Dulu' : fileEntries.some(f => f.status === 'error') ? 'Ada File Gagal' : 'Kirim Laporan'}
            </button>
          </div>

          {/* Spin animation for loader */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>

        </form>

        {/* ========================================================================= */}
        {/* SECTION: LIST PIKET BELUM DISETUJUI PER USER */}
        {/* ========================================================================= */}
        <div style={{
          marginTop: '32px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '6px solid #F97316',
          boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease'
        }}>
          {/* Header Section */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: `1px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '6px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#431407' : '#FFEDD5',
                  color: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={20} />
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: isDark ? '#FFFFFF' : '#1C1C1E'
                }}>
                  Piket Belum Disetujui
                </h3>
              </div>

              <div style={{
                marginTop: '6px',
                fontSize: '0.85rem',
                color: isDark ? '#FED7AA' : '#6B7280',
                fontWeight: 600
              }}>
                <span>Daftar laporan piket Anda yang sedang menunggu verifikasi.</span>
                {lastRefreshed && (
                  <span style={{ opacity: 0.8, fontSize: '0.8rem', display: 'block', marginTop: '2px' }}>
                    • Update: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Total Badge & Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                padding: '6px 12px',
                backgroundColor: isDark ? '#431407' : '#FFF7ED',
                border: `1px solid ${isDark ? '#EA580C' : '#FDBA74'}`,
                borderRadius: '20px',
                color: isDark ? '#FDBA74' : '#C2410C',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={14} />
                <span>{pendingPikets.length} Menunggu</span>
              </div>

              <button
                type="button"
                onClick={fetchPendingPikets}
                disabled={loadingPending}
                title="Segarkan daftar"
                style={{
                  padding: '8px 14px',
                  backgroundColor: isDark ? '#3D291C' : '#F3F4F6',
                  color: isDark ? '#FED7AA' : '#4B5563',
                  border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: loadingPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  opacity: loadingPending ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loadingPending) e.currentTarget.style.backgroundColor = isDark ? '#4A2E1E' : '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  if (!loadingPending) e.currentTarget.style.backgroundColor = isDark ? '#3D291C' : '#F3F4F6';
                }}
              >
                <RotateCw size={15} style={{ animation: loadingPending ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>{loadingPending ? 'Memuat...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Search jika data lebih dari 3 */}
          {pendingPikets.length > 3 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                borderRadius: '10px',
                padding: '8px 12px'
              }}>
                <Search size={16} color={isDark ? '#FED7AA' : '#9CA3AF'} />
                <input
                  type="text"
                  value={filterPendingQuery}
                  onChange={(e) => setFilterPendingQuery(e.target.value)}
                  placeholder="Cari tempat atau penerima laporan..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.85rem',
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    fontWeight: 600
                  }}
                />
                {filterPendingQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterPendingQuery('')}
                    style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body Content */}
          {loadingPending ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: isDark ? '#FED7AA' : '#6B7280'
            }}>
              <RotateCw size={24} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#F97316' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Memuat daftar piket...</p>
            </div>
          ) : filteredPendingPikets.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              borderRadius: '12px',
              border: `1px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#2D1D13' : '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <CheckCircle size={22} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                {filterPendingQuery ? 'Piket Tidak Ditemukan' : 'Tidak Ada Piket Pending'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#6B7280' }}>
                {filterPendingQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : 'Semua laporan piket yang Anda kirim telah disetujui atau belum ada laporan baru.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredPendingPikets.map((item, index) => (
                <div
                  key={item.id || index}
                  style={{
                    padding: '16px',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                    borderLeft: item.status === 'rejected' ? '6px solid #EF4444' : '6px solid #F59E0B',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Row 1: Tempat & Status Badge */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={18} color="#F97316" style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: isDark ? '#FFFFFF' : '#1F2937'
                      }}>
                        {item.place}
                      </span>
                    </div>

                    {item.status === 'rejected' ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2',
                        border: `1px solid ${isDark ? '#DC2626' : '#FCA5A5'}`,
                        color: isDark ? '#FCA5A5' : '#DC2626',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        <AlertCircle size={12} />
                        <span>Tidak Disetujui</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                        border: `1px solid ${isDark ? '#D97706' : '#FDE68A'}`,
                        color: isDark ? '#FCD34D' : '#B45309',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        <Clock size={12} />
                        <span>Menunggu TTD</span>
                      </div>
                    )}
                  </div>

                  {/* Catatan Penolakan jika ada */}
                  {item.status === 'rejected' && item.rejectionNote && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                      border: `1px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
                      borderRadius: '8px',
                      color: isDark ? '#FCA5A5' : '#B91C1C',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      <strong>Catatan Pengurus:</strong> {item.rejectionNote}
                    </div>
                  )}

                  {/* Row 2: Lapor Kepada & Waktu */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                    fontSize: '0.85rem',
                    color: isDark ? '#FED7AA' : '#4B5563'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color={isDark ? '#FB923C' : '#F97316'} />
                      <span>
                        Lapor ke: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>@{item.laporToUsername}</strong>
                        {item.laporToJabatan && ` (${item.laporToJabatan})`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color={isDark ? '#FB923C' : '#F97316'} />
                      <span>{formatPiketDate(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Row 3: Bukti Foto / Video Thumbnails */}
                  {item.buktiLink && item.buktiLink.length > 0 && (
                    <div style={{
                      paddingTop: '8px',
                      borderTop: `1px dashed ${isDark ? '#3D291C' : '#E5E7EB'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileImage size={13} /> Bukti:
                      </span>
                      {item.buktiLink.map((url, imgIdx) => {
                        const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
                        return (
                          <div
                            key={imgIdx}
                            onClick={() => setPreviewMedia({ url, type: isVideo ? 'video' : 'image' })}
                            style={{
                              position: 'relative',
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: `1.5px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                              backgroundColor: '#000000'
                            }}
                            title="Klik untuk melihat bukti"
                          >
                            {isVideo ? (
                              <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={url} alt="bukti" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Pratinjau Media */}
        {previewMedia && (
          <div
            onClick={() => setPreviewMedia(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                style={{
                  position: 'absolute',
                  top: '-44px',
                  right: 0,
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}
              >
                <X size={20} color="#000000" />
              </button>

              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt="Pratinjau Bukti"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    borderRadius: '12px',
                    objectFit: 'contain',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LaporPiket;

