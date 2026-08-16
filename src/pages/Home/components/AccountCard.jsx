import { User } from 'lucide-react';

const AccountCard = ({ userData }) => {
  const username = userData?.username || 'Memuat...';
  const prodi = userData?.prodi || '';
  const jabatan = userData?.jabatan || '';
  const fotoProfil = userData?.fotoProfil;

  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>{username}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          {prodi} {prodi && jabatan ? '-' : ''} {jabatan}
        </p>
      </div>
      <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <img 
          src={fotoProfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=F97316&color=fff&size=150&bold=true`} 
          alt="Profil" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    </div>
  );
};

export default AccountCard;
