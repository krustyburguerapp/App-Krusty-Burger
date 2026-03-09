import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import Modal from '../UI/Modal';
import './CrossSellingModal.css';

// Precio por defecto del "Upgrade" a Combo (Papas + Gaseosa)
const COMBO_UPGRADE_PRICE = 6000;

export default function CrossSellingModal() {
    const { items, isCrossSellingOpen, setIsCrossSellingOpen, addItem, updateQuantity } = useCart();
    const { products } = useProducts();
    const navigate = useNavigate();

    // Filtramos productos por las nuevas categorías
    const bebidasList = useMemo(() => products.filter(p => p.category === 'bebidas' && p.available), [products]);
    const adicionalesList = useMemo(() => products.filter(p => p.category === 'adicionales' && p.available), [products]);

    const hasIndividualItems = useMemo(() => {
        // Asumimos que podemos acceder a la categoría de los items del carrito buscando en products
        return items.some(cartItem => {
            const productInfo = products.find(p => p.id === cartItem.productId);
            return productInfo && productInfo.category === 'individual';
        });
    }, [items, products]);

    // Calcular cuántos items individuales hay en total
    const totalIndividualQty = useMemo(() => {
        return items.reduce((acc, cartItem) => {
            const productInfo = products.find(p => p.id === cartItem.productId);
            if (productInfo && productInfo.category === 'individual') {
                return acc + cartItem.quantity;
            }
            return acc;
        }, 0);
    }, [items, products]);

    // 'combos' | 'bebidas' | 'adicionales'
    const [step, setStep] = useState('combos');

    // Estado para selecciones temporales antes de pasarlas al carrito
    const [tempCombosQty, setTempCombosQty] = useState(1);
    const [selectedDrinkForCombo, setSelectedDrinkForCombo] = useState(null);
    const [tempBebidas, setTempBebidas] = useState([]); // Array de objetos { product, qty }
    const [tempAdicionales, setTempAdicionales] = useState([]);

    useEffect(() => {
        if (isCrossSellingOpen) {
            if (hasIndividualItems) {
                setStep('combos');
                setTempCombosQty(1);
            } else {
                setStep('adicionales');
            }
            setSelectedDrinkForCombo(null);
            setTempBebidas([]);
            setTempAdicionales([]);
        }
    }, [isCrossSellingOpen, hasIndividualItems]);

    const handleClose = () => {
        setIsCrossSellingOpen(false);
    };

    const proceedToNext = () => {
        if (step === 'combos') {
            setStep('adicionales'); // Si ya ofreció combos, saltamos a adicionales (porque las bebidas ya se ofrecieron en combo)
            // Edit: El usuario dijo "Si no se elige combo que salga a un apartado para agregar gaseosas...". 
            // Si sí eligió combo, pasa a adicionales.
        } else if (step === 'bebidas') {
            setStep('adicionales');
        } else if (step === 'adicionales') {
            finishAndGoToCheckout();
        }
    };

    const handleAcceptCombo = () => {
        if (!selectedDrinkForCombo) {
            alert("Por favor selecciona una bebida para tu combo.");
            return;
        }
        // Agregamos el "combo" al carrito usando un id temporal y el nombre de la bebida
        const comboItem = {
            id: `combo-${Date.now()}`,
            name: `Combo Upgrade (Papas + ${selectedDrinkForCombo.name})`,
            price: COMBO_UPGRADE_PRICE,
            imageURL: '',
            category: 'combo_system'
        };
        // Lo agregamos tantas veces como se indicó
        for (let i = 0; i < tempCombosQty; i++) {
            addItem(comboItem);
        }
        // Como aceptó combo, pasa directo a adicionales
        setStep('adicionales');
    };

    const handleRejectCombo = () => {
        // No quiso combo, le ofrecemos bebidas sueltas
        setStep('bebidas');
    };

    const finishAndGoToCheckout = () => {
        // Agregar las bebidas sueltas al carrito
        tempBebidas.forEach(item => {
            for (let i = 0; i < item.qty; i++) {
                addItem(item.product);
            }
        });

        // Agregar los adicionales al carrito
        tempAdicionales.forEach(item => {
            for (let i = 0; i < item.qty; i++) {
                addItem(item.product);
            }
        });

        setIsCrossSellingOpen(false);
        navigate('/checkout');
    };

    const toggleTempItem = (product, list, setList, add) => {
        const existing = list.find(item => item.product.id === product.id);
        if (add) {
            if (existing) {
                setList(list.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
            } else {
                setList([...list, { product, qty: 1 }]);
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setList(list.map(i => i.product.id === product.id ? { ...i, qty: i.qty - 1 } : i));
                } else {
                    setList(list.filter(i => i.product.id !== product.id));
                }
            }
        }
    };

    if (!isCrossSellingOpen) return null;

    return (
        <Modal isOpen={isCrossSellingOpen} onClose={handleClose} title="Completa tu pedido" size="md">
            <div className="cross-selling-container">
                {/* --- PASO: COMBOS --- */}
                {step === 'combos' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🍟 + 🥤</div>
                        <h3 className="cs-title">¿Agrandar a Combo?</h3>
                        <p className="cs-desc">Agrega papas fritas y bebida a tus hamburguesas por solo <strong>${COMBO_UPGRADE_PRICE.toLocaleString('es-CO')} c/u</strong>.</p>

                        <div className="cs-combo-selection">
                            <label className="cs-label">¿Cuántos combos deseas llevar?</label>
                            <div className="cs-qty-controls">
                                <button className="btn btn-icon btn-ghost" onClick={() => setTempCombosQty(Math.max(1, tempCombosQty - 1))}>
                                    <span className="material-icons-round">remove</span>
                                </button>
                                <span className="cs-qty">{tempCombosQty}</span>
                                <button className="btn btn-icon btn-ghost" onClick={() => setTempCombosQty(Math.min(totalIndividualQty, tempCombosQty + 1))}>
                                    <span className="material-icons-round">add</span>
                                </button>
                            </div>
                            <span className="cs-muted">Máx: {totalIndividualQty} (por tus {totalIndividualQty} hamburguesas)</span>
                        </div>

                        {bebidasList.length > 0 && (
                            <div className="cs-drink-selection">
                                <label className="cs-label">Elige tu bebida para el combo:</label>
                                <div className="cs-drink-grid">
                                    {bebidasList.map(bebida => (
                                        <div
                                            key={bebida.id}
                                            className={`cs-drink-option ${selectedDrinkForCombo?.id === bebida.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedDrinkForCombo(bebida)}
                                        >
                                            <span className="cs-drink-name">{bebida.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="cs-actions">
                            <button className="btn btn-primary btn-lg btn-full" onClick={handleAcceptCombo}>
                                ¡Sí, quiero Combo!
                            </button>
                            <button className="btn btn-ghost btn-full cs-reject-btn" onClick={handleRejectCombo}>
                                No, gracias. Continuar.
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PASO: BEBIDAS SUELTAS --- */}
                {step === 'bebidas' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🥤</div>
                        <h3 className="cs-title">¿Alguna bebida para acompañar?</h3>
                        <p className="cs-desc">Refresca tu pedido con nuestras opciones.</p>

                        <div className="cs-items-list">
                            {bebidasList.length === 0 && <p className="cs-empty">No hay bebidas disponibles.</p>}
                            {bebidasList.map(bebida => {
                                const selected = tempBebidas.find(b => b.product.id === bebida.id);
                                const qty = selected ? selected.qty : 0;
                                return (
                                    <div key={bebida.id} className="cs-item-row">
                                        <div className="cs-item-info">
                                            <span className="cs-item-name">{bebida.name}</span>
                                            <span className="cs-item-price">+${bebida.price.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="cs-item-qty">
                                            {qty > 0 ? (
                                                <>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(bebida, tempBebidas, setTempBebidas, false)}>
                                                        <span className="material-icons-round">remove</span>
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(bebida, tempBebidas, setTempBebidas, true)}>
                                                        <span className="material-icons-round">add</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="btn btn-outline btn-sm" onClick={() => toggleTempItem(bebida, tempBebidas, setTempBebidas, true)}>
                                                    Agregar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="cs-actions single-action">
                            <button className="btn btn-primary btn-lg btn-full" onClick={proceedToNext}>
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PASO: ADICIONALES --- */}
                {step === 'adicionales' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🧀</div>
                        <h3 className="cs-title">¡Hazlo más delicioso!</h3>
                        <p className="cs-desc">¿Quieres agregar un toque extra a tu pedido?</p>

                        <div className="cs-items-list">
                            {adicionalesList.length === 0 && <p className="cs-empty">No hay adicionales disponibles.</p>}
                            {adicionalesList.map(adicional => {
                                const selected = tempAdicionales.find(a => a.product.id === adicional.id);
                                const qty = selected ? selected.qty : 0;
                                return (
                                    <div key={adicional.id} className="cs-item-row">
                                        <div className="cs-item-info">
                                            <span className="cs-item-name">{adicional.name}</span>
                                            <span className="cs-item-price">+${adicional.price.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="cs-item-qty">
                                            {qty > 0 ? (
                                                <>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(adicional, tempAdicionales, setTempAdicionales, false)}>
                                                        <span className="material-icons-round">remove</span>
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(adicional, tempAdicionales, setTempAdicionales, true)}>
                                                        <span className="material-icons-round">add</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="btn btn-outline btn-sm" onClick={() => toggleTempItem(adicional, tempAdicionales, setTempAdicionales, true)}>
                                                    Agregar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="cs-actions single-action">
                            <button className="btn btn-success btn-lg btn-full cs-finish-btn" onClick={proceedToNext}>
                                <span className="material-icons-round">payment</span>
                                Ir a Pagar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
