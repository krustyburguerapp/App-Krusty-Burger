import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useOrders } from '../../contexts/OrdersContext';
import { isStoreOpen, getBusinessHoursText } from '../../utils/businessHours';
import { calculateEstimatedTime } from '../../utils/estimatedTime';
import { showToast } from '../../utils/notifications';
import Spinner from '../../components/UI/Spinner';
import './Checkout.css';

export default function Checkout() {
    const { user, userData, updateUserData } = useAuth();
    const { items, subtotal, clearCart } = useCart();
    const { createOrder } = useOrders();
    const navigate = useNavigate();

    const [deliveryType, setDeliveryType] = useState('delivery');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [addressNotes, setAddressNotes] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [cashAmount, setCashAmount] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [locationUrl, setLocationUrl] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);

    const hasProfile = userData?.hasCompletedProfile && userData?.phone;
    const deliveryFee = deliveryType === 'delivery' ? 5000 : 0;
    const total = subtotal + deliveryFee;
    const storeOpen = isStoreOpen(deliveryType);

    useEffect(() => {
        if (hasProfile && !editMode) {
            setPhone(userData.phone || '');
            setAddress(userData.address || '');
            setAddressNotes(userData.addressNotes || '');
            setLocationUrl(userData.locationUrl || '');
        }
    }, [userData, hasProfile, editMode]);

    useEffect(() => {
        calculateEstimatedTime(deliveryType).then(setEstimatedTime);
    }, [deliveryType]);

    useEffect(() => {
        if (items.length === 0) navigate('/menu');
    }, [items, navigate]);

    const validate = () => {
        const errs = {};
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) errs.phone = 'Ingresa un número de WhatsApp válido (mínimo 10 dígitos)';
        if (deliveryType === 'delivery' && (!address.trim() || !locationUrl)) {
            errs.address = 'Debes ingresar tu dirección escrita y adjuntar tu ubicación GPS';
        }

        if (!paymentMethod) {
            errs.payment = 'Selecciona un método de pago';
        } else if (paymentMethod === 'efectivo') {
            const amount = parseInt(cashAmount.replace(/\D/g, ''));
            if (!cashAmount || isNaN(amount) || amount < total) {
                errs.cash = `Ingresa un monto válido (mínimo $${total.toLocaleString('es-CO')})`;
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            showToast('Tu dispositivo no soporta geolocalización', 'error');
            return;
        }

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocationUrl(`https://maps.google.com/?q=${latitude},${longitude}`);
                setLoadingLocation(false);
                showToast('Ubicación obtenida automáticamente', 'success');
            },
            (error) => {
                setLoadingLocation(false);
                showToast('Ocurrió un error o no diste permiso al GPS. Puedes ingresar tu dirección manualmente.', 'error', 5000);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!storeOpen) {
            showToast(`Estamos cerrados para ${deliveryType === 'delivery' ? 'domicilio' : 'recogida'}. Horario: ${getBusinessHoursText(deliveryType)}`, 'error', 5000);
            return;
        }
        setLoading(true);

        // updateUserData se dispara en background (fire-and-forget)
        // porque setDoc con merge:true necesita leer del servidor para combinar datos
        // y esa lectura puede colgar por red lenta. NO debe bloquear la creacion del pedido.
        if (!hasProfile || editMode) {
            updateUserData({ phone, address, addressNotes, locationUrl, hasCompletedProfile: true }).catch(() => { });
        }

        // Sanitización brutal: Asegurar que NO existan posibles "undefined" o funciones perdidas
        // que traben a Firebase
        const orderData = {
            userId: user.uid,
            userName: userData?.displayName || 'Krusty Fan',
            userPhone: phone || '',
            userAddress: address || '',
            userAddressNotes: addressNotes || '',
            userLocationUrl: locationUrl || '',
            deliveryType: deliveryType || 'delivery',
            items: JSON.parse(JSON.stringify(items)),
            subtotal: subtotal || 0,
            deliveryFee: deliveryFee || 0,
            total: total || 0,
            estimatedTime: estimatedTime || 0,
            paymentMethod: paymentMethod || '',
            cashAmount: paymentMethod === 'efectivo' ? parseInt(cashAmount.replace(/\D/g, '')) : 0,
            orderNotes: orderNotes || ''
        };

        const result = await createOrder(orderData);
        setLoading(false);
        if (result.success) {
            clearCart();
            navigate(`/order-confirmation/${result.orderId}`, { state: { order: { ...orderData, id: result.orderId, estimatedTime } } });
        } else {
            showToast(result.error || 'Error al crear el pedido. Intenta de nuevo.', 'error', 8000);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="page">
            <div className="container checkout-container">
                <h2 className="checkout-title">Confirmar Pedido</h2>

                {!storeOpen && (
                    <div className="store-closed-banner" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <span className="material-icons-round">schedule</span>
                        <div>
                            <strong>Cerrado para {deliveryType === 'delivery' ? 'domicilio' : 'recogida'}</strong>
                            <p>Horario: {getBusinessHoursText(deliveryType)}</p>
                        </div>
                    </div>
                )}

                <div className="checkout-section">
                    <h3>Tipo de entrega</h3>
                    <div className="checkout-delivery-options">
                        <button className={`checkout-delivery-option ${deliveryType === 'delivery' ? 'active' : ''}`} onClick={() => setDeliveryType('delivery')}>
                            <span className="material-icons-round">delivery_dining</span>
                            <span>Domicilio</span>
                            <small>+$5,000</small>
                        </button>
                        <button className={`checkout-delivery-option ${deliveryType === 'pickup' ? 'active' : ''}`} onClick={() => setDeliveryType('pickup')}>
                            <span className="material-icons-round">storefront</span>
                            <span>Recoger</span>
                            <small>Gratis</small>
                        </button>
                    </div>
                </div>

                <div className="checkout-section">
                    <div className="checkout-section-header">
                        <h3>Datos de contacto</h3>
                        {hasProfile && !editMode && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span> Editar
                            </button>
                        )}
                    </div>

                    {hasProfile && !editMode ? (
                        <div className="checkout-saved-data">
                            <div className="checkout-data-row">
                                <span className="material-icons-round">phone</span>
                                <span>{userData.phone}</span>
                            </div>
                            {deliveryType === 'delivery' && (
                                <>
                                    <div className="checkout-data-row">
                                        <span className="material-icons-round">location_on</span>
                                        <span>
                                            {userData.address}
                                            {userData.locationUrl && (
                                                <a href={userData.locationUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 'bold' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 12 }}>map</span>Mapa
                                                </a>
                                            )}
                                        </span>
                                    </div>
                                    {userData.addressNotes && (
                                        <div className="checkout-data-row">
                                            <span className="material-icons-round">note</span>
                                            <span>{userData.addressNotes}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="checkout-form">
                            <div className="input-group">
                                <label htmlFor="phone">WhatsApp</label>
                                <input id="phone" type="tel" className={`input-field ${errors.phone ? 'input-error' : ''}`} placeholder="Ej: 3001234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                {errors.phone && <span className="input-error-text">{errors.phone}</span>}
                                <small style={{ color: 'var(--color-text-hint)', fontSize: 12 }}>Te confirmaremos el pedido por aquí</small>
                            </div>
                            {deliveryType === 'delivery' && (
                                <>
                                    <div className="input-group">
                                        <label htmlFor="address" style={{ marginBottom: '4px' }}>Dirección</label>
                                        <input id="address" type="text" className={`input-field ${errors.address ? 'input-error' : ''}`} placeholder="Calle, número, barrio" value={address} onChange={(e) => setAddress(e.target.value)} />
                                        
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

                                        {errors.address && <span className="input-error-text">{errors.address}</span>}
                                        {locationUrl && (
                                            <small style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                <span className="material-icons-round" style={{ fontSize: 14 }}>check_circle</span>
                                                Ubicación GPS adjuntada
                                                <span
                                                    className="material-icons-round"
                                                    style={{ fontSize: 14, cursor: 'pointer', color: 'var(--color-error)', marginLeft: 'auto' }}
                                                    onClick={() => setLocationUrl('')}
                                                    title="Eliminar ubicación"
                                                >close</span>
                                            </small>
                                        )}
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="notes">Indicaciones (opcional)</label>
                                        <textarea id="notes" className="input-field" placeholder="Apartamento, edificio, punto de referencia..." value={addressNotes} onChange={(e) => setAddressNotes(e.target.value)} rows={2} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="checkout-section">
                    <h3>Resumen del pedido</h3>
                    <div className="checkout-summary">
                        {items.map((item) => (
                            <div key={item.productId} className="checkout-summary-item">
                                <span>{item.quantity}x {item.name}</span>
                                <span>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                            </div>
                        ))}
                        <div className="checkout-summary-divider" />
                        <div className="checkout-summary-item">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString('es-CO')}</span>
                        </div>
                        {deliveryType === 'delivery' && (
                            <div className="checkout-summary-item">
                                <span>Domicilio</span>
                                <span>${deliveryFee.toLocaleString('es-CO')}</span>
                            </div>
                        )}
                        <div className="checkout-summary-item checkout-summary-total">
                            <span>Total</span>
                            <span>${total.toLocaleString('es-CO')}</span>
                        </div>
                    </div>
                    {estimatedTime > 0 && (
                        <div className="checkout-estimated">
                            <span className="material-icons-round">schedule</span>
                            Tu pedido estará listo en aproximadamente <strong>{estimatedTime} minutos</strong>
                        </div>
                    )}

                    <div className="input-group" style={{ marginTop: 'var(--spacing-md)' }}>
                        <label htmlFor="orderNotes" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-icons-round" style={{ fontSize: 16 }}>edit_note</span>
                            Observaciones del pedido (opcional)
                        </label>
                        <textarea
                            id="orderNotes"
                            className="input-field"
                            placeholder="Ej: Sin salsas, la hamburguesa sin cebolla, etc..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <div className="checkout-section">
                    <h3>Método de pago</h3>
                    <div className="checkout-payment-methods">
                        <label className={`checkout-payment-option ${paymentMethod === 'efectivo' ? 'active' : ''}`}>
                            <input type="radio" name="payment" value="efectivo" checked={paymentMethod === 'efectivo'} onChange={(e) => setPaymentMethod(e.target.value)} />
                            <span className="material-icons-round">payments</span>
                            Efectivo
                        </label>
                        <label className={`checkout-payment-option ${paymentMethod === 'nequi' ? 'active' : ''}`}>
                            <input type="radio" name="payment" value="nequi" checked={paymentMethod === 'nequi'} onChange={(e) => setPaymentMethod(e.target.value)} />
                            <span className="material-icons-round">account_balance_wallet</span>
                            Nequi o Daviplata
                        </label>
                        <label className={`checkout-payment-option ${paymentMethod === 'tarjeta' ? 'active' : ''}`}>
                            <input type="radio" name="payment" value="tarjeta" checked={paymentMethod === 'tarjeta'} onChange={(e) => setPaymentMethod(e.target.value)} />
                            <span className="material-icons-round">credit_card</span>
                            Tarjeta física
                        </label>
                        <label className={`checkout-payment-option ${paymentMethod === 'pse' ? 'active' : ''}`}>
                            <input type="radio" name="payment" value="pse" checked={paymentMethod === 'pse'} onChange={(e) => setPaymentMethod(e.target.value)} />
                            <span className="material-icons-round">account_balance</span>
                            PSE
                        </label>
                    </div>
                    {errors.payment && <span className="input-error-text" style={{ display: 'block', marginTop: '8px' }}>{errors.payment}</span>}

                    {paymentMethod === 'efectivo' && (
                        <div className="input-group" style={{ marginTop: 'var(--spacing-md)' }}>
                            <label htmlFor="cashAmount">¿Con cuánto vas a pagar?</label>
                            <input
                                id="cashAmount"
                                type="text"
                                className={`input-field ${errors.cash ? 'input-error' : ''}`}
                                placeholder={`Ej: ${(total + 5000).toLocaleString('es-CO')}`}
                                value={cashAmount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setCashAmount(val ? '$' + parseInt(val).toLocaleString('es-CO') : '');
                                }}
                            />
                            {errors.cash && <span className="input-error-text">{errors.cash}</span>}
                            <small style={{ color: 'var(--color-text-hint)', fontSize: 12 }}>Para llevarte el cambio exacto</small>
                        </div>
                    )}
                </div>

                <button className="btn btn-primary btn-lg btn-full checkout-submit" onClick={handleSubmit} disabled={loading || !storeOpen}>
                    {loading ? <><Spinner size="sm" color="white" /> Procesando...</> : (
                        <><span className="material-icons-round">check_circle</span> Confirmar Pedido — ${total.toLocaleString('es-CO')}</>
                    )}
                </button>

                {!loading && (
                    <button className="btn btn-ghost btn-lg btn-full" onClick={() => navigate('/menu')} style={{ marginTop: 'var(--spacing-sm)' }}>
                        <span className="material-icons-round">edit_shopping_cart</span> Modificar Pedido
                    </button>
                )}
            </div>
        </div>
    );
}
