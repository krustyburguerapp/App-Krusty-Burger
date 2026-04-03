import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPrizeRedemptionState } from '../utils/loyaltySystem';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [items, setItems] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [prizeRedemption, setPrizeRedemption] = useState(null);

    // Verificar estado de reclamo de premio al montar
    useEffect(() => {
        const state = getPrizeRedemptionState();
        setPrizeRedemption(state);
    }, []);

    const isPrizeRedemptionActive = !!prizeRedemption;

    const addItem = useCallback((product) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                imageURL: product.imageURL || '',
                quantity: 1,
                category: product.category
            }];
        });
    }, []);

    const removeItem = useCallback((productId) => {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
    }, []);

    const updateQuantity = useCallback((productId, quantity) => {
        if (quantity < 1) {
            setItems((prev) => prev.filter((item) => item.productId !== productId));
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
            )
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Calcular subtotal con descuento de premio si aplica
    const calculateSubtotal = () => {
        if (!isPrizeRedemptionActive) {
            // Sin premio - suma normal
            return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        }

        // Con premio - encontrar 1 comida individual y 1 bebida pequeña para hacer gratis
        const individualItems = items.filter(item => item.category === 'individual');
        const smallDrinkItems = items.filter(item => item.category === 'bebidas_pequenas');

        let freeItemIds = new Set();

        // Hacer gratis la primera comida individual
        if (individualItems.length > 0) {
            freeItemIds.add(individualItems[0].productId);
        }

        // Hacer gratis la primera bebida pequeña
        if (smallDrinkItems.length > 0) {
            freeItemIds.add(smallDrinkItems[0].productId);
        }

        // Sumar solo los items que NO son gratis
        return items.reduce((sum, item) => {
            if (freeItemIds.has(item.productId)) {
                return sum; // Gratis
            }
            return sum + item.price * item.quantity;
        }, 0);
    };

    const subtotal = calculateSubtotal();
    const total = subtotal + deliveryFee;

    // Calcular cuánto se ahorró con el premio
    const prizeSavings = (() => {
        if (!isPrizeRedemptionActive) return 0;

        const individualItems = items.filter(item => item.category === 'individual');
        const smallDrinkItems = items.filter(item => item.category === 'bebidas_pequenas');

        let savings = 0;
        if (individualItems.length > 0) {
            savings += individualItems[0].price;
        }
        if (smallDrinkItems.length > 0) {
            savings += smallDrinkItems[0].price;
        }
        return savings;
    })();

    // Verificar si tiene los items requeridos para el premio
    const hasRequiredPrizeItems = () => {
        if (!isPrizeRedemptionActive) return false;
        const individualItems = items.filter(item => item.category === 'individual');
        const smallDrinkItems = items.filter(item => item.category === 'bebidas_pequenas');
        return individualItems.length >= 1 && smallDrinkItems.length >= 1;
    };

    const value = {
        items,
        isOpen,
        setIsOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setDeliveryFee,
        setPrizeRedemption,
        refreshPrizeRedemption: () => setPrizeRedemption(getPrizeRedemptionState()),
        totalItems,
        subtotal,
        deliveryFee,
        total,
        isPrizeRedemptionActive,
        prizeSavings,
        hasRequiredPrizeItems
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
    return context;
}
