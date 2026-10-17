import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { db, auth } from "../firebase";
import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";

const messaging = getMessaging();

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted");
      const token = await getFCMToken();
      return token;
    } else {
      console.log("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

export const getFCMToken = async () => {
  try {
    console.log("VAPID:", import.meta.env.VITE_FIREBASE_VAPID_KEY);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log("FCM Token obtained:", token);
      const currentUser = auth.currentUser;

      if (currentUser) {
        await saveFCMToken(currentUser.uid, token);
      }

      return token;
    } else {
      console.log("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const saveFCMToken = async (userId, token) => {
  try {
    // 1. Jika device ini sebelumnya pernah login sebagai user lain,
    // hapus token ini dari user lama agar notifikasi user lama tidak nyasar ke device ini
    const prevUserId = localStorage.getItem("fcm_user_id");
    if (prevUserId && prevUserId !== userId) {
      try {
        const prevUserRef = doc(db, "users", prevUserId);
        await updateDoc(prevUserRef, {
          [`fcmTokens.${token}`]: deleteField(),
          lastTokenDisassociated: new Date().toISOString(),
        });
        console.log("Successfully removed token from previous user:", prevUserId);
      } catch (err) {
        console.warn("Could not remove token from previous user doc:", err);
      }
    }

    localStorage.setItem("fcm_user_id", userId);
    localStorage.setItem("fcm_current_token", token);

    // 2. Daftarkan token ke user saat ini
    const userTokenRef = doc(db, "users", userId);
    await setDoc(
      userTokenRef,
      {
        fcmTokens: {
          [token]: new Date().toISOString(),
        },
        lastTokenUpdate: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("FCM token saved to Firestore for user:", userId);
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
  }
};

/**
 * Hapus token FCM saat logout agar akun ini tidak lagi menerima notifikasi di device ini
 */
export const removeFCMToken = async (userId) => {
  try {
    const currentToken =
      localStorage.getItem("fcm_current_token") ||
      (await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY }).catch(() => null));
    const activeUserId = userId || localStorage.getItem("fcm_user_id") || auth.currentUser?.uid;

    // 1. Hapus token dari dokumen user di Firestore
    if (currentToken && activeUserId) {
      try {
        const userTokenRef = doc(db, "users", activeUserId);
        await updateDoc(userTokenRef, {
          [`fcmTokens.${currentToken}`]: deleteField(),
          lastTokenUpdate: new Date().toISOString(),
        });
        console.log("FCM token deleted from Firestore for user:", activeUserId);
      } catch (e) {
        console.warn("Could not delete token field from Firestore:", e);
      }
    }

    // 2. Batalkan token pada FCM browser agar akun berikutnya mendapat token fresh terpisah
    try {
      await deleteToken(messaging);
      console.log("FCM token unregistered from browser messaging");
    } catch (e) {
      console.warn("Could not delete browser messaging token:", e);
    }

    // 3. Bersihkan localStorage
    localStorage.removeItem("fcm_current_token");
    localStorage.removeItem("fcm_user_id");
  } catch (error) {
    console.error("Error removing FCM token on logout:", error);
  }
};

export const setupMessageListener = (onMessageCallback) => {
  onMessage(messaging, (payload) => {
    console.log("Message received:", payload);
    onMessageCallback(payload);
  });
};

export const initFCM = async () => {
  try {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("Service Worker registered");
    }

    if (Notification.permission === "granted") {
      await getFCMToken();
    }
  } catch (error) {
    console.error("Error initializing FCM:", error);
  }
};
