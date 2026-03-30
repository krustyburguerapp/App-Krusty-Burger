import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Configuración por defecto de tarifas de domicilio
 * Distancias en km, precios en pesos colombianos (COP)
 */
export const DEFAULT_DELIVERY_PRICING = {
    maxDistanceKm: 5,
    prices: {
        '0.5': 2000,
        '1.0': 2000,
        '1.5': 3500,
        '2.0': 4000,
        '2.5': 4500,
        '3.0': 5000,
        '3.5': 7500,
        '4.0': 10000,
        '4.5': 12500,
        '5.0': 15000
    },
    updatedAt: null,
    updatedBy: null
};

/**
 * Obtiene la configuración de tarifas desde Firestore
 * @returns {Promise<Object>} Configuración de tarifas
 */
export async function getDeliveryPricing() {
    try {
        const docRef = doc(db, 'deliveryPricing', 'config');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }

        // Si no existe, crear con valores por defecto
        await setDoc(docRef, {
            ...DEFAULT_DELIVERY_PRICING,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
        });

        return DEFAULT_DELIVERY_PRICING;
    } catch (error) {
        console.error('Error al obtener tarifas de domicilio:', error);
        return DEFAULT_DELIVERY_PRICING;
    }
}

/**
 * Guarda la configuración de tarifas en Firestore
 * @param {Object} pricing - Configuración de tarifas
 * @param {string} userId - ID del usuario que realiza el cambio
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveDeliveryPricing(pricing, userId) {
    try {
        const docRef = doc(db, 'deliveryPricing', 'config');
        await setDoc(docRef, {
            maxDistanceKm: pricing.maxDistanceKm,
            prices: pricing.prices,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        });

        return { success: true };
    } catch (error) {
        console.error('Error al guardar tarifas de domicilio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el precio para una distancia específica
 * @param {Object} pricing - Configuración de tarifas
 * @param {number} distance - Distancia en km
 * @returns {number} Precio en COP
 */
export function getPriceForDistance(pricing, distance) {
    if (distance > pricing.maxDistanceKm) {
        return null; // Fuera de rango
    }

    // Encontrar el tramo correspondiente (redondear hacia arriba al 0.5 más cercano)
    const roundedDistance = Math.ceil(distance * 2) / 2;
    const distanceKey = roundedDistance.toFixed(1);

    return pricing.prices[distanceKey] || pricing.prices[pricing.maxDistanceKm.toFixed(1)] || 0;
}
