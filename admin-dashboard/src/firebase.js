import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAAVrIZXldf7Tjyoz6xugT77dL1i63bc3w",
    authDomain: "nira---virtual-friend.firebaseapp.com",
    projectId: "nira---virtual-friend",
    storageBucket: "nira---virtual-friend.firebasestorage.app",
    messagingSenderId: "559263529238",
    appId: "1:559263529238:web:c7af459902ecb0e04ab837",
    measurementId: "G-2YFBZGB111"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Add a simple check to ensure its working
console.log("🔥 Firebase Admin Initialized");
