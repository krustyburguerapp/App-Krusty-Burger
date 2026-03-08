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

    const hasProfile = userData?.hasCompletedProfile && userData?.phone;
    const deliveryFee = deliveryType === 'delivery' ? 5000 : 0;
    const total = subtotal + deliveryFee;
    const storeOpen = isStoreOpen(deliveryType);

    useEffect(() => {
        if (hasProfile && !editMode) {
            setPhone(userData.phone || '');
            setAddress(userData.address || '');
            setAddressNotes(userData.addressNotes || '');
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
        if (deliveryType === 'delivery' && !address.trim()) errs.address = 'Ingresa tu dirección de entrega';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!storeOpen) {
            showToast(`Estamos cerrados para ${deliveryType === 'delivery' ? 'domicilio' : 'recogida'}. Horario: ${getBusinessHoursText(deliveryType)}`, 'error', 5000);
            return;
        }
        setLoading(true);
        if (!hasProfile || editMode) {
            await updateUserData({ phone, address, addressNotes, hasCompletedProfile: true });
        }
        const orderData = {
            userId: user.uid,
            userName: userData?.displayName || 'Krusty Fan',
            userPhone: phone,
            userAddress: address,
            userAddressNotes: addressNotes,
            deliveryType,
            items,
            subtotal,
            deliveryFee,
            total,
            estimatedTime
        };
        const result = await createOrder(orderData);
        setLoading(false);
        if (result.success) {
            clearCart();
            navigate(`/order-confirmation/${result.orderId}`, { state: { order: { ...orderData, id: result.orderId, estimatedTime } } });
        } else {
            showToast('Error al crear el pedido. Intenta de nuevo.', 'error');
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
                                        <span>{userData.address}</span>
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
                                        <label htmlFor="address">Dirección</label>
                                        <input id="address" type="text" className={`input-field ${errors.address ? 'input-error' : ''}`} placeholder="Calle, número, barrio" value={address} onChange={(e) => setAddress(e.target.value)} />
                                        {errors.address && <span className="input-error-text">{errors.address}</span>}
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
