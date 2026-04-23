import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDjnfMLzfJ7dURGuyIpFIGHenR1QENC2BE",
    authDomain: "peoplesuite-ca155.firebaseapp.com",
    projectId: "peoplesuite-ca155",
    storageBucket: "peoplesuite-ca155.firebasestorage.app",
    messagingSenderId: "482392351722",
    appId: "1:482392351722:web:41a02db7677aa9ebedc893",
    measurementId: "G-4ZL3ET129L"
};

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
