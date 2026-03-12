
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC3OKoilMyGSfrzATJOje9vjg4OFDlPnqc",
    authDomain: "uknight-webcalling-prototype.firebaseapp.com",
    projectId: "uknight-webcalling-prototype",
    storageBucket: "uknight-webcalling-prototype.firebasestorage.app",
    messagingSenderId: "183062696521",
    appId: "1:183062696521:web:5b86d179fadb301a3fe598",
    measurementId: "G-XBQL0R72NZ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
