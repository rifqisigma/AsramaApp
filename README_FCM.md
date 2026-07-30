## 🔔 FCM Notification Feature - QUICK START

> **Status: FRONTEND COMPLETE ✅ | Backend pending deployment**

---

## ✅ Apa yang Sudah Siap?

### Frontend Notifications
- 🔔 Bell icon di top-right corner
- 📬 Notification panel dengan dropdown
- ✨ Real-time notification display
- 🔊 Background notifications (even when app closed)
- 📱 Multi-device support

### Fitur
```
User Login 
   ↓
Request Permission (popup)
   ↓
Get FCM Token & Save to Firestore
   ↓
Listen to Messages
   ↓
Display Notification in UI
```

---

## 🚀 Deployment Steps (3 steps saja!)

### Step 1️⃣: Initialize Cloud Functions
```bash
cd AsramaApp
firebase init functions

# When prompted, choose:
# - Project: asrama-ipb-sukasari
# - Language: JavaScript
# - ESLint: No
# - Install dependencies: Yes
```

### Step 2️⃣: Copy Cloud Functions Code
```bash
cp functions-index.js functions/index.js
cd functions
npm install
cd ..
```

### Step 3️⃣: Deploy
```bash
firebase deploy --only functions
```

**Done!** 🎉

---

## 📝 Update Your Code (Small Integration)

Setiap kali upload evidence atau create point, **include `reportedUser` field**:

### Example 1: Upload Evidence (LaporPiket.jsx)
```javascript
// Before save
const evidenceData = {
  type: 'piket',
  uploadedBy: currentUser.uid,
  // ✅ ADD THIS LINE:
  reportedUser: selectedUserId, 
  fileName: fileName,
  // ...other fields
};

await addDoc(collection(db, 'evidence'), evidenceData);
```

### Example 2: Create Point (PenghakimanPoint.jsx)
```javascript
// Before save
const pointData = {
  // ✅ ADD THIS LINE:
  reportedUser: selectedUserId,
  givenBy: currentUser.uid,
  type: 'piket',
  value: 5,
  // ...other fields
};

await addDoc(collection(db, 'point'), pointData);
```

**Same for:** LaporJamal.jsx, FormSpa.jsx

---

## 🧪 Testing

### Test 1: Check Frontend
1. `npm run dev`
2. Login
3. Click bell icon (top-right)
4. Click "Aktifkan" untuk grant permission
5. Check console for "FCM Token obtained"

### Test 2: Send Test Notification (after deployed)
```bash
firebase functions:shell

# Di dalam shell:
sendNotificationTest({
  userId: 'uid_target_user',
  title: 'Test Notif',
  body: 'Ini test notification',
  data: { link: '/home' }
})
```

### Test 3: End-to-End
1. User A upload evidence untuk User B
2. User B buka app → lihat notif di bell icon ✅

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `IMPLEMENTATION_CHECKLIST.md` | Detailed step-by-step |
| `FCM_IMPLEMENTATION_GUIDE.md` | Technical deep-dive |
| `NOTIFICATION_SUMMARY.md` | Quick reference |
| `functions-index.js` | Cloud Functions code |

---

## ⚠️ Troubleshooting

### "No FCM Token"
- User belum grant notification permission → klik "Aktifkan"
- Service Worker perlu reload page

### "Notification tidak muncul"
1. Check browser DevTools Console untuk error
2. Check `.env` punya `VITE_FIREBASE_VAPID_KEY`
3. Check Firestore → `/users/{userId}/fcmTokens` ada token?
4. Check Cloud Functions deploy? (`firebase deploy --only functions`)

### "Cloud Function deploy error"
- Pastikan `firebase init functions` sudah run
- Pastikan ada file `functions/index.js`
- Pastikan `functions/package.json` ada
- Run `firebase deploy --only functions`

---

## 🎯 Summary

| Task | Status |
|------|--------|
| Frontend Setup | ✅ Complete |
| UI Components | ✅ Complete |
| Service Worker | ✅ Complete |
| App Integration | ✅ Complete |
| Cloud Functions Code | ✅ Ready |
| Deploy Cloud Functions | ⏳ Manual |
| Update Pages (reportedUser) | ⏳ Manual |
| End-to-End Testing | ⏳ Manual |

---

## 💬 Questions?

- Check `.env` → VAPID_KEY sudah ada?
- Check Firestore Rules → User bisa write ke `/users/{userId}`?
- Check Cloud Functions Logs → Ada error?

---

**Let's go! 🚀**
