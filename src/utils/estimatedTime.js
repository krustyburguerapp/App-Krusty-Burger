import { db } from '../config/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const DEFAULT_TIMES = { delivery: 40, pickup: 20 };

export async function calculateEstimatedTime(deliveryType) {
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('deliveryType', '==', deliveryType),
            where('status', '==', 'delivered'),
            where('actualTime', '>', 0),
            orderBy('actualTime', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(3)
        );
        const snapshot = await getDocs(q);
        if (snapshot.size < 1) {
            return DEFAULT_TIMES[deliveryType] || 30;
        }
        let totalTime = 0;
        snapshot.forEach((doc) => {
            totalTime += doc.data().actualTime;
        });
        const avg = Math.round(totalTime / snapshot.size);
        return Math.max(10, Math.min(avg, 120));
    } catch (error) {
        return DEFAULT_TIMES[deliveryType] || 30;
    }
}

export function calculateActualTime(createdAt) {
    const now = new Date();
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return Math.round((now - created) / 60000);
}
