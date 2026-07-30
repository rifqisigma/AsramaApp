import { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs, doc, addDoc, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, CheckCircle, Search, X, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LaporJamal = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [pageLinks, setPageLinks] = useState([]);

  // Fetch links dari databaseSPS dengan filter header == 'jamal'
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const q = query(collection(db, 'databaseSPS'), where('header', '==', 'jamal'));
        const snap = await getDocs(q);
        const links = [];
        snap.forEach(d => links.push({ id: d.id, ...d.data() }));
        setPageLinks(links);
      } catch (err) {
        console.error('Gagal mengambil link jamal:', err);
      }
    };
    fetchLinks();
  }, []);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Multiple users array
  const [searchStatus, setSearchStatus] = useState('');

  // Files
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchStatus('Mencari...');
    setSearchResults([]);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const results = [];
      const queryLower = searchQuery.trim().toLowerCase();

      snap.forEach(d => {
        const data = d.data();
        const uname = (data.username || '').toLowerCase();
        const angkatan = (data.angkatan || '').toString().toLowerCase();
        const name = (data.name || '').toLowerCase();

        if (uname.includes(queryLower) || angkatan.includes(queryLower) || name.includes(queryLower)) {
          // Hanya tambahkan jika belum ada di list selectedUsers
          if (!selectedUsers.find(u => u.id === d.id)) {
            results.push({ id: d.id, ...data });
          }
        }
      });

      if (results.length === 0) {
        setSearchStatus('User tidak ditemukan atau sudah ditambahkan.');
      } else {
        setSearchStatus('');
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setSearchStatus('Terjadi kesalahan saat mencari.');
    }
  };

  const addUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      alert("Silakan cari dan pilih setidaknya 1 penghuni yang bertugas jam malam.");
      return;
    }

    if (files.length === 0) {
      alert("Harap unggah minimal 1 bukti foto/video.");
      return;
    }

    setLoading(true);

    try {
      // Dapatkan username user yang login
      const myUserSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const myUsername = myUserSnap.exists() ? myUserSnap.data().username : auth.currentUser.uid;

      // 1. Upload Files
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split('.').pop();
        const customFileName = `jamal_${myUsername}_${Date.now()}_${i}.${extension}`;

        const fileRef = ref(storage, `jamal/${customFileName}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedUrls.push(url);
              resolve();
            }
          );
        });
      }

      // 2. Simpan ke Firestore
      const jamalData = {
        WhoVerification: null, // belum diverifikasi, jadi kosong (atau isi jika butuh dummy)
        buktiLink: uploadedUrls,
        timestamp: new Date().toISOString(), // format ISO sesuai permintaan (contoh: "2026-05-20T15:22:22Z")
        usertoJamal: selectedUsers.map(u => doc(db, 'users', u.id)), // Array of user references
        verification: false
      };

      await addDoc(collection(db, 'jamal'), jamalData);

      alert("Laporan jam malam berhasil dikirim!");
      navigate('/home');
    } catch (error) {
      console.error("Gagal mengirim laporan:", error);
      alert("Terjadi kesalahan saat mengirim laporan.");
      setLoading(false);
    }
  };

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
          borderTop: '10px solid #8B5CF6', // Purple color for Jamal
          boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
          transition: 'all 0.3s ease'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: '0 0 12px 0' }}>
            Laporan Jam Malam (Jamal)
          </h1>
          <div style={{ 
            backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2', 
            border: `1px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`, 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '16px',
            transition: 'all 0.3s ease'
          }}>
            <p style={{ color: isDark ? '#FCA5A5' : '#B91C1C', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
              Ketentuan Wajib Dibaca:
            </p>
            <p style={{ color: isDark ? '#FCA5A5' : '#991B1B', margin: '8px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>
              1. Yang mensubmit laporan jam malam hanya perwakilan atau salah satu dari penghuni yang bertugas jam malam.
            </p>
          </div>

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
                    backgroundColor: isDark ? '#1E1040' : '#F5F3FF',
                    border: `1.5px solid ${isDark ? '#7C3AED' : '#A78BFA'}`,
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: isDark ? '#A78BFA' : '#6D28D9',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    boxShadow: isDark ? '0 2px 8px rgba(139,92,246,0.15)' : '0 2px 8px rgba(139,92,246,0.08)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = isDark ? '#2D1B69' : '#EDE9FE';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = isDark ? '#1E1040' : '#F5F3FF';
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

          {/* Penghuni Bertugas Section */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1C1C1E', fontWeight: 700 }}>1. Penghuni Bertugas</h3>
            <p style={{ color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.85rem', marginBottom: '12px' }}>Cari dan tambahkan siapa saja yang sedang bertugas jam malam bersamamu.</p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = '#8B5CF6'}
                onBlur={(e) => e.target.style.borderBottomColor = isDark ? '#4A2E1E' : '#D1D5DB'}
              />
              <button
                type="button"
                onClick={searchUsers}
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

            {searchStatus && (
              <div style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 700, color: '#DC2626' }}>
                {searchStatus}
              </div>
            )}

            {/* Hasil Pencarian */}
            {searchResults.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>Hasil Pencarian:</span>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    onClick={() => addUser(user)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                      border: isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#2D1D13' : '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#1E130C' : '#F9FAFB'}
                  >
                    <span><span style={{ fontWeight: 700 }}>{user.name || user.username}</span> - {user.prodi || '?'} (Angkatan {user.angkatan || '?'})</span>
                    <span style={{ color: '#8B5CF6', fontWeight: 800, fontSize: '1.2rem' }}>+</span>
                  </div>
                ))}
              </div>
            )}

            {/* User Terpilih */}
            {selectedUsers.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', display: 'block', marginBottom: '8px' }}>User Terpilih:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedUsers.map(user => (
                    <div key={user.id} style={{
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#1C1C3D' : '#F5F3FF', // Light purple / dark purple
                      border: `1px solid ${isDark ? '#5B21B6' : '#C4B5FD'}`,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#A78BFA' : '#6D28D9', fontWeight: 700, fontSize: '0.95rem' }}>
                        <CheckCircle size={18} />
                        {user.name || user.username} ({user.angkatan})
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUser(user.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Bukti Section */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1C1C1E', fontWeight: 700 }}>2. Upload Bukti Jamal</h3>
            <p style={{ color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>Unggah foto atau video jam malam (maks 10MB/file).</p>

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
              <span style={{ fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>Tambah File Bukti</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {/* Previews */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {files.map((f, idx) => {
                  const isVideo = f.type.startsWith('video/');
                  const objectUrl = URL.createObjectURL(f);
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                      border: isDark ? '1px solid #4A2E1E' : '1px solid #E5E7EB',
                      borderRadius: '12px',
                      color: isDark ? '#FFFFFF' : '#000000',
                      transition: 'all 0.3s ease'
                    }}>
                      {isVideo ? (
                        <video src={objectUrl} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#000' }} />
                      ) : (
                        <img src={objectUrl} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      )}

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                        {uploadProgress[f.name] !== undefined && (
                          <div style={{ width: '100%', height: '4px', backgroundColor: isDark ? '#3D291C' : '#E5E7EB', borderRadius: '2px', marginTop: '6px' }}>
                            <div style={{ width: `${uploadProgress[f.name]}%`, height: '100%', backgroundColor: '#8B5CF6', borderRadius: '2px', transition: 'width 0.2s' }}></div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        style={{ color: '#DC2626', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '8px' }}
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
            <button type="submit" disabled={loading} style={{
              padding: '16px 32px',
              backgroundColor: loading ? '#C4B5FD' : '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '32px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              transition: 'transform 0.1s'
            }}
              onMouseDown={(e) => !loading && (e.target.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LaporJamal;
