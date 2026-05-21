import { CreditCard, LayoutDashboard, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Features = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#3B82F6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CreditCard size={24} color="white" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Pay SPA</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#3B82F6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LayoutDashboard size={24} color="white" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Dashboard</span>
        </div>
        <div onClick={() => navigate('/ttd-piket')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#F97316', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <PenTool size={24} color="white" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>TTD Piket</span>
        </div>
      </div>
    </div>
  );
};

export default Features;
