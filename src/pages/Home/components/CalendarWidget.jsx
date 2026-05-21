import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarWidget = ({ selectedDate, setSelectedDate }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  // Set initial week based on selectedDate
  useEffect(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust when day is sunday
    setCurrentWeekStart(new Date(d.setDate(diff)));
  }, [selectedDate]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const isSameDate = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const monthYear = currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ backgroundColor: 'white', padding: '1.5rem 1rem', borderBottom: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-main)' }}>{monthYear}</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-main)' }}>
          <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--ipb-blue)' }}>
            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
          <CalendarIcon size={20} />
          {!isExpanded && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <ChevronLeft size={20} onClick={prevWeek} style={{ cursor: 'pointer' }} />
              <ChevronRight size={20} onClick={nextWeek} style={{ cursor: 'pointer' }} />
            </div>
          )}
        </div>
      </div>
      
      {isExpanded ? (
        <div className="custom-react-calendar">
          <Calendar 
            onChange={(date) => {
              setSelectedDate(date);
              setIsExpanded(false); // Otomatis tutup saat memilih tanggal
            }} 
            value={selectedDate} 
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {weekDates.map((date, index) => {
            const isSelected = isSameDate(date, selectedDate);
            return (
              <div 
                key={index} 
                onClick={() => setSelectedDate(date)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--ipb-orange)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 500 }}>
                  {days[date.getDay()]}
                </span>
                <div style={{ 
                  width: 38, 
                  height: 38, 
                  borderRadius: '50%', 
                  backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-main)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: '1rem'
                }}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarWidget;