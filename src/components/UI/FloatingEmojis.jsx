import { useState, useEffect } from 'react';
import './FloatingEmojis.css';

const EMOJI_LEVELS = [
    { emojis: ['\u{1F64F}', '\u{1F60A}', '\u{1F449}'], label: 'Por favor...' }, // Nivel 0
    { emojis: ['\u{23F3}', '\u{1F612}', '\u{1F914}'], label: 'Ya va...' },     // Nivel 1
    { emojis: ['\u{1F620}', '\u{1F621}', '\u{1F624}'], label: 'YA POR FAVOR!' },// Nivel 2
    { emojis: ['\u{1F525}', '\u{1F480}', '\u{1F4A2}'], label: 'URGENTE!!!' },   // Nivel 3
    { emojis: ['\u{1F92C}', '\u{1F9E8}', '\u{1F4A3}'], label: 'ME ESTRESO!!' }, // Nivel 4
    { emojis: ['\u{1F451}', '\u{1F3C6}', '\u{1F389}'], label: 'EL MÁS INTENSO' }// Nivel 5 (Ganador)
];

function getLevel(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    if (count === 4) return 4;
    return 5;
}

export function getInsistEmoji(count) {
    const level = getLevel(count);
    const emojis = EMOJI_LEVELS[level].emojis;
    return emojis[count % emojis.length];
}

export function getInsistLabel(count) {
    return EMOJI_LEVELS[getLevel(count)].label;
}

export default function FloatingEmojis({ emoji, trigger }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (trigger <= 0) return;
        const count = 6 + Math.min(trigger, 10);
        const newParticles = Array.from({ length: count }, (_, i) => ({
            id: Date.now() + i,
            emoji,
            left: 10 + Math.random() * 80,
            delay: Math.random() * 0.4,
            duration: 1.5 + Math.random() * 1.5,
            size: 20 + Math.random() * 20,
            drift: -30 + Math.random() * 60
        }));
        setParticles(prev => [...prev, ...newParticles]);
        const timer = setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 3500);
        return () => clearTimeout(timer);
    }, [trigger, emoji]);

    if (particles.length === 0) return null;

    return (
        <div className="floating-emojis-container">
            {particles.map(p => (
                <span
                    key={p.id}
                    className="floating-emoji"
                    style={{
                        left: `${p.left}%`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        fontSize: `${p.size}px`,
                        '--drift': `${p.drift}px`
                    }}
                >
                    {p.emoji}
                </span>
            ))}
        </div>
    );
}
