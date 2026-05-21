import { useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Piket = () => {
  const [activeTab, setActiveTab] = useState('unfinished');

  const piketItems = [
    { id: 1, title: 'Piket', place: 'piket -> place' },
    { id: 2, title: 'Piket', place: 'piket -> place' },
    { id: 3, title: 'Piket', place: 'piket -> place' },
    { id: 4, title: 'Piket', place: 'piket -> place' },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={handleLogout}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="header-title">Check Undone Piket</h1>
      </header>
      
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'unfinished' ? 'active' : ''}`}
          onClick={() => setActiveTab('unfinished')}
        >
          Unfinished
        </div>
        <div 
          className={`tab ${activeTab === 'unaccepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('unaccepted')}
        >
          Unaccepted
        </div>
      </div>

      <div className="content-area">
        {activeTab === 'unfinished' && (
          <div className="piket-list">
            {piketItems.map((item) => (
              <div key={item.id} className="piket-item">
                <div className="piket-item-title">{item.title}</div>
                <div className="piket-item-detail">
                  <Building2 size={16} color="#FF8C00" />
                  <span>[{item.place}]</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'unaccepted' && (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
            No unaccepted items.
          </div>
        )}
      </div>
    </div>
  );
};

export default Piket;
