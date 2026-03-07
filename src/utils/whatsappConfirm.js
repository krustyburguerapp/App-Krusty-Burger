const STORE_PHONE = '573025712968';

export function generateOrderWhatsAppURL(order) {
    const deliveryLabel = order.deliveryType === 'delivery' ? 'Domicilio 🚗' : 'Recoger en local 🏪';
    const message = encodeURIComponent(
        `🍔 *Pedido Confirmado — Krusty Burger*\n\n` +
        `📋 Pedido #${order.id ? order.id.slice(-6).toUpperCase() : '------'}\n` +
        `👤 ${order.userName}\n` +
        `📱 ${order.userPhone}\n` +
        `🚗 ${deliveryLabel}\n` +
        `${order.deliveryType === 'delivery' ? `📍 ${order.userAddress}\n` : ''}` +
        `\n${order.items.map(i => `• ${i.quantity}x ${i.name} - $${i.price.toLocaleString('es-CO')}`).join('\n')}\n\n` +
        `💰 Total: $${order.total.toLocaleString('es-CO')}\n` +
        `⏱️ Tiempo estimado: ~${order.estimatedTime} min\n\n` +
        `¡Gracias por tu pedido!`
    );
    return `https://wa.me/${STORE_PHONE}?text=${message}`;
}

export function generateAdminWhatsAppURL(phone, orderStatus, orderId) {
    const messages = {
        accepted: '¡Hola! 👋 Tu pedido de Krusty Burger ha sido *aceptado* y en breve empezaremos a prepararlo. ¡Gracias por tu paciencia!',
        preparing: '¡Hola! 👨‍🍳 Tu pedido de Krusty Burger ya está *en preparación*. Te avisaremos cuando esté listo.',
        ready: '¡Hola! 🎉 Tu pedido de Krusty Burger está *listo para recoger*. ¡Te esperamos!',
        onTheWay: '¡Hola! 🚗 Tu pedido de Krusty Burger va *en camino*. ¡Ya casi llega!',
        delivered: '¡Hola! ✅ Tu pedido de Krusty Burger ha sido *entregado*. ¡Esperamos que lo disfrutes! 🍔'
    };
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const message = encodeURIComponent(messages[orderStatus] || '¡Hola! Te escribimos de Krusty Burger respecto a tu pedido.');
    return `https://wa.me/${formattedPhone}?text=${message}`;
}
