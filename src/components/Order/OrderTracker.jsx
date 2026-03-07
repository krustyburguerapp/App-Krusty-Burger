import { getStatusLabel, getStatusIcon, getStatusColor } from '../../hooks/useOrders';
import './OrderTracker.css';

const STEPS = ['pending', 'accepted', 'preparing', 'ready', 'delivered'];
const STEPS_DELIVERY = ['pending', 'accepted', 'preparing', 'onTheWay', 'delivered'];

export default function OrderTracker({ order }) {
    const steps = order.deliveryType === 'delivery' ? STEPS_DELIVERY : STEPS;
    const currentIndex = steps.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="order-tracker">
            {order.estimatedTime > 0 && !isCancelled && order.status !== 'delivered' && (
                <div className="order-tracker-time">
                    <span className="material-icons-round">schedule</span>
                    Tiempo estimado: ~{order.estimatedTime} min
                </div>
            )}
            <div className="tracker-steps">
                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex && !isCancelled;
                    const isCurrent = index === currentIndex && !isCancelled;
                    return (
                        <div key={step} className={`tracker-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                            <div className="tracker-step-dot" style={isCompleted ? { background: getStatusColor(step) } : {}}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>
                                    {isCompleted ? (isCurrent ? getStatusIcon(step) : 'check') : getStatusIcon(step)}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`tracker-step-line ${isCompleted && index < currentIndex ? 'completed' : ''}`} />
                            )}
                            <span className="tracker-step-label">{getStatusLabel(step)}</span>
                        </div>
                    );
                })}
            </div>
            {isCancelled && (
                <div className="order-tracker-cancelled">
                    <span className="material-icons-round">cancel</span>
                    Pedido cancelado
                </div>
            )}
        </div>
    );
}
