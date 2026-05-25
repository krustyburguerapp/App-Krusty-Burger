import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useNavigate } from 'react-router-dom';
import { getRestaurantSettings, getRestaurantStatus } from '../../config/restaurantSettings';
import Spinner from '../../components/UI/Spinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { user, userData } = useAuth();
    const { orders, loading, newOrdersCount } = useOrders();
    const { products, toggleAvailability } = useProducts();
    const navigate = useNavigate();
    const [restaurantStatus, setRestaurantStatus] = useState({ isOpen: true, message: 'Abierto' });
    const [restaurantSettings, setRestaurantSettings] = useState(null);

    // Cargar estado del restaurante
    useEffect(() => {
        const loadStatus = async () => {
            const settings = await getRestaurantSettings();
            setRestaurantSettings(settings);
            setRestaurantStatus(getRestaurantStatus(settings));
        };
        loadStatus();
    }, []);

    // Productos no disponibles
    const unavailableProducts = products.filter(p => !p.available);

    if (loading) return <div className="page admin-page"><Spinner size="lg" /></div>;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return d >= todayStart;
    });
    const pending = orders.filter((o) => o.status === 'pending').length;
    const preparing = orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length;
    const completedToday = todayOrders.filter((o) => o.status === 'delivered').length;
    const todayRevenue = todayOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <div className="admin-header">
                    <div>
                        <h2 className="admin-greeting">Hola, {userData?.displayName?.split(' ')[0] || 'Admin'} 👋</h2>
                        <p className="admin-subtitle">Panel de administracion</p>
                    </div>
                    {/* Estado del local */}
                    <div className={`admin-store-status ${restaurantStatus.isOpen ? 'status-open' : 'status-closed'}`}>
                        <span className="material-icons-round">
                            {restaurantStatus.isOpen ? 'store' : 'storefront'}
                        </span>
                        <div>
                            <strong>{restaurantStatus.isOpen ? 'Abierto' : 'Cerrado'}</strong>
                            <span>{restaurantStatus.message}</span>
                        </div>
                    </div>
                </div>

                <div className="admin-stats-grid">
                    <div className="admin-stat-card stat-pending" onClick={() => navigate('/admin/orders')}>
                        <span className="material-icons-round">pending</span>
                        <div className="admin-stat-value">{pending}</div>
                        <div className="admin-stat-label">Pendientes</div>
                        {newOrdersCount > 0 && <div className="admin-stat-badge pulse">{newOrdersCount} nuevos</div>}
                    </div>
                    <div className="admin-stat-card stat-preparing" onClick={() => navigate('/admin/orders')}>
                        <span className="material-icons-round">restaurant</span>
                        <div className="admin-stat-value">{preparing}</div>
                        <div className="admin-stat-label">En Preparacion</div>
                    </div>
                    <div className="admin-stat-card stat-completed">
                        <span className="material-icons-round">done_all</span>
                        <div className="admin-stat-value">{completedToday}</div>
                        <div className="admin-stat-label">Completados Hoy</div>
                    </div>
                    <div className="admin-stat-card stat-revenue">
                        <span className="material-icons-round">payments</span>
                        <div className="admin-stat-value">${todayRevenue.toLocaleString('es-CO')}</div>
                        <div className="admin-stat-label">Ventas Hoy</div>
                    </div>
                </div>

                <div className="admin-quick-actions">
                    <h3>Acciones Rapidas</h3>
                    <div className="admin-actions-grid">
                        <button className="admin-action-btn" onClick={() => navigate('/admin/orders')}>
                            <span className="material-icons-round">receipt_long</span>
                            <span>Gestionar Pedidos</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/admin/products')}>
                            <span className="material-icons-round">inventory_2</span>
                            <span>Gestionar Productos</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/admin/delivery-pricing')}>
                            <span className="material-icons-round">local_shipping</span>
                            <span>Precios Domicilio</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/admin/settings')}>
                            <span className="material-icons-round">store</span>
                            <span>Configuración</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/admin/loyalty')}>
                            <span className="material-icons-round">emoji_events</span>
                            <span>Fidelización</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/admin/prize-claims')}>
                            <span className="material-icons-round">card_giftcard</span>
                            <span>Reclamos de Premios</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/menu')}>
                            <span className="material-icons-round">restaurant_menu</span>
                            <span>Ver Menu</span>
                        </button>
                        <button className="admin-action-btn" onClick={() => navigate('/profile')}>
                            <span className="material-icons-round">settings</span>
                            <span>Mi Perfil</span>
                        </button>
                    </div>
                </div>

                {/* Productos no disponibles */}
                {unavailableProducts.length > 0 && (
                    <div className="admin-unavailable-section">
                        <div className="admin-unavailable-header">
                            <h3>
                                <span className="material-icons-round">visibility_off</span>
                                Productos No Disponibles ({unavailableProducts.length})
                            </h3>
                            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/admin/products')}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span>
                                Gestionar
                            </button>
                        </div>
                        <p className="admin-unavailable-desc">
                            Estos productos están desactivados. Reactívalos si ya están disponibles.
                        </p>
                        <div className="admin-unavailable-list">
                            {unavailableProducts.map(product => (
                                <div key={product.id} className="admin-unavailable-item">
                                    <div className="admin-unavailable-item-info">
                                        {product.imageURL ? (
                                            <img src={product.imageURL} alt={product.name} />
                                        ) : (
                                            <div className="admin-unavailable-placeholder">🍔</div>
                                        )}
                                        <div>
                                            <strong>{product.name}</strong>
                                            <span>${product.price.toLocaleString('es-CO')}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-outline"
                                        style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                        onClick={() => toggleAvailability(product.id, product.available)}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>toggle_on</span>
                                        Activar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
