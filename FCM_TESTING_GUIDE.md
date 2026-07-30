# 📱 FCM Notification Testing Guide

## ✅ Status Deployment

- **Cloud Functions**: ✅ Deployed successfully (all 8 functions)
- **Frontend Notifications**: ✅ Integrated (FormSpa, CreateKegiatan, LaporPiket)
- **Firestore Triggers**: ✅ Active

## 🧪 Frontend Testing (Form Submission Notifications)

### Test 1: FormSpa Submission Notification
```
1. npm run dev
2. Login dengan akun user
3. Navigate ke Spa → Form Pembayaran SPA
4. Isi form & upload foto bukti
5. Klik "Kirim Bukti Pembayaran"
6. ✅ Ekspektasi: Notifikasi "Pembayaran SPA Terkirim" muncul di bell icon
```

### Test 2: CreateKegiatan Submission Notification
```
1. Login dengan akun yang punya jabatan (kementerian)
2. Navigate ke Create Kegiatan
3. Isi form dengan judul, deskripsi, waktu
4. Klik "Publikasikan Kegiatan"
5. ✅ Ekspektasi: Notifikasi "Kegiatan Berhasil Dibuat" muncul di bell icon
```

### Test 3: LaporPiket Submission Notification
```
1. Login ke aplikasi
2. Navigate ke LaporPiket
3. Cari & pilih supervisor (Lapor Ke)
4. Upload foto bukti piket
5. Submit laporan
6. ✅ Ekspektasi: Notifikasi "Laporan Piket Terkirim" muncul di bell icon
```

---

## 🔔 Backend Testing (Cloud Functions Triggers)

### Test 4: Test HTTP Endpoint (sendNotificationTest)

```bash
# Get user ID from Firestore Users collection
USER_ID="copy-user-id-from-firestore"

# Test dengan cURL
curl -X POST https://us-central1-asrama-ipb-sukasari.cloudfunctions.net/sendNotificationTest \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"Test Notifikasi\",
    \"body\": \"Ini pesan test dari Cloud Function\",
    \"data\": {\"link\": \"/home\"}
  }"
```

**Response Success:**
```json
{
  "success": true,
  "message": "Notification sent"
}
```

### Test 5: Test Piket Upload Trigger (onPiketUpload)

**Setup:**
1. Pastikan user sudah save FCM token (login & grant notification permission)
2. User A membuat laporan piket, pilih User B sebagai "Lapor Ke"
3. Upload bukti & submit

**Ekspektasi:**
- ✅ Cloud Function `onPiketUpload` trigger
- ✅ Notifikasi terkirim ke User B: "Ada laporan piket baru di [place] yang perlu Anda verifikasi"

### Test 6: Test Piket Verification Trigger (onPiketVerified)

**Setup:**
1. User B (supervisor) akses piket yang User A submit
2. Verifikasi piket (change `verification` field to `true`)
3. Save changes

**Ekspektasi:**
- ✅ Cloud Function `onPiketVerified` trigger
- ✅ Notifikasi terkirim ke User A: "Laporan piket Anda di [place] telah diverifikasi"

### Test 7: Test SPA Verification Trigger (onSpaVerified)

**Setup:**
1. User A submit SPA pembayaran via FormSpa
2. Admin/Bendahara buka doc di `Spa` collection
3. Ubah `verification` field dari `false` ke `true`

**Ekspektasi:**
- ✅ Cloud Function `onSpaVerified` trigger
- ✅ Notifikasi ke User A: "Bukti pembayaran SPA Anda untuk bulan [bulan] telah diverifikasi"

### Test 8: Test Point Judgment Trigger (onPointJudgment)

**Setup:**
1. Admin buat dokumen baru di collection `historyPoint`
2. Field required:
   ```json
   {
     "userref": "doc-reference-ke-user-uid",
     "point": 5,
     "name": "Tambah Poin Piket"
   }
   ```
3. Save dokumen

**Ekspektasi:**
- ✅ Cloud Function `onPointJudgment` trigger
- ✅ Notifikasi ke user: "Perubahan Poin: Tambah Poin Piket - Ada Penambahan sebesar +5 poin pada akun Anda"

---

## 🔍 Debugging & Troubleshooting

### Issue: Notifikasi tidak muncul (Frontend)

**Solusi:**
1. Cek Console (F12 → Console)
   ```
   "FCM Token obtained: [token]" - ✅ Token berhasil
   "Message received:" - ✅ Message diterima
   ```

2. Pastikan Service Worker registered:
   ```
   "Service Worker registered" - ✅ Di console
   ```

3. Cek notification permission:
   ```javascript
   console.log(Notification.permission); // Should be "granted"
   ```

4. Cek FCM token di Firestore:
   - Buka Firestore Console → Users → current-user-id
   - Lihat field `fcmTokens` - harus ada token

### Issue: Cloud Function tidak trigger

**Solusi:**
1. Cek Cloud Function Logs:
   ```bash
   firebase functions:log
   ```

2. Pastikan field `reportedUser` / `userref` ada di dokumen:
   - `piket`: `laporTo` field harus ada
   - `Spa`: `userWhoReport` field harus ada
   - `historyPoint`: `userref` field harus ada

3. Pastikan user punya FCM token di Firestore:
   ```
   /users/{userId}/fcmTokens should not be empty
   ```

### Issue: Token Invalid/Expired

**Solusi:**
- Cloud Function auto-delete invalid token
- User akan refresh token next time app opens
- Manual refresh: logout → login

---

## 📊 Testing Checklist

```
Frontend Notifications:
  [ ] FormSpa submission → notification appears
  [ ] CreateKegiatan submission → notification appears
  [ ] LaporPiket submission → notification appears

Cloud Functions:
  [ ] sendNotificationTest HTTP endpoint works
  [ ] onPiketUpload trigger works
  [ ] onPiketVerified trigger works
  [ ] onSpaVerified trigger works
  [ ] onPointJudgment trigger works
  [ ] onJamalVerified trigger works

Cross-browser/device:
  [ ] Test on Chrome
  [ ] Test on Firefox
  [ ] Test on Mobile (if available)
  [ ] Test background notifications
```

---

## 📝 Firestore Rules Update (If Needed)

Pastikan `users` collection memiliki write permission untuk `fcmTokens`:

```javascript
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
  
  match /fcmTokens/{token} {
    allow write: if request.auth.uid == userId;
  }
}
```

---

## 🚀 Production Checklist

- [ ] All Cloud Functions deployed & active
- [ ] FCM token storage secured in Firestore
- [ ] Frontend notifications integrated in all forms
- [ ] Testing on staging completed
- [ ] Monitoring enabled in Firebase Console
- [ ] Error logging configured

---

## 📞 Support

**Common Commands:**
```bash
# View Cloud Functions logs
firebase functions:log

# List deployed functions
firebase functions:list

# Deploy only functions
firebase deploy --only functions

# Delete a function (if needed)
firebase functions:delete functionName
```

