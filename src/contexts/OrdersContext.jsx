import { createContext, useContext, useState, useEffect } from 'react';
import { db, isDemoMode, ADMIN_EMAIL } from '../config/firebase';
import {
    collection, onSnapshot, doc,
    addDoc, updateDoc, serverTimestamp, increment, getDoc, deleteDoc
} from 'firebase/firestore';
import { calculateActualTime } from '../utils/estimatedTime';
import { useAuth } from './AuthContext';
import { addStamp, getUserStamps } from '../utils/loyaltySystem';

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

        // TIMEOUT DE SEGURIDAD: si Firestore no responde en 5s, quitamos spinner
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        // 3. LISTENER EN TIEMPO REAL: actualiza desde el servidor en segundo plano
        const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
            clearTimeout(safetyTimeout);

            let ordersData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));

            if (!isAdmin) {
                ordersData = ordersData.filter(o => o.userId === userId);
            }

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
                statusHistory: [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Pedido creado' }],
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
            const cleanOrderData = JSON.parse(JSON.stringify(orderData));
            const now = new Date().toISOString();

            const orderToSave = {
                ...cleanOrderData,
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: now,
                    note: 'Pedido creado'
                }],
                isNew: true,
                whatsappConfirmSent: false,
                actualTime: 0,
                createdAt: now,
                updatedAt: now
            };

            // SIN caché persistente: addDoc va DIRECTO al servidor.
            // Cuando esta promesa resuelve, el pedido YA ESTÁ en Firestore.
            const docRef = await addDoc(collection(db, 'orders'), orderToSave);
            console.log('✅ Pedido creado en servidor:', docRef.id);
            return { success: true, orderId: docRef.id };
        } catch (error) {
            console.error('Error al crear pedido:', error);
            return { success: false, error: `Error: ${error.message}` };
        }
    };

    const updateOrderStatus = async (orderId, newStatus, note = '', metadata = {}) => {
        if (isDemoMode) {
            const currentOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            const updatedOrders = currentOrders.map(o => {
                if (o.id === orderId) {
                    const statusHist = o.statusHistory || [];
                    const updated = {
                        ...o,
                        status: newStatus,
                        isNew: false,
                        statusHistory: [...statusHist, { status: newStatus, timestamp: new Date().toISOString(), note: note || getStatusLabel(newStatus) }],
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
            const order = orders.find((o) => o.id === orderId);
            
            const updateData = {
                status: newStatus,
                isNew: false,
                statusHistory: order?.statusHistory
                    ? [...order.statusHistory, {
                        status: newStatus,
                        timestamp: new Date().toISOString(),
                        note: note || getStatusLabel(newStatus)
                    }]
                    : [{ status: newStatus, timestamp: new Date().toISOString(), note: note || getStatusLabel(newStatus) }],
                updatedAt: serverTimestamp()
            };

            // Guardar tiempo de preparación si se proporciona
            if (metadata.preparationTime !== undefined) {
                updateData.preparationTime = metadata.preparationTime;
            }
            
            if (newStatus === 'delivered' && order && order.createdAt) {
                updateData.actualTime = calculateActualTime(order.createdAt);
                
                // Actualizar estado del pedido primero
                await updateDoc(orderRef, updateData);
                
                // Agregar sello de fidelidad al usuario
                const userId = order.userId;
                if (userId) {
                    const stampResult = await addStamp(userId, order.createdAt);
                    
                    // Si es un sello nuevo y completa los 7, notificar al admin
                    if (stampResult.success && stampResult.isNewStamp && stampResult.stamps >= 7) {
                        // Notificar a todos los admins (en una implementación real, se podría usar Cloud Messaging)
                        console.log('🏆 USUARIO COMPLETÓ 7 SELLOS - PREMIO LISTO', {
                            userId,
                            orderId,
                            userName: order.userName,
                            userPhone: order.userPhone
                        });
                    }
                }
                
                return { success: true, stampAdded: stampResult };
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

    const sendInsist = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { insistCount: increment(1) });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const deleteOrder = async (orderId) => {
        if (isDemoMode) {
            const currentOrders = JSON.parse(localStorage.getItem('demoKrustyOrders') || '[]');
            const updatedOrders = currentOrders.filter(o => o.id !== orderId);
            localStorage.setItem('demoKrustyOrders', JSON.stringify(updatedOrders));
            setOrders(isAdmin ? updatedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : updatedOrders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            return { success: true };
        }

        try {
            const orderRef = doc(db, 'orders', orderId);
            await deleteDoc(orderRef);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <OrdersContext.Provider value={{ orders, loading, error, newOrdersCount, createOrder, updateOrderStatus, markAsSeen, sendInsist, deleteOrder }}>
            {children}
        </OrdersContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrdersContext);
    if (!context) throw new Error('useOrders debe usarse dentro de OrdersProvider');
    return context;
}

export const getStatusLabel = (status) => {
    switch (status) {
        case 'pending': return 'Pendiente';
        case 'preparing': return 'En Preparación';
        case 'onTheWay': return 'En Camino';
        case 'delivered': return 'Entregado';
        case 'cancelled': return 'Cancelado';
        default: return status;
    }
};

export const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#FFB74D';
        case 'preparing': return '#4FC3F7';
        case 'onTheWay': return '#BA68C8';
        case 'delivered': return '#81C784';
        case 'cancelled': return '#E57373';
        default: return '#9E9E9E';
    }
};

export const getStatusIcon = (status) => {
    switch (status) {
        case 'pending': return 'pending';
        case 'preparing': return 'restaurant';
        case 'onTheWay': return 'two_wheeler';
        case 'delivered': return 'done_all';
        case 'cancelled': return 'cancel';
        default: return 'help';
    }
};
