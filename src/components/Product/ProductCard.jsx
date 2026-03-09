import { memo, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { showToast } from '../../utils/notifications';
import Modal from '../UI/Modal';
import './ProductCard.css';

const ProductCard = memo(function ProductCard({ product, index = 0 }) {
    const { addItem } = useCart();
    const [added, setAdded] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleAdd = (e) => {
        if (e) e.stopPropagation();
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
        <>
            <div
                className={`product-card ${!product.available ? 'product-unavailable' : ''}`}
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => product.available && setShowModal(true)}
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

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={product.name}
            >
                <div className="product-modal-content">
                    {product.imageURL ? (
                        <div className="product-modal-image">
                            <img src={product.imageURL} alt={product.name} loading="lazy" />
                        </div>
                    ) : (
                        <div className="product-modal-placeholder">
                            <span>{categoryIcons[product.category] || '🍔'}</span>
                        </div>
                    )}

                    <div className="product-modal-details">
                        <p className="product-modal-desc">{product.description}</p>

                        <div className="product-modal-price-row">
                            <span className="product-modal-price">
                                ${product.price.toLocaleString('es-CO')}
                            </span>
                            {product.featured && <span className="product-badge-featured" style={{ position: 'static' }}>⭐ Destacado</span>}
                        </div>

                        <button
                            className={`btn btn-primary btn-lg btn-full ${added ? 'product-added' : ''}`}
                            onClick={(e) => { handleAdd(e); setShowModal(false); }}
                            disabled={!product.available}
                            style={{ marginTop: 'var(--spacing-md)' }}
                        >
                            <span className="material-icons-round" style={{ fontSize: 20 }}>
                                {added ? 'check' : 'add_shopping_cart'}
                            </span>
                            {added ? 'Agregado al carrito' : 'Agregar al carrito'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
});

export default ProductCard;
