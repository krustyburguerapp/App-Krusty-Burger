import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders, getStatusLabel, getStatusColor } from '../../contexts/OrdersContext';
import OrderTracker from '../../components/Order/OrderTracker';
import FloatingEmojis, { getInsistEmoji, getInsistLabel } from '../../components/UI/FloatingEmojis';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import './OrderTracking.css';

export default function OrderTracking() {
    const { user } = useAuth();
    const { orders, loading, error, sendInsist } = useOrders();
    const [insistTriggers, setInsistTriggers] = useState({});
    const [localCounts, setLocalCounts] = useState({});

    const handleInsist = async (orderId) => {
        const newCount = (localCounts[orderId] || 0) + 1;
        setLocalCounts(prev => ({ ...prev, [orderId]: newCount }));
        setInsistTriggers(prev => ({ ...prev, [orderId]: (prev[orderId] || 0) + 1 }));
        await sendInsist(orderId);
    };

    if (loading) return <div className="page"><Spinner size="lg" /></div>;

    if (error) return (
        <div className="page">
            <div className="container orders-container">
                <EmptyState icon="wifi_off" title="No pudimos cargar tus pedidos" message="Verifica tu conexion e intenta recargar la pagina" />
            </div>
        </div>
    );

    const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    const pastOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

    return (
        <div className="page">
            <div className="container orders-container">
                <h2>Mis Pedidos</h2>

                {orders.length === 0 ? (
                    <EmptyState icon="receipt_long" title="Aun no tienes pedidos" message="Cuando hagas tu primer pedido, aparecera aqui" />
                ) : (
                    <>
                        {activeOrders.length > 0 && (
                            <div className="orders-section">
                                <h3 className="orders-section-title">
                                    <span className="material-icons-round" style={{ color: 'var(--color-primary)' }}>pending</span>
                                    Pedidos Activos
                                </h3>
                                {activeOrders.map((order) => {
                                    const count = localCounts[order.id] || order.insistCount || 0;
                                    return (
                                        <div key={order.id} className="order-card-full" style={{ position: 'relative', overflow: 'hidden' }}>
                                            <FloatingEmojis
                                                emoji={getInsistEmoji(count)}
                                                trigger={insistTriggers[order.id] || 0}
                                            />
                                            <div className="order-card-header">
                                                <span className="order-card-id">#{order.id.slice(-6).toUpperCase()}</span>
                                                <span className="order-status-chip" style={{ background: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                                                    {getStatusLabel(order.status)}
                                                </span>
                                            </div>
                                            <OrderTracker order={order} />
                                            <div className="order-card-items">
                                                {order.items.map((item, i) => (
                                                    <span key={i}>{item.quantity}x {item.name}</span>
                                                ))}
                                            </div>
                                            <div className="order-card-total">
                                                <span>Total</span>
                                                <span>${order.total?.toLocaleString('es-CO')}</span>
                                            </div>
                                            {order.status !== 'onTheWay' && order.status !== 'ready' ? null : null}
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => handleInsist(order.id)}
                                                style={{
                                                    marginTop: '10px',
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: '10px',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    background: count <= 3 ? 'linear-gradient(135deg, #FFF3E0, #FFE0B2)' :
                                                        count <= 7 ? 'linear-gradient(135deg, #FFF9C4, #FFE082)' :
                                                            count <= 12 ? 'linear-gradient(135deg, #FFCDD2, #EF9A9A)' :
                                                                'linear-gradient(135deg, #FF5252, #D32F2F)',
                                                    color: count > 12 ? '#fff' : '#333',
                                                    transition: 'all 0.3s ease',
                                                    transform: 'scale(1)',
                                                    animation: count > 7 ? 'pulse-btn 0.5s ease' : 'none'
                                                }}
                                            >
                                                <span style={{ fontSize: '20px' }}>{getInsistEmoji(count)}</span>
                                                <span>{count === 0 ? 'Insistir' : getInsistLabel(count)}</span>
                                                {count > 0 && <span style={{ opacity: 0.6, fontSize: '12px' }}>x{count}</span>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {pastOrders.length > 0 && (
                            <div className="orders-section">
                                <h3 className="orders-section-title">
                                    <span className="material-icons-round" style={{ color: 'var(--color-text-secondary)' }}>history</span>
                                    Historial
                                </h3>
                                {pastOrders.map((order) => (
                                    <div key={order.id} className="order-card-mini">
                                        <div className="order-card-header">
                                            <span className="order-card-id">#{order.id.slice(-6).toUpperCase()}</span>
                                            <span className="order-status-chip" style={{ background: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </div>
                                        <div className="order-card-items">
                                            {order.items.map((item, i) => (
                                                <span key={i}>{item.quantity}x {item.name}</span>
                                            ))}
                                        </div>
                                        <div className="order-card-total">
                                            <span>Total</span>
                                            <span>${order.total?.toLocaleString('es-CO')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

