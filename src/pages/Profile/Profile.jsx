import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/notifications';
import './Profile.css';

export default function Profile() {
    const { user, userData, updateUserData, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        displayName: userData?.displayName || '',
        phone: userData?.phone || '',
        address: userData?.address || '',
        addressNotes: userData?.addressNotes || ''
    });
    const [saving, setSaving] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateUserData(form);
        setSaving(false);
        if (result.success) {
            setEditing(false);
            showToast('Perfil actualizado', 'success');
        } else {
            showToast('Error al guardar', 'error');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isGuest = user?.isAnonymous;

    return (
        <div className="page">
            <div className="container profile-container">
                <h2>Mi Perfil</h2>

                <div className="profile-card">
                    <div className="profile-photo">
                        {userData?.photoURL && !imgError ? (
                            <img
                                src={userData.photoURL}
                                alt={userData.displayName}
                                onError={() => setImgError(true)}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--color-text-hint)' }}>account_circle</span>
                        )}
                    </div>
                    <div className="profile-info">
                        <h3>{userData?.displayName || 'Invitado'}</h3>
                        <p>{userData?.email || 'Sesión como invitado'}</p>
                        {isAdmin && <span className="badge badge-primary" style={{ marginTop: 4 }}>Admin</span>}
                    </div>
                </div>

                {isGuest && (
                    <div className="profile-guest-notice">
                        <span className="material-icons-round">info</span>
                        <p>Estás como invitado. Tu información se perderá si cierras sesión. <strong>Inicia sesión con Google</strong> para guardar tus datos permanentemente.</p>
                    </div>
                )}

                <div className="profile-section">
                    <div className="profile-section-header">
                        <h3>Datos de Entrega</h3>
                        {!editing && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span> Editar
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div className="profile-form">
                            <div className="input-group">
                                <label htmlFor="p-name">Nombre</label>
                                <input id="p-name" type="text" className="input-field" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="p-phone">WhatsApp</label>
                                <input id="p-phone" type="tel" className="input-field" placeholder="3001234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="p-addr">Dirección</label>
                                <input id="p-addr" type="text" className="input-field" placeholder="Calle, número, barrio" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="p-notes">Indicaciones</label>
                                <textarea id="p-notes" className="input-field" placeholder="Apartamento, edificio..." value={form.addressNotes} onChange={(e) => setForm({ ...form, addressNotes: e.target.value })} rows={2} />
                            </div>
                            <div className="profile-form-actions">
                                <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button className="btn btn-ghost btn-full" onClick={() => setEditing(false)}>Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-data-grid">
                            <div className="profile-data-item">
                                <span className="material-icons-round">phone</span>
                                <div>
                                    <small>WhatsApp</small>
                                    <span>{userData?.phone || 'No configurado'}</span>
                                </div>
                            </div>
                            <div className="profile-data-item">
                                <span className="material-icons-round">location_on</span>
                                <div>
                                    <small>Dirección</small>
                                    <span>{userData?.address || 'No configurada'}</span>
                                </div>
                            </div>
                            {userData?.addressNotes && (
                                <div className="profile-data-item">
                                    <span className="material-icons-round">note</span>
                                    <div>
                                        <small>Indicaciones</small>
                                        <span>{userData.addressNotes}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <button className="btn btn-secondary btn-full" onClick={() => navigate('/admin')} style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <span className="material-icons-round">dashboard</span>
                        Ir al Panel Admin
                    </button>
                )}

                <button className="btn btn-ghost btn-full profile-logout" onClick={handleLogout}>
                    <span className="material-icons-round">logout</span>
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
