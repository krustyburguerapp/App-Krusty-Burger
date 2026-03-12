const STORE_PHONE = '573025712968';

export function generateOrderWhatsAppURL(order) {
    const deliveryLabel = order.deliveryType === 'delivery' ? 'Domicilio' : 'Recoger en local';

    let paymentLabel = '';
    if (order.paymentMethod === 'efectivo') paymentLabel = `Efectivo${order.cashAmount > 0 ? ` (Paga con: $${order.cashAmount.toLocaleString('es-CO')})` : ''}`;
    else if (order.paymentMethod === 'nequi') paymentLabel = 'Nequi / Daviplata';
    else if (order.paymentMethod === 'tarjeta') paymentLabel = 'Tarjeta Fisica';
    else if (order.paymentMethod === 'pse') paymentLabel = 'PSE';

    const message = encodeURIComponent(
        `*Pedido Confirmado - Krusty Burger*\n\n` +
        `Pedido #${order.id ? order.id.slice(-6).toUpperCase() : '------'}\n` +
        `Cliente: ${order.userName}\n` +
        `Tel: ${order.userPhone}\n` +
        `Entrega: ${deliveryLabel}\n` +
        `${order.deliveryType === 'delivery' && order.userAddress ? `Direccion: ${order.userAddress}\n` : ''}` +
        `${order.userLocationUrl ? `Mapa GPS: ${order.userLocationUrl}\n` : ''}` +
        `${order.paymentMethod ? `Pago: ${paymentLabel}\n` : ''}` +
        `${order.orderNotes ? `Notas: ${order.orderNotes}\n` : ''}` +
        `\n*Tu pedido:*\n${order.items.map(i => `- ${i.quantity}x ${i.name} - $${i.price.toLocaleString('es-CO')}`).join('\n')}\n\n` +
        `*Total: $${order.total.toLocaleString('es-CO')}*\n` +
        `Tiempo estimado: ~${order.estimatedTime} min\n\n` +
        `Gracias por tu pedido!`
    );
    return `https://wa.me/${STORE_PHONE}?text=${message}`;
}

export function generateAdminWhatsAppURL(order, forceInitialMessage = false) {
    const cleanPhone = order.userPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

    const itemsSummary = order.items.map(i => `- ${i.quantity}x ${i.name} - $${i.price.toLocaleString('es-CO')}`).join('\n');
    const total = order.total.toLocaleString('es-CO');
    const time = order.estimatedTime || '40';
    let address = 'Recoger en local';
    if (order.deliveryType === 'delivery') {
        address = order.userLocationUrl || order.userAddress || 'No especificada';
    }

    let template = '';

    if (forceInitialMessage || order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing') {
        const notes = order.orderNotes ? `\n_Notas: ${order.orderNotes}_\n` : '';

        if (order.paymentMethod === 'efectivo') {
            const pagaCon = order.cashAmount ? order.cashAmount.toLocaleString('es-CO') : total;
            const cambio = order.cashAmount && order.cashAmount > order.total ? (order.cashAmount - order.total).toLocaleString('es-CO') : '0';
            template = `Hola!\nGracias por tu pedido en *Krusty Burger!*\n\nTu orden fue recibida correctamente y ya estamos preparandola con todo el sabor krusty.\n\n*Resumen de tu pedido*\n${itemsSummary}\n${notes}\n*Total: $${total}*\nTiempo estimado: ${time} minutos\nDireccion de entrega: ${address}\n\n*Pago en efectivo*\nNos indicaste que pagaras con $${pagaCon}\n\nTu cambio sera aproximadamente:\n$${cambio}\n\nNuestro domiciliario llevara el pedido hasta tu ubicacion.\n\nGracias por elegir *Krusty Burger!*\nEstamos cocinando algo brutal para ti.`;
        } else if (order.paymentMethod === 'nequi') {
            template = `Hola!\nGracias por tu pedido en *Krusty Burger!*\n\nYa estamos preparando tu pedido.\n\n*Resumen de tu pedido*\n${itemsSummary}\n${notes}\n*Total: $${total}*\nTiempo estimado: ${time} minutos\nDireccion de entrega: ${address}\n\n*Pago por Nequi o Daviplata*\n\nPuedes realizar el pago a la siguiente llave:\n\n*3234971723*\n\nUna vez realizado el pago, por favor envianos el comprobante por este chat para confirmar tu pedido.\n\nCuando el pago sea confirmado, tu pedido saldra inmediatamente.\n\nGracias por comprar en *Krusty Burger!*\nEstamos preparando algo delicioso para ti.`;
        } else if (order.paymentMethod === 'tarjeta') {
            template = `Hola!\nGracias por tu pedido en *Krusty Burger!*\n\nTu orden fue recibida y ya esta en preparacion.\n\n*Resumen de tu pedido*\n${itemsSummary}\n${notes}\n*Total: $${total}*\nTiempo estimado: ${time} minutos\nDireccion de entrega: ${address}\n\n*Pago con tarjeta*\n\nNuestro domiciliario llevara un datafono Bold para que puedas realizar el pago con tu tarjeta debito o credito al momento de la entrega.\n\nSolo ten tu tarjeta lista cuando llegue el pedido.\n\nGracias por elegir *Krusty Burger!*\nTu hamburguesa ya esta en camino a la parrilla.`;
        } else if (order.paymentMethod === 'pse') {
            template = `Hola!\nGracias por tu pedido en *Krusty Burger!*\n\nTu pedido ya esta siendo preparado.\n\n*Resumen de tu pedido*\n${itemsSummary}\n${notes}\n*Total: $${total}*\nTiempo estimado: ${time} minutos\nDireccion de entrega: ${address}\n\n*Pago por PSE*\n\nRealiza tu pago en el siguiente enlace:\n\nhttps://checkout.bold.co/payment/LNK_37W2GOSA74\n\nUna vez realizado el pago, envianos el comprobante por este chat para confirmar tu pedido.\n\nCuando el pago sea confirmado, tu pedido sera despachado.\n\nGracias por confiar en *Krusty Burger!*\nEstamos preparando algo increible para ti.`;
        } else {
            template = `Hola!\nGracias por tu pedido en *Krusty Burger!*\n${notes}\nTu orden fue recibida y ya esta en preparacion.\nGracias por elegir *Krusty Burger!*`;
        }
    } else {
        const messages = {
            preparing: 'Hola! Tu pedido de *Krusty Burger* ya esta *en preparacion*. Te avisaremos cuando este listo.',
            ready: 'Hola! Tu pedido de *Krusty Burger* esta *listo para recoger*. Te esperamos!',
            onTheWay: 'Hola! Tu pedido de *Krusty Burger* va *en camino*. Ya casi llega!',
            delivered: 'Hola! Tu pedido de *Krusty Burger* ha sido *entregado*. Esperamos que lo disfrutes!'
        };
        template = messages[order.status] || 'Hola! Te escribimos de Krusty Burger respecto a tu pedido.';
    }

    const message = encodeURIComponent(template);
    return `https://wa.me/${formattedPhone}?text=${message}`;
}
