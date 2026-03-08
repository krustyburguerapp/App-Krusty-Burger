import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Utilizamos la configuración estándar recomendada por Firebase
// con caché local para que la app cargue al instante y funcione offline
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);

export const isDemoMode = false;
export const ADMIN_EMAIL = 'krustyburguerco@gmail.com';
