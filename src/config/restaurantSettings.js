import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Configuración por defecto del restaurante
 */
export const DEFAULT_RESTAURANT_SETTINGS = {
    // Horario de servicio
    openingTime: '11:00',  // Hora de apertura (formato HH:mm)
    closingTime: '22:00',  // Hora de cierre (formato HH:mm)
    closedToday: false,    // Si hoy no hay servicio (independiente del horario)
    closedTodayDate: null, // Fecha en que se activó closedToday (para reset automático)

    // Estado de domicilios
    deliveryEnabled: true,  // Si los domicilios están disponibles

    // Promociones
    freeDeliveryPromo: false,  // Si los domicilios son gratis hoy

    // Metadata
    updatedAt: null,
    updatedBy: null
};

/**
 * Obtiene la configuración del restaurante desde Firestore
 * @returns {Promise<Object>} Configuración del restaurante
 */
export async function getRestaurantSettings() {
    try {
        const docRef = doc(db, 'settings', 'restaurant');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Verificar si closedToday debe resetearse automáticamente
            // Si hay una fecha guardada y es diferente a hoy, resetear
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            if (data.closedToday && data.closedTodayDate && data.closedTodayDate !== today) {
                // Resetear automáticamente porque es un día diferente
                await setDoc(docRef, {
                    ...data,
                    closedToday: false,
                    closedTodayDate: null,
                    updatedAt: new Date().toISOString(),
                    updatedBy: 'auto-reset'
                }, { merge: true });

                return {
                    ...data,
                    closedToday: false,
                    closedTodayDate: null
                };
            }

            return data;
        }

        // Si no existe, crear con valores por defecto
        await setDoc(docRef, {
            ...DEFAULT_RESTAURANT_SETTINGS,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
        });

        return DEFAULT_RESTAURANT_SETTINGS;
    } catch (error) {
        console.error('Error al obtener configuración del restaurante:', error);
        return DEFAULT_RESTAURANT_SETTINGS;
    }
}

/**
 * Guarda la configuración del restaurante en Firestore
 * @param {Object} settings - Configuración del restaurante
 * @param {string} userId - ID del usuario que realiza el cambio
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveRestaurantSettings(settings, userId) {
    try {
        const docRef = doc(db, 'settings', 'restaurant');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        await setDoc(docRef, {
            openingTime: settings.openingTime,
            closingTime: settings.closingTime,
            closedToday: settings.closedToday,
            closedTodayDate: settings.closedToday ? today : null, // Guardar fecha solo si está activo
            deliveryEnabled: settings.deliveryEnabled,
            freeDeliveryPromo: settings.freeDeliveryPromo,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        });

        return { success: true };
    } catch (error) {
        console.error('Error al guardar configuración del restaurante:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica si el restaurante está abierto actualmente
 * @param {Object} settings - Configuración del restaurante
 * @returns {boolean} true si está abierto
 */
export function isRestaurantOpen(settings) {
    if (!settings) return true; // Por defecto, abierto

    // Si está cerrado hoy, siempre retorna false
    if (settings.closedToday) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutos desde medianoche

    const [openHour, openMin] = settings.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = settings.closingTime.split(':').map(Number);

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime < closeTime;
}

/**
 * Obtiene el mensaje de estado del restaurante
 * @param {Object} settings - Configuración del restaurante
 * @returns {Object} { isOpen, message, nextChange }
 */
export function getRestaurantStatus(settings) {
    if (!settings) return { isOpen: true, message: 'Abierto' };

    // Si está cerrado hoy
    if (settings.closedToday) {
        return {
            isOpen: false,
            message: 'Hoy no hay servicio',
            nextChange: 'Cerrado todo el día'
        };
    }

    const isOpen = isRestaurantOpen(settings);

    if (isOpen) {
        const [closeHour, closeMin] = settings.closingTime.split(':').map(Number);
        return {
            isOpen: true,
            message: `Abierto - Cerramos a las ${settings.closingTime}`,
            nextChange: `Cierre: ${settings.closingTime}`
        };
    } else {
        const [openHour, openMin] = settings.openingTime.split(':').map(Number);
        return {
            isOpen: false,
            message: `Cerrado - Abrimos a las ${settings.openingTime}`,
            nextChange: `Apertura: ${settings.openingTime}`
        };
    }
}
