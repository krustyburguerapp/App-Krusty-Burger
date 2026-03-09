import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../UI/EmptyState';
import './CartDrawer.css';

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, updateQuantity, removeItem, subtotal, totalItems, setIsCrossSellingOpen } = useCart();
    const navigate = useNavigate();

    const handleCheckout = () => {
        setIsOpen(false);
        setIsCrossSellingOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="cart-overlay" onClick={() => setIsOpen(false)} />
            <div className="cart-drawer">
                <div className="cart-drawer-header">
                    <h3>
                        <span className="material-icons-round" style={{ color: 'var(--color-primary)' }}>shopping_cart</span>
                        Tu Carrito {totalItems > 0 && `(${totalItems})`}
                    </h3>
                    <button className="btn btn-icon btn-ghost" onClick={() => setIsOpen(false)} aria-label="Cerrar carrito">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="cart-drawer-body">
                    {items.length === 0 ? (
                        <EmptyState icon="shopping_cart" title="Tu carrito está vacío" message="Agrega productos del menú para empezar tu pedido" />
                    ) : (
                        <div className="cart-items-list">
                            {items.map((item) => (
                                <div key={item.productId} className="cart-item">
                                    <div className="cart-item-image">
                                        {item.imageURL ? (
                                            <img src={item.imageURL} alt={item.name} />
                                        ) : (
                                            <div className="cart-item-placeholder">🍔</div>
                                        )}
                                    </div>
                                    <div className="cart-item-info">
                                        <span className="cart-item-name">{item.name}</span>
                                        <span className="cart-item-price">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="cart-item-controls">
                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label="Reducir">
                                            <span className="material-icons-round" style={{ fontSize: 18 }}>remove</span>
                                        </button>
                                        <span className="cart-item-qty">{item.quantity}</span>
                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => updateQuantity(item.productId, item.quantity + 1)} aria-label="Aumentar">
                                            <span className="material-icons-round" style={{ fontSize: 18 }}>add</span>
                                        </button>
                                        <button className="btn btn-icon btn-sm btn-ghost cart-item-remove" onClick={() => removeItem(item.productId)} aria-label="Eliminar">
                                            <span className="material-icons-round" style={{ fontSize: 18 }}>delete_outline</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {items.length > 0 && (
                    <div className="cart-drawer-footer">
                        <div className="cart-total">
                            <span>Subtotal</span>
                            <span className="cart-total-price">${subtotal.toLocaleString('es-CO')}</span>
                        </div>
                        <button className="btn btn-primary btn-lg btn-full" onClick={handleCheckout}>
                            <span className="material-icons-round">shopping_bag</span>
                            Continuar tu compra
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
