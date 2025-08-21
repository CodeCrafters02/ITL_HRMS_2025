import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBVgxNPS0JbnJkFBKgsjnsImaTRzJyVg1c",
  authDomain: "hrms-de74c.firebaseapp.com",
  projectId: "hrms-de74c",
  storageBucket: "hrms-de74c.appspot.com", // fixed typo
  messagingSenderId: "24720665780",
  appId: "1:24720665780:web:cd823119f32c84a5d53be1",
  measurementId: "G-PXEX7EJ2R0"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);