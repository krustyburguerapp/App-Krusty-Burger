import { getDeliveryPricing, getPriceForDistance, DEFAULT_DELIVERY_PRICING } from '../config/deliveryPricing.js';

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} - Distancia en kilómetros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Límite máximo de distancia para domicilios (en km)
 * Nota: Este valor ahora se obtiene dinámicamente de la configuración
 */
export const MAX_DELIVERY_DISTANCE_KM = 5;

/**
 * Obtiene la configuración de tarifas (desde Firestore o cache)
 * @returns {Promise<Object>} Configuración de tarifas
 */
let pricingCache = null;
let pricingCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getDeliveryPricingConfig() {
    const now = Date.now();

    // Usar caché si es válido
    if (pricingCache && (now - pricingCacheTime) < CACHE_DURATION) {
        return pricingCache;
    }

    const pricing = await getDeliveryPricing();
    pricingCache = pricing;
    pricingCacheTime = now;

    return pricing;
}

/**
 * Calcula la tarifa de domicilio según la distancia usando la configuración dinámica
 * @param {number} distanceKm - Distancia en kilómetros
 * @param {Object} pricing - Configuración de tarifas (opcional, usa cache si no se proporciona)
 * @returns {number} - Tarifa en pesos colombianos
 */
export async function getDeliveryFee(distanceKm, pricing = null) {
    if (!pricing) {
        pricing = await getDeliveryPricingConfig();
    }

    return getPriceForDistance(pricing, distanceKm) || 0;
}

/**
 * Calcula la tarifa de domicilio y valida si está dentro del límite
 * Versión síncrona que usa pricing en memoria
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @param {number} storeLat - Latitud del restaurante
 * @param {number} storeLon - Longitud del restaurante
 * @param {Object} pricing - Configuración de tarifas
 * @returns {{ distance: number, fee: number, isWithinRange: boolean }}
 */
export function calculateDeliveryInfoWithPricing(userLat, userLon, storeLat, storeLon, pricing) {
    const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
    const maxDistance = pricing?.maxDistanceKm || MAX_DELIVERY_DISTANCE_KM;
    const isWithinRange = distance <= maxDistance;
    const fee = isWithinRange ? getPriceForDistance(pricing, distance) : null;

    return {
        distance: Math.round(distance * 10) / 10, // Redondear a 1 decimal
        fee,
        isWithinRange
    };
}

/**
 * Calcula la tarifa de domicilio y valida si está dentro del límite
 * Versión asíncrona que obtiene pricing automáticamente
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @param {number} storeLat - Latitud del restaurante
 * @param {number} storeLon - Longitud del restaurante
 * @param {number} maxDistanceKm - Distancia máxima permitida (default: 5)
 * @returns {Promise<{ distance: number, fee: number, isWithinRange: boolean }>}
 */
export async function calculateDeliveryInfo(userLat, userLon, storeLat, storeLon, maxDistanceKm = 5) {
    const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
    const pricing = await getDeliveryPricingConfig();
    const effectiveMaxDistance = pricing?.maxDistanceKm || maxDistanceKm;
    const isWithinRange = distance <= effectiveMaxDistance;
    const fee = isWithinRange ? getPriceForDistance(pricing, distance) : null;

    return {
        distance: Math.round(distance * 10) / 10, // Redondear a 1 decimal
        fee,
        isWithinRange
    };
}
