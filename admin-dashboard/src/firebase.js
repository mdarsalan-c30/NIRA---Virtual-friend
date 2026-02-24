import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCezi2i9eAreTivaji9GFS15DM4HNhTRQo",
    authDomain: "nira---virtual-friend.firebaseapp.com",
    projectId: "nira---virtual-friend",
    storageBucket: "nira---virtual-friend.appspot.com",
    messagingSenderId: "542283088267",
    appId: "1:542283088267:web:806ff5e60802c638f37077",
    measurementId: "G-9K52LWWPWS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
