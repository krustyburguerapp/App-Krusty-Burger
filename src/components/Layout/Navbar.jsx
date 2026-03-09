import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
    const { user, isAdmin, userData } = useAuth();
    const { totalItems, setIsOpen } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [imgError, setImgError] = useState(false);

    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <nav className={`navbar ${isAdminRoute ? 'navbar-dark' : ''}`}>
            <div className="navbar-inner">
                <div className="navbar-brand" onClick={() => navigate(isAdmin ? '/admin' : '/menu')}>
                    <img src="/LOGO.png" alt="Krusty Burger" className="navbar-logo" />
                    <span className="navbar-title">Krusty Burger</span>
                </div>
                <div className="navbar-actions">
                    {!isAdminRoute && user && (
                        <button className="btn btn-icon btn-ghost navbar-orders-btn" onClick={() => navigate('/orders')} aria-label="Mis Pedidos" title="Mis Pedidos">
                            <span className="material-icons-round">receipt_long</span>
                        </button>
                    )}
                    {!isAdminRoute && (
                        <button className="btn btn-icon btn-ghost navbar-cart-btn" onClick={() => setIsOpen(true)} aria-label="Carrito">
                            <span className="material-icons-round">shopping_cart</span>
                            {totalItems > 0 && <span className="navbar-cart-badge">{totalItems}</span>}
                        </button>
                    )}
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => navigate(user ? (isAdmin && isAdminRoute ? '/admin' : '/profile') : '/')}
                        aria-label="Perfil"
                    >
                        {userData?.photoURL && !imgError ? (
                            <img
                                src={userData.photoURL}
                                alt={`Foto de ${userData.displayName || 'usuario'}`}
                                className="navbar-avatar"
                                onError={() => setImgError(true)}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="material-icons-round">account_circle</span>
                        )}
                    </button>
                </div>
            </div>
        </nav>
    );
}
