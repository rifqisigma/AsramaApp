import { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, CheckCircle, Search, Video, Image as ImageIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LaporPiket = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  // Form State
  const [place, setPlace] = useState('');
  const [timestampStr, setTimestampStr] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLaporToUser, setSelectedLaporToUser] = useState(null);
  const [searchLaporStatus, setSearchLaporStatus] = useState('');

  // Files
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [buktiLinks, setBuktiLinks] = useState([]);

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
      console.error("Error searching user:", error);
      setSearchLaporStatus('Terjadi kesalahan saat mencari.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    // If it was already uploaded, it will be in buktiLinks, but we'll re-upload everything on submit anyway for simplicity, or we upload immediately.
    // For this implementation, we upload on submit.
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLaporToUser) {
      alert("Silakan cari dan pilih user Lapor Ke terlebih dahulu.");
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

      // Bersihkan lokasi dan laporto dari karakter spasi berlebih
      const cleanPlace = place.trim().replace(/\s+/g, '-');
      const cleanLaporTo = selectedLaporToUser.username.trim().replace(/\s+/g, '-');

      // 1. Upload Files
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split('.').pop();
        const customFileName = `${myUsername}_${cleanPlace}_${Date.now()}_${cleanLaporTo}.${extension}`;

        const fileRef = ref(storage, `piket/${customFileName}`);
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
      const piketData = {
        buktiLink: uploadedUrls,
        jenisKegiatan: "piket",
        laporTo: doc(db, 'users', selectedLaporToUser.id),
        place: place,
        timestamp: new Date(timestampStr),
        userPiket: doc(db, 'users', auth.currentUser.uid),
        verification: false
      };

      // Buat piket mandiri baru
      await addDoc(collection(db, 'piket'), piketData);

      alert("Laporan piket berhasil dikirim!");
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
      backgroundColor: '#F3F4F6', // Latar abu-abu terang ala Google Form
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <ArrowLeft size={18} />
          Kembali
        </Link>

        {/* Form Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          borderTop: '10px solid #F97316', // Garis atas ala Google Form
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1C1C1E', margin: '0 0 12px 0' }}>
            Laporan Piket
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Harap isi laporan piket Anda dengan bukti yang jelas. Form ini akan otomatis tersimpan di sistem.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tempat Section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1C1C1E', fontWeight: 700 }}>1. Tempat Piket</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Tempat Piket *</label>
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
                  border: '1px solid #D1D5DB',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderBottom: '3px solid #D1D5DB',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = '#F97316'}
                onBlur={(e) => e.target.style.borderBottomColor = '#D1D5DB'}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Waktu Pelaksanaan *</label>
              <input
                type="datetime-local"
                required
                value={timestampStr}
                onChange={(e) => setTimestampStr(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #D1D5DB',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderBottom: '3px solid #D1D5DB',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = '#F97316'}
                onBlur={(e) => e.target.style.borderBottomColor = '#D1D5DB'}
              />
            </div>
          </div>

          {/* Lapor Ke Section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1C1C1E', fontWeight: 700 }}>2. Lapor Ke Siapa?</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '12px' }}>Cari berdasarkan username atau angkatan.</p>

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
                  border: '1px solid #D1D5DB',
                  fontSize: '1rem',
                  outline: 'none',
                  borderBottom: '3px solid #D1D5DB',
                }}
              />
              <button
                type="button"
                onClick={searchLaporTo}
                style={{
                  padding: '0 20px',
                  backgroundColor: '#E5E7EB',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>Hasil Pencarian:</span>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedLaporToUser(user);
                      setSearchResults([]);
                      setSearchQuery("");
                    }}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      color: '#1F2937',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                  >
                    <span style={{ fontWeight: 700 }}>{user.name || user.username}</span> - {user.prodi || 'Prodi tidak diketahui'} - Angkatan {user.angkatan || '?'}
                  </div>
                ))}
              </div>
            )}

            {selectedLaporToUser && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #10B981',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '0.95rem' }}>
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
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1C1C1E', fontWeight: 700 }}>3. Upload Bukti Piket</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>Unggah foto atau video hasil piket Anda.</p>

            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
              border: '2px dashed #D1D5DB',
              borderRadius: '16px',
              backgroundColor: '#F9FAFB',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s',
            }}>
              <Upload size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
              <span style={{ fontWeight: 700, color: '#6B7280' }}>Tambah File</span>
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
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px'
                    }}>
                      {isVideo ? (
                        <video src={objectUrl} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#000' }} />
                      ) : (
                        <img src={objectUrl} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      )}

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                        {uploadProgress[f.name] !== undefined && (
                          <div style={{ width: '100%', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', marginTop: '6px' }}>
                            <div style={{ width: `${uploadProgress[f.name]}%`, height: '100%', backgroundColor: '#F97316', borderRadius: '2px', transition: 'width 0.2s' }}></div>
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
              backgroundColor: loading ? '#FDBA74' : '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '32px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
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

export default LaporPiket;
