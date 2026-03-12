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
        addressNotes: userData?.addressNotes || '',
        locationUrl: userData?.locationUrl || ''
    });
    const [saving, setSaving] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            showToast('Tu dispositivo no soporta geolocalización', 'error');
            return;
        }

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setForm({ ...form, locationUrl: `https://maps.google.com/?q=${latitude},${longitude}` });
                setLoadingLocation(false);
                showToast('Ubicación obtenida automáticamente', 'success');
            },
            (error) => {
                setLoadingLocation(false);
                showToast('Ocurrió un error o no diste permiso al GPS.', 'error', 5000);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSave = async () => {
        if (!form.address.trim() || !form.locationUrl) {
            showToast('Debes configurar tu dirección y adjuntar la ubicación GPS', 'error');
            return;
        }
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
                        <h3>{userData?.displayName || 'Krusty Fan'}</h3>
                        <p>{userData?.email || 'Falta correo electrónico'}</p>
                        {isAdmin && <span className="badge badge-primary" style={{ marginTop: 4 }}>Admin</span>}
                    </div>
                </div>



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
                                
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={handleGetLocation}
                                    disabled={loadingLocation}
                                    style={{ marginTop: '8px', padding: '10px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 20 }}>{loadingLocation ? 'sync' : 'my_location'}</span>
                                    {loadingLocation ? 'Obteniendo Ubicación...' : 'Usar mi ubicación GPS (Obligatorio)'}
                                </button>
                                {form.locationUrl ? (
                                    <small style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <span className="material-icons-round" style={{ fontSize: 14 }}>check_circle</span>
                                        Ubicación GPS adjuntada
                                        <span
                                            className="material-icons-round"
                                            style={{ fontSize: 14, cursor: 'pointer', color: 'var(--color-error)', marginLeft: 'auto' }}
                                            onClick={() => setForm({...form, locationUrl: ''})}
                                            title="Eliminar ubicación"
                                        >close</span>
                                    </small>
                                ) : (
                                    <small style={{ color: 'var(--color-error)' }}>Obligatoria para envíos a domicilio</small>
                                )}
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
                                    <small>Dirección y GPS</small>
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        {userData?.address || 'No configurada'}
                                        {userData?.locationUrl && (
                                            <a href={userData.locationUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 'bold' }}>
                                                <span className="material-icons-round" style={{ fontSize: 12 }}>map</span>Mapa
                                            </a>
                                        )}
                                    </span>
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
