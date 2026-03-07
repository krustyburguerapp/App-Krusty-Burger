import { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { CATEGORIES } from '../../data/menuData';
import Modal from '../../components/UI/Modal';
import Spinner from '../../components/UI/Spinner';
import EmptyState from '../../components/UI/EmptyState';
import { showToast } from '../../utils/notifications';
import './AdminProducts.css';

export default function AdminProducts() {
    const { products, loading, addProduct, updateProduct, deleteProduct, toggleAvailability } = useProducts();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', description: '', price: '', category: 'hamburguesas', available: true, featured: false, order: 0
    });

    const openNew = () => {
        setEditingProduct(null);
        setForm({ name: '', description: '', price: '', category: 'hamburguesas', available: true, featured: false, order: products.length + 1 });
        setImageFile(null);
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name, description: product.description, price: product.price.toString(),
            category: product.category, available: product.available, featured: product.featured, order: product.order || 0
        });
        setImageFile(null);
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.price) {
            showToast('Completa nombre y precio', 'error');
            return;
        }
        setSaving(true);
        const productData = {
            name: form.name.trim(),
            description: form.description.trim(),
            price: parseInt(form.price) || 0,
            category: form.category,
            available: form.available,
            featured: form.featured,
            order: parseInt(form.order) || 0
        };
        let result;
        if (editingProduct) {
            result = await updateProduct(editingProduct.id, productData, imageFile);
        } else {
            result = await addProduct(productData, imageFile);
        }
        setSaving(false);
        if (result.success) {
            setModalOpen(false);
            showToast(editingProduct ? 'Producto actualizado' : 'Producto creado', 'success');
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    };

    const handleDelete = async (product) => {
        if (!confirm(`¿Eliminar "${product.name}"?`)) return;
        const result = await deleteProduct(product.id);
        if (result.success) showToast('Producto eliminado', 'success');
        else showToast('Error al eliminar', 'error');
    };

    if (loading) return <div className="page admin-page"><Spinner size="lg" /></div>;

    return (
        <div className="page admin-page">
            <div className="container admin-container">
                <div className="admin-products-header">
                    <h2 style={{ color: 'var(--color-text-on-dark)' }}>Productos</h2>
                    <button className="btn btn-primary" onClick={openNew}>
                        <span className="material-icons-round" style={{ fontSize: 18 }}>add</span>
                        Nuevo
                    </button>
                </div>

                {products.length === 0 ? (
                    <EmptyState icon="inventory_2" title="Sin productos" message="Agrega tu primer producto al menú" />
                ) : (
                    <div className="admin-products-list">
                        {products.map((product) => (
                            <div key={product.id} className="admin-product-row">
                                <div className="admin-product-img">
                                    {product.imageURL ? (
                                        <img src={product.imageURL} alt={product.name} />
                                    ) : (
                                        <div className="admin-product-placeholder">🍔</div>
                                    )}
                                </div>
                                <div className="admin-product-info">
                                    <span className="admin-product-name">{product.name}</span>
                                    <span className="admin-product-cat">{CATEGORIES.find((c) => c.id === product.category)?.label || product.category}</span>
                                </div>
                                <span className="admin-product-price">${product.price.toLocaleString('es-CO')}</span>
                                <div className="admin-product-actions">
                                    <button
                                        className={`btn btn-sm ${product.available ? 'btn-ghost' : 'btn-outline'}`}
                                        style={{ color: product.available ? 'var(--color-success)' : 'var(--color-error)' }}
                                        onClick={() => toggleAvailability(product.id, product.available)}
                                        title={product.available ? 'Desactivar' : 'Activar'}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 18 }}>{product.available ? 'toggle_on' : 'toggle_off'}</span>
                                    </button>
                                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(product)}>
                                        <span className="material-icons-round" style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>edit</span>
                                    </button>
                                    <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(product)}>
                                        <span className="material-icons-round" style={{ fontSize: 18, color: '#E53935' }}>delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'} size="md">
                    <div className="admin-product-form">
                        <div className="input-group">
                            <label>Nombre</label>
                            <input type="text" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Krusty Burger Clásica" />
                        </div>
                        <div className="input-group">
                            <label>Descripción</label>
                            <textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Ingredientes y detalles del producto" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="input-group">
                                <label>Precio (COP)</label>
                                <input type="number" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="18000" />
                            </div>
                            <div className="input-group">
                                <label>Categoría</label>
                                <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Imagen del producto</label>
                            <input type="file" accept="image/*" className="input-field" onChange={(e) => setImageFile(e.target.files[0])} />
                            {editingProduct?.imageURL && !imageFile && (
                                <small style={{ color: 'var(--color-text-hint)' }}>Ya tiene imagen. Sube una nueva para reemplazarla.</small>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
                                Disponible
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                                Destacado
                            </label>
                        </div>
                        <button className="btn btn-primary btn-lg btn-full" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : (editingProduct ? 'Guardar Cambios' : 'Crear Producto')}
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
