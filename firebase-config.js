import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAydN6ZlQvJFg6IfQmwg1DLuGmHxPTODBo",
  authDomain: "agriconnect-486aa.firebaseapp.com",
  projectId: "agriconnect-486aa",
  storageBucket: "agriconnect-486aa.firebasestorage.app",
  messagingSenderId: "334096520447",
  appId: "1:334096520447:web:4b39ded1a7e6c5613ea8ca",
  measurementId: "G-Z6L66XLEDX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
