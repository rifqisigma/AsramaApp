import { Moon } from 'lucide-react';

const ActivityList = ({ selectedDate, activities, user }) => {

  const dateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const isSameDay = (ts) => {
    if (!ts) return false;
    const d1 = ts.toDate ? ts.toDate() : new Date(ts);
    return (
      d1.getDate() === selectedDate.getDate() &&
      d1.getMonth() === selectedDate.getMonth() &&
      d1.getFullYear() === selectedDate.getFullYear()
    );
  };

  const formatTime = (ts) => {
    if (!ts) return "--:--";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🔥 FLATTEN + FILTER
  const filteredActivities = [];

  const checkUserMatch = (ref, userId) => {
    if (!ref || !userId) return false;
    // Handle both direct string comparison and Firestore DocumentReference
    if (typeof ref === 'string') return ref.includes(userId);
    if (ref.id) return ref.id === userId;
    if (ref.path) return ref.path.includes(userId);
    if (ref.__ref__) return ref.__ref__.includes(userId);
    return false;
  };

  activities.forEach((doc) => {
    const data = doc;

    // ===== JAMAL =====
    if (data.Jamal) {
      const j = data.Jamal;
      const ts = j.Timestamp || j.timestamp;
      const dateMatch = isSameDay(ts);
      
      const users = j.UsersToJamal || [];
      const userMatch = users.some(ref => checkUserMatch(ref, user?.uid));

      if (dateMatch && userMatch) {
        filteredActivities.push({
          id: doc.id + "_jamal",
          title: "Jamal",
          startTime: formatTime(ts),
          endTime: formatTime(ts), // We'll just show the same time as we don't have end time
          documentPath: "Jamal",
          icon: "moon",
          sortTime: new Date(ts).getTime()
        });
      }
    }

    // ===== PIKET =====
    if (data.Piket) {
      const p = data.Piket;
      const ts = p.TimeStamp || p.timestamp || p.Timestamp;
      const dateMatch = isSameDay(ts);
      
      const userRef = p.UserToPiket;
      const userMatch = checkUserMatch(userRef, user?.uid);

      if (dateMatch && userMatch) {
        filteredActivities.push({
          id: doc.id + "_piket",
          title: p.namaKegiatan || "Piket",
          startTime: formatTime(ts),
          endTime: formatTime(ts),
          documentPath: "Piket",
          sortTime: new Date(ts).getTime()
        });
      }
    }

    // ===== KEMENTRIAN =====
    if (data.KegiatanKementrian) {
      const k = data.KegiatanKementrian;
      const ts = k.TimeStamp || k.timestamp || k.Timestamp;
      const dateMatch = isSameDay(ts);
      
      const hasName = k.Header && k.Header.trim() !== "";

      if (dateMatch && hasName) {
        filteredActivities.push({
          id: doc.id + "_kementrian",
          title: k.Header,
          startTime: formatTime(ts),
          endTime: formatTime(ts),
          documentPath: "Kementrian",
          sortTime: new Date(ts).getTime()
        });
      }
    }
  });

  // Sort activities by time
  filteredActivities.sort((a, b) => a.sortTime - b.sortTime);

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 500,
        margin: '0.5rem 0 1rem 0',
        color: 'var(--text-main)'
      }}>
        Jadwal [{dateStr}]
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map((act) => (
            <div key={act.id} style={{ display: 'flex', gap: '1rem' }}>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                width: '40px',
                padding: '0.25rem 0'
              }}>
                <span>{act.startTime}</span>
                <span>{act.endTime}</span>
              </div>

              <div style={{
                flex: 1,
                backgroundColor: '#E5E7EB',
                borderRadius: '8px',
                borderLeft: '4px solid var(--ipb-orange)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: 'var(--text-main)'
                  }}>
                    {act.title}
                  </h4>

                  <p style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    {act.documentPath}
                  </p>
                </div>

                {act.icon === 'moon' && (
                  <Moon size={20} color="var(--ipb-orange)" />
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            textAlign: 'center',
            padding: '2rem 0'
          }}>
            Tidak ada kegiatan untuk hari ini.
          </p>
        )}
      </div>
    </div>
  );
};

export default ActivityList;
