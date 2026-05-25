import { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { showToast } from '../../utils/notifications';
import Modal from '../UI/Modal';
import './ProductCard.css';

function ProductCard({ product, index = 0, onSelect }) {
    const { items, isPrizeRedemptionActive } = useCart();
    const [added, setAdded] = useState(false);

    // Verificar si ya tiene comida individual en el carrito
    const alreadyHasFood = items.some(item => item.category === 'individual');

    // Si hay premio activo, es individual, y aún no tiene comida → mostrar $0
    const isFreePrizeItem = isPrizeRedemptionActive && product.category === 'individual' && !alreadyHasFood;

    const handleSelect = (e) => {
        if (e) e.stopPropagation();
        if (!product.available) return;
        if (onSelect) onSelect(product);
    };

    const categoryIcons = {
        hamburguesas: '🍔', combos: '🍱', acompanantes: '🍟',
        bebidas: '🥤', postres: '🍨'
    };

    return (
        <>
            <div
                className={`product-card ${!product.available ? 'product-unavailable' : ''} ${isFreePrizeItem ? 'product-prize-item' : ''}`}
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => product.available && handleSelect()}
            >
                <div className="product-card-image">
                    {product.imageURL ? (
                        <img src={product.imageURL} alt={product.name} loading="lazy" />
                    ) : (
                        <div className="product-card-placeholder">
                            <span>{categoryIcons[product.category] || '🍔'}</span>
                        </div>
                    )}
                    {product.featured && <span className="product-badge-featured">⭐ Destacado</span>}
                    {product.promoActive && product.promoPrice && (
                        <span className="product-badge-promo">🔥 Promo</span>
                    )}
                    {isFreePrizeItem && (
                        <span className="product-badge-promo" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>🎁 GRATIS</span>
                    )}
                    {!product.available && <div className="product-badge-unavailable">No disponible</div>}
                </div>
                <div className="product-card-body">
                    <h4 className="product-card-name">{product.name}</h4>
                    <p className="product-card-desc">{product.description}</p>
                    <div className="product-card-footer">
                        <div className="product-card-price-container">
                            {isFreePrizeItem ? (
                                <>
                                    <span className="product-card-price product-card-price-original">
                                        ${product.price.toLocaleString('es-CO')}
                                    </span>
                                    <span className="product-card-price product-card-price-promo" style={{ color: '#4CAF50' }}>
                                        $0 GRATIS
                                    </span>
                                </>
                            ) : product.promoActive && product.promoPrice ? (
                                <>
                                    <span className="product-card-price product-card-price-original">
                                        ${product.price.toLocaleString('es-CO')}
                                    </span>
                                    <span className="product-card-price product-card-price-promo">
                                        ${product.promoPrice.toLocaleString('es-CO')}
                                    </span>
                                </>
                            ) : (
                                <span className="product-card-price">
                                    ${product.price.toLocaleString('es-CO')}
                                </span>
                            )}
                        </div>
                        <button
                            className={`btn btn-primary btn-sm product-add-btn ${added ? 'product-added' : ''}`}
                            onClick={handleSelect}
                            disabled={!product.available}
                            aria-label={`Agregar ${product.name}`}
                        >
                            <span className="material-icons-round" style={{ fontSize: 18 }}>
                                add
                            </span>
                            Agregar
                        </button>
                    </div>
                </div>
            </div>

        </>
    );
}

export default ProductCard;
