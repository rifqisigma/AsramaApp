# 📱 FCM Notification Feature - Implementation Checklist

## ✅ Fase 1: Frontend Setup (SELESAI)

### Files dibuat:
- ✅ `src/context/fcmService.js` - FCM initialization, token management
- ✅ `src/context/NotificationContext.jsx` - Global notification state management
- ✅ `src/components/NotificationCenter.jsx` - UI component (bell icon + panel)
- ✅ `src/components/NotificationCenter.css` - Styling
- ✅ `public/firebase-messaging-sw.js` - Service Worker untuk background notifications
- ✅ `.env` - Updated dengan VAPID_KEY
- ✅ `src/App.jsx` - Updated dengan NotificationProvider & NotificationCenter

### Flow Frontend:
```
User Login → initFCM() → Request Permission → Get Token → Store to Firestore
                                    ↓
                      Listen to Messages (background)
                                    ↓
                      Display Notification (NotificationCenter)
```

---

## 📋 Fase 2: Backend Setup (Cloud Functions) - TODO

### Step-by-step:

```bash
# 1. Dari folder AsramaApp, initialize Cloud Functions
firebase init functions
# Pilih:
# - Project: asrama-ipb-sukasari  
# - Language: JavaScript
# - ESLint: No (untuk simplicity)
# - Install dependencies: Yes

# 2. Copy Cloud Functions code
cp functions-index.js functions/index.js

# 3. Navigate ke functions folder
cd functions

# 4. Install dependencies
npm install

# 5. Kembali ke root
cd ..

# 6. Test locally (optional)
firebase emulators:start --only functions

# 7. Deploy ke production
firebase deploy --only functions
```

### Cloud Functions yang akan dibuat:
- `onEvidenceUpload` - Trigger saat upload evidence → notif ke terlapor
- `onEvidenceVerified` - Trigger saat status berubah → notif verifikasi
- `onPointJudgment` - Trigger saat point dibuat → notif penghakiman
- `sendNotificationTest` - HTTP endpoint untuk testing
- `sendBulkNotification` - HTTP endpoint untuk bulk notify

---

## 🔌 Fase 3: Integration di Existing Pages - TODO

### 1. Update `src/pages/LaporPiket.jsx` (atau upload evidence di mana saja)

Pastikan ketika upload evidence, include field `reportedUser`:

```javascript
// Contoh pada handleUpload() function
const evidenceData = {
  type: 'piket',
  uploadedBy: currentUser.uid,
  reportedUser: selectedUserId, // ← WAJIB! user yang dilaporkan
  fileName: fileName,
  status: 'pending',
  timestamp: new Date(),
  // ...other fields
};

const docRef = await addDoc(collection(db, 'evidence'), evidenceData);
// Cloud Function akan trigger otomatis → notif ke reportedUser
```

### 2. Update `src/pages/LaporJamal.jsx`

Sama seperti LaporPiket - include `reportedUser` field.

### 3. Update `src/pages/FormSpa.jsx`

Sama seperti LaporPiket - include `reportedUser` field.

### 4. Update `src/pages/PenghakimanPoint.jsx`

Pastikan ketika create point, include field `reportedUser`:

```javascript
// Pada handleSavePoint() atau similar
const pointData = {
  reportedUser: selectedUserId, // ← WAJIB! user yang di-hakimi
  givenBy: currentUser.uid,
  type: 'piket', // atau 'jamal', 'spa'
  value: pointValue,
  reason: reason,
  status: 'pending',
  timestamp: new Date(),
  // ...other fields
};

const docRef = await addDoc(collection(db, 'point'), pointData);
// Cloud Function akan trigger otomatis → notif ke reportedUser
```

---

## 🧪 Fase 4: Testing

### Test Frontend (tanpa backend):
1. npm run dev
2. Login
3. Klik bell icon (atas kanan) → panel notification terbuka
4. Klik "Aktifkan" untuk request notification permission
5. Browser akan popup ask permission → Allow
6. Check console untuk logs "FCM Token obtained"

### Test Backend (setelah Cloud Functions deployed):

```bash
# Via Firebase CLI shell
firebase functions:shell

# Jalankan function testing
sendNotificationTest({
  userId: 'uid_yang_valid',
  title: 'Test Notification',
  body: 'Ini notification dari Cloud Function',
  data: { link: '/home' }
})
```

Atau via cURL:
```bash
curl -X POST https://us-central1-asrama-ipb-sukasari.cloudfunctions.net/sendNotificationTest \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uid_user",
    "title": "Test",
    "body": "Test notification body",
    "data": {"link": "/home"}
  }'
```

### Test End-to-End:
1. Deploy Cloud Functions
2. User A upload evidence untuk User B
3. Check apakah User B dapat notifikasi di NotificationCenter

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Firebase Web SDK + Messaging |
| State Mgmt | Context API |
| Styling | CSS |
| Backend | Firebase Cloud Functions (Node.js 20) |
| Database | Firestore |
| Messaging | Firebase Cloud Messaging (FCM) |
| Service Worker | Web Worker for Background Messages |

---

## 📊 Data Flow Diagram

```
Evidence Upload → Firestore onChange Trigger
                         ↓
                  onEvidenceUpload Cloud Function
                         ↓
                  Read reportedUser & fcmTokens
                         ↓
                  admin.messaging().send()
                         ↓
                  FCM sends to client device
                         ↓
Service Worker receives → onMessage listener
                         ↓
      NotificationCenter component updates
                         ↓
          User sees notification in bell icon
```

---

## 📁 File Structure

```
AsramaApp/
├── src/
│   ├── context/
│   │   ├── fcmService.js ✅ NEW
│   │   ├── NotificationContext.jsx ✅ NEW
│   │   └── ThemeContext.jsx
│   ├── components/
│   │   ├── NotificationCenter.jsx ✅ NEW
│   │   ├── NotificationCenter.css ✅ NEW
│   │   └── ...
│   ├── pages/
│   │   ├── LaporPiket.jsx (need update)
│   │   ├── LaporJamal.jsx (need update)
│   │   ├── FormSpa.jsx (need update)
│   │   ├── PenghakimanPoint.jsx (need update)
│   │   └── ...
│   ├── App.jsx ✅ UPDATED
│   └── ...
├── public/
│   ├── firebase-messaging-sw.js ✅ NEW
│   └── ...
├── functions/ (TODO - create via firebase init)
│   ├── index.js (copy dari functions-index.js)
│   └── package.json
├── .env ✅ UPDATED
├── firebase.json ✅ NEW
├── functions-index.js (template)
├── CLOUD_FUNCTIONS_SETUP.md (guide)
├── FCM_IMPLEMENTATION_GUIDE.md (detailed guide)
└── ...
```

---

## ⚠️ Important Notes

1. **VAPID Key** sudah diset di .env - jangan dirubah
2. **Service Worker** harus di-register sebelum dapat background notifications
3. **FCM Tokens** di-simpan per device (multi-device supported)
4. **Notification Permission** user bisa disable kapan saja
5. **Invalid Tokens** auto-deleted by Cloud Function
6. **Firestore Rules** perlu update untuk user bisa write ke `users/{userId}/fcmTokens`

---

## 🚀 Quick Start Recap

### Frontend: ✅ Sudah siap, tinggal run
```bash
npm run dev
```

### Backend: ⏳ Perlu di-setup
```bash
firebase init functions
cp functions-index.js functions/index.js
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Integration: ⏳ Update LaporPiket, LaporJamal, FormSpa, PenghakimanPoint
- Pastikan include `reportedUser` field saat save

### Done! 🎉
