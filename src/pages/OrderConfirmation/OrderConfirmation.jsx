import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { generateOrderWhatsAppURL } from '../../utils/whatsappConfirm';
import './OrderConfirmation.css';

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const order = location.state?.order;

    if (!order) {
        return (
            <div className="page">
                <div className="container confirmation-container">
                    <div className="confirmation-card">
                        <span className="material-icons-round confirmation-icon" style={{ color: 'var(--color-success)' }}>check_circle</span>
                        <h2>¡Pedido Creado!</h2>
                        <p>Tu pedido ha sido registrado exitosamente.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/orders')}>
                            <span className="material-icons-round">receipt_long</span>
                            Ver mis pedidos
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const whatsappURL = generateOrderWhatsAppURL(order);

    return (
        <div className="page">
            <div className="container confirmation-container">
                <div className="confirmation-card">
                    <div className="confirmation-success-icon">
                        <span className="material-icons-round">check</span>
                    </div>
                    <h2>¡Pedido Confirmado!</h2>
                    <p className="confirmation-order-id">Pedido #{orderId?.slice(-6).toUpperCase()}</p>

                    <div className="confirmation-details">
                        <div className="confirmation-detail-row">
                            <span className="material-icons-round">schedule</span>
                            <span>Tiempo estimado: <strong>~{order.estimatedTime} min</strong></span>
                        </div>
                        <div className="confirmation-detail-row">
                            <span className="material-icons-round">{order.deliveryType === 'delivery' ? 'delivery_dining' : 'storefront'}</span>
                            <span>{order.deliveryType === 'delivery' ? 'Domicilio' : 'Recoger en local'}</span>
                        </div>
                        <div className="confirmation-detail-row">
                            <span className="material-icons-round">payments</span>
                            <span>Total: <strong>${order.total.toLocaleString('es-CO')}</strong></span>
                        </div>
                    </div>

                    <div className="confirmation-items">
                        {order.items.map((item) => (
                            <div key={item.productId} className="confirmation-item">
                                <span>{item.quantity}x {item.name}</span>
                                <span>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                            </div>
                        ))}
                    </div>

                    <a href={whatsappURL} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-full confirmation-whatsapp-btn">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Confirmar por WhatsApp
                    </a>

                    <div className="confirmation-actions">
                        <button className="btn btn-outline btn-full" onClick={() => navigate('/orders')}>
                            <span className="material-icons-round">receipt_long</span>
                            Seguir mi pedido
                        </button>
                        <button className="btn btn-ghost btn-full" onClick={() => navigate('/menu')}>
                            Volver al menú
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
