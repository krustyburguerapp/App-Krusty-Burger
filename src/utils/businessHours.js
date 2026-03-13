const BUSINESS_HOURS = {
    // Horario: 5:00 PM - 10:30 PM para domicilios
    delivery: { open: 17, openMin: 0, close: 22, closeMin: 30 },
    // Horario: 5:00 PM - 11:15 PM para recoger en local
    pickup: { open: 17, openMin: 0, close: 23, closeMin: 15 }
};

function getColombiaTime() {
    const now = new Date();
    const colombiaStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
    return new Date(colombiaStr);
}

export function isStoreOpen(deliveryType = 'pickup') {
    // Bloqueo de horarios ACTIVADO
    const BYPASS_HOURS = false;
    if (BYPASS_HOURS) return true;

    const now = getColombiaTime();
    const hours = deliveryType === 'delivery' ? BUSINESS_HOURS.delivery : BUSINESS_HOURS.pickup;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = hours.open * 60 + hours.openMin;
    const closeMinutes = hours.close * 60 + hours.closeMin;
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

export function getBusinessHoursText(deliveryType) {
    const hours = deliveryType === 'delivery' ? BUSINESS_HOURS.delivery : BUSINESS_HOURS.pickup;
    const formatTime = (h, m) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : h;
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    };
    return `${formatTime(hours.open, hours.openMin)} - ${formatTime(hours.close, hours.closeMin)}`;
}

export function getNextOpenTime() {
    const now = getColombiaTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = BUSINESS_HOURS.pickup.open * 60 + BUSINESS_HOURS.pickup.openMin;
    
    if (currentMinutes < openMinutes) {
        return 'Hoy a las 5:00 PM';
    }
    return 'Mañana a las 5:00 PM';
}

export function getClosedMessage(deliveryType) {
    const hours = deliveryType === 'delivery' ? BUSINESS_HOURS.delivery : BUSINESS_HOURS.pickup;
    const formatTime = (h, m) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : h;
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    };
    
    const now = getColombiaTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = hours.open * 60 + hours.openMin;
    const closeMinutes = hours.close * 60 + hours.closeMin;
    
    if (currentMinutes < openMinutes) {
        // Está cerrado por la mañana/tarde - abre más tarde hoy
        return `Abrimos ${formatTime(hours.open, hours.openMin)} hoy`;
    } else {
        // Está cerrado por la noche - cierra o ya cerró
        return `Pedidos hasta las ${formatTime(hours.close, hours.closeMin)}. Vuelve mañana a las 5:00 PM`;
    }
}

export function getStoreStatus() {
    const deliveryOpen = isStoreOpen('delivery');
    const pickupOpen = isStoreOpen('pickup');
    if (deliveryOpen && pickupOpen) return 'open';
    if (!deliveryOpen && pickupOpen) return 'pickup-only';
    return 'closed';
}
