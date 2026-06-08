export const CATEGORIES = [
    { id: 'individual', label: 'Individual', icon: 'person' },
    { id: 'familiar', label: 'Familiar', icon: 'groups' },
    { id: 'bebidas_pequenas', label: 'Bebidas Pequeñas', icon: 'local_drink' },
    { id: 'bebidas_medianas', label: 'Bebidas Medianas', icon: 'wine_bar' },
    { id: 'bebidas_grandes', label: 'Bebidas Grandes', icon: 'liquor' },
    { id: 'adicionales', label: 'Adicionales', icon: 'add_circle' }
];

export const INDIVIDUAL_SUBCATEGORIES = [
    { id: 'hamburguesas', label: 'Hamburguesas', icon: 'lunch_dining' },
    { id: 'salchipapas', label: 'Salchipapas', icon: 'fastfood' },
    { id: 'hot_dogs', label: 'Hot Dogs', icon: 'restaurant_menu' },
    { id: 'sandwiches', label: 'Sandwiches', icon: 'breakfast_dining' }
];

// NOTA: El menú de demostración (DEMO_PRODUCTS, datos falsos) fue eliminado.
// Si Firestore no devuelve productos, el menú muestra un aviso de fallas técnicas
// con contacto por WhatsApp en lugar de productos inventados.
// Ver: src/pages/Menu/Menu.jsx y src/contexts/ProductsContext.jsx
