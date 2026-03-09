import { useCart } from '../../contexts/CartContext';
import './FloatingCartBtn.css';

export default function FloatingCartBtn() {
    const { totalItems, setIsOpen } = useCart();

    if (totalItems === 0) return null;

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
