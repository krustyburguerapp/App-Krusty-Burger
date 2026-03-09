import { useState, useEffect } from 'react';
import './InstallPrompt.css';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        if (isStandalone) {
            return; // Already installed
        }

        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Show the prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Also check if we are on iOS Safari to show a manual prompt, since iOS doesn't support beforeinstallprompt
        const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
        const isSafari = /safari/.test(navigator.userAgent.toLowerCase()) && !/chrome/.test(navigator.userAgent.toLowerCase());

        if (isIos && isSafari && !isStandalone) {
            setShowPrompt(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            // iOS manual instruction
            alert('Para instalar en iOS: toca el ícono "Compartir" en el menú inferior y luego "Agregar a inicio".');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="install-prompt-overlay fade-in">
            <div className="install-prompt-card slide-up">
                <button className="install-prompt-close" onClick={handleDismiss} aria-label="Cerrar">
                    <span className="material-icons-round">close</span>
                </button>
                <div className="install-prompt-content">
                    <img src="/LOGO.png" alt="Krusty Burger" className="install-prompt-logo" />
                    <div>
                        <h3>Instala nuestra App</h3>
                        <p>Agrega Krusty Burger a tu inicio para pedir más rápido y fácil.</p>
                    </div>
                </div>
                <div className="install-prompt-actions">
                    <button className="btn btn-primary btn-full" onClick={handleInstall}>
                        Instalar App
                    </button>
                </div>
            </div>
        </div>
    );
}
