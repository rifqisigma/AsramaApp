import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Tautan reset password telah dikirim ke email Anda.');
    } catch (err) {
      setError('Gagal mengirim email reset. Pastikan email terdaftar.');
      console.error(err);
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', maxWidth: '400px', margin: '0 auto', width: '100%', paddingTop: '16px' }}>
        
        <Link to="/login" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#4B5563', 
          textDecoration: 'none', 
          fontWeight: 700,
          marginBottom: '32px',
          width: 'fit-content'
        }}>
          <ArrowLeft size={20} />
          Kembali
        </Link>
        
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1C1C1E', marginBottom: '8px' }}>
          Lupa Password?
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '32px', fontWeight: 600 }}>
          Jangan khawatir! Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password.
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

        {message && (
          <div style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #6EE7B7',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            color: '#047857',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Email Anda</label>
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
          
          <button type="submit" disabled={loading} style={{
            padding: '16px',
            backgroundColor: loading ? '#FDBA74' : '#F97316',
            color: 'white',
            border: 'none',
            borderRadius: '32px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => !loading && (e.target.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
