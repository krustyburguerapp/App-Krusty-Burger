import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRestaurantSettings, saveRestaurantSettings, DEFAULT_RESTAURANT_SETTINGS } from '../../config/restaurantSettings';
import { showToast } from '../../utils/notifications';
import Spinner from '../../components/UI/Spinner';
import './AdminSettings.css';

export default function AdminSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        openingTime: '11:00',
        closingTime: '22:00',
        closedToday: false,
        closedTodayDate: null,
        deliveryEnabled: true,
        freeDeliveryPromo: false
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Cargar configuración actual
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await getRestaurantSettings();
            setSettings({
                openingTime: data.openingTime || '11:00',
                closingTime: data.closingTime || '22:00',
                closedToday: data.closedToday || false,
                closedTodayDate: data.closedTodayDate || null,
                deliveryEnabled: data.deliveryEnabled !== undefined ? data.deliveryEnabled : true,
                freeDeliveryPromo: data.freeDeliveryPromo || false
            });
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            showToast('Error al cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
        setHasChanges(true);
    };

    const handleToggleChange = (field) => {
        setSettings(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!user) {
            showToast('Error: Usuario no autenticado', 'error');
            return;
        }

        setSaving(true);
        try {
            const result = await saveRestaurantSettings(settings, user.uid);

            if (result.success) {
                showToast('✅ Configuración guardada correctamente', 'success');
                setHasChanges(false);
                loadSettings();
            } else {
                showToast(`❌ Error al guardar: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            showToast('Error inesperado al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const formatTime12 = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="page admin-page">
                <div className="container admin-container">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <div className="admin-settings-header">
                    <div>
                        <h2 className="admin-greeting">
                            <span className="material-icons-round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>store</span>
                            Configuración del Restaurante
                        </h2>
                        <p className="admin-subtitle">
                            Controla horarios, domicilios y promociones
                        </p>
                    </div>
                </div>

                {/* Información de última actualización */}
                {settings?.updatedAt && (
                    <div className="settings-last-updated">
                        <span className="material-icons-round">update</span>
                        <div>
                            <strong>Última actualización:</strong>{' '}
                            {new Date(settings.updatedAt).toLocaleString('es-CO', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                            {settings.updatedBy && settings.updatedBy !== 'system' && (
                                <span> por {settings.updatedBy}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Horario de Servicio */}
                <div className="settings-section">
                    <h3 className="settings-section-title">
                        <span className="material-icons-round">schedule</span>
                        Horario de Servicio
                    </h3>

                    <div className="settings-card">
                        {/* Toggle: Hoy no hay servicio */}
                        <div className="settings-toggle-row" style={{ marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
                            <div className="settings-toggle-info">
                                <div className="settings-toggle-header">
                                    <span className="material-icons-round" style={{ color: '#ef5350' }}>event_busy</span>
                                    <h4>Hoy No Hay Servicio</h4>
                                </div>
                                <p className="settings-toggle-description">
                                    Activa esta opción si hoy el restaurante estará cerrado todo el día (festivo, emergencia, etc.).
                                    <strong style={{ color: 'var(--color-warning)' }}> Se resetea automáticamente al día siguiente.</strong>
                                </p>
                            </div>

                            <label className="settings-switch settings-switch-closed">
                                <input
                                    type="checkbox"
                                    checked={settings.closedToday}
                                    onChange={() => handleToggleChange('closedToday')}
                                />
                                <span className="settings-slider"></span>
                            </label>
                        </div>

                        {/* Horarios (se deshabilitan visualmente si closedToday está activo) */}
                        <div style={{ opacity: settings.closedToday ? 0.5 : 1, pointerEvents: settings.closedToday ? 'none' : 'auto' }}>
                            <div className="settings-time-grid">
                                <div className="settings-time-input">
                                    <label htmlFor="openingTime">
                                        <span className="material-icons-round">wb_sunny</span>
                                        Hora de Apertura
                                    </label>
                                    <input
                                        id="openingTime"
                                        type="time"
                                        className="input-field"
                                        value={settings.openingTime}
                                        onChange={(e) => handleTimeChange('openingTime', e.target.value)}
                                    />
                                    <small className="settings-time-preview">
                                        {formatTime12(settings.openingTime)}
                                    </small>
                                </div>

                                <div className="settings-time-divider">
                                    <span className="material-icons-round">arrow_forward</span>
                                </div>

                                <div className="settings-time-input">
                                    <label htmlFor="closingTime">
                                        <span className="material-icons-round">wb_twilight</span>
                                        Hora de Cierre
                                    </label>
                                    <input
                                        id="closingTime"
                                        type="time"
                                        className="input-field"
                                        value={settings.closingTime}
                                        onChange={(e) => handleTimeChange('closingTime', e.target.value)}
                                    />
                                    <small className="settings-time-preview">
                                        {formatTime12(settings.closingTime)}
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="settings-info-box">
                            <span className="material-icons-round">info</span>
                            <span>
                                {settings.closedToday
                                    ? '⚠️ El restaurante está cerrado hoy sin importar el horario. Los clientes no podrán hacer pedidos. Se reactivará automáticamente mañana.'
                                    : 'Los clientes solo podrán hacer pedidos dentro del horario establecido. Fuera de este horario, el restaurante aparecerá como cerrado.'
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Control de Domicilios */}
                <div className="settings-section">
                    <h3 className="settings-section-title">
                        <span className="material-icons-round">local_shipping</span>
                        Control de Domicilios
                    </h3>

                    <div className="settings-card">
                        <div className="settings-toggle-row">
                            <div className="settings-toggle-info">
                                <div className="settings-toggle-header">
                                    <span className="material-icons-round" style={{ color: 'var(--color-primary)' }}>delivery_dining</span>
                                    <h4>Servicio de Domicilio</h4>
                                </div>
                                <p className="settings-toggle-description">
                                    Activa o desactiva los domicilios para hoy. Útil si el domiciliario no está disponible o hay problemas con el servicio.
                                </p>
                            </div>

                            <label className="settings-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.deliveryEnabled}
                                    onChange={() => handleToggleChange('deliveryEnabled')}
                                />
                                <span className="settings-slider"></span>
                            </label>
                        </div>

                        <div className={`settings-status-badge ${settings.deliveryEnabled ? 'status-active' : 'status-inactive'}`}>
                            <span className="material-icons-round">
                                {settings.deliveryEnabled ? 'check_circle' : 'cancel'}
                            </span>
                            <span>
                                {settings.deliveryEnabled ? 'Domicilios disponibles' : 'Domicilios no disponibles'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Promociones */}
                <div className="settings-section">
                    <h3 className="settings-section-title">
                        <span className="material-icons-round">local_offer</span>
                        Promociones del Día
                    </h3>

                    <div className="settings-card settings-promo-card">
                        <div className="settings-toggle-row">
                            <div className="settings-toggle-info">
                                <div className="settings-toggle-header">
                                    <span className="material-icons-round" style={{ color: 'var(--color-success)' }}>emoji_events</span>
                                    <h4>🎉 Domicilios Gratis Hoy</h4>
                                </div>
                                <p className="settings-toggle-description">
                                    Activa esta opción para ofrecer domicilios gratuitos como promoción del día. Los clientes verán un mensaje especial indicando que el domicilio es gratis.
                                </p>
                            </div>

                            <label className="settings-switch settings-switch-promo">
                                <input
                                    type="checkbox"
                                    checked={settings.freeDeliveryPromo}
                                    onChange={() => handleToggleChange('freeDeliveryPromo')}
                                />
                                <span className="settings-slider"></span>
                            </label>
                        </div>

                        {settings.freeDeliveryPromo && (
                            <div className="settings-promo-active">
                                <span className="material-icons-round">celebration</span>
                                <div>
                                    <strong>¡Promoción activa!</strong>
                                    <p>Los domicilios son gratis hoy. Los clientes verán "Domicilio GRATIS" en el checkout.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resumen de Configuración Actual */}
                <div className="settings-section">
                    <h3 className="settings-section-title">
                        <span className="material-icons-round">summarize</span>
                        Resumen de Hoy
                    </h3>

                    <div className="settings-summary-card">
                        <div className="summary-item">
                            <span className="material-icons-round">schedule</span>
                            <div>
                                <strong>Horario</strong>
                                <span>
                                    {settings.closedToday
                                        ? `Cerrado hoy${settings.closedTodayDate ? ` (${settings.closedTodayDate})` : ''}`
                                        : `${formatTime12(settings.openingTime)} - ${formatTime12(settings.closingTime)}`
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="summary-item">
                            <span className="material-icons-round">
                                {settings.deliveryEnabled ? 'check_circle' : 'cancel'}
                            </span>
                            <div>
                                <strong>Domicilios</strong>
                                <span className={settings.deliveryEnabled ? 'text-success' : 'text-error'}>
                                    {settings.deliveryEnabled ? 'Disponibles' : 'No disponibles'}
                                </span>
                            </div>
                        </div>

                        <div className="summary-item">
                            <span className="material-icons-round">
                                {settings.freeDeliveryPromo ? 'celebration' : 'info'}
                            </span>
                            <div>
                                <strong>Promoción</strong>
                                <span className={settings.freeDeliveryPromo ? 'text-success' : 'text-secondary'}>
                                    {settings.freeDeliveryPromo ? 'Domicilios gratis' : 'Sin promoción activa'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="settings-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            if (confirm('¿Restablecer configuración por defecto?')) {
                                setSettings(DEFAULT_RESTAURANT_SETTINGS);
                                setHasChanges(true);
                                showToast('Configuración restablecida. No olvides guardar.', 'info');
                            }
                        }}
                        disabled={saving}
                    >
                        <span className="material-icons-round">refresh</span>
                        Restablecer valores
                    </button>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        style={{
                            opacity: saving || !hasChanges ? 0.6 : 1,
                            cursor: saving || !hasChanges ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? (
                            <>
                                <span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <span className="material-icons-round">save</span>
                                Guardar Configuración {hasChanges && <span className="btn-badge">*</span>}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
