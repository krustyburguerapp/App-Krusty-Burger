import { createContext, useContext, useState, useEffect } from 'react';
import { db, storage, isDemoMode } from '../config/firebase';
import {
    collection, query, orderBy, onSnapshot, doc, getDocsFromCache,
    addDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isDemoMode) {
            setProducts([]);
            setLoading(false);
            return;
        }

        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('order', 'asc'));

        // resolved = true en cuanto tenemos una respuesta REAL (cache o servidor).
        // Mientras sea false, seguimos mostrando el spinner de "Cargando menú…".
        let resolved = false;

        // 1. CACHE PRIMERO: carga instantanea desde IndexedDB para clientes recurrentes
        const loadFromCache = async () => {
            try {
                const cachedDocs = await getDocsFromCache(q);
                if (!cachedDocs.empty) {
                    const productsData = cachedDocs.docs.map(d => ({ id: d.id, ...d.data() }));
                    resolved = true;
                    setProducts(productsData);
                    setUnavailable(false);
                    setLoading(false);
                }
            } catch (error) {
                // Cache vacio, esperamos la respuesta del servidor
            }
        };

        loadFromCache();

        // 2. TIMEOUT GENEROSO (10s): damos tiempo de sobra a conexiones lentas antes
        // de mostrar el aviso de fallas técnicas. Si la respuesta llega despues, el
        // listener de abajo recupera el menú automaticamente (no se queda trabado).
        const safetyTimeout = setTimeout(() => {
            if (!resolved) {
                setProducts([]);
                setUnavailable(true);
                setLoading(false);
            }
        }, 10000);

        // 3. LISTENER EN TIEMPO REAL: fuente de verdad del servidor
        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(safetyTimeout);
            resolved = true;
            const productsData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));

            setProducts(productsData);
            // Solo marcamos "no disponible" si Firebase respondio pero el menú esta vacio
            setUnavailable(productsData.length === 0);
            setLoading(false);
            setError(null);
        }, (err) => {
            clearTimeout(safetyTimeout);
            console.error('Error sincronizando productos de Firebase:', err.message);
            setError(err.message);
            // Si nunca cargamos nada (ni cache ni servidor), mostramos el aviso
            if (!resolved) {
                setProducts([]);
                setUnavailable(true);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimeout);
            unsubscribe();
        };
    }, []);

    const addProduct = async (productData, imageFile) => {
        if (isDemoMode) return { success: false, error: 'Accion no permitida en Modo Demo' };
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
        if (isDemoMode) return { success: false, error: 'Accion no permitida en Modo Demo' };
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
        if (isDemoMode) return { success: false, error: 'Accion no permitida en Modo Demo' };
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
        if (isDemoMode) return { success: false, error: 'Accion no permitida en Modo Demo' };
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
        <ProductsContext.Provider value={{ products, loading, unavailable, error, addProduct, updateProduct, deleteProduct, toggleAvailability }}>
            {children}
        </ProductsContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductsContext);
    if (!context) throw new Error('useProducts debe usarse dentro de ProductsProvider');
    return context;
}
