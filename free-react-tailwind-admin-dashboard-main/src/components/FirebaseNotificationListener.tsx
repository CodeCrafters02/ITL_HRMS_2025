import { useEffect, useState } from "react";
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const FirebaseNotificationListener = ({ userToken }: { userToken: string }) => {
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);
  const [visible, setVisible] = useState(false); 

  useEffect(() => {
    // Request browser permission
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // Send FCM token to backend
    async function updateToken() {
      try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          
          const response = await fetch("http://localhost:8000/notifications/devices/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
            },
            body: JSON.stringify({ token: currentToken }),
          });

          console.log("/notifications/devices/ response status:", response.status);
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response from backend:", errorText);
          }
        }
      } catch (err) {
        console.error("Unable to get FCM token:", err);
      }
    }

    updateToken();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received in foreground:", payload);
      const { title, body } = payload.notification || {};

      setNotification({ title: title || "New Notification", body: body || "" });
      setVisible(true);

      // Hide after 5s with animation
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => setNotification(null), 300); // wait for animation out
      }, 5000);
    });

    return () => unsubscribe();
  }, [userToken]);

  return (
    <>
      {notification && (
        <div
          className={`fixed top-5 right-5 bg-white shadow-lg rounded-xl p-4 border border-gray-200 w-80 transform transition-all duration-300 ease-out
            ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
        >
          <h4 className="font-semibold text-gray-900">{notification.title}</h4>
          <p className="text-gray-600 text-sm">{notification.body}</p>
        </div>
      )}
    </>
  );
};
