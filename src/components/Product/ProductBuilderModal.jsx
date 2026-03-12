import { useState, useMemo, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { showToast } from '../../utils/notifications';
import Modal from '../UI/Modal';
import './ProductBuilderModal.css';

const COMBO_OPTIONS = [
    { id: 'combo_pequeno', name: 'Combo Pequeño', description: 'Porción de Papas + Gaseosa Pequeña', price: 4000, drinkType: 'pequena' },
    { id: 'combo_mediano', name: 'Combo Mediano', description: 'Porción de Papas Grande + Gaseosa Pequeña', price: 5000, drinkType: 'pequena' },
    { id: 'combo_grande', name: 'Combo Grande', description: 'Porción de Papas + Gaseosa Mediana', price: 6000, drinkType: 'mediana' },
    { id: 'combo_super', name: 'Combo Super', description: 'Porción de Papas Grande + Gaseosa Mediana', price: 7000, drinkType: 'mediana' },
];

export default function ProductBuilderModal({ isOpen, onClose, product }) {
    const { addItem } = useCart();
    const { products } = useProducts();

    // Filtramos productos por las nuevas categorías de bebidas y adicionales
    const bebidasPequenasList = useMemo(() => products.filter(p => p.category === 'bebidas_pequenas' && p.available), [products]);
    const bebidasMedianasList = useMemo(() => products.filter(p => p.category === 'bebidas_medianas' && p.available), [products]);
    const bebidasGrandesList = useMemo(() => products.filter(p => p.category === 'bebidas_grandes' && p.available), [products]);
    const adicionalesList = useMemo(() => products.filter(p => p.category === 'adicionales' && p.available), [products]);

    // Estado base
    const [quantity, setQuantity] = useState(1);

    // Selecciones temporales guiadas (Combos y sus bebidas)
    const [selectedCombos, setSelectedCombos] = useState([]); // Array de objetos { combo, qty }
    const [selectedComboDrinksPeq, setSelectedComboDrinksPeq] = useState([]);
    const [selectedComboDrinksMed, setSelectedComboDrinksMed] = useState([]);

    // Selecciones temporales familiares
    const [selectedFamiliarDrinks, setSelectedFamiliarDrinks] = useState([]); // Array de objetos { product, qty }

    // Selecciones libres
    const [tempBebidas, setTempBebidas] = useState([]); // Array de objetos { product, qty }
    const [tempAdicionales, setTempAdicionales] = useState([]);

    // Manejo de Pasos (Wizard)
    const [stepHistory, setStepHistory] = useState(['info']);
    const currentStep = stepHistory[stepHistory.length - 1];

    const goToStep = (nextStep) => {
        setStepHistory(prev => [...prev, nextStep]);
    };

    const goBack = () => {
        if (stepHistory.length > 1) {
            setStepHistory(prev => prev.slice(0, -1));
        } else {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelectedCombos([]);
            setSelectedComboDrinksPeq([]);
            setSelectedComboDrinksMed([]);
            setSelectedFamiliarDrinks([]);
            setTempBebidas([]);
            setTempAdicionales([]);
            setStepHistory(['info']);
        }
    }, [isOpen, product]);

    const isIndividual = product?.category === 'individual';
    const isFamiliar = product?.category === 'familiar';

    // Totales requeridos basados en combos
    const totalPeqCombos = selectedCombos.filter(c => c.combo.drinkType === 'pequena').reduce((acc, curr) => acc + curr.qty, 0);
    const totalMedCombos = selectedCombos.filter(c => c.combo.drinkType === 'mediana').reduce((acc, curr) => acc + curr.qty, 0);

    const totalSelectedPeqDrinks = selectedComboDrinksPeq.reduce((acc, curr) => acc + curr.qty, 0);
    const totalSelectedMedDrinks = selectedComboDrinksMed.reduce((acc, curr) => acc + curr.qty, 0);

    // Totales requeridos para familiares
    const totalFamiliarQty = isFamiliar ? quantity : 0;
    const totalSelectedFamiliarDrinks = selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0);

    // Efectos para auto-ajustar bebidas si el usuario reduce la cantidad de combos
    useEffect(() => {
        if (!isOpen) return;
        if (totalSelectedPeqDrinks > totalPeqCombos) {
            let toRemove = totalSelectedPeqDrinks - totalPeqCombos;
            const newSelected = [...selectedComboDrinksPeq];
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
            setSelectedComboDrinksPeq(newSelected);
        }
    }, [totalPeqCombos, totalSelectedPeqDrinks, selectedComboDrinksPeq, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (totalSelectedMedDrinks > totalMedCombos) {
            let toRemove = totalSelectedMedDrinks - totalMedCombos;
            const newSelected = [...selectedComboDrinksMed];
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
            setSelectedComboDrinksMed(newSelected);
        }
    }, [totalMedCombos, totalSelectedMedDrinks, selectedComboDrinksMed, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (totalSelectedFamiliarDrinks > totalFamiliarQty) {
            let toRemove = totalSelectedFamiliarDrinks - totalFamiliarQty;
            const newSelected = [...selectedFamiliarDrinks];
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
            setSelectedFamiliarDrinks(newSelected);
        }
    }, [totalFamiliarQty, totalSelectedFamiliarDrinks, selectedFamiliarDrinks, isOpen]);

    if (!isOpen || !product) return null;


    // Handlers genéricos para incrementar/decrementar
    const toggleItemQty = (item, list, setList, add, maxLimit) => {
        const existing = list.find(i => (i.product?.id || i.combo?.id) === (item.product?.id || item.combo?.id || item.id));
        const itemId = item.id || item.product?.id || item.combo?.id;

        if (add) {
            const currentTotal = list.reduce((acc, curr) => acc + curr.qty, 0);
            if (maxLimit !== undefined && currentTotal >= maxLimit) return;

            if (existing) {
                setList(list.map(i => (i.combo?.id || i.product?.id) === itemId ? { ...i, qty: i.qty + 1 } : i));
            } else {
                setList([...list, { [item.price ? 'product' : 'combo']: item, qty: 1 }]); // Simplificación, ajustamos según el tipo guardado real
            }
        } else {
            if (existing) {
                if (existing.qty > 1) {
                    setList(list.map(i => (i.combo?.id || i.product?.id) === itemId ? { ...i, qty: i.qty - 1 } : i));
                } else {
                    setList(list.filter(i => (i.combo?.id || i.product?.id) !== itemId));
                }
            }
        }
    };

    const handleComboToggle = (combo, add) => {
        // Para asegurar que guardamos { combo, qty } y no { product, qty }
        const existing = selectedCombos.find(c => c.combo.id === combo.id);
        if (add) {
            if (existing) setSelectedCombos(selectedCombos.map(c => c.combo.id === combo.id ? { ...c, qty: c.qty + 1 } : c));
            else setSelectedCombos([...selectedCombos, { combo, qty: 1 }]);
        } else {
            if (existing) {
                if (existing.qty > 1) setSelectedCombos(selectedCombos.map(c => c.combo.id === combo.id ? { ...c, qty: c.qty - 1 } : c));
                else setSelectedCombos(selectedCombos.filter(c => c.combo.id !== combo.id));
            }
        }
    };

    const handleDrinkToggle = (bebida, isPeq, add) => {
        const list = isPeq ? selectedComboDrinksPeq : selectedComboDrinksMed;
        const setList = isPeq ? setSelectedComboDrinksPeq : setSelectedComboDrinksMed;
        const maxLimit = isPeq ? totalPeqCombos : totalMedCombos;

        const existing = list.find(item => item.product.id === bebida.id);
        if (add) {
            const currentTotal = list.reduce((acc, curr) => acc + curr.qty, 0);
            if (currentTotal >= maxLimit) return;
            if (existing) setList(list.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
            else setList([...list, { product: bebida, qty: 1 }]);
        } else {
            if (existing) {
                if (existing.qty > 1) setList(list.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                else setList(list.filter(i => i.product.id !== bebida.id));
            }
        }
    };
    
    // Handlers para libre elección
    const handleTempDrinkToggle = (bebida, add) => {
        const existing = tempBebidas.find(item => item.product.id === bebida.id);
        if (add) {
            if (existing) setTempBebidas(tempBebidas.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
            else setTempBebidas([...tempBebidas, { product: bebida, qty: 1 }]);
        } else {
            if (existing) {
                if (existing.qty > 1) setTempBebidas(tempBebidas.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                else setTempBebidas(tempBebidas.filter(i => i.product.id !== bebida.id));
            }
        }
    };

    const handleTempExtraToggle = (adicional, add) => {
        const existing = tempAdicionales.find(item => item.product.id === adicional.id);
        if (add) {
            if (existing) setTempAdicionales(tempAdicionales.map(i => i.product.id === adicional.id ? { ...i, qty: i.qty + 1 } : i));
            else setTempAdicionales([...tempAdicionales, { product: adicional, qty: 1 }]);
        } else {
            if (existing) {
                if (existing.qty > 1) setTempAdicionales(tempAdicionales.map(i => i.product.id === adicional.id ? { ...i, qty: i.qty - 1 } : i));
                else setTempAdicionales(tempAdicionales.filter(i => i.product.id !== adicional.id));
            }
        }
    };

    const handleFamiliarDrinkToggle = (bebida, add) => {
         const existing = selectedFamiliarDrinks.find(item => item.product.id === bebida.id);
         if (add) {
             const currentTotal = selectedFamiliarDrinks.reduce((acc, curr) => acc + curr.qty, 0);
             if (currentTotal >= totalFamiliarQty) return;
             if (existing) setSelectedFamiliarDrinks(selectedFamiliarDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty + 1 } : i));
             else setSelectedFamiliarDrinks([...selectedFamiliarDrinks, { product: bebida, qty: 1 }]);
         } else {
             if (existing) {
                 if (existing.qty > 1) setSelectedFamiliarDrinks(selectedFamiliarDrinks.map(i => i.product.id === bebida.id ? { ...i, qty: i.qty - 1 } : i));
                 else setSelectedFamiliarDrinks(selectedFamiliarDrinks.filter(i => i.product.id !== bebida.id));
             }
         }
    };

    const handleAddToCart = () => {
        // Validaciones
        if (totalSelectedPeqDrinks !== totalPeqCombos) {
            showToast(`Te faltan ${totalPeqCombos - totalSelectedPeqDrinks} bebidas pequeñas para los combos.`, 'error');
            return;
        }
        if (totalSelectedMedDrinks !== totalMedCombos) {
            showToast(`Te faltan ${totalMedCombos - totalSelectedMedDrinks} bebidas medianas para los combos.`, 'error');
            return;
        }
        if (isFamiliar && totalSelectedFamiliarDrinks < totalFamiliarQty) {
            showToast(`Elige los sabores de las gaseosas incluidas (${totalFamiliarQty - totalSelectedFamiliarDrinks} faltan).`, 'error');
            return;
        }

        // 1. Agregar el producto principal en la cantidad especificada
        for (let i = 0; i < quantity; i++) {
            addItem(product);
        }

        // 2. Agregar los combos elegidos
        let flatPeqDrinks = [];
        selectedComboDrinksPeq.forEach(d => { for (let i = 0; i < d.qty; i++) flatPeqDrinks.push(d.product); });

        let flatMedDrinks = [];
        selectedComboDrinksMed.forEach(d => { for (let i = 0; i < d.qty; i++) flatMedDrinks.push(d.product); });

        selectedCombos.forEach(c => {
            for (let i = 0; i < c.qty; i++) {
                const isPeq = c.combo.drinkType === 'pequena';
                const drinkArr = isPeq ? flatPeqDrinks : flatMedDrinks;
                const drink = drinkArr.pop(); // Sacar una bebida correspondiente

                addItem({
                    id: `combo-${Date.now()}-${Math.random()}`,
                    name: `${c.combo.name} (+ ${drink?.name || 'Bebida'})`,
                    price: c.combo.price,
                    imageURL: drink?.imageURL || '',
                    category: 'combo_system'
                });
            }
        });

        // 3. Agregar bebidas del menú familiar
        selectedFamiliarDrinks.forEach(drinkItem => {
            for (let i = 0; i < drinkItem.qty; i++) {
                addItem({
                    id: `included-${Date.now()}-${Math.random()}`,
                    name: `Bebida Familiar Incluida (${drinkItem.product.name})`,
                    price: 0,
                    imageURL: drinkItem.product.imageURL || '',
                    category: 'combo_system'
                });
            }
        });

        // 4. Agregar bebidas sueltas
        tempBebidas.forEach(item => {
            for (let i = 0; i < item.qty; i++) { addItem(item.product); }
        });

        // 5. Agregar adicionales sueltos
        tempAdicionales.forEach(item => {
            for (let i = 0; i < item.qty; i++) { addItem(item.product); }
        });

        showToast(`${product.name} y adiciones agregadas al carrito`, 'success');
        onClose();
    };

    // Cálculos de subtotal
    const baseTotal = product.price * quantity;
    const combosTotal = selectedCombos.reduce((sum, c) => sum + (c.combo.price * c.qty), 0);
    const bebidasTotal = tempBebidas.reduce((sum, b) => sum + (b.product.price * b.qty), 0);
    const adicionalesTotal = tempAdicionales.reduce((sum, a) => sum + (a.product.price * a.qty), 0);
    const grandTotal = baseTotal + combosTotal + bebidasTotal + adicionalesTotal;

    const categoryIcons = {
        hamburguesas: '🍔', combos: '🍱', acompanantes: '🍟',
        bebidas: '🥤', postres: '🍨'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name} size="md">
            <div className="product-builder">
                
                <div className="pb-sections-container pb-step-container">
                    
                    {currentStep === 'info' && (
                        <div className="pb-step-content slide-in-right">
                            {/* --- SECCIÓN HERO DEL PRODUCTO --- */}
                            <div className="pb-hero">
                                <div className="pb-image-container">
                                    {product.imageURL ? (
                                        <img src={product.imageURL} alt={product.name} loading="lazy" />
                                    ) : (
                                        <div className="pb-placeholder">
                                            <span>{categoryIcons[product.category] || '🍔'}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pb-info">
                                    <p className="pb-desc">{product.description}</p>
                                    <div className="pb-price-row">
                                        <span className="pb-price">${product.price.toLocaleString('es-CO')}</span>
                                    </div>
                                    
                                    <div className="pb-base-qty">
                                        <span>Cantidad a llevar:</span>
                                        <div className="pb-qty-controls">
                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => quantity > 1 && setQuantity(quantity - 1)} disabled={quantity <= 1}>
                                                <span className="material-icons-round">remove</span>
                                            </button>
                                            <span className="pb-qty-val">{quantity}</span>
                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setQuantity(quantity + 1)}>
                                                <span className="material-icons-round">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'combos' && (
                        <div className="pb-step-content slide-in-right">
                            <div className="pb-section">
                                <h3 className="pb-section-title">
                                    <span className="material-icons-round">fastfood</span> 
                                    Elige tus Combos
                                </h3>
                                <div className="pb-list">
                                    {COMBO_OPTIONS.map(combo => {
                                        const selected = selectedCombos.find(c => c.combo.id === combo.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={combo.id} className="pb-item">
                                                <div className="pb-item-info">
                                                    <span className="pb-item-name">{combo.name}</span>
                                                    <span className="pb-item-desc">{combo.description}</span>
                                                    <span className="pb-item-price">+${combo.price.toLocaleString('es-CO')}</span>
                                                </div>
                                                <div className="pb-item-actions">
                                                    {qty > 0 ? (
                                                        <>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleComboToggle(combo, false)}><span className="material-icons-round">remove</span></button>
                                                            <span>{qty}</span>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleComboToggle(combo, true)}><span className="material-icons-round">add</span></button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-outline btn-sm" onClick={() => handleComboToggle(combo, true)}>Agregar</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* BEBIDAS PARA COMBOS PEQUEÑOS */}
                                {totalPeqCombos > 0 && bebidasPequenasList.length > 0 && (
                                    <div className="pb-sub-section fade-in" style={{marginTop: '1rem'}}>
                                        <label className="pb-label">
                                            Elige {totalPeqCombos} bebida(s) para tu(s) Combo(s) Pequeño(s):
                                            {totalSelectedPeqDrinks < totalPeqCombos && <span className="pb-error-text" style={{display: 'block', marginTop: '4px'}}>Faltan {totalPeqCombos - totalSelectedPeqDrinks}</span>}
                                        </label>
                                        <div className="pb-grid">
                                            {bebidasPequenasList.map(bebida => {
                                                const selected = selectedComboDrinksPeq.find(d => d.product.id === bebida.id);
                                                const qty = selected ? selected.qty : 0;
                                                return (
                                                    <div key={bebida.id} className={`pb-grid-item ${qty > 0 ? 'selected' : ''}`} onClick={() => handleDrinkToggle(bebida, true, true)}>
                                                {bebida.imageURL && (
                                                    <div className="pb-grid-img-wrapper">
                                                        <img src={bebida.imageURL} alt={bebida.name} />
                                                    </div>
                                                )}
                                                <span className="pb-grid-name">{bebida.name}</span>
                                                {qty > 0 && totalPeqCombos > 1 && (
                                                            <div className="pb-grid-qty" onClick={e => e.stopPropagation()}>
                                                                <button className="btn btn-icon btn-sm" onClick={() => handleDrinkToggle(bebida, true, false)}><span className="material-icons-round">remove</span></button>
                                                                <span>{qty}</span>
                                                                <button className="btn btn-icon btn-sm" onClick={() => handleDrinkToggle(bebida, true, true)} disabled={totalSelectedPeqDrinks >= totalPeqCombos}><span className="material-icons-round">add</span></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* BEBIDAS PARA COMBOS MEDIANOS */}
                                {totalMedCombos > 0 && bebidasMedianasList.length > 0 && (
                                    <div className="pb-sub-section fade-in" style={{marginTop: '1rem'}}>
                                        <label className="pb-label">
                                            Elige {totalMedCombos} bebida(s) para tu(s) Combo(s) Mediano(s):
                                            {totalSelectedMedDrinks < totalMedCombos && <span className="pb-error-text" style={{display: 'block', marginTop: '4px'}}>Faltan {totalMedCombos - totalSelectedMedDrinks}</span>}
                                        </label>
                                        <div className="pb-grid">
                                            {bebidasMedianasList.map(bebida => {
                                                const selected = selectedComboDrinksMed.find(d => d.product.id === bebida.id);
                                                const qty = selected ? selected.qty : 0;
                                                return (
                                                    <div key={bebida.id} className={`pb-grid-item ${qty > 0 ? 'selected' : ''}`} onClick={() => handleDrinkToggle(bebida, false, true)}>
                                                {bebida.imageURL && (
                                                    <div className="pb-grid-img-wrapper">
                                                        <img src={bebida.imageURL} alt={bebida.name} />
                                                    </div>
                                                )}
                                                <span className="pb-grid-name">{bebida.name}</span>
                                                {qty > 0 && totalMedCombos > 1 && (
                                                            <div className="pb-grid-qty" onClick={e => e.stopPropagation()}>
                                                                <button className="btn btn-icon btn-sm" onClick={() => handleDrinkToggle(bebida, false, false)}><span className="material-icons-round">remove</span></button>
                                                                <span>{qty}</span>
                                                                <button className="btn btn-icon btn-sm" onClick={() => handleDrinkToggle(bebida, false, true)} disabled={totalSelectedMedDrinks >= totalMedCombos}><span className="material-icons-round">add</span></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 'familiar_drinks' && isFamiliar && bebidasGrandesList.length > 0 && (
                        <div className="pb-step-content slide-in-right">
                            <div className="pb-section fade-in">
                                <h3 className="pb-section-title">
                                    <span className="material-icons-round">liquor</span>
                                    Gaseosas Familiares Incluidas ({totalSelectedFamiliarDrinks}/{totalFamiliarQty})
                                </h3>
                                {totalSelectedFamiliarDrinks < totalFamiliarQty && <p className="pb-error-text">Faltan {totalFamiliarQty - totalSelectedFamiliarDrinks} vaso(s) por escoger</p>}
                                <div className="pb-grid">
                                    {bebidasGrandesList.map(bebida => {
                                        const selected = selectedFamiliarDrinks.find(d => d.product.id === bebida.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={bebida.id} className={`pb-grid-item ${qty > 0 ? 'selected' : ''}`} onClick={() => handleFamiliarDrinkToggle(bebida, true)}>
                                            {bebida.imageURL && (
                                                <div className="pb-grid-img-wrapper">
                                                    <img src={bebida.imageURL} alt={bebida.name} />
                                                </div>
                                            )}
                                            <span className="pb-grid-name">{bebida.name}</span>
                                            {qty > 0 && totalFamiliarQty > 1 && (
                                                    <div className="pb-grid-qty" onClick={e => e.stopPropagation()}>
                                                        <button className="btn btn-icon btn-sm" onClick={() => handleFamiliarDrinkToggle(bebida, false)}><span className="material-icons-round">remove</span></button>
                                                        <span>{qty}</span>
                                                        <button className="btn btn-icon btn-sm" onClick={() => handleFamiliarDrinkToggle(bebida, true)} disabled={totalSelectedFamiliarDrinks >= totalFamiliarQty}><span className="material-icons-round">add</span></button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'drinks' && (
                        <div className="pb-step-content slide-in-right">
                            <div className="pb-section">
                                <h3 className="pb-section-title">
                                    <span className="material-icons-round">local_drink</span> 
                                    ¿Deseas una bebida?
                                </h3>
                                <div className="pb-list">
                                    {[...bebidasPequenasList, ...bebidasMedianasList, ...bebidasGrandesList].map(bebida => {
                                        const selected = tempBebidas.find(b => b.product.id === bebida.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={bebida.id} className="pb-item">
                                            {bebida.imageURL && (
                                                <div className="pb-item-img-wrapper">
                                                    <img src={bebida.imageURL} alt={bebida.name} />
                                                </div>
                                            )}
                                            <div className="pb-item-info">
                                                <span className="pb-item-name">{bebida.name}</span>
                                                    <span className="pb-item-price">+${bebida.price.toLocaleString('es-CO')}</span>
                                                </div>
                                                <div className="pb-item-actions">
                                                    {qty > 0 ? (
                                                        <>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleTempDrinkToggle(bebida, false)}><span className="material-icons-round">remove</span></button>
                                                            <span>{qty}</span>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleTempDrinkToggle(bebida, true)}><span className="material-icons-round">add</span></button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-outline btn-sm" onClick={() => handleTempDrinkToggle(bebida, true)}>Agregar</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'extras' && (
                        <div className="pb-step-content slide-in-right">
                            <div className="pb-section">
                                <h3 className="pb-section-title">
                                    <span className="material-icons-round">add_circle</span> 
                                    ¿Agregarás algo más? (Adicionales)
                                </h3>
                                <div className="pb-list">
                                    {adicionalesList.map(adicional => {
                                        const selected = tempAdicionales.find(a => a.product.id === adicional.id);
                                        const qty = selected ? selected.qty : 0;
                                        return (
                                            <div key={adicional.id} className="pb-item">
                                            {adicional.imageURL && (
                                                <div className="pb-item-img-wrapper">
                                                    <img src={adicional.imageURL} alt={adicional.name} />
                                                </div>
                                            )}
                                            <div className="pb-item-info">
                                                <span className="pb-item-name">{adicional.name}</span>
                                                    <span className="pb-item-price">+${adicional.price.toLocaleString('es-CO')}</span>
                                                </div>
                                                <div className="pb-item-actions">
                                                    {qty > 0 ? (
                                                        <>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleTempExtraToggle(adicional, false)}><span className="material-icons-round">remove</span></button>
                                                            <span>{qty}</span>
                                                            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => handleTempExtraToggle(adicional, true)}><span className="material-icons-round">add</span></button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-outline btn-sm" onClick={() => handleTempExtraToggle(adicional, true)}>Agregar</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pb-footer">
                    {currentStep !== 'info' ? (
                        <button className="btn btn-outline btn-sm" onClick={goBack} style={{padding: '0 12px'}}>
                            <span className="material-icons-round">arrow_back</span>
                            Atrás
                        </button>
                    ) : (
                        <div style={{ width: '80px', visibility: 'hidden' }}></div>
                    )}

                    <div className="pb-footer-total">
                        <span>Total:</span>
                        <span className="pb-footer-price">${grandTotal.toLocaleString('es-CO')}</span>
                    </div>
                    
                    {currentStep === 'info' && (
                        <button className="btn btn-primary" onClick={() => {
                            if (isIndividual) goToStep('combos');
                            else if (isFamiliar) goToStep('familiar_drinks');
                            else goToStep('extras');
                        }}>
                            Continuar <span className="material-icons-round">arrow_forward</span>
                        </button>
                    )}

                    {currentStep === 'combos' && (
                        <button className="btn btn-primary" onClick={() => {
                            if (totalSelectedPeqDrinks !== totalPeqCombos) { showToast(`Te faltan ${totalPeqCombos - totalSelectedPeqDrinks} bebidas pequeñas.`, 'error'); return; }
                            if (totalSelectedMedDrinks !== totalMedCombos) { showToast(`Te faltan ${totalMedCombos - totalSelectedMedDrinks} bebidas medianas.`, 'error'); return; }
                            
                            const hasCombos = totalPeqCombos > 0 || totalMedCombos > 0 || selectedCombos.length > 0;
                            if (hasCombos) {
                                goToStep('extras'); // Si llevó combo, salta directo a extras
                            } else {
                                goToStep('drinks'); // Si no llevó combos, pasa a preguntar por gaseosas libres
                            }
                        }}>
                            Continuar <span className="material-icons-round">arrow_forward</span>
                        </button>
                    )}

                    {currentStep === 'familiar_drinks' && (
                         <button className="btn btn-primary" onClick={() => {
                             if (totalSelectedFamiliarDrinks < totalFamiliarQty) { showToast(`Faltan ${totalFamiliarQty - totalSelectedFamiliarDrinks} bebidas por escoger.`, 'error'); return; }
                             goToStep('extras');
                         }}>
                             Continuar <span className="material-icons-round">arrow_forward</span>
                         </button>
                    )}

                    {currentStep === 'drinks' && (
                         <button className="btn btn-primary" onClick={() => goToStep('extras')}>
                             Continuar <span className="material-icons-round">arrow_forward</span>
                         </button>
                    )}

                    {currentStep === 'extras' && (
                        <button className="btn btn-primary" onClick={handleAddToCart}>
                            <span className="material-icons-round">add_shopping_cart</span>
                            Añadir
                        </button>
                    )}

                </div>
            </div>
        </Modal>
    );
}
