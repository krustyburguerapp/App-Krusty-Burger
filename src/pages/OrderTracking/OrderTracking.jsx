import { useAuth } from '../../contexts/AuthContext';
import { useOrders, getStatusLabel, getStatusColor } from '../../hooks/useOrders';
import OrderTracker from '../../components/Order/OrderTracker';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import './OrderTracking.css';

export default function OrderTracking() {
    const { user } = useAuth();
    const { orders, loading, error } = useOrders(user?.uid);

    if (loading) return <div className="page"><Spinner size="lg" /></div>;

    if (error) return (
        <div className="page">
            <div className="container orders-container">
                <EmptyState icon="wifi_off" title="No pudimos cargar tus pedidos" message="Verifica tu conexión e intenta recargar la página" />
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
                    <EmptyState icon="receipt_long" title="Aún no tienes pedidos" message="Cuando hagas tu primer pedido, aparecerá aquí" />
                ) : (
                    <>
                        {activeOrders.length > 0 && (
                            <div className="orders-section">
                                <h3 className="orders-section-title">
                                    <span className="material-icons-round" style={{ color: 'var(--color-primary)' }}>pending</span>
                                    Pedidos Activos
                                </h3>
                                {activeOrders.map((order) => (
                                    <div key={order.id} className="order-card-full">
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
                                    </div>
                                ))}
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
