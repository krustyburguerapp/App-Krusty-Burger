/**
 * SISTEMA DE FIDELIZACIÓN - KRUSTY BURGERS
 * ==========================================
 * 
 * Reglas:
 * - 1 sello por cada día distinto con pedido completado
 * - 7 sellos = Comida individual GRATIS + Bebida pequeña
 * - Los sellos se reinician cada mes
 * - Admin puede asignar sellos manualmente y reiniciar
 */

import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const LOYALTY_COLLECTION = 'loyaltyStamps';
const MAX_STAMPS = 7;

/**
 * Obtiene los sellos de un usuario para el mes actual
 */
export async function getUserStamps(userId) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        }
        
        // Documento no existe, crear uno nuevo
        const newStampData = {
            userId,
            month: monthKey,
            stamps: 0,
            stampDays: [], // Días con sello ganado
            lastUpdated: new Date().toISOString(),
            prizeClaimed: false,
            prizeClaimedAt: null,
            manualStamps: [] // Sellos asignados manualmente por admin
        };
        
        await setDoc(docRef, newStampData);
        return newStampData;
    } catch (error) {
        console.error('Error getting user stamps:', error);
        return null;
    }
}

/**
 * Agrega un sello al usuario (automático por pedido completado)
 */
export async function addStamp(userId, orderDate) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const docSnap = await getDoc(docRef);
        
        const date = orderDate.toDate ? orderDate.toDate() : new Date(orderDate);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Verificar si ya tiene sello para este día
            if (data.stampDays?.includes(dayKey)) {
                return { success: true, message: 'Ya tiene sello para este día', stamps: data.stamps };
            }
            
            // Verificar si ya completó los 7 sellos
            if (data.stamps >= MAX_STAMPS) {
                return { success: true, message: 'Ya completó los 7 sellos', stamps: data.stamps };
            }
            
            // Agregar sello
            const newStampDays = [...(data.stampDays || []), dayKey];
            const newStamps = data.stamps + 1;
            
            await updateDoc(docRef, {
                stamps: newStamps,
                stampDays: newStampDays,
                lastUpdated: new Date().toISOString()
            });
            
            return { success: true, message: 'Sello agregado', stamps: newStamps, isNewStamp: true };
        } else {
            // Crear nuevo documento
            const newStampData = {
                userId,
                month: monthKey,
                stamps: 1,
                stampDays: [dayKey],
                lastUpdated: new Date().toISOString(),
                prizeClaimed: false,
                prizeClaimedAt: null,
                manualStamps: []
            };
            
            await setDoc(docRef, newStampData);
            return { success: true, message: 'Primer sello agregado', stamps: 1, isNewStamp: true };
        }
    } catch (error) {
        console.error('Error adding stamp:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin agrega sello manualmente
 */
export async function addManualStamp(userId, adminId, note = '') {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (data.stamps >= MAX_STAMPS) {
                return { success: false, error: 'Usuario ya completó los 7 sellos' };
            }
            
            const newStamps = Math.min(data.stamps + 1, MAX_STAMPS);
            const manualStampEntry = {
                date: now.toISOString(),
                adminId,
                note
            };
            
            await updateDoc(docRef, {
                stamps: newStamps,
                manualStamps: [...(data.manualStamps || []), manualStampEntry],
                lastUpdated: now.toISOString()
            });
            
            return { success: true, stamps: newStamps };
        } else {
            // Crear documento si no existe
            const newStampData = {
                userId,
                month: monthKey,
                stamps: 1,
                stampDays: [],
                lastUpdated: now.toISOString(),
                prizeClaimed: false,
                prizeClaimedAt: null,
                manualStamps: [{
                    date: now.toISOString(),
                    adminId,
                    note
                }]
            };
            
            await setDoc(docRef, newStampData);
            return { success: true, stamps: 1 };
        }
    } catch (error) {
        console.error('Error adding manual stamp:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin reinicia los sellos de un usuario (después de entregar premio)
 */
export async function resetUserStamps(userId, adminId, note = '') {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            await updateDoc(docRef, {
                stamps: 0,
                stampDays: [],
                manualStamps: [],
                prizeClaimed: true,
                prizeClaimedAt: now.toISOString(),
                resetBy: adminId,
                resetNote: note,
                lastUpdated: now.toISOString()
            });
            
            return { success: true, message: 'Sellos reiniciados' };
        }
        
        return { success: false, error: 'Usuario no tiene sellos este mes' };
    } catch (error) {
        console.error('Error resetting stamps:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca usuarios por nombre, email o teléfono (búsqueda bajo demanda)
 * Solo devuelve usuarios que coincidan con el término de búsqueda
 */
export async function searchUsers(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim().length < 3) {
            return [];
        }
        
        const term = searchTerm.trim().toLowerCase();
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        console.log(`🔍 Buscando usuarios con término: "${term}"`);
        
        // Búsqueda por nombre (usando range query)
        const nameQuery = query(
            collection(db, 'users'),
            where('displayName', '>=', term),
            where('displayName', '<=', term + '\uf8ff')
        );
        
        console.log('📡 Ejecutando consulta por nombre...');
        
        const nameSnap = await getDocs(nameQuery);
        
        console.log(`📊 Resultados por nombre: ${nameSnap.size}`);
        
        // Si no hay resultados por nombre, intentar con email
        let emailSnap = { docs: [], size: 0 };
        if (nameSnap.size === 0) {
            try {
                const emailQuery = query(
                    collection(db, 'users'),
                    where('email', '>=', term),
                    where('email', '<=', term + '\uf8ff')
                );
                emailSnap = await getDocs(emailQuery);
                console.log(`📊 Resultados por email: ${emailSnap.size}`);
            } catch (err) {
                console.warn('⚠️ No se pudo buscar por email (posible falta de índice):', err.message);
            }
        }
        
        // Si aún no hay resultados, intentar con teléfono
        let phoneSnap = { docs: [], size: 0 };
        if (nameSnap.size === 0 && emailSnap.size === 0) {
            try {
                const phoneQuery = query(
                    collection(db, 'users'),
                    where('phone', '>=', term),
                    where('phone', '<=', term + '\uf8ff')
                );
                phoneSnap = await getDocs(phoneQuery);
                console.log(`📊 Resultados por teléfono: ${phoneSnap.size}`);
            } catch (err) {
                console.warn('⚠️ No se pudo buscar por teléfono (posible falta de índice):', err.message);
            }
        }
        
        // Combinar resultados y eliminar duplicados
        const userIds = new Set();
        const usersStamps = [];
        
        const processUser = async (userDoc) => {
            if (userIds.has(userDoc.id)) return;
            userIds.add(userDoc.id);
            
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            // Obtener sellos del usuario
            const stampDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
            const stampDocSnap = await getDoc(stampDocRef);
            const stampData = stampDocSnap.exists() ? stampDocSnap.data() : null;
            
            usersStamps.push({
                id: stampDocSnap.id || `${userId}_${monthKey}`,
                userId: userId,
                userName: userData?.displayName || 'Usuario sin nombre',
                userEmail: userData?.email || '',
                userPhone: userData?.phone || '',
                month: monthKey,
                stamps: stampData?.stamps || 0,
                stampDays: stampData?.stampDays || [],
                manualStamps: stampData?.manualStamps || [],
                prizeClaimed: stampData?.prizeClaimed || false,
                prizeClaimedAt: stampData?.prizeClaimedAt,
                lastUpdated: stampData?.lastUpdated || new Date().toISOString()
            });
        };
        
        // Procesar todos los resultados en paralelo
        const allDocs = [...nameSnap.docs, ...emailSnap.docs, ...phoneSnap.docs];
        console.log(`📋 Total documentos a procesar: ${allDocs.length}`);
        
        await Promise.all(allDocs.map(processUser));
        
        // Ordenar por cantidad de sellos (descendente)
        usersStamps.sort((a, b) => b.stamps - a.stamps);
        
        console.log(`✅ Usuarios únicos encontrados: ${usersStamps.length}`);
        
        return usersStamps;
    } catch (error) {
        console.error('❌ Error searching users:', error);
        console.error('Detalle del error:', error.message);
        return [];
    }
}

/**
 * Obtiene un usuario específico con sus sellos (para cuando el admin selecciona uno)
 */
export async function getUserStampsById(userId) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const stampDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const stampDocSnap = await getDoc(stampDocRef);
        const stampData = stampDocSnap.exists() ? stampDocSnap.data() : null;
        
        // Obtener datos del usuario
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        return {
            id: stampDocSnap.id || `${userId}_${monthKey}`,
            userId: userId,
            userName: userData?.displayName || 'Usuario sin nombre',
            userEmail: userData?.email || '',
            userPhone: userData?.phone || '',
            month: monthKey,
            stamps: stampData?.stamps || 0,
            stampDays: stampData?.stampDays || [],
            manualStamps: stampData?.manualStamps || [],
            prizeClaimed: stampData?.prizeClaimed || false,
            prizeClaimedAt: stampData?.prizeClaimedAt,
            lastUpdated: stampData?.lastUpdated || new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting user stamps by id:', error);
        return null;
    }
}

/**
 * Marca el premio como reclamado
 */
export async function claimPrize(userId) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        
        await updateDoc(docRef, {
            prizeClaimed: true,
            prizeClaimedAt: now.toISOString(),
            lastUpdated: now.toISOString()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error claiming prize:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica si un usuario ya ganó el premio este mes
 */
export async function hasUserClaimedPrize(userId) {
    try {
        const stampData = await getUserStamps(userId);
        return stampData?.prizeClaimed || false;
    } catch (error) {
        console.error('Error checking prize claim:', error);
        return false;
    }
}
