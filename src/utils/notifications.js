const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACA' +
    'gICAgICAgICAgICAgICAgICAgIB/f39+fn5+fn5+fn19fHx7e3t6enl5eXh4' +
    'eHd3d3Z2dnV1dXR0dHNzc3JycnFxcXBwb29vbm5ubW1tbGxsa2tramppampq' +
    'aWlpaGhoZ2dnaGhoaWlpa2tra21tbm9vcHBxcnJzc3R1dXZ3d3h4eXp6e3x8' +
    'fX5+f4CAgYGCg4OEhYWGh4eIiomKi4yMjY6Oj5CQkZKSk5SUlZWWl5eYmZma' +
    'mpucnJ2en5+goaGio6Okpaamp6eoqamqq6ysra6ur7CxsbKzs7S1tre3uLm6' +
    'u7u8vb6/v8DBwsPExcbGx8nJysvMzc3Oz9DR0tPU1NXW19jZ2tvc3d3e3+Dh' +
    '4uPk5eXm5+jp6uvs7O3u7/Dx8vLz9PX19vf4+fn6+/z9/f3+/v/+/f38/Pv7' +
    '+vn4+Pf29fT08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQ' +
    'z87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaOi';

let audioElement = null;

function getAudioElement() {
    if (!audioElement) {
        audioElement = new Audio(NOTIFICATION_SOUND);
        audioElement.volume = 0.5;
    }
    return audioElement;
}

export function playNotificationSound() {
    try {
        const audio = getAudioElement();
        audio.currentTime = 0;
        audio.play().catch(() => {
            /* Browser may block autoplay - that's OK */
        });
    } catch (err) {
        /* Silently fail if audio is not supported */
    }
}

let toastContainer = null;

function getToastContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 16px;
      z-index: 500;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    const colors = {
        info: '#1E88E5',
        success: '#43A047',
        warning: '#FB8C00',
        error: '#E53935',
        order: '#D32F2F'
    };
    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error',
        order: 'notifications_active'
    };
    toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    border-left: 4px solid ${colors[type]};
    pointer-events: auto;
    animation: slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #212121;
    max-width: 360px;
    cursor: pointer;
  `;
    toast.innerHTML = `
    <span class="material-icons-round" style="color:${colors[type]};font-size:22px">${icons[type]}</span>
    <span style="flex:1">${message}</span>
  `;
    toast.addEventListener('click', () => {
        toast.style.animation = 'fadeOut 200ms ease forwards';
        setTimeout(() => toast.remove(), 200);
    });
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'fadeOut 200ms ease forwards';
            setTimeout(() => toast.remove(), 200);
        }
    }, duration);
}
