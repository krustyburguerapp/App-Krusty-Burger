import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useOrders } from '../../contexts/OrdersContext';
import { isStoreOpen, getBusinessHoursText, getClosedMessage } from '../../utils/businessHours';
import { calculateEstimatedTime } from '../../utils/estimatedTime';
import { showToast } from '../../utils/notifications';
import { calculateDeliveryInfo, MAX_DELIVERY_DISTANCE_KM } from '../../utils/deliveryCost';
import { STORE_LOCATION } from '../../config/storeLocation';
import { getPrizeRedemptionState } from '../../utils/loyaltySystem';
import { getRestaurantSettings, isRestaurantOpen, getRestaurantStatus } from '../../config/restaurantSettings';
import Spinner from '../../components/UI/Spinner';
import './Checkout.css';

// Función para extraer coordenadas de una URL de Google Maps
function extractCoordinates(url) {
    if (!url) return null;
    const match = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
        return {
            latitude: parseFloat(match[1]),
            longitude: parseFloat(match[2])
        };
    }
    return null;
}

export default function Checkout() {
    const { user, userData, updateUserData } = useAuth();
    const { items, subtotal, clearCart, deliveryFee, setDeliveryFee, total, prizeSavings, isPrizeRedemptionActive, hasRequiredPrizeItems } = useCart();
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
    const [userCoordinates, setUserCoordinates] = useState(null);
    const [distanceInfo, setDistanceInfo] = useState(null);

    // Verificar si es pedido de premio
    const redemptionState = getPrizeRedemptionState();
    const isPrizeOrder = isPrizeRedemptionActive && hasRequiredPrizeItems();

    // Estado para configuración del restaurante
    const [restaurantSettings, setRestaurantSettings] = useState(null);
    const [restaurantStatus, setRestaurantStatus] = useState({ isOpen: true, message: 'Abierto' });

    // Refs para los campos del formulario
    const phoneRef = useRef(null);
    const addressRef = useRef(null);
    const paymentMethodRef = useRef(null);
    const cashAmountRef = useRef(null);

    const hasProfile = userData?.hasCompletedProfile && userData?.phone;
    const storeOpen = isStoreOpen(deliveryType) && restaurantStatus.isOpen;

    // Cargar configuración del restaurante
    useEffect(() => {
        const loadSettings = async () => {
            const settings = await getRestaurantSettings();
            setRestaurantSettings(settings);
            setRestaurantStatus(getRestaurantStatus(settings));
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (hasProfile && !editMode) {
            setPhone(userData.phone || '');
            setAddress(userData.address || '');
            setAddressNotes(userData.addressNotes || '');
            setLocationUrl(userData.locationUrl || '');
            // Extraer coordenadas de la URL de ubicación guardada si existe
            if (userData.locationUrl) {
                const coords = extractCoordinates(userData.locationUrl);
                if (coords) {
                    setUserCoordinates(coords);
                }
            }
        }
    }, [userData, hasProfile, editMode]);

    useEffect(() => {
        calculateEstimatedTime(deliveryType).then(setEstimatedTime);
    }, [deliveryType]);

    // Calcular tarifa cuando cambian las coordenadas o el tipo de entrega
    useEffect(() => {
        const calculateFee = async () => {
            if (userCoordinates && deliveryType === 'delivery') {
                try {
                    const info = await calculateDeliveryInfo(
                        userCoordinates.latitude,
                        userCoordinates.longitude,
                        STORE_LOCATION.latitude,
                        STORE_LOCATION.longitude,
                        MAX_DELIVERY_DISTANCE_KM
                    );
                    setDistanceInfo(info);

                    // Verificar si los domicilios están habilitados
                    if (restaurantSettings && !restaurantSettings.deliveryEnabled) {
                        setDeliveryFee(0);
                    }
                    // Verificar si hay promoción de domicilios gratis
                    else if (restaurantSettings && restaurantSettings.freeDeliveryPromo) {
                        setDeliveryFee(0);
                    }
                    // Calcular tarifa normal
                    else {
                        setDeliveryFee(info.isWithinRange ? info.fee : 0);
                    }
                } catch (error) {
                    console.error('Error al calcular tarifa de domicilio:', error);
                    setDistanceInfo(null);
                    setDeliveryFee(0);
                }
            } else if (deliveryType === 'pickup') {
                setDistanceInfo(null);
                setDeliveryFee(0);
            }
        };

        calculateFee();
    }, [userCoordinates, deliveryType, setDeliveryFee, restaurantSettings]);

    useEffect(() => {
        if (items.length === 0) navigate('/menu');
    }, [items, navigate]);

    const validate = () => {
        const errs = {};
        let firstErrorField = null;

        // Validar que los domicilios estén habilitados
        if (deliveryType === 'delivery' && restaurantSettings && !restaurantSettings.deliveryEnabled) {
            errs.delivery = 'Los domicilios no están disponibles en este momento';
            firstErrorField = 'delivery';
        }

        // Validar WhatsApp
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
            errs.phone = 'Ingresa un número de WhatsApp válido (mínimo 10 dígitos)';
            firstErrorField = 'phone';
        }

        // Validar dirección y ubicación (solo delivery)
        if (deliveryType === 'delivery') {
            if (!address.trim()) {
                errs.address = 'Ingresa tu dirección escrita';
                if (!firstErrorField) firstErrorField = 'address';
            }
            if (!locationUrl) {
                errs.address = errs.address
                    ? 'Ingresa tu dirección y adjunta la ubicación GPS'
                    : 'Adjunta tu ubicación GPS (es obligatorio)';
                if (!firstErrorField) firstErrorField = 'address';
            }
        }

        // Validar distancia máxima
        if (deliveryType === 'delivery' && distanceInfo && !distanceInfo.isWithinRange) {
            errs.distance = `Superas el límite máximo de ${MAX_DELIVERY_DISTANCE_KM} km. Distancia actual: ${distanceInfo.distance} km`;
            // No hay campo específico para este error
        }

        // Validar método de pago
        if (!paymentMethod) {
            errs.payment = 'Selecciona un método de pago';
            if (!firstErrorField) firstErrorField = 'payment';
        } else if (paymentMethod === 'efectivo') {
            const amount = parseInt(cashAmount.replace(/\D/g, ''));
            if (!cashAmount || isNaN(amount) || amount < total) {
                errs.cash = `Ingresa un monto válido (mínimo $${total.toLocaleString('es-CO')})`;
                if (!firstErrorField) firstErrorField = 'cash';
            }
        }

        setErrors(errs);

        // Si hay errores, hacer scroll al primer campo con error
        if (Object.keys(errs).length > 0 && firstErrorField) {
            setTimeout(() => {
                const refMap = {
                    phone: phoneRef,
                    address: addressRef,
                    payment: paymentMethodRef,
                    cash: cashAmountRef
                };

                const ref = refMap[firstErrorField];
                if (ref?.current) {
                    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Si es un input, hacer focus
                    if (ref.current.tagName === 'INPUT' || ref.current.tagName === 'TEXTAREA') {
                        ref.current.focus();
                    }
                }
            }, 100);
        }

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
                setUserCoordinates({ latitude, longitude });
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
        // Primero validar
        if (!validate()) {
            showToast('❌ Por favor completa los campos obligatorios', 'error', 3000);
            return;
        }

        // Verificar si la tienda está abierta
        if (!storeOpen) {
            const closedMsg = getClosedMessage(deliveryType);
            showToast(`🕒 ${closedMsg}. Horario: ${getBusinessHoursText(deliveryType)}`, 'error', 6000);
            return;
        }

        setLoading(true);

        try {
            // ACTUALIZAR DATOS DEL USUARIO ANTES DE CREAR EL PEDIDO
            // Ahora esperamos a que se guarde antes de continuar
            if (!hasProfile || editMode) {
                console.log('💾 [Checkout] Guardando datos del usuario en perfil...');
                const updateResult = await updateUserData({
                    phone,
                    address,
                    addressNotes,
                    locationUrl,
                    hasCompletedProfile: true
                });

                if (!updateResult.success) {
                    console.error('❌ [Checkout] Error al guardar perfil:', updateResult.error);
                    // Continuamos igual - el pedido es más importante que el perfil
                } else {
                    console.log('✅ [Checkout] Perfil actualizado correctamente');
                }
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
                orderNotes: orderNotes || '',
                isPrizeOrder: isPrizeOrder || false,
                prizeSavings: prizeSavings || 0
            };

            console.log('📝 [Checkout] Creando pedido:', orderData);

            const result = await createOrder(orderData);

            console.log('📍 [Checkout] Resultado de crear pedido:', result);

            setLoading(false);

            if (result.success) {
                clearCart();
                navigate(`/order-confirmation/${result.orderId}`, { state: { order: { ...orderData, id: result.orderId, estimatedTime } } });
            } else {
                showToast(result.error || 'Error al crear el pedido. Intenta de nuevo.', 'error', 8000);
            }
        } catch (error) {
            console.error('❌ [Checkout] Error inesperado:', error);
            setLoading(false);
            showToast('Error inesperado. Por favor intenta de nuevo.', 'error', 8000);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="page">
            <div className="container checkout-container">
                <h2 className="checkout-title">Confirmar Pedido</h2>

                {/* Banner de restaurante cerrado */}
                {!storeOpen && (
                    <div className="store-closed-banner" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <span className="material-icons-round">schedule</span>
                        <div>
                            <strong>🕒 {restaurantStatus.message}</strong>
                            <p>
                                {restaurantSettings?.closedToday
                                    ? 'El restaurante no está atendiendo hoy. Vuelve mañana.'
                                    : restaurantSettings
                                        ? `Horario: ${restaurantSettings.openingTime} - ${restaurantSettings.closingTime}`
                                        : getBusinessHoursText(deliveryType)
                                }
                            </p>
                        </div>
                    </div>
                )}

                {/* Banner de domicilios no disponibles */}
                {deliveryType === 'delivery' && restaurantSettings && !restaurantSettings.deliveryEnabled && (
                    <div className="store-closed-banner" style={{ marginBottom: 'var(--spacing-md)', background: 'rgba(244, 67, 54, 0.15)', borderLeft: '4px solid #ef5350' }}>
                        <span className="material-icons-round" style={{ color: '#ef5350' }}>delivery_dining</span>
                        <div>
                            <strong>🚫 Domicilios no disponibles</strong>
                            <p>El servicio de domicilio está desactivado por el momento. Puedes elegir "Recoger en local".</p>
                        </div>
                    </div>
                )}

                {/* Banner de promoción de domicilios gratis */}
                {deliveryType === 'delivery' && restaurantSettings && restaurantSettings.freeDeliveryPromo && (
                    <div className="store-closed-banner" style={{ marginBottom: 'var(--spacing-md)', background: 'rgba(76, 175, 80, 0.15)', borderLeft: '4px solid var(--color-success)' }}>
                        <span className="material-icons-round" style={{ color: 'var(--color-success)' }}>celebration</span>
                        <div>
                            <strong>🎉 ¡Domicilio GRATIS hoy!</strong>
                            <p>Aprovecha esta promoción especial. El domicilio es completamente gratis.</p>
                        </div>
                    </div>
                )}

                <div className="checkout-section">
                    <h3>Tipo de entrega</h3>
                    <div className="checkout-delivery-options">
                        <button
                            className={`checkout-delivery-option ${deliveryType === 'delivery' ? 'active' : ''}`}
                            onClick={() => setDeliveryType('delivery')}
                            disabled={restaurantSettings && !restaurantSettings.deliveryEnabled}
                            style={restaurantSettings && !restaurantSettings.deliveryEnabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            <span className="material-icons-round">delivery_dining</span>
                            <span>Domicilio</span>
                            <small>
                                {restaurantSettings?.freeDeliveryPromo
                                    ? '¡GRATIS!'
                                    : distanceInfo
                                        ? `+$${distanceInfo.fee?.toLocaleString('es-CO')}`
                                        : 'Calculando...'
                                }
                            </small>
                        </button>
                        <button className={`checkout-delivery-option ${deliveryType === 'pickup' ? 'active' : ''}`} onClick={() => setDeliveryType('pickup')}>
                            <span className="material-icons-round">storefront</span>
                            <span>Recoger</span>
                            <small>Gratis</small>
                        </button>
                    </div>
                    {distanceInfo && deliveryType === 'delivery' && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <span className="material-icons-round" style={{ color: 'var(--color-primary)', fontSize: 20 }}>location_on</span>
                            <span>
                                <strong>Distancia: {distanceInfo.distance} km</strong>
                                {distanceInfo.isWithinRange
                                    ? ` - Tarifa calculada: $${deliveryFee.toLocaleString('es-CO')}`
                                    : ` - ⚠️ Superas el límite de ${MAX_DELIVERY_DISTANCE_KM} km`
                                }
                            </span>
                        </div>
                    )}
                    {errors.distance && (
                        <span className="input-error-text" style={{ display: 'block', marginTop: '8px' }}>{errors.distance}</span>
                    )}
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
                                <input
                                    id="phone"
                                    ref={phoneRef}
                                    type="tel"
                                    className={`input-field ${errors.phone ? 'input-error' : ''}`}
                                    placeholder="Ej: 3001234567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                {errors.phone && <span className="input-error-text">{errors.phone}</span>}
                                <small style={{ color: 'var(--color-text-hint)', fontSize: 12 }}>Te confirmaremos el pedido por aquí</small>
                            </div>
                            {deliveryType === 'delivery' && (
                                <>
                                    <div className="input-group">
                                        <label htmlFor="address" style={{ marginBottom: '4px' }}>Dirección</label>
                                        <input
                                            id="address"
                                            ref={addressRef}
                                            type="text"
                                            className={`input-field ${errors.address ? 'input-error' : ''}`}
                                            placeholder="Calle, número, barrio"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />

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
                    {isPrizeOrder && (
                        <div className="prize-banner-summary">
                            <span className="material-icons-round">card_giftcard</span>
                            <div>
                                <strong>🎉 Premio de 7 Sellos Aplicado</strong>
                                <p>1 Comida Individual + 1 Bebida Pequeña GRATIS</p>
                            </div>
                        </div>
                    )}
                    <div className="checkout-summary">
                        {items.map((item) => {
                            const isFreeItem = isPrizeOrder &&
                                (item.category === 'individual' || item.category === 'bebidas_pequenas') &&
                                items.findIndex(i => i.category === item.category) === 0;

                            return (
                                <div key={item.productId} className={`checkout-summary-item ${isFreeItem ? 'free-item' : ''}`}>
                                    <span>
                                        {item.quantity}x {item.name}
                                        {isFreeItem && <span className="free-badge"> (GRATIS)</span>}
                                    </span>
                                    <span>${isFreeItem ? 0 : (item.price * item.quantity).toLocaleString('es-CO')}</span>
                                </div>
                            );
                        })}
                        <div className="checkout-summary-divider" />
                        <div className="checkout-summary-item">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString('es-CO')}</span>
                        </div>
                        {prizeSavings > 0 && (
                            <div className="checkout-summary-item prize-discount">
                                <span>Descuento Premio (7 sellos)</span>
                                <span>-${prizeSavings.toLocaleString('es-CO')}</span>
                            </div>
                        )}
                        {deliveryType === 'delivery' && (
                            <div className="checkout-summary-item">
                                <span>Domicilio ({distanceInfo?.distance || '--'} km)</span>
                                <span>${deliveryFee.toLocaleString('es-CO')}</span>
                            </div>
                        )}
                        <div className="checkout-summary-item checkout-summary-total">
                            <span>Total</span>
                            <span>${total.toLocaleString('es-CO')}</span>
                        </div>
                        {prizeSavings > 0 && (
                            <div className="checkout-savings-note">
                                <span className="material-icons-round">celebration</span>
                                ¡Ahorraste ${prizeSavings.toLocaleString('es-CO')} con tu premio!
                            </div>
                        )}
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
                    <div className="checkout-payment-methods" ref={paymentMethodRef}>
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
                                ref={cashAmountRef}
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

                <button
                    className="btn btn-primary btn-lg btn-full checkout-submit"
                    onClick={handleSubmit}
                    disabled={loading || !storeOpen || (distanceInfo && !distanceInfo.isWithinRange)}
                >
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
