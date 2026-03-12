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
 */
export const MAX_DELIVERY_DISTANCE_KM = 5;

/**
 * Calcula la tarifa de domicilio según la distancia
 * Regla:
 * - ≤ 1 km: $2,000
 * - > 1 km y ≤ 3 km: $5,000
 * - > 3 km: $5,000 + ($5,000 × km extra después de 3)
 * @param {number} distanceKm - Distancia en kilómetros
 * @returns {number} - Tarifa en pesos colombianos
 */
export function getDeliveryFee(distanceKm) {
    if (distanceKm <= 1) {
        return 2000;
    }

    if (distanceKm <= 3) {
        return 5000;
    }

    // Más de 3 km: $5,000 base + $5,000 por cada km extra (redondeado hacia arriba)
    const kmExtra = Math.ceil(distanceKm - 3);
    return 5000 + (kmExtra * 5000);
}

/**
 * Calcula la tarifa de domicilio y valida si está dentro del límite
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @param {number} storeLat - Latitud del restaurante
 * @param {number} storeLon - Longitud del restaurante
 * @param {number} maxDistanceKm - Distancia máxima permitida (default: 5)
 * @returns {{ distance: number, fee: number, isWithinRange: boolean }}
 */
export function calculateDeliveryInfo(userLat, userLon, storeLat, storeLon, maxDistanceKm = 5) {
    const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
    const isWithinRange = distance <= maxDistanceKm;
    const fee = isWithinRange ? getDeliveryFee(distance) : null;

    return {
        distance: Math.round(distance * 10) / 10, // Redondear a 1 decimal
        fee,
        isWithinRange
    };
}
