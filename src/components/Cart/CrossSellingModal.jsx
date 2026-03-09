import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import Modal from '../UI/Modal';
import './CrossSellingModal.css';

const COMBO_OPTIONS = [
    { id: 'combo_pequeno', name: 'Combo Pequeño', description: 'Porción de Papas y Bebida Individual', price: 4000, type: 'individual' },
    { id: 'combo_mediano', name: 'Combo Mediano', description: 'Porción de papas grande y Bebida Individual', price: 5000, type: 'individual' },
    { id: 'combo_grande', name: 'Combo Grande', description: 'Porción de papas grande y Bebida Familiar', price: 7000, type: 'familiar' },
];

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

    const totalFamiliarQty = useMemo(() => {
        return items.reduce((acc, cartItem) => {
            const productInfo = products.find(p => p.id === cartItem.productId);
            if (productInfo && productInfo.category === 'familiar') {
                return acc + cartItem.quantity;
            }
            return acc;
        }, 0);
    }, [items, products]);

    // 'combos' | 'bebidas' | 'sabores_familiar' | 'adicionales'
    const [step, setStep] = useState('combos');

    // Estado para selecciones temporales antes de pasarlas al carrito
    const [selectedCombos, setSelectedCombos] = useState([]); // Array de objetos { combo, qty }
    const [selectedComboDrinksInd, setSelectedComboDrinksInd] = useState([]);
    const [selectedComboDrinksFam, setSelectedComboDrinksFam] = useState([]);
    const [tempBebidas, setTempBebidas] = useState([]); // Array de objetos { product, qty }
    const [selectedFamiliarDrinks, setSelectedFamiliarDrinks] = useState([]); // Array de objetos { product, qty }
    const [tempAdicionales, setTempAdicionales] = useState([]);

    useEffect(() => {
        if (isCrossSellingOpen) {
            if (hasIndividualItems) {
                setStep('combos');
            } else if (hasFamiliarItems) {
                setStep('sabores_familiar');
            } else {
                setStep('adicionales');
            }
            setSelectedCombos([]);
            setSelectedComboDrinksInd([]);
            setSelectedComboDrinksFam([]);
            setTempBebidas([]);
            setSelectedFamiliarDrinks([]);
            setTempAdicionales([]);
        }
    }, [isCrossSellingOpen, hasIndividualItems, hasFamiliarItems]);

    const totalCombosSelected = selectedCombos.reduce((acc, curr) => acc + curr.qty, 0);
    const totalIndCombos = selectedCombos.filter(c => c.combo.type === 'individual').reduce((acc, curr) => acc + curr.qty, 0);
    const totalFamCombos = selectedCombos.filter(c => c.combo.type === 'familiar').reduce((acc, curr) => acc + curr.qty, 0);

    const totalSelectedIndDrinks = selectedComboDrinksInd.reduce((acc, curr) => acc + curr.qty, 0);
    const totalSelectedFamDrinks = selectedComboDrinksFam.reduce((acc, curr) => acc + curr.qty, 0);

    useEffect(() => {
        if (totalSelectedIndDrinks > totalIndCombos) {
            let toRemove = totalSelectedIndDrinks - totalIndCombos;
            const newSelected = [...selectedComboDrinksInd];
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
            setSelectedComboDrinksInd(newSelected);
        }
    }, [totalIndCombos, totalSelectedIndDrinks, selectedComboDrinksInd]);

    useEffect(() => {
        if (totalSelectedFamDrinks > totalFamCombos) {
            let toRemove = totalSelectedFamDrinks - totalFamCombos;
            const newSelected = [...selectedComboDrinksFam];
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
            setSelectedComboDrinksFam(newSelected);
        }
    }, [totalFamCombos, totalSelectedFamDrinks, selectedComboDrinksFam]);

    const toggleCombo = (combo, add) => {
        const existing = selectedCombos.find(c => c.combo.id === combo.id);
        if (add) {
            if (existing) {
                setSelectedCombos(selectedCombos.map(c => c.combo.id === combo.id ? { ...c, qty: c.qty + 1 } : c));
            } else {
                setSelectedCombos([...selectedCombos, { combo, qty: 1 }]);
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setSelectedCombos(selectedCombos.map(c => c.combo.id === combo.id ? { ...c, qty: c.qty - 1 } : c));
                } else {
                    setSelectedCombos(selectedCombos.filter(c => c.combo.id !== combo.id));
                }
            }
        }
    };

    const toggleComboDrinkGeneric = (bebida, add, isInd) => {
        const list = isInd ? selectedComboDrinksInd : selectedComboDrinksFam;
        const setList = isInd ? setSelectedComboDrinksInd : setSelectedComboDrinksFam;
        const totalMax = isInd ? totalIndCombos : totalFamCombos;
        const currentTotal = isInd ? totalSelectedIndDrinks : totalSelectedFamDrinks;

        const existing = list.find(item => item.product.id === bebida.id);

        if (add) {
            if (totalMax === 1) {
                setList([{ product: bebida, qty: 1 }]);
                return;
            }
            if (currentTotal >= totalMax) return;

            if (existing) {
                setList(list.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
            } else {
                setList([...list, { product: bebida, qty: 1 }]);
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setList(list.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                } else {
                    setList(list.filter(i => i.product.id !== bebida.id));
                }
            }
        }
    };

    const handleClose = () => {
        setIsCrossSellingOpen(false);
    };

    const proceedToNext = () => {
        if (step === 'bebidas') {
            if (hasFamiliarItems) setStep('sabores_familiar');
            else setStep('adicionales');
        } else if (step === 'adicionales') {
            finishAndGoToCheckout();
        }
    };

    const handleComboAction = () => {
        if (totalCombosSelected === 0) {
            setStep('bebidas'); // Si no lleva combo, pasamos a ofrecer bebidas individuales
            return;
        }

        if (totalSelectedIndDrinks !== totalIndCombos) {
            alert(`Por favor selecciona las ${totalIndCombos} bebidas individuales correspondientes a tus combos.`);
            return;
        }

        if (totalSelectedFamDrinks !== totalFamCombos) {
            alert(`Por favor selecciona las ${totalFamCombos} bebidas familiares correspondientes a tus Combos Grandes.`);
            return;
        }

        // Expanded lists of drinks to match combos
        let flatIndDrinks = [];
        selectedComboDrinksInd.forEach(d => { for (let i = 0; i < d.qty; i++) flatIndDrinks.push(d.product); });

        let flatFamDrinks = [];
        selectedComboDrinksFam.forEach(d => { for (let i = 0; i < d.qty; i++) flatFamDrinks.push(d.product); });

        selectedCombos.forEach(c => {
            for (let i = 0; i < c.qty; i++) {
                const isInd = c.combo.type === 'individual';
                const drinkArr = isInd ? flatIndDrinks : flatFamDrinks;
                const drink = drinkArr.pop(); // Take one matching drink

                addItem({
                    id: `combo-${Date.now()}-${Math.random()}`,
                    name: `${c.combo.name} (+ ${drink?.name || 'Bebida'})`,
                    price: c.combo.price,
                    imageURL: drink?.imageURL || '',
                    category: 'combo_system'
                });
            }
        });

        if (hasFamiliarItems) setStep('sabores_familiar');
        else setStep('adicionales');
    };

    const handleFamiliarAction = () => {
        const totalSelectedFamiliar = selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0);
        if (totalSelectedFamiliar !== totalFamiliarQty) {
            alert(`Por favor selecciona las ${totalFamiliarQty} bebidas incluidas de tus menús familiares. Te faltan ${totalFamiliarQty - totalSelectedFamiliar}.`);
            return;
        }

        // Agregamos las bebidas gratis asociadas al menú familiar
        selectedFamiliarDrinks.forEach(drinkItem => {
            for (let i = 0; i < drinkItem.qty; i++) {
                const includedDrink = {
                    id: `included-${Date.now()}-${Math.random()}`,
                    name: `Bebida Familiar Incluida (${drinkItem.product.name})`,
                    price: 0,
                    imageURL: drinkItem.product.imageURL || '',
                    category: 'combo_system'
                };
                addItem(includedDrink);
            }
        });

        setStep('adicionales');
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

    const toggleFamiliarDrink = (bebida, add) => {
        const existing = selectedFamiliarDrinks.find(item => item.product.id === bebida.id);
        const totalSelectedFamiliar = selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0);

        if (add) {
            if (totalFamiliarQty === 1) {
                setSelectedFamiliarDrinks([{ product: bebida, qty: 1 }]);
                return;
            }
            if (totalSelectedFamiliar >= totalFamiliarQty) return;

            if (existing) {
                setSelectedFamiliarDrinks(selectedFamiliarDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
            } else {
                setSelectedFamiliarDrinks([...selectedFamiliarDrinks, { product: bebida, qty: 1 }]);
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setSelectedFamiliarDrinks(selectedFamiliarDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                } else {
                    setSelectedFamiliarDrinks(selectedFamiliarDrinks.filter(i => i.product.id !== bebida.id));
                }
            }
        }
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
                        <p className="cs-desc">Mejora tus hamburguesas individuales con nuestras opciones de combo.</p>

                        <div className="cs-items-list" style={{ marginTop: 'var(--spacing-md)' }}>
                            {COMBO_OPTIONS.map(combo => {
                                const selected = selectedCombos.find(c => c.combo.id === combo.id);
                                const qty = selected ? selected.qty : 0;
                                return (
                                    <div key={combo.id} className="cs-item-row" style={{ alignItems: 'flex-start' }}>
                                        <div className="cs-item-info">
                                            <span className="cs-item-name">{combo.name}</span>
                                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>{combo.description}</span>
                                            <span className="cs-item-price" style={{ marginTop: '4px' }}>+${combo.price.toLocaleString('es-CO')} c/u</span>
                                        </div>
                                        <div className="cs-item-qty" style={{ alignSelf: 'center' }}>
                                            {qty > 0 ? (
                                                <>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleCombo(combo, false)}>
                                                        <span className="material-icons-round">remove</span>
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleCombo(combo, true)}>
                                                        <span className="material-icons-round">add</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="btn btn-outline btn-sm" onClick={() => toggleCombo(combo, true)}>
                                                    Agregar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalIndCombos > 0 && bebidasList.length > 0 && (
                            <div className="cs-drink-selection fade-in" style={{ marginTop: 'var(--spacing-md)' }}>
                                <label className="cs-label">
                                    Bebidas para tus combos Pequeños/Medianos ({totalSelectedIndDrinks}/{totalIndCombos}):
                                    {totalSelectedIndDrinks < totalIndCombos && <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>Faltan {totalIndCombos - totalSelectedIndDrinks} por elegir</span>}
                                </label>
                                <div className="cs-drink-grid">
                                    {bebidasList.map(bebida => {
                                        const selected = selectedComboDrinksInd.find(d => d.product.id === bebida.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={bebida.id} className={`cs-drink-option ${qty > 0 ? 'selected' : ''}`} onClick={() => toggleComboDrinkGeneric(bebida, true, true)}>
                                                {bebida.imageURL ? <img src={bebida.imageURL} alt={bebida.name} className="cs-drink-img" /> : <span className="material-icons-round cs-drink-icon">local_drink</span>}
                                                <span className="cs-drink-name">{bebida.name}</span>
                                                {qty > 0 && totalIndCombos > 1 && (
                                                    <div className="cs-drink-qty-mini fade-in" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', borderRadius: '20px', padding: '2px 6px', marginTop: '6px' }}>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrinkGeneric(bebida, false, true)} style={{ width: 24, height: 24, minHeight: 0 }}><span className="material-icons-round" style={{ fontSize: 16 }}>remove</span></button>
                                                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{qty}</span>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrinkGeneric(bebida, true, true)} disabled={totalSelectedIndDrinks >= totalIndCombos} style={{ width: 24, height: 24, minHeight: 0 }}><span className="material-icons-round" style={{ fontSize: 16 }}>add</span></button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {totalFamCombos > 0 && bebidasFamiliaresList.length > 0 && (
                            <div className="cs-drink-selection fade-in" style={{ marginTop: 'var(--spacing-md)' }}>
                                <label className="cs-label">
                                    Bebidas para tus combos Grandes ({totalSelectedFamDrinks}/{totalFamCombos}):
                                    {totalSelectedFamDrinks < totalFamCombos && <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>Faltan {totalFamCombos - totalSelectedFamDrinks} por elegir</span>}
                                </label>
                                <div className="cs-drink-grid">
                                    {bebidasFamiliaresList.map(bebida => {
                                        const selected = selectedComboDrinksFam.find(d => d.product.id === bebida.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={bebida.id} className={`cs-drink-option ${qty > 0 ? 'selected' : ''}`} onClick={() => toggleComboDrinkGeneric(bebida, true, false)}>
                                                {bebida.imageURL ? <img src={bebida.imageURL} alt={bebida.name} className="cs-drink-img" /> : <span className="material-icons-round cs-drink-icon">liquor</span>}
                                                <span className="cs-drink-name">{bebida.name}</span>
                                                {qty > 0 && totalFamCombos > 1 && (
                                                    <div className="cs-drink-qty-mini fade-in" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', borderRadius: '20px', padding: '2px 6px', marginTop: '6px' }}>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrinkGeneric(bebida, false, false)} style={{ width: 24, height: 24, minHeight: 0 }}><span className="material-icons-round" style={{ fontSize: 16 }}>remove</span></button>
                                                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{qty}</span>
                                                        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleComboDrinkGeneric(bebida, true, false)} disabled={totalSelectedFamDrinks >= totalFamCombos} style={{ width: 24, height: 24, minHeight: 0 }}><span className="material-icons-round" style={{ fontSize: 16 }}>add</span></button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="cs-actions single-action" style={{ marginTop: 'var(--spacing-md)' }}>
                            <button className={`btn btn-lg btn-full ${totalCombosSelected > 0 ? 'btn-primary' : 'btn-outline'}`} onClick={handleComboAction}>
                                {totalCombosSelected > 0 ? '¡Agregar Combos!' : 'Continuar sin combo'}
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
                            {[...bebidasList, ...bebidasFamiliaresList].length === 0 && <p className="cs-empty">No hay bebidas disponibles.</p>}
                            {[...bebidasList, ...bebidasFamiliaresList].map(bebida => {
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

                {/* --- PASO: SABORES BEBIDAS FAMILIARES --- */}
                {step === 'sabores_familiar' && (
                    <div className="cs-step fade-in">
                        <div className="cs-icon-header">🍾</div>
                        <h3 className="cs-title">Sabor de tus gaseosas grandes</h3>
                        <p className="cs-desc">Tus menús familiares incluyen gaseosa. Por favor elige los sabores.</p>

                        <div className="cs-drink-selection fade-in">
                            <label className="cs-label">
                                Elige {totalFamiliarQty} {totalFamiliarQty === 1 ? 'sabor' : 'sabores'}:
                                {selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0) < totalFamiliarQty && <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>Faltan {totalFamiliarQty - selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0)} por elegir</span>}
                            </label>

                            {bebidasFamiliaresList.length === 0 && (
                                <p className="cs-empty">No hay sabores familiares disponibles actualmente.</p>
                            )}

                            <div className="cs-drink-grid">
                                {bebidasFamiliaresList.map(bebida => {
                                    const selected = selectedFamiliarDrinks.find(d => d.product.id === bebida.id);
                                    const qty = selected ? selected.qty : 0;
                                    const currTotalFamiliarSelected = selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0);

                                    return (
                                        <div
                                            key={bebida.id}
                                            className={`cs-drink-option ${qty > 0 ? 'selected' : ''}`}
                                            onClick={() => toggleFamiliarDrink(bebida, true)}
                                        >
                                            {bebida.imageURL ? (
                                                <img src={bebida.imageURL} alt={bebida.name} className="cs-drink-img" />
                                            ) : (
                                                <span className="material-icons-round cs-drink-icon">liquor</span>
                                            )}
                                            <span className="cs-drink-name">{bebida.name}</span>

                                            {qty > 0 && totalFamiliarQty > 1 && (
                                                <div className="cs-drink-qty-mini fade-in" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', borderRadius: '20px', padding: '2px 6px', marginTop: '6px' }}>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleFamiliarDrink(bebida, false)} style={{ width: 24, height: 24, minHeight: 0 }}>
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>remove</span>
                                                    </button>
                                                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>{qty}</span>
                                                    <button className="btn btn-icon btn-sm btn-ghost" onClick={() => toggleFamiliarDrink(bebida, true)} disabled={currTotalFamiliarSelected >= totalFamiliarQty} style={{ width: 24, height: 24, minHeight: 0 }}>
                                                        <span className="material-icons-round" style={{ fontSize: 16 }}>add</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="cs-actions single-action" style={{ marginTop: 'var(--spacing-md)' }}>
                            <button className="btn btn-primary btn-lg btn-full" onClick={handleFamiliarAction}>
                                ¡Elegir Sabores!
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
