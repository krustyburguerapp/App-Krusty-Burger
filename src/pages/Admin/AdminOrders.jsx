import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders, getStatusLabel, getStatusIcon, getStatusColor } from '../../contexts/OrdersContext';
import { generateAdminWhatsAppURL } from '../../utils/whatsappConfirm';
import { playNotificationSound, showToast, startOrderAlarm, stopOrderAlarm } from '../../utils/notifications';
import { getInsistEmoji } from '../../components/UI/FloatingEmojis';
import EmptyState from '../../components/UI/EmptyState';
import Spinner from '../../components/UI/Spinner';
import Modal from '../../components/UI/Modal';
import './AdminOrders.css';

const STATUS_TABS = [
    { key: 'pending', label: 'Pendientes', icon: 'pending' },
    { key: 'preparing', label: 'En Preparación', icon: 'restaurant' },
    { key: 'onTheWay', label: 'En Camino', icon: 'two_wheeler' },
    { key: 'completed', label: 'Completados', icon: 'done_all' }
];

const NEXT_STATUS = {
    pending: 'preparing',
    preparing: 'onTheWay',
    onTheWay: 'delivered'
};

const isOrderFromToday = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

// Calcular tiempo transcurrido desde la creación del pedido
const calculateElapsedTime = (createdAt) => {
    if (!createdAt) return { minutes: 0, text: '0 min' };

    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffMs = now - createdDate;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
        return { minutes: diffMinutes, text: `${diffMinutes} min` };
    } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return { minutes: diffMinutes, text: `${hours}h ${mins}m` };
    }
};

export default function AdminOrders() {
    const { user } = useAuth();
    const { orders, loading, newOrdersCount, updateOrderStatus, markAsSeen, deleteOrder } = useOrders();
    const [activeTab, setActiveTab] = useState('pending');
    const [prevInsistCounts, setPrevInsistCounts] = useState({});
    const [insistTriggers, setInsistTriggers] = useState({});

    // Estados para el modal de domiciliarios
    const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [savedDrivers, setSavedDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [newDriverName, setNewDriverName] = useState('');
    const [newDriverPhone, setNewDriverPhone] = useState('');
    const [savingDriver, setSavingDriver] = useState(false);

    // Estados para el modal de reconfirmación de WhatsApp
    const [reconfirmModalOpen, setReconfirmModalOpen] = useState(false);
    const [orderToReconfirm, setOrderToReconfirm] = useState(null);

    const [now, setNow] = useState(Date.now());

    // Cargar domiciliarios guardados al iniciar
    useEffect(() => {
        const saved = localStorage.getItem('krusty_drivers');
        if (saved) {
            try {
                setSavedDrivers(JSON.parse(saved));
            } catch (e) {
                console.error('Error cargando domiciliarios:', e);
            }
        }
    }, []);

    // Timer para recalcular tiempos de espera de los pedidos (cada segundo)
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000); // 1 segundo para precisión
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        orders.forEach(order => {
            const currentCount = order.insistCount || 0;
            const prevCount = prevInsistCounts[order.id] || 0;
            if (currentCount > prevCount && prevCount > 0) {
                setInsistTriggers(prev => ({ ...prev, [order.id]: (prev[order.id] || 0) + 1 }));
                if (navigator.vibrate) {
                    navigator.vibrate([150, 50, 150]); // Vibrar dispositivo si lo soporta
                }
            }
        });
        const newCounts = {};
        orders.forEach(o => { newCounts[o.id] = o.insistCount || 0; });
        setPrevInsistCounts(newCounts);
    }, [orders]);
    const prevNewCount = useRef(0);

    useEffect(() => {
        if (newOrdersCount > prevNewCount.current && prevNewCount.current >= 0) {
            playNotificationSound();
            showToast(`🍔 ¡Nuevo pedido recibido!`, 'order', 5000);
            startOrderAlarm(); // Iniciar la alarma
        }
        prevNewCount.current = newOrdersCount;
    }, [newOrdersCount]);

    // Iniciar alarma si hay pedidos pendientes al cargar la página
    useEffect(() => {
        const pendingCount = orders.filter((o) => o.status === 'pending').length;
        if (pendingCount > 0) {
            startOrderAlarm();
        }
    }, [orders]);

    // Detener alarma cuando no hay pedidos pendientes
    useEffect(() => {
        const pendingCount = orders.filter((o) => o.status === 'pending').length;
        if (pendingCount === 0 && prevNewCount.current > 0) {
            stopOrderAlarm();
        }
    }, [orders]);

    // Limpiar alarma al desmontar el componente
    useEffect(() => {
        return () => {
            stopOrderAlarm();
        };
    }, []);

    const filterOrders = () => {
        switch (activeTab) {
            case 'pending': return orders.filter((o) => o.status === 'pending');
            case 'preparing': return orders.filter((o) => o.status === 'preparing');
            case 'onTheWay': return orders.filter((o) => o.status === 'onTheWay');
            case 'completed': return orders.filter((o) => ['delivered', 'cancelled'].includes(o.status) && isOrderFromToday(o.createdAt));
            default: return orders;
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        // Detener alarma si se está reproduciendo
        if (newStatus === 'preparing') {
            stopOrderAlarm();
        }

        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            showToast(`Pedido actualizado: ${getStatusLabel(newStatus)}`, 'success');
        } else {
            showToast('Error al actualizar el pedido', 'error');
        }
    };

    const handleSeen = (orderId) => {
        markAsSeen(orderId);
    };

    const handleDeleteOrder = async (orderId, orderName) => {
        if (!confirm(`¿Estás seguro de eliminar el pedido "${orderName}"? Esta acción no se puede deshacer.`)) return;

        const result = await deleteOrder(orderId);
        if (result.success) {
            showToast('Pedido eliminado correctamente', 'success');
        } else {
            showToast(result.error || 'Error al eliminar el pedido', 'error');
        }
    };

    // Abrir modal para asignar domiciliario
    const openDeliveryModal = (order) => {
        setSelectedOrder(order);
        setDeliveryModalOpen(true);
        setSelectedDriverId('');
        setNewDriverName('');
        setNewDriverPhone('');
    };

    // Guardar nuevo domiciliario
    const saveNewDriver = () => {
        if (!newDriverName.trim() || !newDriverPhone.trim()) {
            showToast('Nombre y teléfono son obligatorios', 'error');
            return;
        }

        setSavingDriver(true);
        const newDriver = {
            id: Date.now().toString(),
            name: newDriverName.trim(),
            phone: newDriverPhone.trim()
        };

        const updatedDrivers = [...savedDrivers, newDriver];
        setSavedDrivers(updatedDrivers);
        localStorage.setItem('krusty_drivers', JSON.stringify(updatedDrivers));

        setSelectedDriverId(newDriver.id);
        setSavingDriver(false);
        showToast('Domiciliario guardado exitosamente', 'success');
    };

    // Confirmar envío a domicilio
    const confirmDeliveryToDriver = () => {
        const driver = savedDrivers.find(d => d.id === selectedDriverId);

        if (!driver && (!newDriverName.trim() || !newDriverPhone.trim())) {
            showToast('Seleccioná un domiciliario o ingresá uno nuevo', 'error');
            return;
        }

        const finalDriver = driver || {
            id: 'temp',
            name: newDriverName.trim(),
            phone: newDriverPhone.trim()
        };

        // Calcular tiempo de espera antes de actualizar
        const elapsedTime = calculateElapsedTime(selectedOrder.createdAt).minutes;

        // Actualizar estado del pedido a "En Camino"
        handleStatusChange(selectedOrder.id, 'onTheWay', `Domiciliario: ${finalDriver.name} - ${finalDriver.phone}`, { preparationTime: elapsedTime });

        // Construir mensaje completo para WhatsApp
        const orderItems = selectedOrder.items.map(item => `${item.quantity}x ${item.name}`).join('\n');
        const paymentInfo = selectedOrder.paymentMethod === 'efectivo'
            ? `💵 Efectivo - Cliente paga: $${selectedOrder.cashAmount?.toLocaleString('es-CO') || selectedOrder.total.toLocaleString('es-CO')}\n💰 Cambio: $${(selectedOrder.cashAmount - selectedOrder.total).toLocaleString('es-CO')}`
            : `💳 ${selectedOrder.paymentMethod === 'nequi' ? 'Nequi/Daviplata' : selectedOrder.paymentMethod === 'tarjeta' ? 'Tarjeta física' : 'PSE'}`;

        const whatsappMessage = `🚀 *NUEVO PEDIDO PARA DOMICILIO* 🚀

📋 *Pedido #${selectedOrder.id.slice(-6).toUpperCase()}*

👤 *Cliente:* ${selectedOrder.userName}
📱 *Teléfono:* ${selectedOrder.userPhone}

📍 *Dirección:* ${selectedOrder.userAddress || 'Solo GPS'}
${selectedOrder.userAddressNotes ? `📝 *Indicaciones:* ${selectedOrder.userAddressNotes}` : ''}
${selectedOrder.userLocationUrl ? `🗺️ *Ubicación GPS:* ${selectedOrder.userLocationUrl}` : ''}

🛒 *Pedido:*
${orderItems}

💰 *Total a cobrar:* $${selectedOrder.total.toLocaleString('es-CO')}
${paymentInfo}

⏰ *Hora del pedido:* ${new Date(selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate() : selectedOrder.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}

¡Gracias por tu servicio! 🙌`;

        // Abrir WhatsApp del domiciliario
        const whatsappUrl = `https://wa.me/57${finalDriver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');

        // Cerrar modal
        setDeliveryModalOpen(false);
        setSelectedOrder(null);
    };

    // Confirmar pedido listo para recoger (pickup)
    const confirmPickupReady = (order) => {
        // Calcular tiempo de espera
        const elapsedTime = calculateElapsedTime(order.createdAt).minutes;

        // Actualizar estado del pedido a "En Camino" (listo para recoger)
        handleStatusChange(order.id, 'onTheWay', 'Listo para recoger en local', { preparationTime: elapsedTime });

        // Construir mensaje completo para WhatsApp del cliente
        const orderItems = order.items.map(item => `${item.quantity}x ${item.name}`).join('\n');
        const paymentInfo = order.paymentMethod === 'efectivo'
            ? `💵 Efectivo - Total: $${order.total.toLocaleString('es-CO')}`
            : `💳 ${order.paymentMethod === 'nequi' ? 'Nequi/Daviplata' : order.paymentMethod === 'tarjeta' ? 'Tarjeta física' : 'PSE'} - Pagado`;

        const whatsappMessage = `✅ *¡TU PEDIDO ESTÁ LISTO!* ✅

📋 *Pedido #${order.id.slice(-6).toUpperCase()}*

👤 *Cliente:* ${order.userName}

🏪 *Lugar de recogida:* Krusty Burger
📍 *Dirección:* https://maps.google.com/?q=4.5792401,-74.1662881

🛒 *Pedido:*
${orderItems}

${paymentInfo}

⏰ *Hora de listo:* ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}

🙏 *¡Gracias por tu compra! Te esperamos.*`;

        // Abrir WhatsApp del cliente
        const whatsappUrl = `https://wa.me/57${order.userPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');

        // Mostrar toast de confirmación
        showToast('Pedido marcado como listo + WhatsApp enviado al cliente', 'success');
    };

    // Enviar reconfirmación de WhatsApp
    const sendReconfirmation = () => {
        if (!orderToReconfirm) return;

        const url = generateAdminWhatsAppURL(orderToReconfirm, true);
        window.open(url, '_blank');

        setReconfirmModalOpen(false);
        setOrderToReconfirm(null);
        showToast('Mensaje de WhatsApp abierto', 'success');
    };

    if (loading) return <div className="page admin-page"><Spinner size="lg" /></div>;

    const filtered = filterOrders();

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <h2 style={{ color: 'var(--color-text-on-dark)', marginBottom: 'var(--spacing-md)' }}>
                    Gestión de Pedidos
                </h2>

                <div className="admin-tabs">
                    {STATUS_TABS.map((tab) => {
                        const count = tab.key === 'pending' ? orders.filter((o) => o.status === 'pending').length
                            : tab.key === 'preparing' ? orders.filter((o) => o.status === 'preparing').length
                                : tab.key === 'onTheWay' ? orders.filter((o) => o.status === 'onTheWay').length
                                    : orders.filter((o) => ['delivered', 'cancelled'].includes(o.status) && isOrderFromToday(o.createdAt)).length;
                        return (
                            <button
                                key={tab.key}
                                className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="material-icons-round" style={{ fontSize: 18 }}>{tab.icon}</span>
                                {tab.label}
                                {count > 0 && <span className="admin-tab-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <EmptyState icon="inbox" title="Sin pedidos aquí" message="No hay pedidos en esta categoría" />
                ) : (
                    <div className="admin-orders-list">
                        {filtered.map((order) => {
                            const level = order.insistCount || 0;
                            const isVibrating = (insistTriggers[order.id] || 0) > 0;

                            // Calcula los minutos que han pasado
                            let minutesWaiting = 0;
                            if (order.createdAt) {
                                const createdDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                                minutesWaiting = Math.floor((now - createdDate.getTime()) / 60000);
                            }

                            return (
                                <div key={order.id}
                                    className={`admin-order-card ${order.isNew ? 'new-order' : ''} ${isVibrating ? 'shake-admin-card' : ''}`}
                                    onClick={() => order.isNew && handleSeen(order.id)}
                                    style={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        background: level <= 0 ? 'var(--color-bg-dark-card)' :
                                            level === 1 ? 'linear-gradient(135deg, rgba(255, 248, 225, 0.1), rgba(255, 255, 255, 0.05))' :
                                                level === 2 ? '#3b3815' :
                                                    level === 3 ? '#4a151b' :
                                                        level === 4 ? '#590e0c' :
                                                            'linear-gradient(135deg, #755f00, #802f00)',
                                        borderColor: level >= 2 ? (level >= 4 ? '#f50057' : '#ffd54f') : 'rgba(255, 255, 255, 0.06)'
                                    }}>

                                    <div className="admin-order-header" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div className="admin-order-id">
                                                {order.isNew && <span className="admin-new-badge">NUEVO</span>}
                                                <span style={{ fontSize: '18px', color: 'var(--color-text-on-dark)' }}>#{order.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span className="order-status-chip" style={{ background: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14 }}>{getStatusIcon(order.status)}</span>
                                                    {getStatusLabel(order.status)}
                                                </span>
                                                {/* Cronómetro - Tiempo de espera */}
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && order.createdAt && (
                                                    <span className="order-timer" style={{
                                                        fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                                                        padding: '4px 8px', borderRadius: '12px',
                                                        background: calculateElapsedTime(order.createdAt).minutes > 30 ? 'rgba(255, 82, 82, 0.2)' :
                                                            calculateElapsedTime(order.createdAt).minutes > 15 ? 'rgba(255, 213, 79, 0.2)' :
                                                                'rgba(255, 255, 255, 0.1)',
                                                        color: calculateElapsedTime(order.createdAt).minutes > 30 ? '#ff5252' :
                                                            calculateElapsedTime(order.createdAt).minutes > 15 ? '#ffd54f' :
                                                                'rgba(255,255,255,0.8)'
                                                    }}>
                                                        <span className="material-icons-round" style={{ fontSize: 12 }}>schedule</span>
                                                        {calculateElapsedTime(order.createdAt).text}
                                                    </span>
                                                )}
                                                {level > 0 && (
                                                    <span style={{ fontSize: '16px' }}>{getInsistEmoji(level)}{level >= 5 && '👑'} x{level}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span className="admin-order-total" style={{ fontSize: '22px' }}>${order.total?.toLocaleString('es-CO')}</span>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                        <div className="admin-order-items" style={{ marginBottom: 0 }}>
                                            {order.items.map((item, i) => (
                                                <span key={i} style={{ fontSize: '14px', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }}>{item.quantity}x {item.name}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {order.orderNotes && (
                                        <div style={{
                                            background: 'linear-gradient(45deg, #ffc107, #ff9800)', color: '#000',
                                            padding: '12px', borderRadius: '8px', marginBottom: '12px',
                                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                                            fontWeight: 800, fontSize: '15px', boxShadow: '0 4px 10px rgba(255, 152, 0, 0.4)'
                                        }}>
                                            <span className="material-icons-round" style={{ fontSize: 22 }}>warning</span>
                                            <div style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {order.orderNotes}
                                            </div>
                                        </div>
                                    )}

                                    <div className="admin-order-client">
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>person</span>
                                        {order.userName}
                                        <span style={{ margin: '0 4px', color: 'rgba(255,255,255,0.3)' }}>|</span>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>{order.deliveryType === 'delivery' ? 'delivery_dining' : 'storefront'}</span>
                                        {order.deliveryType === 'delivery' ? 'Domicilio' : 'Recoger'}
                                    </div>

                                    {order.deliveryType === 'delivery' && (order.userAddress || order.userLocationUrl) && (
                                        <div className="admin-order-address">
                                            <span className="material-icons-round" style={{ fontSize: 14 }}>location_on</span>
                                            {order.userAddress ? order.userAddress : 'Solo GPS'}
                                            {order.userAddressNotes && <span> — {order.userAddressNotes}</span>}
                                            {order.userLocationUrl && (
                                                <a href={order.userLocationUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 12 }}>map</span>
                                                    Abrir Mapa
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {order.paymentMethod && (
                                        <div className="admin-order-address" style={{ marginTop: '4px' }}>
                                            <span className="material-icons-round" style={{ fontSize: 14 }}>
                                                {order.paymentMethod === 'efectivo' ? 'payments' :
                                                    order.paymentMethod === 'nequi' ? 'account_balance_wallet' :
                                                        order.paymentMethod === 'pse' ? 'account_balance' : 'credit_card'}
                                            </span>
                                            {order.paymentMethod === 'efectivo' ? 'Efectivo' :
                                                order.paymentMethod === 'nequi' ? 'Nequi / Daviplata' :
                                                    order.paymentMethod === 'pse' ? 'PSE' : 'Tarjeta física'}

                                            {order.paymentMethod === 'efectivo' && order.cashAmount > 0 && (
                                                <strong style={{ marginLeft: '4px', color: 'var(--color-primary)' }}>
                                                    (Para cambio de: ${order.cashAmount.toLocaleString('es-CO')})
                                                </strong>
                                            )}
                                        </div>
                                    )}

                                    <div className="admin-order-footer">
                                        <div className="admin-order-actions" style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {/* Botón de cancelar - A la izquierda, más discreto */}
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ color: '#E53935', opacity: 0.7 }}
                                                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Cancelar este pedido?')) handleStatusChange(order.id, 'cancelled'); }}
                                                        title="Cancelar pedido"
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                                    </button>
                                                )}
                                                {/* Botón de WhatsApp - Reenviar mensaje (solo en preparación, listo y en camino) */}
                                                {order.status !== 'pending' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOrderToReconfirm(order);
                                                            setReconfirmModalOpen(true);
                                                        }}
                                                        title="Reenviar mensaje de WhatsApp"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--color-success)" style={{ flexShrink: 0 }}>
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {order.status === 'pending' && (
                                                    <a
                                                        href={generateAdminWhatsAppURL(order)}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="btn btn-sm btn-primary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(order.id, 'preparing');
                                                        }}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{ flexShrink: 0 }}>
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                        </svg>
                                                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Aceptar Pedido</span>
                                                    </a>
                                                )}
                                                {/* Botón para pedidos en preparación */}
                                                {order.status === 'preparing' && (
                                                    order.deliveryType === 'pickup' ? (
                                                        // Pickup - Botón directo para notificar al cliente
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={(e) => { e.stopPropagation(); confirmPickupReady(order); }}
                                                            title="Notificar al cliente que su pedido está listo"
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 16 }}>storefront</span>
                                                            Listo para recoger
                                                        </button>
                                                    ) : (
                                                        // Delivery - Abrir modal de domiciliarios
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={(e) => { e.stopPropagation(); openDeliveryModal(order); }}
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 16 }}>two_wheeler</span>
                                                            En Camino
                                                        </button>
                                                    )
                                                )}
                                                {NEXT_STATUS[order.status] && order.status !== 'pending' && order.status !== 'preparing' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, NEXT_STATUS[order.status]); }}
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>{getStatusIcon(NEXT_STATUS[order.status])}</span>
                                                        {getStatusLabel(NEXT_STATUS[order.status])}
                                                    </button>
                                                )}
                                                {(order.status === 'delivered' || order.status === 'cancelled') && isOrderFromToday(order.createdAt) && (
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id, `${order.items[0]?.quantity}x ${order.items[0]?.name}...`); }}
                                                        title="Eliminar pedido de prueba"
                                                        style={{ color: '#E53935' }}
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal para asignar domiciliario */}
            <Modal
                isOpen={deliveryModalOpen}
                onClose={() => setDeliveryModalOpen(false)}
                title="📍 Asignar Domiciliario"
                size="md"
            >
                <div style={{ padding: 'var(--spacing-md)' }}>
                    {selectedOrder && (
                        <>
                            {/* Resumen del pedido */}
                            <div style={{
                                background: 'var(--color-surface-alt)',
                                padding: 'var(--spacing-md)',
                                borderRadius: '8px',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📋 Pedido #{selectedOrder.id.slice(-6).toUpperCase()}</h4>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    <div><strong>Cliente:</strong> {selectedOrder.userName}</div>
                                    <div><strong>Teléfono:</strong> {selectedOrder.userPhone}</div>
                                    <div><strong>Dirección:</strong> {selectedOrder.userAddress || 'Solo GPS'}</div>
                                    <div><strong>Total:</strong> ${selectedOrder.total.toLocaleString('es-CO')}</div>
                                </div>
                            </div>

                            {/* Domiciliarios guardados */}
                            {savedDrivers.length > 0 && (
                                <div className="input-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <label htmlFor="saved-drivers">📌 Domiciliarios guardados</label>
                                    <select
                                        id="saved-drivers"
                                        className="input-field"
                                        value={selectedDriverId}
                                        onChange={(e) => {
                                            setSelectedDriverId(e.target.value);
                                            const driver = savedDrivers.find(d => d.id === e.target.value);
                                            if (driver) {
                                                setNewDriverName(driver.name);
                                                setNewDriverPhone(driver.phone);
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar domiciliario...</option>
                                        {savedDrivers.map(driver => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name} - {driver.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Nuevo domiciliario */}
                            <div style={{
                                background: 'rgba(67, 160, 71, 0.1)',
                                padding: 'var(--spacing-md)',
                                borderRadius: '8px',
                                marginBottom: 'var(--spacing-md)',
                                borderLeft: '3px solid var(--color-success)'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-success)' }}>
                                    🆕 Nuevo domiciliario
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label htmlFor="driver-name">Nombre</label>
                                        <input
                                            id="driver-name"
                                            type="text"
                                            className="input-field"
                                            value={newDriverName}
                                            onChange={(e) => setNewDriverName(e.target.value)}
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label htmlFor="driver-phone">WhatsApp</label>
                                        <input
                                            id="driver-phone"
                                            type="tel"
                                            className="input-field"
                                            value={newDriverPhone}
                                            onChange={(e) => setNewDriverPhone(e.target.value)}
                                            placeholder="Ej: 3001234567"
                                        />
                                    </div>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={saveNewDriver}
                                    disabled={savingDriver || !newDriverName.trim() || !newDriverPhone.trim()}
                                    style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
                                >
                                    {savingDriver ? 'Guardando...' : '💾 Guardar en historial'}
                                </button>
                            </div>

                            {/* Botones de acción */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <button
                                    className="btn btn-ghost btn-full"
                                    onClick={() => setDeliveryModalOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={confirmDeliveryToDriver}
                                    disabled={!selectedDriverId && (!newDriverName.trim() || !newDriverPhone.trim())}
                                >
                                    ✅ Hecho, enviar pedido
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Modal de reconfirmación de WhatsApp */}
            <Modal
                isOpen={reconfirmModalOpen}
                onClose={() => setReconfirmModalOpen(false)}
                title="⚠️ Reenviar Confirmación"
                size="sm"
            >
                <div style={{ padding: 'var(--spacing-md)' }}>
                    {/* Ícono de advertencia */}
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 16px',
                        background: 'rgba(255, 152, 0, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span className="material-icons-round" style={{
                            fontSize: '36px',
                            color: 'var(--color-warning)',
                        }}>warning</span>
                    </div>

                    {/* Mensaje principal */}
                    <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        textAlign: 'center',
                        color: 'var(--color-text-on-dark)'
                    }}>
                        ¿Estás seguro de reenviar la confirmación?
                    </h4>

                    {/* Descripción */}
                    <p style={{
                        margin: '0 0 20px 0',
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        Este botón solo debe usarse si la confirmación original <strong>falló o no llegó</strong> al cliente.
                    </p>

                    {/* Resumen del pedido */}
                    {orderToReconfirm && (
                        <div style={{
                            background: 'var(--color-surface-alt)',
                            padding: 'var(--spacing-md)',
                            borderRadius: '8px',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                <div style={{ marginBottom: '4px' }}>
                                    <strong>Pedido:</strong> #{orderToReconfirm.id.slice(-6).toUpperCase()}
                                </div>
                                <div style={{ marginBottom: '4px' }}>
                                    <strong>Cliente:</strong> {orderToReconfirm.userName}
                                </div>
                                <div>
                                    <strong>Estado:</strong> {orderToReconfirm.status === 'preparing' ? '🍳 En Preparación' : orderToReconfirm.status === 'onTheWay' ? '🛵 En Camino' : '✅ Listo'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                            className="btn btn-ghost btn-full"
                            onClick={() => setReconfirmModalOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-success btn-full"
                            onClick={sendReconfirmation}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style={{ marginRight: '8px', flexShrink: 0 }}>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Sí, Reenviar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
