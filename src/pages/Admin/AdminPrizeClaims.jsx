import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPrizeClaims, updatePrizeClaimStatus } from '../../utils/loyaltySystem';
import { showToast } from '../../utils/notifications';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import Modal from '../../components/UI/Modal';
import './AdminPrizeClaims.css';

const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: '#FFB74D', icon: 'pending' },
    delivered: { label: 'Entregado', color: '#81C784', icon: 'done_all' },
    cancelled: { label: 'Cancelado', color: '#E57373', icon: 'cancel' }
};

export default function AdminPrizeClaims() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const loadClaims = async () => {
        setLoading(true);
        const results = await getPrizeClaims();
        setClaims(results);
        setLoading(false);
    };

    useEffect(() => {
        loadClaims();
    }, []);

    const handleUpdateStatus = async (status) => {
        if (!selectedClaim) return;

        setActionLoading(true);
        const result = await updatePrizeClaimStatus(selectedClaim.id, status, note);
        setActionLoading(false);

        if (result.success) {
            showToast(`Estado actualizado: ${STATUS_CONFIG[status].label}`, 'success');
            setModalOpen(false);
            setNote('');
            loadClaims();
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    };

    const openStatusModal = (claim) => {
        setSelectedClaim(claim);
        setNote(claim.note || '');
        setModalOpen(true);
    };

    const filteredClaims = statusFilter === 'all' 
        ? claims 
        : claims.filter(c => c.status === statusFilter);

    const getStatusCount = (status) => claims.filter(c => c.status === status).length;

    if (loading) return <div className="page admin-page"><Spinner size="lg" /></div>;

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <h2 style={{ color: 'var(--color-text-on-dark)', marginBottom: 'var(--spacing-md)' }}>
                    🏆 Reclamos de Premios - Programa de Fidelización
                </h2>

                {/* Tarjeta informativa */}
                <div className="loyalty-info-card" style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span className="material-icons-round" style={{ fontSize: 32 }}>emoji_events</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Gestión de Recompensas</h3>
                            <p style={{ margin: 0, opacity: 0.9 }}>Administra los reclamos de comida gratis</p>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                        Los usuarios con 7 sellos pueden reclamar su premio directamente desde la app.
                        Los sellos se reinician automáticamente al reclamar.
                    </p>
                </div>

                {/* Filtros de estado */}
                <div className="status-filters">
                    <button
                        className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Todos ({claims.length})
                    </button>
                    <button
                        className={`filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('pending')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>pending</span>
                        Pendientes ({getStatusCount('pending')})
                    </button>
                    <button
                        className={`filter-chip ${statusFilter === 'delivered' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('delivered')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>done_all</span>
                        Entregados ({getStatusCount('delivered')})
                    </button>
                    <button
                        className={`filter-chip ${statusFilter === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('cancelled')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>cancel</span>
                        Cancelados ({getStatusCount('cancelled')})
                    </button>
                </div>

                {claims.length === 0 ? (
                    <EmptyState
                        icon="emoji_events"
                        title="Sin reclamos"
                        message="No hay reclamos de premios este mes"
                    />
                ) : filteredClaims.length === 0 ? (
                    <EmptyState
                        icon="filter_list"
                        title="Sin resultados"
                        message={`No hay reclamos con estado "${STATUS_CONFIG[statusFilter]?.label}"`}
                    />
                ) : (
                    <div className="claims-list">
                        <div className="claims-header">
                            <span>Usuario</span>
                            <span>Fecha</span>
                            <span>Estado</span>
                            <span>Acciones</span>
                        </div>

                        {filteredClaims.map((claim) => (
                            <div key={claim.id} className="claim-row">
                                <div className="claim-user-info">
                                    <div className="claim-user-name">{claim.userName}</div>
                                    <div className="claim-user-contact">
                                        <span className="material-icons-round" style={{ fontSize: 14 }}>phone</span>
                                        {claim.userPhone || 'Sin teléfono'}
                                    </div>
                                    {claim.userEmail && (
                                        <div className="claim-user-email">
                                            <span className="material-icons-round" style={{ fontSize: 14 }}>email</span>
                                            {claim.userEmail}
                                        </div>
                                    )}
                                </div>

                                <div className="claim-date">
                                    {new Date(claim.claimedAt).toLocaleDateString('es-CO', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>

                                <div className="claim-status">
                                    <span 
                                        className="status-badge" 
                                        style={{ background: `${STATUS_CONFIG[claim.status]?.color}20`, color: STATUS_CONFIG[claim.status]?.color }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>
                                            {STATUS_CONFIG[claim.status]?.icon}
                                        </span>
                                        {STATUS_CONFIG[claim.status]?.label}
                                    </span>
                                </div>

                                <div className="claim-actions">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => openStatusModal(claim)}
                                        title="Gestionar reclamo"
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span>
                                        Gestionar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal para gestionar estado */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="Gestionar Reclamo"
                    size="md"
                >
                    <div style={{ padding: 'var(--spacing-md)' }}>
                        {selectedClaim && (
                            <>
                                <div className="claim-detail-header">
                                    <div className="claim-detail-item">
                                        <strong>Usuario:</strong> {selectedClaim.userName}
                                    </div>
                                    <div className="claim-detail-item">
                                        <strong>Fecha:</strong> {new Date(selectedClaim.claimedAt).toLocaleString('es-CO')}
                                    </div>
                                    <div className="claim-detail-item">
                                        <strong>Estado actual:</strong> 
                                        <span className="status-badge" style={{ background: `${STATUS_CONFIG[selectedClaim.status]?.color}20`, color: STATUS_CONFIG[selectedClaim.status]?.color, marginLeft: 8 }}>
                                            {STATUS_CONFIG[selectedClaim.status]?.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label htmlFor="note">Nota (opcional)</label>
                                    <textarea
                                        id="note"
                                        className="input-field"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Ej: Pedido entregado, cliente satisfecho..."
                                        rows={3}
                                    />
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label style={{ display: 'block', marginBottom: '8px' }}>Actualizar estado:</label>
                                    <div className="status-buttons">
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <button
                                                key={key}
                                                className={`status-btn ${selectedClaim.status === key ? 'active' : ''}`}
                                                onClick={() => handleUpdateStatus(key)}
                                                disabled={actionLoading}
                                                style={{
                                                    background: selectedClaim.status === key ? config.color : 'transparent',
                                                    color: selectedClaim.status === key ? 'white' : config.color,
                                                    border: `2px solid ${config.color}`
                                                }}
                                            >
                                                <span className="material-icons-round" style={{ fontSize: 16, marginRight: 4 }}>
                                                    {config.icon}
                                                </span>
                                                {config.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedClaim.note && (
                                    <div style={{
                                        background: '#f5f5f5',
                                        padding: 'var(--spacing-md)',
                                        borderRadius: '8px',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        <strong>Nota anterior:</strong>
                                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                            {selectedClaim.note}
                                        </p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    <button
                                        className="btn btn-ghost btn-full"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    );
}
