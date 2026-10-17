import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setupMessageListener } from "./fcmService";
import { auth } from "../firebase";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Bersihkan riwayat notifikasi di UI saat akun logout / berganti akun
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setupMessageListener((payload) => {
      const targetUserId = payload.data?.targetUserId || payload.data?.userId;
      const currentUid = auth.currentUser?.uid;

      // Filter ketat keamanan: jika notifikasi ini dikirim untuk user lain, abaikan!
      if (targetUserId && currentUid && targetUserId !== currentUid) {
        console.warn("Abaikan notifikasi: bukan ditujukan untuk user aktif saat ini:", targetUserId, "Aktif:", currentUid);
        return;
      }

      const notification = {
        id: Date.now(),
        title: payload.notification?.title || "Notifikasi Baru",
        body: payload.notification?.body || "",
        data: payload.data || {},
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [notification, ...prev]);
    });
  }, []);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  const clearNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
