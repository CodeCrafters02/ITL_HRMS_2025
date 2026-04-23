importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDjnfMLzfJ7dURGuyIpFIGHenR1QENC2BE",
    authDomain: "peoplesuite-ca155.firebaseapp.com",
    projectId: "peoplesuite-ca155",
    storageBucket: "peoplesuite-ca155.firebasestorage.app",
    messagingSenderId: "482392351722",
    appId: "1:482392351722:web:41a02db7677aa9ebedc893",
    measurementId: "G-4ZL3ET129L"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.data.title || 'Notification';
  const notificationOptions = {
    body: payload.data.body || '',
    icon: '/favicon.png', // Update with actual icon path if needed
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
