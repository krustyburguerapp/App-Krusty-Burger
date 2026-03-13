import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { searchUsers, addManualStamp, resetUserStamps } from '../../utils/loyaltySystem';
import { showToast } from '../../utils/notifications';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import Modal from '../../components/UI/Modal';
import './AdminLoyalty.css';

export default function AdminLoyalty() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [usersStamps, setUsersStamps] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    
    // Debounce para la búsqueda
    const searchTimeoutRef = useRef(null);

    // Función para recargar la lista de usuarios (después de agregar/reiniciar sello)
    const loadUsersStamps = async () => {
        if (searchTerm && searchTerm.trim().length >= 3) {
            setSearching(true);
            const results = await searchUsers(searchTerm);
            setUsersStamps(results);
            setSearching(false);
        }
    };

    const handleSearch = async (term) => {
        setSearchTerm(term);
        
        // Limpiar timeout anterior
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Si el término está vacío, limpiar resultados
        if (!term || term.trim().length < 3) {
            setUsersStamps([]);
            setHasSearched(false);
            return;
        }
        
        // Debounce de 400ms para evitar demasiadas consultas
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            const results = await searchUsers(term);
            setUsersStamps(results);
            setSearching(false);
            setHasSearched(true);
        }, 400);
    };

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleAddStamp = async () => {
        if (!selectedUser) return;

        console.log('🔘 [AdminLoyalty] Intentando agregar sello manual:', {
            userId: selectedUser.userId,
            userName: selectedUser.userName,
            currentStamps: selectedUser.stamps,
            note
        });

        setActionLoading(true);
        const result = await addManualStamp(selectedUser.userId, user.uid, note || 'Sello asignado por admin');

        console.log('📍 [AdminLoyalty] Resultado de addManualStamp:', result);
        setActionLoading(false);

        if (result.success) {
            showToast(`✅ Sello agregado. Total: ${result.stamps}/7`, 'success');
            setModalOpen(false);
            setNote('');
            // Recargar la lista de usuarios
            loadUsersStamps();
        } else {
            showToast(`❌ Error: ${result.error || 'Error al agregar sello'}`, 'error');
        }
    };

    const handleResetStamps = async () => {
        if (!selectedUser) return;

        console.log('🔘 [AdminLoyalty] Intentando reiniciar sellos:', {
            userId: selectedUser.userId,
            userName: selectedUser.userName,
            currentStamps: selectedUser.stamps,
            note
        });

        setActionLoading(true);
        const result = await resetUserStamps(selectedUser.userId, user.uid, note || 'Premio entregado - reinicio de sellos');

        console.log('📍 [AdminLoyalty] Resultado de resetUserStamps:', result);
        setActionLoading(false);

        if (result.success) {
            showToast('✅ Sellos reiniciados correctamente', 'success');
            setResetModalOpen(false);
            setNote('');
            loadUsersStamps();
        } else {
            showToast(`❌ Error: ${result.error || 'Error al reiniciar sellos'}`, 'error');
        }
    };

    const openAddModal = (userData) => {
        setSelectedUser(userData);
        setNote('');
        setModalOpen(true);
    };

    const openResetModal = (userData) => {
        setSelectedUser(userData);
        setNote('');
        setResetModalOpen(true);
    };

    const getMonthName = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    };

    if (loading) return <div className="page admin-page"><Spinner size="lg" /></div>;

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <h2 style={{ color: 'var(--color-text-on-dark)', marginBottom: 'var(--spacing-md)' }}>
                    Programa de Fidelización - Sellos Krusty
                </h2>

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
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Gana una Comida Gratis</h3>
                            <p style={{ margin: 0, opacity: 0.9 }}>Comida Individual GRATIS + Bebida Pequeña</p>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                        Los usuarios ganan 1 sello por cada día distinto con pedido completado. 
                        Al completar 7 sellos en el mismo mes, <b>ganan una comida gratis + bebida pequeña</b>.
                    </p>
                </div>

                {/* Buscador de usuarios */}
                <div className="input-group" style={{ marginBottom: '20px', position: 'relative' }}>
                    <label htmlFor="search" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span className="material-icons-round" style={{ fontSize: 18 }}>search</span>
                        Buscar usuario por nombre, email o teléfono
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="search"
                            type="text"
                            className="input-field"
                            placeholder="Escribí al menos 3 letras para buscar..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ padding: '12px 40px 12px 16px', fontSize: '15px' }}
                        />
                        {searching && (
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Spinner size="sm" />
                            </div>
                        )}
                        {searchTerm && !searching && (
                            <button
                                onClick={() => handleSearch('')}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--color-text-secondary)'
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
                            </button>
                        )}
                    </div>
                    {hasSearched && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            {usersStamps.length} usuario{usersStamps.length !== 1 ? 's' : ''} encontrado{usersStamps.length !== 1 ? 's' : ''}
                        </div>
                    )}
                    {!hasSearched && searchTerm.length > 0 && searchTerm.length < 3 && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-warning)' }}>
                            <span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle' }}>info</span>
                            Escribí al menos 3 letras para buscar
                        </div>
                    )}
                </div>

                {usersStamps.length === 0 && hasSearched ? (
                    <EmptyState 
                        icon="search_off" 
                        title="No se encontró ningún usuario" 
                        message="Probá con otro término de búsqueda" 
                    />
                ) : usersStamps.length === 0 && !hasSearched ? (
                    <EmptyState 
                        icon="search" 
                        title="Buscá usuarios" 
                        message="Escribí el nombre, email o teléfono para buscar usuarios en el programa de fidelidad" 
                    />
                ) : (
                    <div className="loyalty-users-list">
                        <div className="loyalty-users-header">
                            <span>Usuario</span>
                            <span>Sellos</span>
                            <span>Progreso</span>
                            <span style={{ textAlign: 'center' }}>Acciones</span>
                        </div>
                        
                        {usersStamps.map((userData) => (
                            <div key={userData.id} className="loyalty-user-row">
                                <div className="loyalty-user-info">
                                    <div className="loyalty-user-name">{userData.userName}</div>
                                    <div className="loyalty-user-contact">
                                        <span className="material-icons-round" style={{ fontSize: 14 }}>phone</span>
                                        {userData.userPhone || 'Sin teléfono'}
                                    </div>
                                    {userData.userEmail && (
                                        <div className="loyalty-user-email">
                                            <span className="material-icons-round" style={{ fontSize: 14 }}>email</span>
                                            {userData.userEmail}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="loyalty-user-stamps">
                                    <span className={`stamp-count ${userData.stamps >= 7 ? 'complete' : ''}`}>
                                        {userData.stamps}/7
                                    </span>
                                </div>
                                
                                <div className="loyalty-user-progress">
                                    <div className="progress-bar">
                                        <div 
                                            className={`progress-fill ${userData.stamps >= 7 ? 'complete' : ''}`}
                                            style={{ width: `${(userData.stamps / 7) * 100}%` }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                        {userData.stamps >= 7 
                                            ? '✅ ¡Completó los 7 sellos!' 
                                            : userData.stamps === 6
                                                ? '¡Falta 1 sello para tu comida gratis! 🍔'
                                                : `Faltan ${7 - userData.stamps} sellos para tu comida gratis`}
                                    </div>
                                    {userData.prizeClaimed && (
                                        <span className="prize-claimed-badge">
                                            <span className="material-icons-round">check_circle</span>
                                            Premio reclamado
                                        </span>
                                    )}
                                </div>
                                
                                <div className="loyalty-user-actions">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => openAddModal(userData)}
                                        disabled={userData.stamps >= 7}
                                        title={userData.stamps >= 7 ? 'Ya completó los 7 sellos' : 'Agregar sello manual'}
                                        style={{ 
                                            opacity: userData.stamps >= 7 ? 0.5 : 1,
                                            cursor: userData.stamps >= 7 ? 'not-allowed' : 'pointer',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 18, marginRight: '4px' }}>add_circle</span>
                                        Agregar
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => openResetModal(userData)}
                                        title="Reiniciar sellos (entregó premio)"
                                        style={{ 
                                            background: 'var(--color-success)',
                                            color: 'white',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 18, marginRight: '4px' }}>refresh</span>
                                        Reiniciar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal para agregar sello */}
                <Modal 
                    isOpen={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    title="Agregar Sello Manual"
                    size="sm"
                >
                    <div style={{ padding: 'var(--spacing-md)' }}>
                        {selectedUser && (
                            <>
                                <p style={{ marginBottom: 'var(--spacing-md)' }}>
                                    Agregar sello a: <strong>{selectedUser.userName}</strong>
                                </p>
                                
                                <div className="input-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label htmlFor="note">Nota (opcional)</label>
                                    <textarea
                                        id="note"
                                        className="input-field"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Motivo del sello manual..."
                                        rows={3}
                                    />
                                </div>
                                
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    <button
                                        className="btn btn-ghost btn-full"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={handleAddStamp}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Agregando...' : 'Agregar Sello'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>

                {/* Modal para reiniciar sellos */}
                <Modal 
                    isOpen={resetModalOpen} 
                    onClose={() => setResetModalOpen(false)} 
                    title="Reiniciar Sellos"
                    size="sm"
                >
                    <div style={{ padding: 'var(--spacing-md)' }}>
                        {selectedUser && (
                            <>
                                <div style={{ 
                                    background: 'var(--color-warning-light)', 
                                    padding: 'var(--spacing-md)',
                                    borderRadius: '8px',
                                    marginBottom: 'var(--spacing-md)',
                                    borderLeft: '4px solid var(--color-warning)'
                                }}>
                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                        <strong>⚠️ Atención:</strong> Esta acción reiniciará los sellos del usuario a 0.
                                        Úsalo solo después de entregar el premio.
                                    </p>
                                </div>
                                
                                <p style={{ marginBottom: 'var(--spacing-md)' }}>
                                    Usuario: <strong>{selectedUser.userName}</strong><br/>
                                    Sellos actuales: <strong>{selectedUser.stamps}/7</strong>
                                </p>
                                
                                <div className="input-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label htmlFor="resetNote">Nota de reinicio</label>
                                    <textarea
                                        id="resetNote"
                                        className="input-field"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Ej: Premio entregado el..."
                                        rows={3}
                                        required
                                    />
                                </div>
                                
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    <button
                                        className="btn btn-ghost btn-full"
                                        onClick={() => setResetModalOpen(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={handleResetStamps}
                                        disabled={actionLoading || !note.trim()}
                                    >
                                        {actionLoading ? 'Reiniciando...' : 'Reiniciar Sellos'}
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
