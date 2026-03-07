import { memo, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { showToast } from '../../utils/notifications';
import './ProductCard.css';

const ProductCard = memo(function ProductCard({ product, index = 0 }) {
    const { addItem } = useCart();
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
        if (!product.available) return;
        addItem(product);
        setAdded(true);
        showToast(`${product.name} agregado al carrito`, 'success');
        setTimeout(() => setAdded(false), 600);
    };

    const categoryIcons = {
        hamburguesas: '🍔', combos: '🍱', acompanantes: '🍟',
        bebidas: '🥤', postres: '🍨'
    };

    return (
        <div
            className={`product-card ${!product.available ? 'product-unavailable' : ''}`}
            style={{ animationDelay: `${index * 60}ms` }}
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
                {!product.available && <div className="product-badge-unavailable">No disponible</div>}
            </div>
            <div className="product-card-body">
                <h4 className="product-card-name">{product.name}</h4>
                <p className="product-card-desc">{product.description}</p>
                <div className="product-card-footer">
                    <span className="product-card-price">${product.price.toLocaleString('es-CO')}</span>
                    <button
                        className={`btn btn-primary btn-sm product-add-btn ${added ? 'product-added' : ''}`}
                        onClick={handleAdd}
                        disabled={!product.available}
                        aria-label={`Agregar ${product.name}`}
                    >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>
                            {added ? 'check' : 'add'}
                        </span>
                        {added ? 'Listo' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ProductCard;
