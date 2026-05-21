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
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

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
        } else if (!currentUser.emailVerified) {
          // Belum terverifikasi
          // SignOut ditangani secara spesifik di Login.jsx & SignUp.jsx agar tidak bentrok
          setUser(null);
        } else {
          setUser(currentUser);
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
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/home" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/home" />} />
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
        <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
