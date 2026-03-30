import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDeliveryPricing, saveDeliveryPricing, DEFAULT_DELIVERY_PRICING } from '../../config/deliveryPricing';
import { showToast } from '../../utils/notifications';
import Spinner from '../../components/UI/Spinner';
import './AdminDeliveryPricing.css';

const DISTANCE_INTERVALS = [
    { value: '0.5', label: '0.5 km' },
    { value: '1.0', label: '1.0 km' },
    { value: '1.5', label: '1.5 km' },
    { value: '2.0', label: '2.0 km' },
    { value: '2.5', label: '2.5 km' },
    { value: '3.0', label: '3.0 km' },
    { value: '3.5', label: '3.5 km' },
    { value: '4.0', label: '4.0 km' },
    { value: '4.5', label: '4.5 km' },
    { value: '5.0', label: '5.0 km' }
];

export default function AdminDeliveryPricing() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pricing, setPricing] = useState(null);
    const [maxDistance, setMaxDistance] = useState(5);
    const [prices, setPrices] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    // Cargar configuración actual
    useEffect(() => {
        loadPricing();
    }, []);

    const loadPricing = async () => {
        setLoading(true);
        try {
            const data = await getDeliveryPricing();
            setPricing(data);
            setMaxDistance(data.maxDistanceKm || 5);
            setPrices(data.prices || DEFAULT_DELIVERY_PRICING.prices);
        } catch (error) {
            console.error('Error al cargar tarifas:', error);
            showToast('Error al cargar la configuración de tarifas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (distanceKey, value) => {
        const numValue = parseInt(value.replace(/\D/g, '')) || 0;
        setPrices(prev => ({
            ...prev,
            [distanceKey]: numValue
        }));
        setHasChanges(true);
    };

    const handleMaxDistanceChange = (value) => {
        const numValue = parseInt(value) || 5;
        setMaxDistance(numValue);
        setHasChanges(true);
    };

    const handleResetToDefaults = () => {
        if (!confirm('¿Estás seguro de restablecer los valores por defecto? Se perderán los cambios no guardados.')) {
            return;
        }
        setPrices(DEFAULT_DELIVERY_PRICING.prices);
        setMaxDistance(DEFAULT_DELIVERY_PRICING.maxDistanceKm);
        setHasChanges(true);
        showToast('Valores restablecidos. No olvides guardar los cambios.', 'info');
    };

    const handleSave = async () => {
        if (!user) {
            showToast('Error: Usuario no autenticado', 'error');
            return;
        }

        setSaving(true);
        try {
            const result = await saveDeliveryPricing({
                maxDistanceKm: maxDistance,
                prices
            }, user.uid);

            if (result.success) {
                showToast('✅ Tarifas guardadas correctamente', 'success');
                setHasChanges(false);
                loadPricing(); // Recargar para mostrar última actualización
            } else {
                showToast(`❌ Error al guardar: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al guardar tarifas:', error);
            showToast('Error inesperado al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const formatPrice = (value) => {
        if (value === undefined || value === null) return '';
        return value.toLocaleString('es-CO');
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

    const visibleIntervals = DISTANCE_INTERVALS.filter(
        interval => parseFloat(interval.value) <= maxDistance
    );

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <div className="admin-delivery-pricing-header">
                    <div>
                        <h2 className="admin-greeting">
                            <span className="material-icons-round" style={{ verticalAlign: 'middle', marginRight: '8px' }}>local_shipping</span>
                            Configurar Precios de Domicilio
                        </h2>
                        <p className="admin-subtitle">
                            Ajusta las tarifas por distancia cada 0.5 km
                        </p>
                    </div>
                </div>

                {/* Información de última actualización */}
                {pricing?.updatedAt && (
                    <div className="pricing-last-updated">
                        <span className="material-icons-round">update</span>
                        <div>
                            <strong>Última actualización:</strong>{' '}
                            {new Date(pricing.updatedAt).toLocaleString('es-CO', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                            {pricing.updatedBy && pricing.updatedBy !== 'system' && (
                                <span> por {pricing.updatedBy}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Configuración de distancia máxima */}
                <div className="pricing-section">
                    <h3 className="pricing-section-title">
                        <span className="material-icons-round">tune</span>
                        Configuración General
                    </h3>
                    
                    <div className="pricing-card">
                        <div className="input-group">
                            <label htmlFor="maxDistance">
                                <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: 'middle' }}>radio_button_checked</span>
                                Distancia Máxima de Domicilio (km)
                            </label>
                            <select
                                id="maxDistance"
                                className="input-field"
                                value={maxDistance}
                                onChange={(e) => handleMaxDistanceChange(e.target.value)}
                            >
                                {[3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(dist => (
                                    <option key={dist} value={dist}>{dist} km</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--color-text-hint)', marginTop: '8px', display: 'block' }}>
                                Los pedidos que superen esta distancia no podrán ser realizados a domicilio.
                            </small>
                        </div>
                    </div>
                </div>

                {/* Tabla de precios por distancia */}
                <div className="pricing-section">
                    <h3 className="pricing-section-title">
                        <span className="material-icons-round" style={{ fontSize: 20 }}>price_check</span>
                        Tarifas por Distancia
                    </h3>
                    
                    <div className="pricing-grid">
                        {visibleIntervals.map((interval, index) => (
                            <div 
                                key={interval.value} 
                                className="pricing-input-card"
                                style={{
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                <div className="pricing-input-header">
                                    <span className="material-icons-round" style={{ color: 'var(--color-secondary)', fontSize: 20 }}>location_on</span>
                                    <span className="pricing-distance-label">{interval.label}</span>
                                </div>
                                
                                <div className="pricing-input-wrapper">
                                    <span className="pricing-currency-symbol">$</span>
                                    <input
                                        type="text"
                                        className="input-field pricing-input"
                                        value={formatPrice(prices[interval.value])}
                                        onChange={(e) => handlePriceChange(interval.value, e.target.value)}
                                        placeholder="0"
                                        inputMode="numeric"
                                    />
                                </div>
                                
                                <small className="pricing-input-hint">
                                    {prices[interval.value] === 0 
                                        ? 'Sin costo' 
                                        : `$${(prices[interval.value] || 0).toLocaleString('es-CO')}`}
                                </small>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vista previa de ejemplo */}
                <div className="pricing-section">
                    <h3 className="pricing-section-title">
                        <span className="material-icons-round">visibility</span>
                        Vista Previa
                    </h3>
                    
                    <div className="pricing-preview-card">
                        <div className="preview-example">
                            <div className="preview-row">
                                <span className="preview-label">📍 Domicilio a 1.5 km:</span>
                                <span className="preview-value">${(prices['1.5'] || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <div className="preview-row">
                                <span className="preview-label">📍 Domicilio a 3.0 km:</span>
                                <span className="preview-value">${(prices['3.0'] || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <div className="preview-row">
                                <span className="preview-label">📍 Domicilio a 5.0 km:</span>
                                <span className="preview-value">${(prices['5.0'] || 0).toLocaleString('es-CO')}</span>
                            </div>
                        </div>
                        <div className="preview-info">
                            <span className="material-icons-round">info</span>
                            <span>
                                El sistema calculará automáticamente la tarifa según la distancia real entre el restaurante y la ubicación del cliente.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="pricing-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={handleResetToDefaults}
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
                                Guardar Cambios {hasChanges && <span className="btn-badge">*</span>}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
