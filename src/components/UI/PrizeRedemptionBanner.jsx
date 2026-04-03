import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrizeRedemptionState, clearPrizeRedemptionState } from '../../utils/loyaltySystem';
import { useCart } from '../../contexts/CartContext';
import './PrizeRedemptionBanner.css';

export default function PrizeRedemptionBanner() {
    const navigate = useNavigate();
    const { hasRequiredPrizeItems, isPrizeRedemptionActive } = useCart();
    const [redemptionState, setRedemptionState] = useState(null);

    useEffect(() => {
        const state = getPrizeRedemptionState();
        setRedemptionState(state);
    }, []);

    if (!redemptionState) return null;

    const handleCancel = () => {
        clearPrizeRedemptionState();
        navigate('/menu');
    };

    const hasRequiredItems = hasRequiredPrizeItems();

    return (
        <div className="prize-redemption-banner">
            <div className="prize-redemption-content">
                <div className="prize-redemption-icon">
                    <span className="material-icons-round">card_giftcard</span>
                </div>
                <div className="prize-redemption-text">
                    <h3>🎁 Reclamo de Premio - 7 Sellos</h3>
                    <p>
                        {hasRequiredItems 
                            ? '✅ ¡Tienes 1 comida individual + 1 bebida pequeña! Esos items salen GRATIS.'
                            : 'Selecciona 1 comida individual y 1 bebida pequeña para tu premio gratis.'
                        }
                    </p>
                </div>
                <button 
                    className="prize-redemption-cancel"
                    onClick={handleCancel}
                    title="Cancelar reclamo"
                >
                    <span className="material-icons-round">close</span>
                </button>
            </div>
            {!hasRequiredItems && isPrizeRedemptionActive && (
                <div className="prize-redemption-progress">
                    <div className="prize-redemption-items">
                        <div className={`prize-item ${redemptionState.hasFood ? 'completed' : ''}`}>
                            <span className="material-icons-round">
                                {redemptionState.hasFood ? 'check_circle' : 'lunch_dining'}
                            </span>
                            <span>Comida Individual</span>
                        </div>
                        <div className={`prize-item ${redemptionState.hasDrink ? 'completed' : ''}`}>
                            <span className="material-icons-round">
                                {redemptionState.hasDrink ? 'check_circle' : 'local_drink'}
                            </span>
                            <span>Bebida Pequeña</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
