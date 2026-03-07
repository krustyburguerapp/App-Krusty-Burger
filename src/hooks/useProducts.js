import { useState, useEffect, useRef } from 'react';
import { db, storage, isDemoMode } from '../config/firebase';
import {
    collection, query, orderBy, onSnapshot, doc,
    addDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '../utils/imageCompressor';
import { DEMO_PRODUCTS } from '../data/menuData';

const LOAD_TIMEOUT_MS = 3000; // 3 seconds max wait for Firestore

export function useProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (isDemoMode) {
            setProducts(DEMO_PRODUCTS);
            setLoading(false);
            return;
        }

        // Safety timeout: if Firestore takes too long, use demo products as fallback
        timeoutRef.current = setTimeout(() => {
            setProducts((prev) => {
                if (prev.length === 0) {
                    return DEMO_PRODUCTS;
                }
                return prev;
            });
            setLoading(false);
        }, LOAD_TIMEOUT_MS);

        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('order', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const productsData = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data()
            }));
            // If Firestore has no products, use demo data as fallback
            setProducts(productsData.length > 0 ? productsData : DEMO_PRODUCTS);
            setLoading(false);
            setError(null);
        }, (err) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            console.warn('Firestore products error, using fallback:', err.message);
            setProducts(DEMO_PRODUCTS);
            setError(err.message);
            setLoading(false);
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

    return { products, loading, error, addProduct, updateProduct, deleteProduct, toggleAvailability };
}
