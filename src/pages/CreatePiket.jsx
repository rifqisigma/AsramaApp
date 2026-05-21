import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc } from 'firebase/firestore';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreatePiket = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [logs, setLogs] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processCSV = async () => {
    if (!file) return setStatus({ type: 'error', message: 'Pilih file CSV terlebih dahulu.' });

    setLoading(true);
    setStatus({ type: 'info', message: 'Memproses file...' });
    setLogs([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length < 2) {
        setLoading(false);
        return setStatus({ type: 'error', message: 'File CSV kosong atau format tidak valid.' });
      }

      // Skip header (lines[0])
      let successCount = 0;
      let errorCount = 0;
      let newLogs = [];

      for (let i = 1; i < lines.length; i++) {
        const [username, tanggal, place] = lines[i].split(',');

        if (!username || !tanggal || !place) {
          errorCount++;
          newLogs.push(`Baris ${i + 1}: Format tidak lengkap.`);
          continue;
        }

        try {
          // Cari user berdasarkan username
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', username.trim()));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            errorCount++;
            newLogs.push(`Baris ${i + 1}: Username "${username}" tidak ditemukan.`);
            continue;
          }

          const userDoc = querySnapshot.docs[0];
          const userRef = doc(db, 'users', userDoc.id);

          // Buat Date dari tanggal (misal: 2026-05-20)
          const dateObj = new Date(`${tanggal.trim()}T07:00:00+07:00`);

          const kegiatanData = {
            buktiLink: [],
            jenisKegiatan: "piket",
            laporTo: null,
            place: place.trim(),
            timestampMaxPiket: dateObj,
            userPiket: userRef,
            verification: false
          };

          await addDoc(collection(db, 'piket'), kegiatanData);
          successCount++;
          newLogs.push(`Baris ${i + 1}: Sukses membuat jadwal untuk ${username}.`);
        } catch (error) {
          errorCount++;
          newLogs.push(`Baris ${i + 1}: Error - ${error.message}`);
        }
      }

      setLogs(newLogs);
      setStatus({
        type: errorCount === 0 ? 'success' : 'info',
        message: `Selesai! Berhasil: ${successCount}, Gagal: ${errorCount}`
      });
      setLoading(false);
      if (errorCount === 0) setFile(null);
    };

    reader.onerror = () => {
      setLoading(false);
      setStatus({ type: 'error', message: 'Gagal membaca file.' });
    };

    reader.readAsText(file);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px',
      paddingBottom: '80px'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px'
        }}>
          <ArrowLeft size={20} />
          Kembali
        </Link>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#9A3412', margin: '0 0 8px 0' }}>
          Buat Jadwal Piket
        </h1>
        <p style={{ color: '#6B7280', margin: '0 0 24px 0', fontSize: '0.95rem', fontWeight: 600 }}>
          Upload file CSV untuk mengotomatisasi pembuatan jadwal piket.
        </p>

        {/* Petunjuk Penggunaan */}
        <div style={{
          backgroundColor: '#FFF7ED',
          border: '2px solid #FDBA74',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            Format CSV
          </h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#C2410C' }}>
            File CSV harus memiliki 3 kolom (dipisah dengan koma) tanpa spasi berlebih. Baris pertama wajib merupakan header.
          </p>
          <pre style={{
            backgroundColor: '#FFEDD5',
            padding: '12px',
            borderRadius: '12px',
            color: '#9A3412',
            fontSize: '0.85rem',
            overflowX: 'auto',
            margin: 0,
            border: '1px solid #F97316'
          }}>
            username,tanggal,place<br />
            rifqi,2026-05-19,dapur bawah<br />
            budi,2026-05-20,kamar mandi atas
          </pre>
          <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: '#C2410C', fontStyle: 'italic' }}>
            *Note: Waktu deadline (timestampMaxPiket) akan diset otomatis ke jam 07:00 pada tanggal yang ditentukan.
          </p>
        </div>

        {/* Status Message */}
        {status.message && (
          <div style={{
            padding: '16px',
            borderRadius: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: status.type === 'error' ? '#FEF2F2' : status.type === 'success' ? '#ECFDF5' : '#EFF6FF',
            color: status.type === 'error' ? '#B91C1C' : status.type === 'success' ? '#047857' : '#1D4ED8',
            border: `1px solid ${status.type === 'error' ? '#FCA5A5' : status.type === 'success' ? '#6EE7B7' : '#93C5FD'}`
          }}>
            {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{status.message}</span>
          </div>
        )}

        {/* Upload Area */}
        <label style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          border: '2px dashed #D1D5DB',
          borderRadius: '24px',
          backgroundColor: '#F9FAFB',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.2s',
          borderColor: file ? '#F97316' : '#D1D5DB'
        }}>
          <Upload size={40} color={file ? '#F97316' : '#9CA3AF'} style={{ marginBottom: '16px' }} />
          <span style={{ fontWeight: 700, color: file ? '#F97316' : '#6B7280', textAlign: 'center' }}>
            {file ? file.name : 'Pilih File CSV'}
          </span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        <button
          onClick={processCSV}
          disabled={!file || loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: (!file || loading) ? '#FDBA74' : '#F97316',
            color: 'white',
            border: 'none',
            borderRadius: '32px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: (!file || loading) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => !loading && file && (e.target.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          {loading ? 'Memproses CSV...' : 'Upload & Buat Jadwal'}
        </button>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#4B5563', fontSize: '1rem' }}>Log Proses:</h4>
            <div style={{
              backgroundColor: '#F3F4F6',
              padding: '16px',
              borderRadius: '16px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '0.85rem',
              color: '#374151',
              fontFamily: 'monospace',
              lineHeight: '1.5'
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('Error') || log.includes('tidak ditemukan') ? '#DC2626' : '#059669' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CreatePiket;
