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
    const bebidasFamiliaresList = useMemo(() => products.filter(p => p.category === 'bebidas_familiares' && p.available), [products]);
    const adicionalesList = useMemo(() => products.filter(p => p.category === 'adicionales' && p.available), [products]);

    const hasIndividualItems = useMemo(() => {
        return items.some(cartItem => {
            const productInfo = products.find(p => p.id === cartItem.productId);
            return productInfo && productInfo.category === 'individual';
        });
    }, [items, products]);

    const hasFamiliarItems = useMemo(() => {
        return items.some(cartItem => {
            const productInfo = products.find(p => p.id === cartItem.productId);
            return productInfo && productInfo.category === 'familiar';
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

    // 'combos' | 'bebidas' | 'bebidas_familiares' | 'adicionales'
    const [step, setStep] = useState('combos');

    // Estado para selecciones temporales antes de pasarlas al carrito
    const [tempCombosQty, setTempCombosQty] = useState(0);
    const [selectedComboDrinks, setSelectedComboDrinks] = useState([]); // Array de objetos { product, qty }
    const [tempBebidas, setTempBebidas] = useState([]); // Array de objetos { product, qty }
    const [tempBebidasFamiliares, setTempBebidasFamiliares] = useState([]); // Array de objetos { product, qty }
    const [tempAdicionales, setTempAdicionales] = useState([]);

    useEffect(() => {
        if (isCrossSellingOpen) {
            if (hasIndividualItems) {
                setStep('combos');
                setTempCombosQty(0);
            } else if (hasFamiliarItems) {
                setStep('bebidas_familiares');
            } else {
                setStep('adicionales');
            }
            setSelectedComboDrinks([]);
            setTempBebidas([]);
            setTempBebidasFamiliares([]);
            setTempAdicionales([]);
        }
    }, [isCrossSellingOpen, hasIndividualItems, hasFamiliarItems]);

    const totalComboDrinks = selectedComboDrinks.reduce((acc, curr) => acc + curr.qty, 0);

    const handleReduceCombosQty = () => {
        const newQty = Math.max(0, tempCombosQty - 1);
        setTempCombosQty(newQty);

        if (totalComboDrinks > newQty) {
            let toRemove = totalComboDrinks - newQty;
            const newSelected = [...selectedComboDrinks];
            while (toRemove > 0 && newSelected.length > 0) {
                let last = newSelected[newSelected.length - 1];
                if (last.qty > toRemove) {
                    last.qty -= toRemove;
                    toRemove = 0;
                } else {
                    toRemove -= last.qty;
                    newSelected.pop();
                }
            }
            setSelectedComboDrinks(newSelected);
        }
    };

    const toggleComboDrink = (bebida, add) => {
        const existing = selectedComboDrinks.find(item => item.product.id === bebida.id);

        if (add) {
            if (tempCombosQty === 1) {
                setSelectedComboDrinks([{ product: bebida, qty: 1 }]);
                return;
            }
            if (totalComboDrinks >= tempCombosQty) return;

            if (existing) {
                setSelectedComboDrinks(selectedComboDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
            } else {
                setSelectedComboDrinks([...selectedComboDrinks, { product: bebida, qty: 1 }]);
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setSelectedComboDrinks(selectedComboDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                } else {
                    setSelectedComboDrinks(selectedComboDrinks.filter(i => i.product.id !== bebida.id));
                }
            }
        }
    };

    const handleClose = () => {
        setIsCrossSellingOpen(false);
    };

    const proceedToNext = () => {
        if (step === 'bebidas') {
            if (hasFamiliarItems) setStep('bebidas_familiares');
            else setStep('adicionales');
        } else if (step === 'bebidas_familiares') {
            setStep('adicionales');
        } else if (step === 'adicionales') {
            finishAndGoToCheckout();
        }
    };

    const handleComboAction = () => {
        if (tempCombosQty === 0) {
            setStep('bebidas'); // Si no lleva combo, pasamos a ofrecer bebidas individuales
            return;
        }

        if (totalComboDrinks !== tempCombosQty) {
            alert(`Por favor selecciona las ${tempCombosQty} bebidas para tus combos. Te faltan ${tempCombosQty - totalComboDrinks}.`);
            return;
        }

        // Agregamos los combos al carrito
        selectedComboDrinks.forEach(drinkItem => {
            for (let i = 0; i < drinkItem.qty; i++) {
                const comboItem = {
                    id: `combo-${Date.now()}-${Math.random()}`,
                    name: `Combo Upgrade (Papas + ${drinkItem.product.name})`,
                    price: COMBO_UPGRADE_PRICE,
                    imageURL: drinkItem.product.imageURL || '',
                    category: 'combo_system'
                };
                addItem(comboItem);
            }
        });

        if (hasFamiliarItems) setStep('bebidas_familiares');
        else setStep('adicionales');
    };

    const finishAndGoToCheckout = () => {
        // Agregar las bebidas sueltas al carrito
        tempBebidas.forEach(item => {
            for (let i = 0; i < item.qty; i++) {
                addItem(item.product);
            }
        });

        // Agregar las bebidas familiares al carrito
        tempBebidasFamiliares.forEach(item => {
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
                                <button className="btn btn-icon btn-ghost" onClick={handleReduceCombosQty}>
                                    <span className="material-icons-round">remove</span>
                                </button>
                                <span className="cs-qty">{tempCombosQty}</span>
                                <button className="btn btn-icon btn-ghost" onClick={() => setTempCombosQty(tempCombosQty + 1)}>
                                    <span className="material-icons-round">add</span>
                                </button>
                            </div>
                        </div>

                        {tempCombosQty > 0 && bebidasList.length > 0 && (
                            <div className="cs-drink-selection fade-in">
                                <label className="cs-label">
                                    Elige tu bebida para los combos:
                                    {totalComboDrinks < tempCombosQty && <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>Faltan {tempCombosQty - totalComboDrinks} por elegir</span>}
                                </label>
                                <div className="cs-drink-grid">
                                    {bebidasList.map(bebida => {
                                        const selected = selectedComboDrinks.find(d => d.product.id === bebida.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div
                                                key={bebida.id}
                                                className={`cs-drink-option ${qty > 0 ? 'selected' : ''}`}
                                                onClick={() => toggleComboDrink(bebida, true)}
                                            >
                                                {bebida.imageURL ? (
                                                    <img src={bebida.imageURL} alt={bebida.name} className="cs-drink-img" />
                                                ) : (
                                                    <span className="material-icons-round cs-drink-icon">local_drink</span>
                                                )}
                                                <span className="cs-drink-name">{bebida.name}</span>
                                                {qty > 0 && tempCombosQty > 1 && (
                                                    <div className="cs-drink-qty-mini fade-in" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', borderRadius: '20px', padding: '2px 6px', marginTop: '6px' }}>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrink(bebida, false)} style={{ width: 24, height: 24, minHeight: 0 }}>
                                                            <span className="material-icons-round" style={{ fontSize: 16 }}>remove</span>
                                                        </button>
                                                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{qty}</span>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrink(bebida, true)} disabled={totalComboDrinks >= tempCombosQty} style={{ width: 24, height: 24, minHeight: 0 }}>
                                                            <span className="material-icons-round" style={{ fontSize: 16 }}>add</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="cs-actions single-action" style={{ marginTop: 'var(--spacing-md)' }}>
                            <button className={`btn btn-lg btn-full ${tempCombosQty > 0 ? 'btn-primary' : 'btn-outline'}`} onClick={handleComboAction}>
                                {tempCombosQty > 0 ? '¡Agregar Combos!' : 'Continuar sin combo'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PASO: BEBIDAS SUELTAS --- */}
                {step === 'bebidas' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🥤</div>
                        <h3 className="cs-title">¿Bebidas adicionales?</h3>
                        <p className="cs-desc">Refresca tu pedido individual con nuestras gaseosas y jugos.</p>

                        <div className="cs-items-list">
                            {bebidasList.length === 0 && <p className="cs-empty">No hay bebidas individuales disponibles.</p>}
                            {bebidasList.map(bebida => {
                                const selected = tempBebidas.find(b => b.product.id === bebida.id);
                                const qty = selected ? selected.qty : 0;
                                return (
                                    <div key={bebida.id} className="cs-item-row">
                                        {bebida.imageURL ? (
                                            <img src={bebida.imageURL} alt={bebida.name} className="cs-item-image" />
                                        ) : (
                                            <div className="cs-item-image-placeholder">
                                                <span className="material-icons-round">local_drink</span>
                                            </div>
                                        )}
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

                {/* --- PASO: BEBIDAS FAMILIARES --- */}
                {step === 'bebidas_familiares' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🍾</div>
                        <h3 className="cs-title">¡Para compartir en familia!</h3>
                        <p className="cs-desc">Acompaña tus combos familiares con la bebida ideal.</p>

                        <div className="cs-items-list">
                            {bebidasFamiliaresList.length === 0 && <p className="cs-empty">No hay bebidas familiares disponibles.</p>}
                            {bebidasFamiliaresList.map(bebida => {
                                const selected = tempBebidasFamiliares.find(b => b.product.id === bebida.id);
                                const qty = selected ? selected.qty : 0;
                                return (
                                    <div key={bebida.id} className="cs-item-row">
                                        {bebida.imageURL ? (
                                            <img src={bebida.imageURL} alt={bebida.name} className="cs-item-image" />
                                        ) : (
                                            <div className="cs-item-image-placeholder">
                                                <span className="material-icons-round">liquor</span>
                                            </div>
                                        )}
                                        <div className="cs-item-info">
                                            <span className="cs-item-name">{bebida.name}</span>
                                            <span className="cs-item-price">+${bebida.price.toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="cs-item-qty">
                                            {qty > 0 ? (
                                                <>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(bebida, tempBebidasFamiliares, setTempBebidasFamiliares, false)}>
                                                        <span className="material-icons-round">remove</span>
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleTempItem(bebida, tempBebidasFamiliares, setTempBebidasFamiliares, true)}>
                                                        <span className="material-icons-round">add</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="btn btn-outline btn-sm" onClick={() => toggleTempItem(bebida, tempBebidasFamiliares, setTempBebidasFamiliares, true)}>
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
                                        {adicional.imageURL ? (
                                            <img src={adicional.imageURL} alt={adicional.name} className="cs-item-image" />
                                        ) : (
                                            <div className="cs-item-image-placeholder">
                                                <span className="material-icons-round">add_circle</span>
                                            </div>
                                        )}
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
