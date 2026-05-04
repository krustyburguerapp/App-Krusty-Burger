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

    // Métodos de pago
    nequiPaymentKey: '3234971723',  // Llave Nequi/Daviplata que se envía al cliente por WhatsApp

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
            nequiPaymentKey: settings.nequiPaymentKey || DEFAULT_RESTAURANT_SETTINGS.nequiPaymentKey,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error al guardar configuración del restaurante:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Devuelve la hora actual en zona horaria de Bogotá (Colombia).
 * Usar en lugar de `new Date()` para que el cálculo de apertura/cierre
 * no dependa de la zona horaria del navegador del cliente.
 */
function getColombiaTime() {
    const now = new Date();
    const colombiaStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    return new Date(colombiaStr);
}

/**
 * Convierte "HH:mm" a minutos desde medianoche.
 */
function parseTimeToMinutes(time) {
    const [h, m] = String(time).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * Formatea "HH:mm" a "h:mm AM/PM"
 */
export function formatTime12(time24) {
    if (!time24) return '';
    const [hours, minutes] = String(time24).split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${period}`;
}

/**
 * Verifica si el restaurante está abierto actualmente.
 * Soporta cierre después de medianoche (ej: abre 17:00, cierra 02:00).
 */
export function isRestaurantOpen(settings) {
    if (!settings) return true; // Por defecto, abierto si aún no cargaron los settings

    if (settings.closedToday) return false;

    const now = getColombiaTime();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const openTime = parseTimeToMinutes(settings.openingTime);
    const closeTime = parseTimeToMinutes(settings.closingTime);

    // Caso 1: horario normal (ej: 11:00 - 22:00) → openTime < closeTime
    if (closeTime > openTime) {
        return currentTime >= openTime && currentTime < closeTime;
    }

    // Caso 2: cierre después de medianoche (ej: 17:00 - 02:00) → closeTime <= openTime
    // Está abierto si estás después de openTime O antes de closeTime
    return currentTime >= openTime || currentTime < closeTime;
}

/**
 * Obtiene el mensaje de estado del restaurante para mostrar en la UI.
 */
export function getRestaurantStatus(settings) {
    if (!settings) return { isOpen: true, message: 'Abierto' };

    if (settings.closedToday) {
        return {
            isOpen: false,
            message: 'Hoy no hay servicio',
            nextChange: 'Cerrado todo el día'
        };
    }

    const isOpen = isRestaurantOpen(settings);
    const closingFormatted = formatTime12(settings.closingTime);
    const openingFormatted = formatTime12(settings.openingTime);

    if (isOpen) {
        return {
            isOpen: true,
            message: `Abierto - Cerramos a las ${closingFormatted}`,
            nextChange: `Cierre: ${closingFormatted}`
        };
    }

    return {
        isOpen: false,
        message: `Cerrado - Abrimos a las ${openingFormatted}`,
        nextChange: `Apertura: ${openingFormatted}`
    };
}

/**
 * Texto del horario para mostrar al cliente (ej: "11:00 AM - 10:00 PM").
 */
export function getBusinessHoursText(settings) {
    if (!settings) return '';
    return `${formatTime12(settings.openingTime)} - ${formatTime12(settings.closingTime)}`;
}

/**
 * Mensaje contextual cuando la tienda está cerrada.
 */
export function getClosedMessage(settings) {
    if (!settings) return 'El restaurante está cerrado';
    if (settings.closedToday) return 'Hoy no hay servicio. Vuelve mañana.';

    const now = getColombiaTime();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const openTime = parseTimeToMinutes(settings.openingTime);
    const closeTime = parseTimeToMinutes(settings.closingTime);

    // Para horarios que cruzan medianoche, si ya pasó el cierre, abrimos de nuevo a openingTime
    if (closeTime <= openTime) {
        if (currentTime >= closeTime && currentTime < openTime) {
            return `Abrimos a las ${formatTime12(settings.openingTime)}`;
        }
    } else {
        if (currentTime < openTime) {
            return `Abrimos a las ${formatTime12(settings.openingTime)}`;
        }
    }
    return `Pedidos hasta las ${formatTime12(settings.closingTime)}. Vuelve mañana a las ${formatTime12(settings.openingTime)}`;
}
