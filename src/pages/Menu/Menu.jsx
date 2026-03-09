import { useState, useMemo } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import ProductCard from '../../components/Product/ProductCard';
import CategoryFilter from '../../components/Product/CategoryFilter';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import { getStoreStatus, getBusinessHoursText, getNextOpenTime } from '../../utils/businessHours';
import './Menu.css';

export default function Menu() {
    const { products, loading } = useProducts();
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const storeStatus = getStoreStatus();

    const filtered = useMemo(() => {
        return products
            .filter((p) => {
                // Ocultar categorías de ventas cruzadas (cross-selling) del panel principal
                if (['bebidas', 'bebidas_familiares', 'adicionales'].includes(p.category)) {
                    return false;
                }
                const matchCategory = activeCategory === 'all' || p.category === activeCategory;
                const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
                return matchCategory && matchSearch;
            })
            .sort((a, b) => {
                // Destacados primero
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return 0; // Mantener orden original si ambos son o no son destacados
            });
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
                {filtered.length === 0 ? (
                    <EmptyState icon="search_off" title="Sin resultados" message="No encontramos productos con ese criterio" />
                ) : (
                    <div className="menu-grid">
                        {filtered.map((product, index) => (
                            <ProductCard key={product.id} product={product} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
