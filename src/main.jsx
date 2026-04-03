import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// LIMPIEZA DE INDEXEDDB CORRUPTO
// Las sesiones anteriores usaban persistentLocalCache que dejó datos corruptos
// en IndexedDB. Limpiamos UNA VEZ para que Firestore arranque limpio.
const CLEANUP_KEY = 'krusty_idb_cleaned_v2';
if (!localStorage.getItem(CLEANUP_KEY)) {
    const dbNames = [
        'firebaseLocalStorageDb',
        'firestore/[DEFAULT]/app-krusty-burger/main'
    ];
    dbNames.forEach(name => {
        try { indexedDB.deleteDatabase(name); } catch (e) { /* ignore */ }
    });
    localStorage.setItem(CLEANUP_KEY, 'true');
    // Recargar para que Firebase inicie sin datos corruptos
    window.location.reload();
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);

// Register Service Worker for PWA (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            /* SW registration failed - that's OK */
        });
    });
}
