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

        console.log('📍 [addStamp] Iniciando proceso:', { userId, orderDate, dayKey, monthKey });

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📄 [addStamp] Documento existe:', { stamps: data.stamps, stampDays: data.stampDays });

            // Verificar si ya tiene sello para este día
            if (data.stampDays?.includes(dayKey)) {
                console.log('ℹ️ [addStamp] Usuario ya tiene sello para este día');
                return { success: true, message: 'Ya tiene sello para este día', stamps: data.stamps };
            }

            // Verificar si ya completó los 7 sellos
            if (data.stamps >= MAX_STAMPS) {
                console.log('ℹ️ [addStamp] Usuario ya completó los 7 sellos');
                return { success: true, message: 'Ya completó los 7 sellos', stamps: data.stamps };
            }

            // Agregar sello
            const newStampDays = [...(data.stampDays || []), dayKey];
            const newStamps = data.stamps + 1;

            console.log('✏️ [addStamp] Actualizando documento:', { newStamps, newStampDays });

            await updateDoc(docRef, {
                stamps: newStamps,
                stampDays: newStampDays,
                lastUpdated: new Date().toISOString()
            });

            console.log('✅ [addStamp] Sello agregado exitosamente:', newStamps);
            return { success: true, message: 'Sello agregado', stamps: newStamps, isNewStamp: true };
        } else {
            // Crear nuevo documento
            console.log('📝 [addStamp] Creando nuevo documento para usuario');
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
            console.log('✅ [addStamp] Primer sello creado exitosamente');
            return { success: true, message: 'Primer sello agregado', stamps: 1, isNewStamp: true };
        }
    } catch (error) {
        console.error('❌ [addStamp] Error fatal:', error);
        console.error('❌ [addStamp] Stack:', error.stack);
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

        console.log('📍 [addManualStamp] Iniciando proceso:', { userId, adminId, note, monthKey });

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📄 [addManualStamp] Documento existe:', { stamps: data.stamps });

            if (data.stamps >= MAX_STAMPS) {
                console.log('ℹ️ [addManualStamp] Usuario ya completó los 7 sellos');
                return { success: false, error: 'Usuario ya completó los 7 sellos' };
            }

            const newStamps = Math.min(data.stamps + 1, MAX_STAMPS);
            const manualStampEntry = {
                date: now.toISOString(),
                adminId,
                note
            };

            // IMPORTANTE: También agregamos el día actual a stampDays para consistencia
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const newStampDays = data.stampDays?.includes(todayKey) 
                ? data.stampDays 
                : [...(data.stampDays || []), todayKey];

            console.log('✏️ [addManualStamp] Actualizando documento:', { newStamps, newStampDays });

            await updateDoc(docRef, {
                stamps: newStamps,
                stampDays: newStampDays,
                manualStamps: [...(data.manualStamps || []), manualStampEntry],
                lastUpdated: now.toISOString()
            });

            console.log('✅ [addManualStamp] Sello manual agregado exitosamente:', newStamps);
            return { success: true, stamps: newStamps };
        } else {
            // Crear documento si no existe
            console.log('📝 [addManualStamp] Creando nuevo documento para usuario');
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const newStampData = {
                userId,
                month: monthKey,
                stamps: 1,
                stampDays: [todayKey],
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
            console.log('✅ [addManualStamp] Primer sello manual creado exitosamente');
            return { success: true, stamps: 1 };
        }
    } catch (error) {
        console.error('❌ [addManualStamp] Error fatal:', error);
        console.error('❌ [addManualStamp] Stack:', error.stack);
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
 * 
 * IMPORTANTE: Si las búsquedas fallan, es posible que necesites crear índices en Firebase Console.
 * Ve a: Firebase Console > Firestore > Indexes > Create Index
 */
export async function searchUsers(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim().length < 3) {
            console.log('⚠️ [searchUsers] Término muy corto (mínimo 3 caracteres)');
            return [];
        }

        const term = searchTerm.trim().toLowerCase();
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        console.log(`🔍 [searchUsers] Buscando con término: "${term}"`);

        const userIds = new Set();
        const usersStamps = [];
        let totalFound = 0;

        // FUNCIÓN AUXILIAR: Búsqueda simple sin índices compuestos
        // Esta función usa filtros en memoria en lugar de índices de Firestore
        const searchUsersInMemory = async (field) => {
            try {
                console.log(`📡 [searchUsers] Intentando búsqueda en memoria por ${field}...`);
                
                // Obtener TODOS los usuarios (sin filtros de Firestore)
                const allUsersQuery = query(collection(db, 'users'));
                const allUsersSnap = await getDocs(allUsersQuery);
                
                console.log(`📊 [searchUsers] Total usuarios en DB: ${allUsersSnap.size}`);
                
                // PRIMEROS 3 USUARIOS: Mostrar en consola para depurar
                if (field === 'displayName') {
                    console.log('📋 [searchUsers] Muestra de usuarios en DB (primeros 5):');
                    allUsersSnap.docs.slice(0, 5).forEach((doc, index) => {
                        const data = doc.data();
                        console.log(`  ${index + 1}. ID: ${doc.id} | displayName: "${data.displayName}" | email: "${data.email}" | phone: "${data.phone}"`);
                    });
                }
                
                // Filtrar en memoria con manejo robusto de null/undefined
                const filtered = allUsersSnap.docs.filter(doc => {
                    const data = doc.data();
                    const value = data[field];
                    
                    // Manejar null, undefined, o no-string
                    if (!value) return false;
                    const stringValue = String(value).toLowerCase();
                    
                    // Búsqueda parcial (contiene el término)
                    return stringValue.includes(term);
                });
                
                console.log(`📊 [searchUsers] Usuarios filtrados por ${field}: ${filtered.length}`);
                
                // Mostrar los que coincidieron
                if (filtered.length > 0 && field === 'displayName') {
                    console.log('✅ [searchUsers] Usuarios encontrados:');
                    filtered.forEach((doc, index) => {
                        const data = doc.data();
                        console.log(`  ${index + 1}. "${data.displayName}" - ${data.email} - ${data.phone}`);
                    });
                }
                
                return filtered;
            } catch (err) {
                console.error(`❌ [searchUsers] Error buscando por ${field}:`, err.message);
                return [];
            }
        };

        // ESTRATEGIA: Búsqueda en memoria por todos los campos simultáneamente
        console.log('🚀 [searchUsers] Iniciando búsqueda en memoria...');
        
        const [byName, byEmail, byPhone] = await Promise.all([
            searchUsersInMemory('displayName'),
            searchUsersInMemory('email'),
            searchUsersInMemory('phone')
        ]);

        const allDocs = [...byName, ...byEmail, ...byPhone];
        totalFound = allDocs.length;
        console.log(`📋 [searchUsers] Total documentos encontrados: ${totalFound}`);

        // Procesar usuarios y obtener sus sellos
        const processUser = async (userDoc) => {
            if (userIds.has(userDoc.id)) return;
            userIds.add(userDoc.id);

            const userId = userDoc.id;
            const userData = userDoc.data();

            // Obtener sellos del usuario
            const stampDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
            try {
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
            } catch (err) {
                console.warn(`⚠️ [searchUsers] Error obteniendo sellos para ${userId}:`, err.message);
                // Agregar usuario sin sellos
                usersStamps.push({
                    id: `${userId}_${monthKey}`,
                    userId: userId,
                    userName: userData?.displayName || 'Usuario sin nombre',
                    userEmail: userData?.email || '',
                    userPhone: userData?.phone || '',
                    month: monthKey,
                    stamps: 0,
                    stampDays: [],
                    manualStamps: [],
                    prizeClaimed: false,
                    prizeClaimedAt: null,
                    lastUpdated: new Date().toISOString()
                });
            }
        };

        // Procesar todos los usuarios en paralelo
        await Promise.all(allDocs.map(processUser));

        // Ordenar por cantidad de sellos (descendente)
        usersStamps.sort((a, b) => b.stamps - a.stamps);

        console.log(`✅ [searchUsers] Búsqueda completada: ${usersStamps.length} usuarios únicos`);

        return usersStamps;
    } catch (error) {
        console.error('❌ [searchUsers] Error fatal:', error);
        console.error('❌ [searchUsers] Stack:', error.stack);
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
