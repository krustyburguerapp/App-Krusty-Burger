import { useCart } from '../../contexts/CartContext';
import { useLocation } from 'react-router-dom';
import './FloatingCartBtn.css';

export default function FloatingCartBtn() {
    const { totalItems, isOpen, setIsOpen } = useCart();
    const location = useLocation();

    // No mostrar si:
    // 1. No hay items en el carrito
    // 2. El carrito ya está abierto
    // 3. Está en la página de checkout
    if (totalItems === 0 || isOpen || location.pathname === '/checkout') return null;

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
