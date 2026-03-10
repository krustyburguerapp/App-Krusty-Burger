import { useState, useMemo } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import ProductCard from '../../components/Product/ProductCard';
import CategoryFilter from '../../components/Product/CategoryFilter';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import { getStoreStatus, getBusinessHoursText, getNextOpenTime } from '../../utils/businessHours';
import { INDIVIDUAL_SUBCATEGORIES } from '../../data/menuData';
import './Menu.css';

export default function Menu() {
    const { products, loading } = useProducts();
    const [activeCategory, setActiveCategory] = useState('individual');
    const [search, setSearch] = useState('');
    const storeStatus = getStoreStatus();

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

        const featuredList = filtered.filter(p => p.featured);

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

    return (
        <div className="page">
            <div className="container">
                {storeStatus === 'closed' && (
                    <div className="store-closed-banner">
                        <span className="material-icons-round">schedule</span>
                        <div>
                            <strong>Estamos cerrados</strong>
                            <p>Domicilio: {getBusinessHoursText('delivery')} | Recoger: {getBusinessHoursText('pickup')}</p>
                            <p>Abrimos {getNextOpenTime()}</p>
                        </div>
                    </div>
                )}
                {storeStatus === 'pickup-only' && (
                    <div className="store-pickup-banner">
                        <span className="material-icons-round">info</span>
                        <div>
                            <strong>Solo recogida en local</strong>
                            <p>El domicilio cierra a las {getBusinessHoursText('delivery').split(' - ')[1]}</p>
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
                                        <ProductCard key={product.id} product={product} index={index} />
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
                                                    <ProductCard key={product.id} product={product} index={index} />
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
                                                <ProductCard key={product.id} product={product} index={index} />
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
                                        <ProductCard key={product.id} product={product} index={index} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
