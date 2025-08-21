// public/firebase-messaging-sw.js
// This service worker enables push notifications to be shown even if all browser tabs are closed,
// as long as the browser process is running in the background.
// If the browser is fully killed by the OS, notifications will not be delivered until it is restarted.
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBVgxNPS0JbnJkFBKgsjnsImaTRzJyVg1c",
  authDomain: "hrms-de74c.firebaseapp.com",
  projectId: "hrms-de74c",
  storageBucket: "hrms-de74c.appspot.com",
  messagingSenderId: "24720665780",
  appId: "1:24720665780:web:cd823119f32c84a5d53be1",
  measurementId: "G-PXEX7EJ2R0"
});

const messaging = firebase.messaging();

// Listen for background messages and show notifications
messaging.onBackgroundMessage(function(payload) {
  const data = payload.data || {};
  console.log("Background notification:", data);

  const notificationTitle = data.company_name || data.title || "New Notification";
  const notificationOptions = {
    body: data.body || "You have a new message",
    icon: data.company_logo || "/logo.png", 
    data: {
      url: data.url || "/",                
      ...data,
    },
    actions: [
     
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

