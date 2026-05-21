import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Bottom Sheet State
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [biodata, setBiodata] = useState({
    username: '',
    prodi: '',
    angkatan: '',
    nim: '',
    jabatan: '',
    fotoProfil: ''
  });

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Password tidak cocok');
    }
    if (password.length < 6) {
      return setError('Password minimal 6 karakter');
    }

    setShowBottomSheet(true);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("Mulai create user auth...");
      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User auth berhasil dibuat:", userCredential.user.uid);
      
      // 2. Send Email Verification (Lakukan lebih awal agar email pasti terkirim)
      console.log("Mulai mengirim email verifikasi...");
      await sendEmailVerification(userCredential.user);
      console.log("Email verifikasi berhasil dikirim.");
      
      // 3. Save Biodata to Firestore dengan Timeout 10 detik agar tidak hang
      console.log("Mulai menyimpan biodata ke Firestore...");
      const firestoreWritePromise = setDoc(doc(db, "users", userCredential.user.uid), {
        username: biodata.username,
        email: email,
        prodi: biodata.prodi,
        angkatan: biodata.angkatan,
        nim: biodata.nim,
        jabatan: biodata.jabatan,
        fotoProfil: biodata.fotoProfil,
        createdAt: new Date()
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout saat menyimpan data ke Firestore. Pastikan Firestore sudah dibuat di console Firebase dan rules-nya diizinkan.")), 10000)
      );

      await Promise.race([firestoreWritePromise, timeoutPromise]);
      console.log("Biodata berhasil disimpan di Firestore.");

      // 4. Sign out the user because they need to verify email first
      console.log("Mulai sign out...");
      await signOut(auth);
      console.log("Berhasil sign out.");
      
      alert("Pendaftaran berhasil! Link verifikasi telah dikirim ke email Anda. Silakan cek kotak masuk atau spam.");
      navigate('/login');
    } catch (err) {
      console.error("Terjadi error di handleConfirm:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Silakan gunakan email lain atau login.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Minimal 6 karakter.');
      } else {
        setError('Gagal memproses pendaftaran: ' + err.message);
      }
      setShowBottomSheet(false); // Hide bottom sheet to show error on main form
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1C1C1E', marginBottom: '8px' }}>
          Buat Akun Baru
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '32px', fontWeight: 600 }}>
          Daftar sekarang untuk mulai menggunakan AsramaApp
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            color: '#B91C1C',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: nama@email.com"
              required
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #D1D5DB',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#F9FAFB',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Buat password (min. 6 karakter)"
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #D1D5DB',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#F9FAFB',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Konfirmasi Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password Anda"
              required
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #D1D5DB',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#F9FAFB',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>
          <button type="submit" style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#F97316',
            color: 'white',
            border: 'none',
            borderRadius: '32px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Selanjutnya
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.95rem', color: '#6B7280', fontWeight: 600 }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: '#F97316', fontWeight: 800, textDecoration: 'none' }}>Login di sini</Link>
        </div>
      </div>

      {showBottomSheet && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => !loading && setShowBottomSheet(false)}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ width: '40px', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', margin: '0 auto 24px auto' }}></div>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1C1C1E' }}>Lengkapi Biodata</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#6B7280', fontWeight: 600 }}>Silakan isi data diri Anda untuk profil asrama</p>
            </div>
            
            <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Input Helper Component */}
              {['Username', 'Program Studi', 'Angkatan', 'NIM', 'Jabatan', 'Link Foto Profil (Opsional)'].map((label, idx) => {
                const keys = ['username', 'prodi', 'angkatan', 'nim', 'jabatan', 'fotoProfil'];
                const key = keys[idx];
                const types = ['text', 'text', 'number', 'text', 'text', 'url'];
                const placeholders = ['Nama Panggilan/Username', 'Contoh: Ilmu Komputer', 'Contoh: 60', 'Masukkan NIM', 'Contoh: Anggota, Pengurus', 'URL foto profil'];
                const isRequired = key !== 'fotoProfil';
                
                return (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>{label}</label>
                    <input
                      type={types[idx]}
                      required={isRequired}
                      value={biodata[key]}
                      onChange={(e) => setBiodata({ ...biodata, [key]: e.target.value })}
                      placeholder={placeholders[idx]}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid #D1D5DB',
                        fontSize: '1rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#F9FAFB',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#F97316'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '32px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }} onClick={() => setShowBottomSheet(false)} disabled={loading}>
                  Batal
                </button>
                <button type="submit" style={{
                  flex: 2,
                  padding: '16px',
                  backgroundColor: loading ? '#FDBA74' : '#F97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '32px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                }} disabled={loading}>
                  {loading ? 'Memproses...' : 'Konfirmasi & Daftar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUp;
