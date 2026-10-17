importScripts("https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAI7DAqPqKvIDTSJi60mzrB3N6atygMpBw",
  authDomain: "asrama-ipb-sukasari.firebaseapp.com",
  projectId: "asrama-ipb-sukasari",
  storageBucket: "asrama-ipb-sukasari.firebasestorage.app",
  messagingSenderId: "573037156718",
  appId: "1:573037156718:web:dbf1355ea6e8c6da83c97f",
});

const messaging = firebase.messaging();

/**
 * Membaca UID pengguna yang sedang aktif login di browser dari IndexedDB Firebase Auth
 */
function getActiveAuthUserId() {
  return new Promise(function (resolve) {
    try {
      if (!self.indexedDB) {
        return resolve(null);
      }
      var req = self.indexedDB.open("firebaseLocalStorageDb");
      req.onsuccess = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          return resolve(null);
        }
        var tx = db.transaction("firebaseLocalStorage", "readonly");
        var store = tx.objectStore("firebaseLocalStorage");
        var cursorReq = store.openCursor();
        cursorReq.onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            var val = cursor.value;
            if (val && val.value && val.value.uid) {
              return resolve(val.value.uid);
            }
            cursor.continue();
          } else {
            resolve(null);
          }
        };
        cursorReq.onerror = function () {
          resolve(null);
        };
      };
      req.onerror = function () {
        resolve(null);
      };
    } catch (err) {
      resolve(null);
    }
  });
}

messaging.onBackgroundMessage(async (payload) => {
  console.log("Received background message:", payload);

  const targetUserId =
    payload.data && (payload.data.targetUserId || payload.data.userId);

  // Filter Keamanan: Periksa apakah notifikasi ditujukan ke pengguna yang sedang aktif di perangkat
  if (targetUserId) {
    const activeUid = await getActiveAuthUserId();

    if (!activeUid) {
      console.warn(
        "Notifikasi background diblokir: Perangkat sedang tidak login (logout). Target:",
        targetUserId
      );
      return;
    }

    if (activeUid !== targetUserId) {
      console.warn(
        "Notifikasi background diblokir: Target user tidak cocok dengan akun aktif. Target:",
        targetUserId,
        "Aktif:",
        activeUid
      );
      return;
    }
  }

  const notificationTitle =
    (payload.notification && payload.notification.title) ||
    "Notifikasi Asrama";
  const notificationOptions = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: (payload.data && payload.data.type) || "notification",
    data: payload.data,
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  const urlToOpen = (data && data.link) || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
