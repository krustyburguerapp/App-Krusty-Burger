import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Spinner from '../../components/UI/Spinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { user, userData } = useAuth();
    const { orders, loading, newOrdersCount } = useOrders();
    const navigate = useNavigate();

    const [storeCoords, setStoreCoords] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsMsg, setGpsMsg] = useState('');

    useEffect(() => {
        const loadCoords = async () => {
            try {
                const snap = await getDoc(doc(db, 'config', 'storeLocation'));
                if (snap.exists()) setStoreCoords(snap.data());
            } catch (e) { console.error('Error cargando coordenadas:', e); }
        };
        loadCoords();
    }, []);

    const handleCaptureGPS = () => {
        if (!navigator.geolocation) {
            setGpsMsg('Tu navegador no soporta GPS');
            return;
        }
        setGpsLoading(true);
        setGpsMsg('Obteniendo ubicacion...');
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: new Date().toISOString() };
                try {
                    await setDoc(doc(db, 'config', 'storeLocation'), coords);
                    setStoreCoords(coords);
                    setGpsMsg('Coordenadas guardadas!');
                } catch (e) {
                    setGpsMsg('Error guardando: ' + e.message);
                }
                setGpsLoading(false);
            },
            (err) => {
                setGpsMsg('Error GPS: ' + err.message);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

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

                {/* Seccion GPS del Local */}
                <div className="admin-quick-actions" style={{ marginTop: '16px' }}>
                    <h3>Ubicacion del Local</h3>
                    <button
                        className="admin-action-btn"
                        onClick={handleCaptureGPS}
                        disabled={gpsLoading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', background: gpsLoading ? 'var(--color-surface-alt)' : '' }}
                    >
                        <span className="material-icons-round">{gpsLoading ? 'hourglass_top' : 'my_location'}</span>
                        <span>{gpsLoading ? 'Calculando...' : 'Calcular coordenadas del local'}</span>
                    </button>
                    {gpsMsg && <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{gpsMsg}</p>}
                    {storeCoords && (
                        <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--color-surface-alt)', borderRadius: '12px', fontSize: '13px' }}>
                            <p style={{ marginBottom: '6px' }}><strong>Lat:</strong> {storeCoords.lat}</p>
                            <p style={{ marginBottom: '6px' }}><strong>Lng:</strong> {storeCoords.lng}</p>
                            <a
                                href={`https://maps.google.com/?q=${storeCoords.lat},${storeCoords.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--color-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                                <span className="material-icons-round" style={{ fontSize: '16px' }}>map</span>
                                Ver en Google Maps
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
