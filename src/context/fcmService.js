import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";

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
    console.log("FCM token saved to Firestore");
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
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
