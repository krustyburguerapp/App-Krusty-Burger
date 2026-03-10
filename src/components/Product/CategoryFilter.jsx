import { CATEGORIES } from '../../data/menuData';
import './CategoryFilter.css';

export default function CategoryFilter({ activeCategory, onCategoryChange }) {
    return (
        <div className="category-filter">

            {CATEGORIES.filter(c => !['bebidas_pequenas', 'bebidas_medianas', 'bebidas_grandes', 'adicionales'].includes(c.id)).map((cat) => (
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
