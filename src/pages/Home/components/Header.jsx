import { Building2 } from 'lucide-react';

const Header = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)' }}>
      <Building2 size={24} color="var(--text-main)" style={{ marginRight: '0.75rem' }} />
      <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Sukasari Mobile</h1>
    </div>
  );
};

export default Header;
