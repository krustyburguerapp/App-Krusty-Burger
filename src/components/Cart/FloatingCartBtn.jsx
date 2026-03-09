import { useCart } from '../../contexts/CartContext';
import { useLocation } from 'react-router-dom';
import './FloatingCartBtn.css';

export default function FloatingCartBtn() {
    const { totalItems, setIsOpen } = useCart();
    const location = useLocation();

    if (totalItems === 0 || location.pathname === '/checkout') return null;

    return (
        <button
            className="floating-cart-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Abrir carrito flotante"
        >
            <span className="material-icons-round">shopping_cart</span>
            <span className="floating-cart-badge">{totalItems}</span>
        </button>
    );
}
