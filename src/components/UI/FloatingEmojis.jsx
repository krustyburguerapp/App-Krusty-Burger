import { useState, useEffect } from 'react';
import './FloatingEmojis.css';

const EMOJI_LEVELS = [
    { emojis: ['\u{1F64F}', '\u{1F60A}', '\u{1F449}'], label: 'Por favor...' },
    { emojis: ['\u{23F3}', '\u{1F612}', '\u{1F914}'], label: 'Ya va...' },
    { emojis: ['\u{1F620}', '\u{1F621}', '\u{1F624}'], label: 'YA POR FAVOR!' },
    { emojis: ['\u{1F525}', '\u{1F480}', '\u{1F4A2}'], label: 'URGENTE!!!' }
];

function getLevel(count) {
    if (count <= 3) return 0;
    if (count <= 7) return 1;
    if (count <= 12) return 2;
    return 3;
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
