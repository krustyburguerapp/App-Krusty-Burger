import { useState, useMemo, useEffect } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import ProductCard from '../../components/Product/ProductCard';
import ProductBuilderModal from '../../components/Product/ProductBuilderModal';
import CategoryFilter from '../../components/Product/CategoryFilter';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import PrizeRedemptionBanner from '../../components/UI/PrizeRedemptionBanner';
import { getRestaurantSettings, isRestaurantOpen, getBusinessHoursText, formatTime12 } from '../../config/restaurantSettings';
import { INDIVIDUAL_SUBCATEGORIES } from '../../data/menuData';
import './Menu.css';

export default function Menu() {
    const { products, loading } = useProducts();
    const [activeCategory, setActiveCategory] = useState('individual');
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [restaurantSettings, setRestaurantSettings] = useState(null);

    useEffect(() => {
        getRestaurantSettings()
            .then(setRestaurantSettings)
            .catch(err => console.error('Error cargando configuración:', err));
    }, []);

    const storeIsOpen = restaurantSettings ? isRestaurantOpen(restaurantSettings) : true;

    const { featuredList, groupedProducts, regularList, hasResults } = useMemo(() => {
        const filtered = products.filter((p) => {
            // Ocultar categorías de ventas cruzadas (cross-selling) del panel principal
            if (['bebidas_pequenas', 'bebidas_medianas', 'bebidas_grandes', 'adicionales'].includes(p.category)) {
                return false;
            }
            const matchCategory = p.category === activeCategory;
            const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
            return matchCategory && matchSearch;
        });

        const featuredList = filtered.filter(p => p.featured || (p.promoActive && p.promoPrice));

        let groupedProducts = null;
        let regularList = null;

        if (activeCategory === 'individual') {
            groupedProducts = {};
            INDIVIDUAL_SUBCATEGORIES.forEach(sub => {
                groupedProducts[sub.id] = [];
            });
            groupedProducts['otros'] = [];

            filtered.forEach(p => {
                const subId = p.subCategory || 'otros';
                if (groupedProducts[subId]) {
                    groupedProducts[subId].push(p);
                } else {
                    groupedProducts['otros'].push(p);
                }
            });
        } else {
            regularList = filtered;
        }

        return {
            featuredList,
            groupedProducts,
            regularList,
            hasResults: filtered.length > 0
        };
    }, [products, activeCategory, search]);

    if (loading) return <div className="page"><Spinner size="lg" /></div>;

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
    };

    return (
        <div className="page">
            <div className="container">
                <PrizeRedemptionBanner />

                {!storeIsOpen && restaurantSettings && (
                    <div className="store-closed-banner">
                        <span className="material-icons-round">schedule</span>
                        <div>
                            <strong>Estamos cerrados</strong>
                            {restaurantSettings.closedToday ? (
                                <p>Hoy no hay servicio. Vuelve mañana.</p>
                            ) : (
                                <>
                                    <p>Horario: {getBusinessHoursText(restaurantSettings)}</p>
                                    <p>Abrimos a las {formatTime12(restaurantSettings.openingTime)}</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <div className="menu-header">
                    <h2 className="menu-title">Nuestro Menú</h2>
                    <div className="menu-search">
                        <span className="material-icons-round menu-search-icon">search</span>
                        <input
                            type="text"
                            className="input-field menu-search-input"
                            placeholder="Buscar productos..."
                            aria-label="Buscar productos en el menú"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <CategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
                {!hasResults ? (
                    <EmptyState icon="search_off" title="Sin resultados" message="No encontramos productos con ese criterio" />
                ) : (
                    <div className="menu-sections-container">
                        {featuredList.length > 0 && (
                            <div className="menu-section">
                                <h3 className="section-divider"><span>★ Destacados</span></h3>
                                <div className="menu-grid">
                                    {featuredList.map((product, index) => (
                                        <ProductCard key={product.id} product={product} index={index} onSelect={handleProductSelect} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {groupedProducts && (
                            <>
                                {INDIVIDUAL_SUBCATEGORIES.map(subCategory => {
                                    const items = groupedProducts[subCategory.id];
                                    if (!items || items.length === 0) return null;
                                    return (
                                        <div className="menu-section" key={subCategory.id}>
                                            <h3 className="section-divider"><span>{subCategory.label}</span></h3>
                                            <div className="menu-grid">
                                                {items.map((product, index) => (
                                                    <ProductCard key={product.id} product={product} index={index} onSelect={handleProductSelect} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {groupedProducts['otros'] && groupedProducts['otros'].length > 0 && (
                                    <div className="menu-section">
                                        <h3 className="section-divider"><span>Más opciones</span></h3>
                                        <div className="menu-grid">
                                            {groupedProducts['otros'].map((product, index) => (
                                                <ProductCard key={product.id} product={product} index={index} onSelect={handleProductSelect} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {regularList && regularList.length > 0 && (
                            <div className="menu-section">
                                {featuredList.length > 0 && <h3 className="section-divider"><span>Todo el menú</span></h3>}
                                <div className="menu-grid">
                                    {regularList.map((product, index) => (
                                        <ProductCard key={product.id} product={product} index={index} onSelect={handleProductSelect} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ProductBuilderModal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                product={selectedProduct}
            />
        </div>
    );
}
