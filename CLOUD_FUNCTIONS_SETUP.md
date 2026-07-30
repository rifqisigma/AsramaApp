# Firebase Cloud Functions Setup Guide

## Langkah 1: Setup Cloud Functions Lokal

```bash
# Install Firebase CLI (jika belum)
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Dari root folder AsramaApp, initialize Cloud Functions
firebase init functions
# Pilih:
# - Project: asrama-ipb-sukasari
# - Language: JavaScript
# - Install dependencies: Yes
```

## Langkah 2: Install Dependencies

```bash
cd functions
npm install
```

## Langkah 3: Update functions/index.js

Copy kode dari `functions-index.js` di repo ini ke `functions/index.js`

## Langkah 4: Update functions/services/notificationService.js

Copy kode dari `functions-notificationService.js` ke `functions/services/notificationService.js`

## Langkah 5: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

## Trigger Events

### Evidence Upload Trigger
- Ketika user upload bukti piket/jamal/spa di `/lapor-piket`, `/lapor-jamal`, `/form-spa`
- Data disimpan di `evidence/{evidenceId}`
- Cloud Function akan mengirim notif ke terlapor

### Evidence Verification Trigger
- Admin/verifier verify evidence di evidence collection
- Cloud Function mendeteksi status change
- Kirim notif ke terlapor (approved/rejected)

### Point Judgment Trigger
- Admin input penghakiman point di `/penghakiman-point`
- Data disimpan di `point/{pointId}`
- Cloud Function kirim notif ke terlapor

## Database Structure (Firestore)

```
/users/{userId}
  ├─ fcmTokens: {tokenString: timestamp}
  ├─ name, email, role
  └─ ...

/evidence/{evidenceId}
  ├─ type: 'piket' | 'jamal' | 'spa'
  ├─ uploadedBy: userId
  ├─ reportedUser: userId (terlapor)
  ├─ status: 'pending' | 'verified' | 'rejected'
  ├─ timestamp: Date
  └─ ...

/point/{pointId}
  ├─ reportedUser: userId
  ├─ givenBy: userId (admin)
  ├─ type: 'piket' | 'jamal' | 'spa'
  ├─ value: number
  ├─ status: 'pending' | 'finalized'
  └─ timestamp: Date
```

## Testing

```bash
# Test locally
firebase emulators:start --only functions

# Send test notification
curl -X POST http://localhost:5001/asrama-ipb-sukasari/us-central1/sendNotificationTest \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "title": "Test Notif",
    "body": "Ini test notification",
    "data": {"link": "/home"}
  }'
```

## Variables & Environment

Tidak perlu setup `.env` untuk Cloud Functions - gunakan Firebase Admin SDK config yang sudah ada.

VAPID Key di frontend `.env`:
```
VITE_FIREBASE_VAPID_KEY=BIQMhPDGvKzU6_8PcbzJBEKWUZd5H8Lq_zZcXvKhOtKqZ0JU5KnC_VsZkVkLqIABvKx3QkpkX5qJ7_KQ_J5KDuM
```
