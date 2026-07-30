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

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: "notification",
    data: payload.data,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  const urlToOpen = data.link || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
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
