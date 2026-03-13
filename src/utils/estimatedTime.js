import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DEFAULT_TIMES = { delivery: 40, pickup: 25 };
const MIN_TIME = 25; // Mínimo 25 minutos
const MAX_TIME = 60; // Máximo 1 hora

export async function calculateEstimatedTime(deliveryType) {
    try {
        // Obtener pedidos completados HOY
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('deliveryType', '==', deliveryType),
            where('status', '==', 'delivered'),
            where('createdAt', '>=', todayStart),
            where('createdAt', '<=', todayEnd)
        );
        
        const snapshot = await getDocs(q);
        
        // Si no hay pedidos hoy, usar tiempo por defecto
        if (snapshot.size < 1) {
            return DEFAULT_TIMES[deliveryType] || MIN_TIME;
        }
        
        // Calcular promedio de tiempos de preparación
        let totalTime = 0;
        let validOrders = 0;
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Usar actualTime si existe, sino calcular desde createdAt
            const prepTime = data.actualTime || calculateActualTime(data.createdAt);
            if (prepTime > 0) {
                totalTime += prepTime;
                validOrders++;
            }
        });
        
        // Si no hay tiempos válidos, usar default
        if (validOrders === 0) {
            return DEFAULT_TIMES[deliveryType] || MIN_TIME;
        }
        
        const avg = Math.round(totalTime / validOrders);
        
        // Aplicar mínimos y máximos
        return Math.max(MIN_TIME, Math.min(avg, MAX_TIME));
    } catch (error) {
        console.error('Error calculating estimated time:', error);
        return DEFAULT_TIMES[deliveryType] || MIN_TIME;
    }
}

export function calculateActualTime(createdAt) {
    const now = new Date();
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return Math.round((now - created) / 60000);
}
