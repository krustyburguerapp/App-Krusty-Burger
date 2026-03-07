import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './BottomNav.css';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useAuth();

    const userItems = [
        { path: '/menu', icon: 'restaurant_menu', label: 'Menú' },
        { path: '/orders', icon: 'receipt_long', label: 'Pedidos' },
        { path: '/profile', icon: 'person', label: 'Perfil' }
    ];

    const adminItems = [
        { path: '/admin', icon: 'dashboard', label: 'Panel' },
        { path: '/admin/orders', icon: 'receipt_long', label: 'Pedidos' },
        { path: '/admin/products', icon: 'inventory_2', label: 'Productos' },
        { path: '/menu', icon: 'restaurant_menu', label: 'Menú' }
    ];

    const items = isAdmin && location.pathname.startsWith('/admin') ? adminItems : userItems;

    return (
        <nav className={`bottom-nav ${location.pathname.startsWith('/admin') ? 'bottom-nav-dark' : ''}`}>
            {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.path}
                        className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                        aria-label={item.label}
                    >
                        <span className="material-icons-round bottom-nav-icon">{item.icon}</span>
                        <span className="bottom-nav-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
