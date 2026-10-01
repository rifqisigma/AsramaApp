import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getCookie, setCookie, getWeeklyResetTime } from '../utils/cookie';
import { getGlobalWibDate } from '../utils/time';
import { collection, getDocs, doc, addDoc, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, CheckCircle, Search, ExternalLink, Loader, Clock, RotateCw, MapPin, User, FileImage, X, AlertCircle, Calendar, Sparkles, CheckCircle2, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const LaporPiket = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [pageLinks, setPageLinks] = useState([]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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

  // State untuk Tab List & Data Piket
  const [listTab, setListTab] = useState('TODAY_ALL'); // 'TODAY_ALL' | 'MY_PENDING'
  const [myPikets, setMyPikets] = useState([]);
  const [pendingPikets, setPendingPikets] = useState([]);
  const [todayPikets, setTodayPikets] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  
  // Filters
  const [filterPendingQuery, setFilterPendingQuery] = useState('');
  const [filterPendingStatus, setFilterPendingStatus] = useState('ALL'); // 'ALL' | 'pending' | 'verified' | 'rejected'
  const [filterTodayQuery, setFilterTodayQuery] = useState('');
  const [filterTodayStatus, setFilterTodayStatus] = useState('ALL'); // 'ALL' | 'verified' | 'pending'

  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  // Helper untuk ekstrak UID dari field Firestore (mendukung DocRef, string, object)
  const extractUid = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field.replace(/^\/?users\//, '').trim();
    if (field.id) return String(field.id).trim();
    if (field.uid) return String(field.uid).trim();
    if (field._key?.path?.segments) {
      const segs = field._key.path.segments;
      return String(segs[segs.length - 1]).trim();
    }
    if (field.path) {
      const parts = field.path.split('/');
      return String(parts[parts.length - 1]).trim();
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

  // Helper cek apakah tanggal adalah hari ini (WIB)
  const isTodayWib = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return false;
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric', day: 'numeric' };
    try {
      return dateObj.toLocaleDateString('id-ID', options) === now.toLocaleDateString('id-ID', options);
    } catch {
      return (
        dateObj.getFullYear() === now.getFullYear() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getDate() === now.getDate()
      );
    }
  };

  // Fetch seluruh data piket (piket milik user login & semua piket hari ini)
  const fetchAllPiketLists = useCallback(async () => {
    const currentUid = (auth.currentUser?.uid || currentUser?.uid || '').trim();
    setLoadingPending(true);
    try {
      // 1. Ambil seluruh user untuk lookup info pembuat piket dan laporTo
      const usersSnap = await getDocs(collection(db, 'users'));
      const userMap = new Map();
      usersSnap.forEach(d => {
        userMap.set(d.id, { id: d.id, ...d.data() });
      });

      // 2. Ambil seluruh data piket
      const piketSnap = await getDocs(collection(db, 'piket'));
      const myList = [];
      const pendingList = [];
      const todayList = [];

      piketSnap.forEach(d => {
        const data = d.data();
        const userPiketId = extractUid(data.userPiket);
        const userPiketData = userPiketId ? userMap.get(userPiketId) : null;

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
        const isVerified = data.verification === true;

        const piketItem = {
          id: d.id,
          place: data.place || 'Piket',
          timestamp: reportDate,
          buktiLink: buktiList,
          verification: isVerified,
          status: isRejected ? 'rejected' : (isVerified ? 'verified' : 'pending'),
          rejectionNote: data.rejectionNote || data.rejection_reason || data.alasan || '',
          userPiketId: userPiketId,
          userPiketName: userPiketData?.name || userPiketData?.username || 'Penghuni Asrama',
          userPiketUsername: userPiketData?.username || 'penghuni',
          userPiketAngkatan: userPiketData?.angkatan || '?',
          userPiketProdi: userPiketData?.prodi || '',
          userPiketFoto: userPiketData?.fotoProfil || '',
          userPiketJabatan: userPiketData?.jabatan || '',
          laporToName: laporToUserData?.name || laporToUserData?.username || 'Pengurus',
          laporToUsername: laporToUserData?.username || '-',
          laporToJabatan: laporToUserData?.jabatan || '',
          laporToAngkatan: laporToUserData?.angkatan || '-'
        };

        // A. Cek apakah ini laporan piket milik user login (Identik dengan Dashboard Home)
        const isMyPiket = Boolean(
          currentUid && (
            (data.userPiket && (data.userPiket.id === currentUid || String(data.userPiket.id).trim() === currentUid)) ||
            (userPiketId && userPiketId === currentUid) ||
            (typeof data.userPiket === 'string' && data.userPiket.replace(/^\/?users\//, '').trim() === currentUid) ||
            (data.userId && String(data.userId).trim() === currentUid) ||
            (data.userPiketId && String(data.userPiketId).trim() === currentUid) ||
            (data.uid && String(data.uid).trim() === currentUid) ||
            (data.user && String(data.user).trim() === currentUid)
          )
        );

        if (isMyPiket && !isVerified) {
          myList.push(piketItem);
          pendingList.push(piketItem);
        }

        // B. Piket Siapa Saja Yang Sudah Piket Hari Ini
        if (isTodayWib(reportDate)) {
          todayList.push(piketItem);
        }
      });

      // Urutkan dari yang paling baru
      myList.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
      pendingList.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
      todayList.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

      setMyPikets(myList);
      setPendingPikets(pendingList);
      setTodayPikets(todayList);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Gagal mengambil daftar piket:', err);
    } finally {
      setLoadingPending(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAllPiketLists();
  }, [fetchAllPiketLists]);

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
      fetchAllPiketLists();
      navigate('/home');
    } catch (error) {
      console.error('Gagal mengirim laporan:', error);
      alert('Terjadi kesalahan saat mengirim laporan.');
      setLoading(false);
    }
  };

  // Filter daftar piket belum disetujui milik user login (Menunggu & Tidak Disetujui)
  const filteredMyPikets = myPikets.filter(item => {
    // Filter status
    if (filterPendingStatus === 'pending' && item.status === 'rejected') return false;
    if (filterPendingStatus === 'rejected' && item.status !== 'rejected') return false;

    // Filter text pencarian
    if (!filterPendingQuery.trim()) return true;
    const q = filterPendingQuery.toLowerCase().trim();
    return (
      (item.place || '').toLowerCase().includes(q) ||
      (item.laporToName || '').toLowerCase().includes(q) ||
      (item.laporToUsername || '').toLowerCase().includes(q) ||
      (item.laporToJabatan || '').toLowerCase().includes(q)
    );
  });

  // Filter daftar piket seluruh user hari ini
  const filteredTodayPikets = todayPikets.filter(item => {
    // Filter status
    if (filterTodayStatus === 'verified' && !item.verification) return false;
    if (filterTodayStatus === 'pending' && (item.verification || item.status === 'rejected')) return false;
    if (filterTodayStatus === 'rejected' && item.status !== 'rejected') return false;

    // Filter search text (nama siswa, angkatan, tempat piket, atau laporTo)
    if (filterTodayQuery.trim()) {
      const q = filterTodayQuery.toLowerCase().trim();
      const uName = (item.userPiketName || '').toLowerCase();
      const uUname = (item.userPiketUsername || '').toLowerCase();
      const uAngk = String(item.userPiketAngkatan || '').toLowerCase();
      const uPlace = (item.place || '').toLowerCase();
      const lToName = (item.laporToName || '').toLowerCase();
      const lToUname = (item.laporToUsername || '').toLowerCase();
      if (!uName.includes(q) && !uUname.includes(q) && !uAngk.includes(q) && !uPlace.includes(q) && !lToName.includes(q) && !lToUname.includes(q)) {
        return false;
      }
    }
    return true;
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
        {/* SECTION: TABS DAFTAR PIKET (HARI INI & MILIK SAYA) */}
        {/* ========================================================================= */}
        <div style={{
          marginTop: '32px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '6px solid #F97316',
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5, 0 10px 15px rgba(249, 115, 22, 0.05)',
          transition: 'all 0.3s ease'
        }}>

          {/* 🔘 Segmented Tab Control (Duolingo 3D Button Style) */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => setListTab('TODAY_ALL')}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: listTab === 'TODAY_ALL' 
                  ? '2px solid #F97316' 
                  : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: listTab === 'TODAY_ALL' 
                  ? (isDark ? '#3D291C' : '#FFF7ED') 
                  : (isDark ? '#1E130C' : '#FFFFFF'),
                color: listTab === 'TODAY_ALL' ? '#F97316' : (isDark ? '#FED7AA' : '#6B7280'),
                fontWeight: 900,
                fontSize: '0.88rem',
                boxShadow: listTab === 'TODAY_ALL' 
                  ? (isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5') 
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
            >
              <Sparkles size={16} strokeWidth={2.5} />
              <span>Sudah Piket Hari Ini ({todayPikets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setListTab('MY_PENDING')}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: listTab === 'MY_PENDING' 
                  ? '2px solid #F97316' 
                  : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: listTab === 'MY_PENDING' 
                  ? (isDark ? '#3D291C' : '#FFF7ED') 
                  : (isDark ? '#1E130C' : '#FFFFFF'),
                color: listTab === 'MY_PENDING' ? '#F97316' : (isDark ? '#FED7AA' : '#6B7280'),
                fontWeight: 900,
                fontSize: '0.88rem',
                boxShadow: listTab === 'MY_PENDING' 
                  ? (isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5') 
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
            >
              <Clock size={16} strokeWidth={2.5} />
              <span>Piket Saya ({pendingPikets.length})</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: DAFTAR SIAPA SAJA YANG SUDAH PIKET HARI INI */}
          {/* ================================================================= */}
          {listTab === 'TODAY_ALL' && (
            <div>
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
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Users size={20} />
                    </div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      color: isDark ? '#FFFFFF' : '#1C1C1E'
                    }}>
                      Siapa Saja yang Sudah Piket Hari Ini
                    </h3>
                  </div>

                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.85rem',
                    color: isDark ? '#FED7AA' : '#6B7280',
                    fontWeight: 600
                  }}>
                    <span>Daftar seluruh penghuni yang telah mengisi laporan piket hari ini.</span>
                    {lastRefreshed && (
                      <span style={{ opacity: 0.8, fontSize: '0.8rem', display: 'block', marginTop: '2px' }}>
                        • Update: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Counter & Refresh Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
                    border: `1px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
                    borderRadius: '20px',
                    color: isDark ? '#86EFAC' : '#15803D',
                    fontWeight: 850,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CheckCircle2 size={14} />
                    <span>{todayPikets.length} Hari Ini</span>
                  </div>

                  <button
                    type="button"
                    onClick={fetchAllPiketLists}
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

              {/* Quick Search & Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  borderRadius: '14px',
                  padding: '8px 14px'
                }}>
                  <Search size={16} color={isDark ? '#FED7AA' : '#9CA3AF'} />
                  <input
                    type="text"
                    value={filterTodayQuery}
                    onChange={(e) => setFilterTodayQuery(e.target.value)}
                    placeholder="Cari nama penghuni, angkatan, tempat piket..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.88rem',
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      fontWeight: 700,
                      fontFamily: '"Nunito", "Inter", sans-serif'
                    }}
                  />
                  {filterTodayQuery && (
                    <button
                      type="button"
                      onClick={() => setFilterTodayQuery('')}
                      style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Filter Pills (Semua, Disetujui, Menunggu TTD) */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { key: 'ALL', label: `Semua (${todayPikets.length})` },
                    { key: 'verified', label: `Disetujui (${todayPikets.filter(p => p.verification).length})` },
                    { key: 'pending', label: `Menunggu TTD (${todayPikets.filter(p => !p.verification && p.status !== 'rejected').length})` }
                  ].map(tab => {
                    const isActive = filterTodayStatus === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterTodayStatus(tab.key)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: isActive ? '1.5px solid #F97316' : `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                          backgroundColor: isActive ? (isDark ? '#3D291C' : '#FFF7ED') : (isDark ? '#1E130C' : '#FFFFFF'),
                          color: isActive ? '#F97316' : (isDark ? '#FED7AA' : '#6B7280'),
                          transition: 'all 0.1s'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body Content: Today's Piket List */}
              {loadingPending ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: isDark ? '#FED7AA' : '#6B7280'
                }}>
                  <RotateCw size={24} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#F97316' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Memuat daftar piket hari ini...</p>
                </div>
              ) : filteredTodayPikets.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  borderRadius: '16px',
                  border: `1.5px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🧹</span>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                    {filterTodayQuery ? 'Penghuni Tidak Ditemukan' : 'Belum Ada yang Piket Hari Ini'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
                    {filterTodayQuery
                      ? 'Coba gunakan kata kunci pencarian yang lain.'
                      : 'Belum ada laporan piket yang dikirim hari ini. Jadilah yang pertama mengisi laporan!'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTodayPikets.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                        borderLeft: item.verification 
                          ? '6px solid #10B981' 
                          : (item.status === 'rejected' ? '6px solid #EF4444' : '6px solid #F59E0B'),
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Row 1: Profile Penghuni & Status Badge */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <img
                            src={item.userPiketFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userPiketName)}&background=F97316&color=fff&size=80&bold=true`}
                            alt={item.userPiketName}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #F97316',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '0.98rem', 
                              fontWeight: 900, 
                              color: isDark ? '#FFFFFF' : '#1F2937',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.userPiketName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: '#F97316',
                                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                border: '1px solid #F97316'
                              }}>
                                Angkatan {item.userPiketAngkatan}
                              </span>
                              {item.userPiketJabatan && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: isDark ? '#FED7AA' : '#6B7280',
                                  textTransform: 'capitalize'
                                }}>
                                  • {item.userPiketJabatan}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        {item.verification ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
                            border: `1px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
                            color: isDark ? '#86EFAC' : '#15803D',
                            fontSize: '0.75rem',
                            fontWeight: 850,
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={12} />
                            <span>Disetujui</span>
                          </div>
                        ) : item.status === 'rejected' ? (
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
                            fontWeight: 850,
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
                            fontWeight: 850,
                            flexShrink: 0
                          }}>
                            <Clock size={12} />
                            <span>Menunggu TTD</span>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Tempat & Lapor Ke & Jam */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: '8px',
                        fontSize: '0.85rem',
                        color: isDark ? '#FED7AA' : '#4B5563',
                        padding: '8px 12px',
                        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                        borderRadius: '12px',
                        border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={15} color="#F97316" style={{ flexShrink: 0 }} />
                          <span>Tempat: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>{item.place}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={15} color={isDark ? '#FB923C' : '#F97316'} style={{ flexShrink: 0 }} />
                          <span>Lapor ke: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>@{item.laporToUsername}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} color={isDark ? '#FB923C' : '#F97316'} style={{ flexShrink: 0 }} />
                          <span>Waktu: <strong>{item.timestamp ? item.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}</strong></span>
                        </div>
                      </div>

                      {/* Row 3: Bukti Foto / Video Thumbnails */}
                      {item.buktiLink && item.buktiLink.length > 0 && (
                        <div style={{
                          paddingTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 750, color: isDark ? '#FED7AA' : '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileImage size={13} /> Bukti Piket:
                          </span>
                          {item.buktiLink.map((url, imgIdx) => {
                            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
                            return (
                              <div
                                key={imgIdx}
                                onClick={() => setPreviewMedia({ url, type: isVideo ? 'video' : 'image' })}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                                  backgroundColor: '#000000',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
          )}

          {/* ================================================================= */}
          {/* TAB 2: DAFTAR PIKET MILIK USER LOGIN (PIKET SAYA) */}
          {/* ================================================================= */}
          {listTab === 'MY_PENDING' && (
            <div>
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
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
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
                      fontWeight: 900,
                      color: isDark ? '#FFFFFF' : '#1C1C1E'
                    }}>
                      Laporan Piket Saya (Belum Disetujui)
                    </h3>
                  </div>

                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.85rem',
                    color: isDark ? '#FED7AA' : '#6B7280',
                    fontWeight: 600
                  }}>
                    <span>Daftar laporan piket Anda yang berstatus Menunggu TTD atau Tidak Disetujui.</span>
                    {lastRefreshed && (
                      <span style={{ opacity: 0.8, fontSize: '0.8rem', display: 'block', marginTop: '2px' }}>
                        • Update: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Counter & Refresh Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                    border: `1px solid ${isDark ? '#F97316' : '#FDBA74'}`,
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    color: '#F97316'
                  }}>
                    {myPikets.filter(p => p.status !== 'rejected').length} Menunggu
                  </div>

                  <button
                    type="button"
                    onClick={fetchAllPiketLists}
                    disabled={loadingPending}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                      backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                      color: isDark ? '#FED7AA' : '#4B5563',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: loadingPending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                    title="Muat ulang daftar piket"
                  >
                    <RotateCw size={14} style={{ animation: loadingPending ? 'spin 1s linear infinite' : 'none' }} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Search Bar & Status Filter Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  borderRadius: '14px',
                  padding: '8px 14px'
                }}>
                  <Search size={16} color={isDark ? '#FED7AA' : '#9CA3AF'} />
                  <input
                    type="text"
                    value={filterPendingQuery}
                    onChange={(e) => setFilterPendingQuery(e.target.value)}
                    placeholder="Cari tempat atau nama penerima laporan..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.88rem',
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      fontWeight: 700,
                      fontFamily: '"Nunito", "Inter", sans-serif'
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

                {/* Status Filter Pills for Piket Saya (Menunggu & Tidak Disetujui) */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'ALL', label: `Semua (${myPikets.length})` },
                    { key: 'pending', label: `Menunggu TTD (${myPikets.filter(p => p.status !== 'rejected').length})` },
                    { key: 'rejected', label: `Tidak Disetujui (${myPikets.filter(p => p.status === 'rejected').length})` }
                  ].map(tab => {
                    const isActive = filterPendingStatus === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterPendingStatus(tab.key)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: isActive ? '1.5px solid #F97316' : `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                          backgroundColor: isActive ? (isDark ? '#3D291C' : '#FFF7ED') : (isDark ? '#1E130C' : '#FFFFFF'),
                          color: isActive ? '#F97316' : (isDark ? '#FED7AA' : '#6B7280'),
                          transition: 'all 0.1s'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body Content: User's Piket List */}
              {loadingPending ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: isDark ? '#FED7AA' : '#6B7280'
                }}>
                  <RotateCw size={24} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#F97316' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Memuat daftar piket Anda...</p>
                </div>
              ) : filteredMyPikets.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  borderRadius: '16px',
                  border: `1.5px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📋</span>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                    {filterPendingQuery ? 'Laporan Tidak Ditemukan' : 'Tidak Ada Laporan Piket'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
                    {filterPendingQuery
                      ? 'Coba gunakan kata kunci pencarian yang lain.'
                      : filterPendingStatus === 'pending'
                        ? 'Semua laporan piket Anda sudah diproses / disetujui.'
                        : 'Belum ada data laporan piket yang dikirimkan.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredMyPikets.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                        borderLeft: item.verification 
                          ? '6px solid #10B981' 
                          : (item.status === 'rejected' ? '6px solid #EF4444' : '6px solid #F59E0B'),
                        borderRadius: '16px',
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
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                            color: '#F97316',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            flexShrink: 0
                          }}>
                            <MapPin size={18} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '1rem', 
                              fontWeight: 900, 
                              color: isDark ? '#FFFFFF' : '#1F2937',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.place}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
                              Dilaporkan: {formatPiketDate(item.timestamp)}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        {item.verification ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
                            border: `1px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
                            color: isDark ? '#86EFAC' : '#15803D',
                            fontSize: '0.75rem',
                            fontWeight: 850,
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={12} />
                            <span>Disetujui</span>
                          </div>
                        ) : item.status === 'rejected' ? (
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
                            fontWeight: 850,
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
                            fontWeight: 850,
                            flexShrink: 0
                          }}>
                            <Clock size={12} />
                            <span>Menunggu TTD</span>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Info Penerima Laporan (Lapor Ke) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '8px',
                        fontSize: '0.85rem',
                        color: isDark ? '#FED7AA' : '#4B5563',
                        padding: '8px 12px',
                        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                        borderRadius: '12px',
                        border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={15} color="#F97316" style={{ flexShrink: 0 }} />
                          <span>Lapor ke: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>@{item.laporToUsername}</strong> ({item.laporToName})</span>
                        </div>

                        {item.laporToJabatan && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: isDark ? '#FED7AA' : '#6B7280' }}>
                              Jabatan: <strong>{item.laporToJabatan}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Catatan Penolakan (Jika Ada) */}
                      {item.rejectionNote && (
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: isDark ? '#3D1414' : '#FEF2F2',
                          border: `1px solid ${isDark ? '#991B1B' : '#F87171'}`,
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          color: isDark ? '#FCA5A5' : '#B91C1C'
                        }}>
                          <strong>Alasan Penolakan:</strong> {item.rejectionNote}
                        </div>
                      )}

                      {/* Row 3: Bukti Foto / Video Thumbnails */}
                      {item.buktiLink && item.buktiLink.length > 0 && (
                        <div style={{
                          paddingTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 750, color: isDark ? '#FED7AA' : '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileImage size={13} /> Bukti Unggahan:
                          </span>
                          {item.buktiLink.map((url, imgIdx) => {
                            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
                            return (
                              <div
                                key={imgIdx}
                                onClick={() => setPreviewMedia({ url, type: isVideo ? 'video' : 'image' })}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                                  backgroundColor: '#000000',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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

