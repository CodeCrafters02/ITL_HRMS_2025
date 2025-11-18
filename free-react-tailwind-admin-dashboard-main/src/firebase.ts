import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBVgxNPS0JbnJkFBKgsjnsImaTRzJyVg1c",
  authDomain: "hrms-54ea8.firebaseapp.com",
  projectId: "hrms-54ea8",
  storageBucket: "hrms-54ea8.appspot.com", // fixed typo
  messagingSenderId: "24720665780",
  appId: "1:24720665780:web:cd823119f32c84a5d53be1",
  measurementId: "G-PXEX7EJ2R0"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);