export default function EmptyState({ icon = 'inbox', title, message }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem',
            animation: 'fadeInUp 400ms ease'
        }}>
            <span className="material-icons-round" style={{
                fontSize: 56, color: 'var(--color-text-hint)', opacity: 0.6
            }}>{icon}</span>
            <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)'
            }}>{title}</h3>
            {message && <p style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                textAlign: 'center', maxWidth: 300
            }}>{message}</p>}
        </div>
    );
}
