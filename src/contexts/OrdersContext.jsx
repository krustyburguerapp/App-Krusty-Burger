import { createContext, useContext, useState, useEffect } from 'react';
import { db, isDemoMode } from '../config/firebase';
import {
    collection, onSnapshot, doc, getDocsFromCache, query, where,
    addDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { calculateActualTime } from '../utils/estimatedTime';
import { useAuth } from './AuthContext';

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
    const { user, isAdmin } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newOrdersCount, setNewOrdersCount] = useState(0);

    const userId = user?.uid;

    useEffect(() => {
        if (!userId && !isAdmin) {
            setOrders([]);
            setLoading(false);
            return;
        }

        if (isDemoMode) {
            const demoOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            const userOrders = isAdmin ? demoOrders : demoOrders.filter(o => o.userId === userId);
            setOrders(userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            if (isAdmin) setNewOrdersCount(demoOrders.filter((o) => o.isNew).length);
            setLoading(false);

            const interval = setInterval(() => {
                const refreshed = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
                const refreshedUser = isAdmin ? refreshed : refreshed.filter(o => o.userId === userId);
                setOrders(refreshedUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
                if (isAdmin) setNewOrdersCount(refreshed.filter((o) => o.isNew).length);
            }, 3000);
            return () => clearInterval(interval);
        }

        const ordersRef = collection(db, 'orders');

        // Optimización: Si no es admin, filtramos directo en la query si es posible (aunque para caché general leer la colección basta)

        let ordersLoadedFromCache = false;

        // 1. INTENTO DE CACHÉ
        const loadFromCache = async () => {
            try {
                // Intentamos leer el caché general de órdenes
                const cachedDocs = await getDocsFromCache(ordersRef);
                if (!cachedDocs.empty) {
                    let ordersData = cachedDocs.docs.map(d => ({ id: d.id, ...d.data() }));

                    if (!isAdmin) {
                        ordersData = ordersData.filter(o => o.userId === userId);
                    }

                    ordersData.sort((a, b) => {
                        const dateA = a.createdAt?.seconds || 0;
                        const dateB = b.createdAt?.seconds || 0;
                        return dateB - dateA;
                    });

                    setOrders(ordersData);
                    if (isAdmin) setNewOrdersCount(ordersData.filter((o) => o.isNew).length);

                    setLoading(false);
                    ordersLoadedFromCache = true;
                }
            } catch (e) {
                console.log('ℹ️ Caché de órdenes vacío.');
            }
        };

        loadFromCache();

        // 2. TIMEOUT DE SEGURIDAD (No bloquear la app si Orders falla)
        const safetyTimeout = setTimeout(() => {
            if (loading && !ordersLoadedFromCache) {
                console.warn('⚠️ Timeout en OrdersContext, quitando loading...');
                setLoading(false);
            }
        }, 2000);

        // 3. BACKGROUND FETCH
        const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
            clearTimeout(safetyTimeout);
            let ordersData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));

            // 1. Filtrado Local
            if (!isAdmin) {
                ordersData = ordersData.filter(o => o.userId === userId);
            }

            // 2. Ordenado Local (Más nuevo a viejo)
            ordersData.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setOrders(ordersData);
            if (isAdmin) {
                setNewOrdersCount(ordersData.filter((o) => o.isNew).length);
            }
            setLoading(false);
            setError(null);
        }, (err) => {
            clearTimeout(safetyTimeout);
            console.error('Error cargando los pedidos:', err.message);
            setError('Error al conectar con la base de datos de pedidos.');
            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimeout);
            unsubscribe();
        };
    }, [userId, isAdmin]);

    const createOrder = async (orderData) => {
        if (isDemoMode) {
            const newOrder = {
                id: 'demo-ord-' + Date.now(),
                ...orderData,
                status: 'pending',
                statusHistory: [{ status: 'pending', timestamp: new Date(), note: 'Pedido creado' }],
                isNew: true,
                whatsappConfirmSent: false,
                actualTime: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const currentOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            localStorage.setItem('demoKrustyOrders', JSON.stringify([...currentOrders, newOrder]));
            setOrders(prev => [newOrder, ...prev]);
            return { success: true, orderId: newOrder.id };
        }

        try {
            const orderDataToSave = {
                ...orderData,
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: new Date(),
                    note: 'Pedido creado'
                }],
                isNew: true,
                whatsappConfirmSent: false,
                actualTime: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'orders'), orderDataToSave);
            return { success: true, orderId: docRef.id };
        } catch (error) {
            console.error('Error al crear pedido en db:', error);
            return { success: false, error: 'Hubo un error al crear tu pedido. Revisa tu conexión.' };
        }
    };

    const updateOrderStatus = async (orderId, newStatus, note = '') => {
        if (isDemoMode) {
            const currentOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            const updatedOrders = currentOrders.map(o => {
                if (o.id === orderId) {
                    const statusHist = o.statusHistory || [];
                    const updated = {
                        ...o,
                        status: newStatus,
                        isNew: false,
                        statusHistory: [...statusHist, { status: newStatus, timestamp: new Date(), note: note || getStatusLabel(newStatus) }],
                        updatedAt: new Date().toISOString()
                    };
                    if (newStatus === 'delivered' && o.createdAt) {
                        updated.actualTime = calculateActualTime({ toDate: () => new Date(o.createdAt) });
                    }
                    return updated;
                }
                return o;
            });
            localStorage.setItem('demoKrustyOrders', JSON.stringify(updatedOrders));
            setOrders(isAdmin ? updatedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : updatedOrders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            return { success: true };
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            const updateData = {
                status: newStatus,
                isNew: false,
                statusHistory: orders.find((o) => o.id === orderId)?.statusHistory
                    ? [...orders.find((o) => o.id === orderId).statusHistory, {
                        status: newStatus,
                        timestamp: new Date(),
                        note: note || getStatusLabel(newStatus)
                    }]
                    : [{ status: newStatus, timestamp: new Date(), note: note || getStatusLabel(newStatus) }],
                updatedAt: serverTimestamp()
            };
            if (newStatus === 'delivered') {
                const order = orders.find((o) => o.id === orderId);
                if (order && order.createdAt) {
                    updateData.actualTime = calculateActualTime(order.createdAt);
                }
            }
            await updateDoc(orderRef, updateData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const markAsSeen = async (orderId) => {
        if (isDemoMode) {
            const currentOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            const updatedOrders = currentOrders.map(o => o.id === orderId ? { ...o, isNew: false } : o);
            localStorage.setItem('demoKrustyOrders', JSON.stringify(updatedOrders));
            if (isAdmin) setNewOrdersCount(updatedOrders.filter(o => o.isNew).length);
            return;
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { isNew: false });
        } catch (error) {
            /* silently fail for seen marking */
        }
    };

    return (
        <OrdersContext.Provider value={{ orders, loading, error, newOrdersCount, createOrder, updateOrderStatus, markAsSeen }}>
            {children}
        </OrdersContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrdersContext);
    if (!context) throw new Error('useOrders debe usarse dentro de OrdersProvider');
    return context;
}

export function getStatusLabel(status) {
    const labels = {
        pending: 'Pedido recibido',
        accepted: 'Aceptado',
        preparing: 'En preparación',
        ready: 'Listo',
        onTheWay: 'En camino',
        delivered: 'Entregado',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
}

export function getStatusIcon(status) {
    const icons = {
        pending: 'receipt_long',
        accepted: 'check_circle',
        preparing: 'restaurant',
        ready: 'inventory_2',
        onTheWay: 'delivery_dining',
        delivered: 'done_all',
        cancelled: 'cancel'
    };
    return icons[status] || 'help';
}

export function getStatusColor(status) {
    const colors = {
        pending: '#FB8C00',
        accepted: '#1E88E5',
        preparing: '#8E24AA',
        ready: '#43A047',
        onTheWay: '#00ACC1',
        delivered: '#43A047',
        cancelled: '#E53935'
    };
    return colors[status] || '#757575';
}
