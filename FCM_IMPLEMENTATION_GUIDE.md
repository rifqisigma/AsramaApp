# FCM Notification Implementation Guide

## Frontend Setup ✅ SELESAI

### Files yang sudah dibuat:
1. **`src/context/fcmService.js`** - FCM initialization & token management
2. **`src/context/NotificationContext.jsx`** - State management untuk notifikasi
3. **`src/components/NotificationCenter.jsx`** - UI component bell icon dengan notification panel
4. **`src/components/NotificationCenter.css`** - Styling untuk notification UI
5. **`public/firebase-messaging-sw.js`** - Service Worker untuk background notifications
6. **`src/App.jsx`** - Updated untuk include NotificationProvider & NotificationCenter

### Environment Variables ✅ Updated
```
VITE_FIREBASE_VAPID_KEY=BIQMhPDGvKzU6_8PcbzJBEKWUZd5H8Lq_zZcXvKhOtKqZ0JU5KnC_VsZkVkLqIABvKx3QkpkX5qJ7_KQ_J5KDuM
```

## Backend Setup (Cloud Functions) - TODO

### Step 1: Initialize Cloud Functions
```bash
cd AsramaApp
firebase init functions
# Choose:
# - Project: asrama-ipb-sukasari
# - Language: JavaScript
# - ESLint: Yes
# - Install dependencies: Yes
```

### Step 2: Copy Cloud Functions Code
```bash
# Copy kode dari functions-index.js ke functions/index.js
cp functions-index.js functions/index.js
```

### Step 3: Install Dependencies
```bash
cd functions
npm install
cd ..
```

### Step 4: Deploy
```bash
firebase deploy --only functions
```

## How It Works

### Frontend Flow:
1. User logs in → `initFCM()` dipanggil
2. Service Worker registered
3. Request notification permission (dengan UI prompt)
4. Get FCM token dari Firebase Messaging
5. Token disimpan di Firestore: `/users/{userId}/fcmTokens`
6. Listen to incoming messages via `setupMessageListener()`
7. Display notifications dengan `NotificationCenter` component

### Backend Flow (Cloud Functions):
1. **onEvidenceUpload** trigger - ketika evidence upload
   - Ambil `reportedUser` field
   - Kirim notif ke terlapor
   - Data: title, body, link ke `/history`

2. **onEvidenceVerified** trigger - ketika status verified/rejected
   - Monitor perubahan status field
   - Kirim notif ke terlapor dengan status info

3. **onPointJudgment** trigger - ketika point dibuat
   - Ambil `reportedUser` field
   - Kirim notif ke terlapor dengan poin value

### Database Structure (Firestore):

```json
/users/{userId}
  fcmTokens: {
    "token_string_1": "2024-01-15T10:30:00Z",
    "token_string_2": "2024-01-14T08:20:00Z"
  }
  lastTokenUpdate: "2024-01-15T10:30:00Z"

/evidence/{evidenceId}
  type: "piket" | "jamal" | "spa"
  uploadedBy: "uid_uploader"
  reportedUser: "uid_terlapor" ← Cloud Function akan kirim notif ke sini
  status: "pending" | "verified" | "rejected"
  timestamp: Date
  ...other_fields

/point/{pointId}
  reportedUser: "uid_terlapor" ← Cloud Function akan kirim notif ke sini
  givenBy: "uid_admin"
  type: "piket" | "jamal" | "spa"
  value: 5
  status: "pending" | "finalized"
  timestamp: Date
  ...other_fields
```

## Integration Points

### Untuk Upload Evidence (di LaporPiket.jsx, LaporJamal.jsx, FormSpa.jsx):
Pastikan ketika upload evidence, include field `reportedUser`:
```javascript
const evidenceData = {
  type: 'piket',
  uploadedBy: currentUser.uid,
  reportedUser: selectedUserUID, // ← PENTING!
  status: 'pending',
  timestamp: new Date(),
  // ...other fields
};

await addDoc(collection(db, 'evidence'), evidenceData);
// Cloud Function akan trigger otomatis & kirim notif
```

### Untuk Penghakiman Point (di PenghakimanPoint.jsx):
Pastikan include field `reportedUser`:
```javascript
const pointData = {
  reportedUser: selectedUserUID, // ← PENTING!
  givenBy: currentUser.uid,
  type: 'piket',
  value: 5,
  status: 'pending',
  timestamp: new Date(),
  // ...other fields
};

await addDoc(collection(db, 'point'), pointData);
// Cloud Function akan trigger otomatis & kirim notif
```

## Testing

### Test Frontend Notifications:
1. Login ke app
2. Klik bell icon di top-right
3. Klik "Aktifkan" untuk request permission
4. Open browser DevTools → Console untuk check logs

### Test Backend Notifications:
```bash
# Dari root folder
firebase functions:shell

# Di dalam shell
sendNotificationTest({
  userId: 'uid_user',
  title: 'Test Title',
  body: 'Test Body',
  data: { link: '/home' }
})

# Tekan Enter untuk execute
```

## Troubleshooting

**Problem: "No registration token available"**
- User belum grant notification permission
- Tampilkan prompt di NotificationCenter untuk request permission

**Problem: "Invalid registration token"**
- Token sudah expired
- Cloud Function akan auto-delete invalid token
- Next time user open app, token akan di-refresh

**Problem: Notification tidak muncul**
- Check browser console untuk error
- Pastikan Service Worker registered
- Pastikan VAPID key di .env benar
- Pastikan Cloud Functions sudah deployed
- Pastikan reportedUser field ada di evidence/point data

## Next Steps

1. Deploy Cloud Functions ke production
2. Update LaporPiket, LaporJamal, FormSpa untuk include reportedUser
3. Update PenghakimanPoint untuk include reportedUser
4. Test end-to-end notification flow
5. Monitor Cloud Function logs untuk debugging
