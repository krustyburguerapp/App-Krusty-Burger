import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAqIzWzq3NRr0L3Y6KKXr1aUdSrjR_GubU",
    authDomain: "app-krusty-burger.firebaseapp.com",
    projectId: "app-krusty-burger",
    storageBucket: "app-krusty-burger.firebasestorage.app",
    messagingSenderId: "731380363280",
    appId: "1:731380363280:web:3558872d891d2a99be5a95",
    measurementId: "G-FGM69NX2ST"
};

export const isDemoMode = false; // Desactivado manualmente ya que tenemos credenciales reales

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_EMAIL = 'krustyburguerco@gmail.com';
