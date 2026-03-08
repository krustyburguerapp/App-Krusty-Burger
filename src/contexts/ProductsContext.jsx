import { createContext, useContext, useState, useEffect } from 'react';
import { db, storage, isDemoMode } from '../config/firebase';
import {
    collection, query, orderBy, onSnapshot, doc, getDocsFromCache,
    addDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';
import { DEMO_PRODUCTS } from '../data/menuData';

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isDemoMode) {
            setProducts(DEMO_PRODUCTS);
            setLoading(false);
            return;
        }

        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('order', 'asc'));

        let productsLoadedFromCache = false;

        // 1. INTENTO DE CACHÉ (Carga Inmediata)
        const loadFromCache = async () => {
            try {
                const cachedDocs = await getDocsFromCache(q);
                if (!cachedDocs.empty) {
                    const productsData = cachedDocs.docs.map(d => ({ id: d.id, ...d.data() }));
                    setProducts(productsData);
                    setLoading(false);
                    productsLoadedFromCache = true;
                    console.log('✅ Productos cargados desde caché');
                }
            } catch (error) {
                console.log('ℹ️ Caché de productos vacío o no disponible.');
            }
        };

        loadFromCache();

        // 2. TIMEOUT DE SEGURIDAD (Evita cargar infinto si no hay caché y red está lenta)
        const safetyTimeout = setTimeout(() => {
            if (loading && !productsLoadedFromCache) {
                console.warn('⚠️ Timeout esperando a Firestore para productos, usando demostración.');
                setProducts(DEMO_PRODUCTS);
                setLoading(false);
                setError('Demostrando menú por defecto por conexión lenta.');
            }
        }, 2500);

        // 3. RECUPERACIÓN / ACTUALIZACIÓN EN SEGUNDO PLANO
        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(safetyTimeout);
            const productsData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));

            setProducts(productsData.length > 0 ? productsData : DEMO_PRODUCTS);
            setLoading(false);
            setError(null);
        }, (err) => {
            clearTimeout(safetyTimeout);
            console.error('Error sincronizando productos de Firebase:', err.message);
            if (!productsLoadedFromCache && products.length === 0) {
                setProducts(DEMO_PRODUCTS); // Fallback amigable
                setError('Modo sin conexión. Demostrando menú por defecto.');
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimeout);
            unsubscribe();
        };
    }, []);

    const addProduct = async (productData, imageFile) => {
        if (isDemoMode) return { success: false, error: 'Acción no permitida en Modo Demo' };
        try {
            let imageURL = '';
            const docRef = await addDoc(collection(db, 'products'), {
                ...productData,
                imageURL: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            if (imageFile) {
                const compressed = await compressImage(imageFile);
                const storageRef = ref(storage, `products/${docRef.id}/image.webp`);
                await uploadBytes(storageRef, compressed);
                imageURL = await getDownloadURL(storageRef);
                await updateDoc(doc(db, 'products', docRef.id), { imageURL });
            }
            return { success: true, productId: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updateProduct = async (productId, productData, imageFile) => {
        if (isDemoMode) return { success: false, error: 'Acción no permitida en Modo Demo' };
        try {
            const updateData = { ...productData, updatedAt: serverTimestamp() };
            if (imageFile) {
                const compressed = await compressImage(imageFile);
                const storageRef = ref(storage, `products/${productId}/image.webp`);
                await uploadBytes(storageRef, compressed);
                updateData.imageURL = await getDownloadURL(storageRef);
            }
            await updateDoc(doc(db, 'products', productId), updateData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const deleteProduct = async (productId) => {
        if (isDemoMode) return { success: false, error: 'Acción no permitida en Modo Demo' };
        try {
            try {
                const storageRef = ref(storage, `products/${productId}/image.webp`);
                await deleteObject(storageRef);
            } catch (e) {
                /* Image might not exist, that's fine */
            }
            await deleteDoc(doc(db, 'products', productId));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const toggleAvailability = async (productId, available) => {
        if (isDemoMode) return { success: false, error: 'Acción no permitida en Modo Demo' };
        try {
            await updateDoc(doc(db, 'products', productId), {
                available: !available,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <ProductsContext.Provider value={{ products, loading, error, addProduct, updateProduct, deleteProduct, toggleAvailability }}>
            {children}
        </ProductsContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductsContext);
    if (!context) throw new Error('useProducts debe usarse dentro de ProductsProvider');
    return context;
}
