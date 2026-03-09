import { CATEGORIES } from '../../data/menuData';
import './CategoryFilter.css';

export default function CategoryFilter({ activeCategory, onCategoryChange }) {
    return (
        <div className="category-filter">
            <button
                className={`chip ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => onCategoryChange('all')}
            >
                <span className="material-icons-round" style={{ fontSize: 18 }}>apps</span>
                Todos
            </button>
            {CATEGORIES.filter(c => c.id !== 'bebidas' && c.id !== 'adicionales').map((cat) => (
                <button
                    key={cat.id}
                    className={`chip ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => onCategoryChange(cat.id)}
                >
                    <span className="material-icons-round" style={{ fontSize: 18 }}>{cat.icon}</span>
                    {cat.label}
                </button>
            ))}
        </div>
    );
}
