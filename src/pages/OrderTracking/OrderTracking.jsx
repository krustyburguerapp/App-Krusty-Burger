import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders, getStatusLabel, getStatusColor } from '../../contexts/OrdersContext';
import OrderTracker from '../../components/Order/OrderTracker';
import FloatingEmojis, { getInsistEmoji, getInsistLabel } from '../../components/UI/FloatingEmojis';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import { getUserStamps, hasUserClaimedPrize, startPrizeRedemption } from '../../utils/loyaltySystem';
import './OrderTracking.css';

export default function OrderTracking() {
    const navigate = useNavigate();
    const { user, userData } = useAuth(); // Agregar userData al hook
    const { orders, loading, error, sendInsist } = useOrders();
    const [insistTriggers, setInsistTriggers] = useState({});
    const [loyaltyStamps, setLoyaltyStamps] = useState(0);
    const [prizeClaimed, setPrizeClaimed] = useState(false);
    const [loadingLoyalty, setLoadingLoyalty] = useState(true);
    const [claimingPrize, setClaimingPrize] = useState(false);

    const handleInsistReal = async (orderId) => {
        setInsistTriggers(prev => ({ ...prev, [orderId]: (prev[orderId] || 0) + 1 }));
        await sendInsist(orderId);
    };

    // Cargar sellos del usuario desde Firestore
    useEffect(() => {
        const loadLoyalty = async () => {
            if (!user) return;
            const stampData = await getUserStamps(user.uid);
            if (stampData) {
                setLoyaltyStamps(stampData.stamps || 0);
                setPrizeClaimed(stampData.prizeClaimed || false);
            }
            setLoadingLoyalty(false);
        };
        loadLoyalty();
    }, [user]);

    if (loading) return <div className="page"><Spinner size="lg" /></div>;

    if (error) return (
        <div className="page">
            <div className="container orders-container">
                <EmptyState icon="wifi_off" title="No pudimos cargar tus pedidos" message="Verifica tu conexion e intenta recargar la pagina" />
            </div>
        </div>
    );

    const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    const pastOrders = orders.filter((o) => o.status === 'delivered');

    useEffect(() => {
        // Mostrar popup si la persona tiene exactamente 1 sello ganado (su primer pedido del mes)
        if (loyaltyStamps >= 1 && activeOrders.length === 0 && !prizeClaimed) {
            const currentMonthKey = `krusty_loyalty_popup_${new Date().getMonth()}_${new Date().getFullYear()}`;
            const hasSeenPopup = localStorage.getItem(currentMonthKey);

            if (!hasSeenPopup && loyaltyStamps < 7) {
                setTimeout(() => {
                    Swal.fire({
                        title: '¡Llevas 1 Sello Krusty! 🎯',
                        html: 'Recuerda que si acumulas compras en 7 días distintos durante este mismo mes, ¡te regalamos una <b>comida individual GRATIS + Bebida pequeña</b>! 🍔🥤',
                        icon: 'info',
                        confirmButtonText: '¡Entendido!',
                        confirmButtonColor: 'var(--color-primary)'
                    });
                    localStorage.setItem(currentMonthKey, 'true');
                }, 1000);
            }
        }
    }, [loyaltyStamps, activeOrders.length, prizeClaimed]);

    const handleLoyaltyClick = async () => {
        if (prizeClaimed) {
            Swal.fire({
                title: 'Premio ya Reclamado 🎉',
                html: 'Ya reclamaste tu premio este mes. ¡Pero puedes seguir acumulando para el próximo mes!',
                icon: 'success',
                confirmButtonColor: 'var(--color-primary)'
            });
        } else if (loyaltyStamps >= 7) {
            const result = await Swal.fire({
                title: '¡FELICIDADES! 🏆',
                html: `
                    <div style="text-align: left; padding: 20px 0;">
                        <p style="margin-bottom: 15px;">
                            Has completado tus 7 sellos este mes.
                        </p>
                        <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 15px; border-radius: 10px; color: white; text-align: center; margin: 15px 0;">
                            <h3 style="margin: 0 0 10px 0;">🍔 COMIDA GRATIS</h3>
                            <p style="margin: 0; font-size: 14px;">Comida Individual + Bebida Pequeña</p>
                        </div>
                        <p style="font-size: 13px; color: #666; margin-top: 15px;">
                            ⚠️ Los adicionales van por separado.
                        </p>
                    </div>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: '🎁 Reclamar mi premio AHORA',
                cancelButtonText: 'Cerrar',
                confirmButtonColor: 'var(--color-primary)',
                cancelButtonColor: '#666',
                reverseButtons: true
            });

            if (result.isConfirmed) {
                // Confirmación final antes de reclamar
                const confirm = await Swal.fire({
                    title: '¿Confirmar reclamo?',
                    html: `
                        <p style="margin-bottom: 15px;">
                            Estás a punto de reclamar tu premio de 7 sellos.
                        </p>
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
                            <p style="margin: 0; font-size: 14px;">
                                ✅ Serás llevado al menú<br>
                                ✅ Debes elegir 1 comida individual + 1 bebida pequeña<br>
                                ✅ Esos items salen GRATIS<br>
                                ✅ Tus sellos se reiniciarán al confirmar el pedido
                            </p>
                        </div>
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, ir al menú',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--color-primary)',
                    cancelButtonColor: '#666'
                });

                if (confirm.isConfirmed) {
                    // Iniciar proceso de reclamo
                    const redemptionResult = await startPrizeRedemption(user.uid, userData);

                    if (redemptionResult.success) {
                        // Redirigir al menú
                        navigate('/menu');
                    } else {
                        await Swal.fire({
                            title: 'Error al iniciar reclamo',
                            text: redemptionResult.error || 'Hubo un error',
                            icon: 'error',
                            confirmButtonColor: 'var(--color-primary)'
                        });
                    }
                }
            }
        } else {
            Swal.fire({
                title: 'Programa de Fidelidad 🍔',
                html: `Llevas <b>${loyaltyStamps}</b> de 7 sellos este mes.<br><br>Ganas un sello por cada día distinto en que hagas un pedido completado.<br><br><i>¡Completa los 7 en el mismo mes y <b>gana una comida individual GRATIS + bebida pequeña</b>!</i><br><br><small style="opacity:0.7">⚠️ Los adicionales van por separado.</small>`,
                icon: 'question',
                confirmButtonText: 'Genial',
                confirmButtonColor: 'var(--color-primary)'
            });
        }
    };
    // -------------------------------------------

    return (
        <div className="page">
            <div className="container orders-container">
                <h2>Mis Pedidos</h2>

                {orders.length === 0 ? (
                    <EmptyState icon="receipt_long" title="Aun no tienes pedidos" message="Cuando hagas tu primer pedido, aparecera aqui" />
                ) : (
                    <>
                        {activeOrders.length > 0 && (
                            <div className="orders-section">
                                <h3 className="orders-section-title">
                                    <span className="material-icons-round" style={{ color: 'var(--color-primary)' }}>pending</span>
                                    Pedidos Activos
                                </h3>
                                {activeOrders.map((order) => {
                                    const level = order.insistCount || 0;
                                    return (
                                        <div key={order.id} className="order-card-full" style={{ position: 'relative', overflow: 'hidden' }}>
                                            <FloatingEmojis
                                                emoji={getInsistEmoji(level)}
                                                trigger={insistTriggers[order.id] || 0}
                                            />
                                            <div className="order-card-header">
                                                <span className="order-card-id">#{order.id.slice(-6).toUpperCase()}</span>
                                                <span className="order-status-chip" style={{ background: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}>
                                                    {getStatusLabel(order.status)}
                                                </span>
                                            </div>
                                            <OrderTracker order={order} />
                                            <div className="order-card-items">
                                                {order.items.map((item, i) => (
                                                    <span key={i}>{item.quantity}x {item.name}</span>
                                                ))}
                                            </div>
                                            <div className="order-card-total">
                                                <span>Total</span>
                                                <span>${order.total?.toLocaleString('es-CO')}</span>
                                            </div>
                                            {['pending', 'accepted', 'preparing', 'ready'].includes(order.status) && (
                                                <InsistButton order={order} onInsistReal={handleInsistReal} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* SECCIÓN FIDELIDAD EN VEZ DEL HISTORIAL */}
                        <div className="loyalty-card" onClick={handleLoyaltyClick}>
                            <div className="loyalty-header">
                                <div>
                                    <h3 className="loyalty-title">Sellos Krusty</h3>
                                    <p className="loyalty-subtitle">
                                        {loyaltyStamps >= 7
                                            ? '¡Completaste los 7 sellos!'
                                            : loyaltyStamps === 6
                                                ? '¡Falta 1 sello para tu comida gratis!'
                                                : `Faltan ${7 - loyaltyStamps} sellos para tu comida gratis`}
                                    </p>
                                </div>
                                <span className="material-icons-round" style={{ color: 'var(--color-primary)', fontSize: 28, opacity: 0.8 }}>card_membership</span>
                            </div>
                            <div className="stamps-container">
                                {[...Array(7)].map((_, index) => {
                                    const isEarned = index < loyaltyStamps;
                                    const isPrize = index === 6; // El septimo sello (índice 6)
                                    return (
                                        <div
                                            key={index}
                                            className={`stamp-slot ${isEarned ? 'earned' : ''} ${isEarned && isPrize ? 'free-burger' : ''}`}
                                            title={isPrize ? "¡Hamburguesa Gratis!" : `Día de compra ${index + 1}`}
                                        >
                                            {isEarned && isPrize ? (
                                                <span className="stamp-prize">🍔</span>
                                            ) : isEarned ? (
                                                <img src="/logo.webp" alt="Sello" className="stamp-image" />
                                            ) : (
                                                <span className="stamp-number">{index + 1}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const REQUIRED_CLICKS = [7, 10, 13, 16, 20]; // 5 Niveles reducidos
const MAX_LEVEL = 5;

function InsistButton({ order, onInsistReal }) {
    const level = order.insistCount || 0;
    const isMax = level >= MAX_LEVEL;
    const [clicks, setClicks] = useState(0);

    useEffect(() => {
        if (isMax || clicks === 0) return;
        const timer = setInterval(() => {
            setClicks(prev => Math.max(0, prev - 1));
        }, 220); // Pierde rápidez (decay timer) - Más lento (más fácil)
        return () => clearInterval(timer);
    }, [clicks, isMax]);

    const handleClick = () => {
        if (isMax) {
            Swal.fire({
                title: '¡MAXIMA INTENSIDAD!',
                text: 'Eres el cliente más intenso del día de hoy jeje 👑',
                icon: 'success',
                confirmButtonColor: 'var(--color-primary)'
            });
            return;
        }

        const required = REQUIRED_CLICKS[Math.min(level, REQUIRED_CLICKS.length - 1)];
        const newClicks = clicks + 1;

        if (newClicks >= required) {
            setClicks(0);
            onInsistReal(order.id);
            if (level + 1 >= MAX_LEVEL) {
                Swal.fire({
                    title: '¡GANASTE!',
                    text: 'Eres el cliente más intenso del día de hoy jeje 🏆',
                    icon: 'success',
                    backdrop: `rgba(0,0,0,0.4) url("https://i.gifer.com/origin/d3/d3f472b06590a25cb4372ff289d81711_w200.gif") center top no-repeat`,
                    confirmButtonColor: 'var(--color-primary)'
                });
            }
        } else {
            setClicks(newClicks);
        }
    };

    const required = REQUIRED_CLICKS[Math.min(level, REQUIRED_CLICKS.length - 1)];
    const progress = isMax ? 100 : Math.min(100, (clicks / required) * 100);
    const displayLevel = Math.min(level, MAX_LEVEL);

    return (
        <button
            className={`btn btn-sm insist-game-btn ${clicks > 0 ? 'active' : ''}`}
            onClick={handleClick}
            style={{
                marginTop: '10px', width: '100%', position: 'relative', overflow: 'hidden', padding: '12px',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                background: displayLevel <= 1 ? '#FFF8E1' :
                    displayLevel === 2 ? '#FFF9C4' :
                        displayLevel === 3 ? '#FFCDD2' :
                            displayLevel === 4 ? '#FF5252' :
                                'linear-gradient(135deg, #FFD700, #FF8C00)',
                color: displayLevel === 4 ? '#fff' : '#333'
            }}
        >
            <div className="insist-progress-fill" style={{
                width: `${progress}%`,
                background: displayLevel === 4 || displayLevel === 5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
            }} />
            <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                <span style={{ fontSize: '20px' }}>{getInsistEmoji(displayLevel)}</span>
                {isMax ? '¡NIVEL MÁXIMO!' : (clicks > 0 ? `¡TOCA RÁPIDO! (${clicks}/${required})` : getInsistLabel(displayLevel))}
                {displayLevel > 0 && !isMax && <span style={{ opacity: 0.6, fontSize: '12px' }}>Nvl {displayLevel}</span>}
            </span>
        </button>
    );
}

