import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home/index';
import Me from './pages/Me';
import SeePoints from './pages/SeePoints';
import CreatePoint from './pages/CreatePoint';
import PenghakimanPoint from './pages/PenghakimanPoint';
import ForgotPassword from './pages/ForgotPassword';
import CreatePiket from './pages/CreatePiket';
import LaporPiket from './pages/LaporPiket';
import TandaTanganPiket from './pages/TandaTanganPiket';
import LaporJamal from './pages/LaporJamal';
import TtdJamal from './pages/TtdJamal';
import CreateKegiatan from './pages/CreateKegiatan';
import SeeKegiatan from './pages/SeeKegiatan';
import Spa from './pages/Spa';
import FormSpa from './pages/FormSpa';
import AcceptingSpa from './pages/AcceptingSpa';
import HistoryActivity from './pages/HistoryActivity';
import FormAbsenMalam from './pages/FormAbsenMalam';
import VerificationAbsenMalam from './pages/VerificationAbsenMalam';
import CatatanPiket from './pages/CatatanPiket';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { initFCM } from './context/fcmService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Cek Cache 15 Hari
        const loginTimestamp = localStorage.getItem('auth_timestamp');
        const now = new Date().getTime();
        const fifteenDays = 15 * 24 * 60 * 60 * 1000;

        if (loginTimestamp && (now - parseInt(loginTimestamp)) > fifteenDays) {
          // Sesi kadaluarsa
          await signOut(auth);
          localStorage.removeItem('auth_timestamp');
          setUser(null);
        } else {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
              setUser(currentUser);
              // Initialize FCM when user is authenticated
              await initFCM();
            } else {
              // Jika sedang sign up, jangan sign out dulu agar proses setDoc di SignUp.jsx selesai
              if (localStorage.getItem('is_signing_up') === 'true') {
                setUser(null);
              } else {
                await signOut(auth);
                setUser(null);
              }
            }
          } catch (err) {
            console.error("Error verifying user document:", err);
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#0A3055' }}>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Router>

          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
            <Route path="/signup" element={user ? <SignUp /> : <Navigate to="/login" />} />
            <Route path="/forgot-password" element={user ? <ForgotPassword /> : <Navigate to="/login" />} />
            <Route path="/create-piket" element={user ? <CreatePiket /> : <Navigate to="/login" />} />
            <Route path="/lapor-piket" element={user ? <LaporPiket /> : <Navigate to="/login" />} />
            <Route path="/ttd-piket" element={user ? <TandaTanganPiket /> : <Navigate to="/login" />} />
            <Route path="/lapor-jamal" element={user ? <LaporJamal /> : <Navigate to="/login" />} />
            <Route path="/ttd-jamal" element={user ? <TtdJamal /> : <Navigate to="/login" />} />
            <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
            <Route path="/me" element={user ? <Me /> : <Navigate to="/login" />} />
            <Route path="/see-points" element={user ? <SeePoints /> : <Navigate to="/login" />} />
            <Route path="/create-point" element={user ? <CreatePoint /> : <Navigate to="/login" />} />
            <Route path="/penghakiman-point" element={user ? <PenghakimanPoint /> : <Navigate to="/login" />} />
            <Route path="/create-kegiatan" element={user ? <CreateKegiatan /> : <Navigate to="/login" />} />
            <Route path="/see-kegiatan" element={user ? <SeeKegiatan /> : <Navigate to="/login" />} />
            <Route path="/spa" element={user ? <Spa /> : <Navigate to="/login" />} />
            <Route path="/form-spa" element={user ? <FormSpa /> : <Navigate to="/login" />} />
            <Route path="/accepting-spa" element={user ? <AcceptingSpa /> : <Navigate to="/login" />} />
            <Route path="/history" element={user ? <HistoryActivity /> : <Navigate to="/login" />} />
            <Route path="/form-absen-malam" element={user ? <FormAbsenMalam /> : <Navigate to="/login" />} />
            <Route path="/verification-absen-malam" element={user ? <VerificationAbsenMalam /> : <Navigate to="/login" />} />
            <Route path="/catatan-piket" element={user ? <CatatanPiket /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );

}

export default App;
