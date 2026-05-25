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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy, runTransaction } from 'firebase/firestore';

const LOYALTY_COLLECTION = 'loyaltyStamps';
const MAX_STAMPS = 7;
const AUDIT_COLLECTION = 'auditLogs';

/**
 * Función interna para registrar acciones importantes en auditLogs
 * No se exporta - se usa internamente para trazabilidad
 */
async function logAudit(action, details) {
    try {
        await addDoc(collection(db, AUDIT_COLLECTION), {
            action,
            ...details,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // No bloquear la operación principal si el logging falla
        console.error('⚠️ [logAudit] Error registrando auditoría:', error);
    }
}

/**
 * VALIDACIÓN SERVER-SIDE: Verifica si un usuario es elegible para reclamar el premio.
 * Esta función lee directamente de Firestore, NO de localStorage.
 * Se usa ANTES de crear un pedido de premio para evitar fraude.
 */
export async function validatePrizeEligibility(userId) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return {
                eligible: false,
                reason: 'No tienes sellos este mes',
                stamps: 0
            };
        }

        const data = docSnap.data();

        if (data.stamps < MAX_STAMPS) {
            return {
                eligible: false,
                reason: `Solo tienes ${data.stamps} de ${MAX_STAMPS} sellos`,
                stamps: data.stamps
            };
        }

        if (data.prizeClaimed) {
            return {
                eligible: false,
                reason: 'Ya reclamaste tu premio este mes',
                stamps: data.stamps
            };
        }

        return {
            eligible: true,
            stamps: data.stamps,
            month: monthKey
        };
    } catch (error) {
        console.error('❌ [validatePrizeEligibility] Error:', error);
        return {
            eligible: false,
            reason: 'Error al verificar elegibilidad',
            error: error.message
        };
    }
}

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
 * USA TRANSACCIONES para evitar race conditions cuando múltiples pedidos
 * se marcan como "delivered" simultáneamente
 */
export async function addStamp(userId, orderDate) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);

        const date = orderDate.toDate ? orderDate.toDate() : new Date(orderDate);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        console.log('📍 [addStamp] Iniciando proceso con transacción:', { userId, orderDate, dayKey, monthKey });

        const result = await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
                // Crear documento con primer sello
                const newStampData = {
                    userId,
                    month: monthKey,
                    stamps: 1,
                    stampDays: [dayKey],
                    lastUpdated: now.toISOString(),
                    prizeClaimed: false,
                    prizeClaimedAt: null,
                    manualStamps: []
                };
                transaction.set(docRef, newStampData);

                // Logging de auditoría
                await logAudit('stamp_added', {
                    userId,
                    stamps: 1,
                    dayKey,
                    month: monthKey,
                    source: 'auto_order_first'
                });

                console.log('✅ [addStamp] Primer sello creado en transacción');
                return { success: true, message: 'Primer sello agregado', stamps: 1, isNewStamp: true };
            }

            const data = docSnap.data();
            console.log('📄 [addStamp] Documento existe en transacción:', { stamps: data.stamps, stampDays: data.stampDays });

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

            // Agregar sello de forma atómica
            const newStampDays = [...(data.stampDays || []), dayKey];
            const newStamps = data.stamps + 1;

            console.log('✏️ [addStamp] Actualizando en transacción:', { newStamps, newStampDays });

            transaction.update(docRef, {
                stamps: newStamps,
                stampDays: newStampDays,
                lastUpdated: now.toISOString()
            });

            // Logging de auditoría
            await logAudit('stamp_added', {
                userId,
                stamps: newStamps,
                dayKey,
                month: monthKey,
                source: 'auto_order'
            });

            console.log('✅ [addStamp] Sello agregado exitosamente en transacción:', newStamps);
            return { success: true, message: 'Sello agregado', stamps: newStamps, isNewStamp: true };
        });

        return result;
    } catch (error) {
        console.error('❌ [addStamp] Error fatal:', error);
        console.error('❌ [addStamp] Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

/**
 * Admin agrega sello manualmente
 * USA TRANSACCIONES para evitar race conditions
 */
export async function addManualStamp(userId, adminId, note = '') {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const docRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);

        console.log('📍 [addManualStamp] Iniciando proceso con transacción:', { userId, adminId, note, monthKey });

        const result = await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
                // Crear documento si no existe
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
                transaction.set(docRef, newStampData);

                // Logging de auditoría
                await logAudit('manual_stamp_added', {
                    userId,
                    adminId,
                    stamps: 1,
                    note,
                    month: monthKey,
                    firstStamp: true
                });

                console.log('✅ [addManualStamp] Primer sello manual creado en transacción');
                return { success: true, stamps: 1 };
            }

            const data = docSnap.data();
            console.log('📄 [addManualStamp] Documento existe en transacción:', { stamps: data.stamps });

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

            // También agregamos el día actual a stampDays para consistencia
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const newStampDays = data.stampDays?.includes(todayKey)
                ? data.stampDays
                : [...(data.stampDays || []), todayKey];

            console.log('✏️ [addManualStamp] Actualizando en transacción:', { newStamps, newStampDays });

            transaction.update(docRef, {
                stamps: newStamps,
                stampDays: newStampDays,
                manualStamps: [...(data.manualStamps || []), manualStampEntry],
                lastUpdated: now.toISOString()
            });

            // Logging de auditoría
            await logAudit('manual_stamp_added', {
                userId,
                adminId,
                stamps: newStamps,
                note,
                month: monthKey
            });

            console.log('✅ [addManualStamp] Sello manual agregado exitosamente en transacción:', newStamps);
            return { success: true, stamps: newStamps };
        });

        return result;
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

            // Logging de auditoría
            await logAudit('stamps_reset_by_admin', {
                userId,
                adminId,
                note,
                month: monthKey
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
 * Reclama premio DESDE LA APP y reinicia sellos automáticamente
 * Crea un registro en la colección 'prizeClaims' para que el admin sepa
 */
export async function claimPrizeFromApp(userId, userData) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const loyaltyDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const loyaltyDocSnap = await getDoc(loyaltyDocRef);

        // Verificar que tiene 7 sellos
        if (!loyaltyDocSnap.exists() || loyaltyDocSnap.data().stamps < 7) {
            return {
                success: false,
                error: 'No tienes los 7 sellos necesarios para reclamar el premio'
            };
        }

        // Verificar que no haya reclamado ya
        if (loyaltyDocSnap.data().prizeClaimed) {
            return {
                success: false,
                error: 'Ya reclamaste tu premio este mes'
            };
        }

        // 1. Crear registro del reclamo en colección 'prizeClaims'
        const claimRef = await addDoc(collection(db, 'prizeClaims'), {
            userId,
            userName: userData?.displayName || 'Usuario sin nombre',
            userEmail: userData?.email || '',
            userPhone: userData?.phone || '',
            month: monthKey,
            stampsAtClaim: loyaltyDocSnap.data().stamps,
            claimedAt: now.toISOString(),
            status: 'pending', // pending, delivered, cancelled
            note: ''
        });

        // 2. Reiniciar sellos automáticamente
        await updateDoc(loyaltyDocRef, {
            stamps: 0,
            stampDays: [],
            manualStamps: [],
            prizeClaimed: true,
            prizeClaimedAt: now.toISOString(),
            autoReset: true,
            lastUpdated: now.toISOString()
        });

        console.log('✅ [claimPrizeFromApp] Premio reclamado exitosamente:', {
            userId,
            claimId: claimRef.id,
            month: monthKey
        });

        return {
            success: true,
            claimId: claimRef.id,
            message: '¡Premio reclamado exitosamente! Tus sellos se reiniciaron.'
        };
    } catch (error) {
        console.error('❌ [claimPrizeFromApp] Error fatal:', error);
        return { success: false, error: error.message };
    }
}

/**
 * INICIA el proceso de reclamo de premio
 * Crea un documento en Firestore (no localStorage) para evitar manipulación
 * El reinicio real ocurre cuando se confirma el pedido
 */
export async function startPrizeRedemption(userId, userData) {
    try {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const loyaltyDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const loyaltyDocSnap = await getDoc(loyaltyDocRef);

        // Verificar que tiene 7 sellos
        if (!loyaltyDocSnap.exists() || loyaltyDocSnap.data().stamps < 7) {
            return {
                success: false,
                error: 'No tienes los 7 sellos necesarios'
            };
        }

        // Verificar que no haya reclamado ya
        if (loyaltyDocSnap.data().prizeClaimed) {
            return {
                success: false,
                error: 'Ya reclamaste tu premio este mes'
            };
        }

        // Verificar si ya tiene una redención activa (no expirada)
        const redemptionsRef = collection(db, 'prizeRedemptions');
        const q = query(
            redemptionsRef,
            where('userId', '==', userId),
            where('status', '==', 'active')
        );
        const existingSnap = await getDocs(q);

        if (!existingSnap.empty) {
            // Ya tiene una redención activa - verificar si no expiró
            const existing = existingSnap.docs[0].data();
            const startedAt = new Date(existing.startedAt);
            const diffMinutes = (now - startedAt) / 1000 / 60;

            if (diffMinutes < 30) {
                // Aún activa, retornar éxito
                console.log('ℹ️ [startPrizeRedemption] Ya existe redención activa');
                return { success: true, message: 'Redención ya activa', existing: true };
            }

            // Expirada - marcar como expirada
            await updateDoc(doc(db, 'prizeRedemptions', existingSnap.docs[0].id), {
                status: 'expired',
                expiredAt: now.toISOString()
            });
        }

        // Crear nuevo documento de redención en Firestore
        const redemptionDocRef = await addDoc(redemptionsRef, {
            userId,
            userName: userData?.displayName || '',
            userEmail: userData?.email || '',
            userPhone: userData?.phone || '',
            month: monthKey,
            stampsAtStart: loyaltyDocSnap.data().stamps,
            startedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutos
            status: 'active', // active, completed, expired, cancelled
            orderId: null
        });

        // También guardar en localStorage como fallback temporal
        const redemptionState = {
            isActive: true,
            userId,
            month: monthKey,
            stampsAtStart: loyaltyDocSnap.data().stamps,
            startedAt: now.toISOString(),
            userName: userData?.displayName || '',
            userEmail: userData?.email || '',
            userPhone: userData?.phone || '',
            redemptionDocId: redemptionDocRef.id // ID del documento en Firestore
        };

        localStorage.setItem('krustyPrizeRedemption', JSON.stringify(redemptionState));

        // Logging de auditoría
        await logAudit('prize_redemption_started', {
            userId,
            redemptionDocId: redemptionDocRef.id,
            month: monthKey,
            stampsAtStart: loyaltyDocSnap.data().stamps
        });

        console.log('✅ [startPrizeRedemption] Redención iniciada en Firestore:', redemptionDocRef.id);

        return {
            success: true,
            message: 'Estado de reclamo iniciado',
            redemptionDocId: redemptionDocRef.id
        };
    } catch (error) {
        console.error('❌ [startPrizeRedemption] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el estado actual del reclamo de premio
 * Si se pasa userId, busca en Firestore primero
 * Si no, usa localStorage (para CartContext que no tiene acceso al usuario)
 */
export async function getPrizeRedemptionState(userId = null) {
    try {
        // Si no hay userId, usar localStorage directamente
        if (!userId) {
            const state = localStorage.getItem('krustyPrizeRedemption');
            if (!state) return null;

            const parsed = JSON.parse(state);

            // Verificar que no haya expirado (máximo 30 minutos)
            const startedAt = new Date(parsed.startedAt);
            const now = new Date();
            const diffMinutes = (now - startedAt) / 1000 / 60;

            if (diffMinutes > 30) {
                localStorage.removeItem('krustyPrizeRedemption');
                return null;
            }

            return parsed;
        }

        // Si hay userId, buscar en Firestore primero
        const redemptionsRef = collection(db, 'prizeRedemptions');
        const q = query(
            redemptionsRef,
            where('userId', '==', userId),
            where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();

            // Verificar si expiró
            const expiresAt = new Date(data.expiresAt);
            const now = new Date();

            if (now > expiresAt) {
                // Expirado - actualizar estado
                await updateDoc(doc.ref, {
                    status: 'expired',
                    expiredAt: now.toISOString()
                });
                localStorage.removeItem('krustyPrizeRedemption');
                return null;
            }

            return {
                isActive: true,
                userId: data.userId,
                month: data.month,
                stampsAtStart: data.stampsAtStart,
                startedAt: data.startedAt,
                userName: data.userName,
                userEmail: data.userEmail,
                userPhone: data.userPhone,
                redemptionDocId: doc.id
            };
        }

        // Fallback a localStorage si no hay nada en Firestore
        const state = localStorage.getItem('krustyPrizeRedemption');
        if (!state) return null;

        const parsed = JSON.parse(state);

        // Verificar que no haya expirado (máximo 30 minutos)
        const startedAt = new Date(parsed.startedAt);
        const now = new Date();
        const diffMinutes = (now - startedAt) / 1000 / 60;

        if (diffMinutes > 30) {
            localStorage.removeItem('krustyPrizeRedemption');
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('❌ [getPrizeRedemptionState] Error:', error);
        // Fallback a localStorage en caso de error
        try {
            const state = localStorage.getItem('krustyPrizeRedemption');
            return state ? JSON.parse(state) : null;
        } catch {
            return null;
        }
    }
}

/**
 * Limpia el estado de reclamo de premio (tanto Firestore como localStorage)
 */
export async function clearPrizeRedemptionState(userId = null) {
    // Limpiar localStorage
    localStorage.removeItem('krustyPrizeRedemption');

    // Limpiar documento en Firestore si existe
    if (userId) {
        try {
            const redemptionsRef = collection(db, 'prizeRedemptions');
            const q = query(
                redemptionsRef,
                where('userId', '==', userId),
                where('status', '==', 'active')
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                // Marcar como cancelada en vez de borrar (para auditoría)
                await updateDoc(snapshot.docs[0].ref, {
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.warn('⚠️ [clearPrizeRedemptionState] Error limpiando Firestore:', error);
        }
    }
}

/**
 * Verifica si hay una redención activa para un usuario (server-side check)
 */
export async function verifyPrizeRedemptionActive(userId) {
    try {
        const redemptionsRef = collection(db, 'prizeRedemptions');
        const q = query(
            redemptionsRef,
            where('userId', '==', userId),
            where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return { active: false, reason: 'No hay redención activa' };

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Verificar expiración
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();

        if (now > expiresAt) {
            await updateDoc(doc.ref, {
                status: 'expired',
                expiredAt: now.toISOString()
            });
            return { active: false, reason: 'Redención expirada' };
        }

        return { active: true, redemptionDocId: doc.id, data };
    } catch (error) {
        console.error('❌ [verifyPrizeRedemptionActive] Error:', error);
        return { active: false, reason: 'Error al verificar', error: error.message };
    }
}

/**
 * CONFIRMA el reclamo del premio y reinicia los sellos
 * Se llama después de crear el pedido exitosamente
 * USA TRANSACCIÓN para garantizar atomicidad: o se hacen ambas operaciones
 * (crear claim + reiniciar sellos) o no se hace ninguna
 */
export async function confirmPrizeRedemption(userId, orderId) {
    try {
        const redemptionState = await getPrizeRedemptionState(userId);

        if (!redemptionState || redemptionState.userId !== userId) {
            return {
                success: false,
                error: 'No hay un reclamo de premio activo'
            };
        }

        const now = new Date();
        const monthKey = redemptionState.month;
        const loyaltyDocRef = doc(db, LOYALTY_COLLECTION, `${userId}_${monthKey}`);
        const claimsCollection = collection(db, 'prizeClaims');

        console.log('🔒 [confirmPrizeRedemption] Iniciando transacción atómica...');

        // Ejecutar todo en una transacción atómica
        const claimRef = await runTransaction(db, async (transaction) => {
            // 1. Leer el documento de sellos dentro de la transacción
            const loyaltyDocSnap = await transaction.get(loyaltyDocRef);

            if (!loyaltyDocSnap.exists()) {
                throw new Error('No se encontró el documento de sellos del usuario');
            }

            const loyaltyData = loyaltyDocSnap.data();

            // Verificación de seguridad: confirmar que tiene 7+ sellos y no ha reclamado
            if (loyaltyData.stamps < MAX_STAMPS) {
                throw new Error(`Usuario no tiene 7 sellos (tiene ${loyaltyData.stamps})`);
            }

            if (loyaltyData.prizeClaimed) {
                throw new Error('Usuario ya reclamó su premio este mes');
            }

            // 2. Crear el documento de prizeClaims
            // Nota: addDoc no se puede usar dentro de transacciones, así que creamos
            // un doc con ID explícito usando doc() y set()
            const newClaimRef = doc(claimsCollection);
            const claimData = {
                userId,
                userName: redemptionState.userName,
                userEmail: redemptionState.userEmail,
                userPhone: redemptionState.userPhone,
                month: monthKey,
                stampsAtClaim: loyaltyData.stamps,
                claimedAt: now.toISOString(),
                status: 'pending',
                note: '',
                orderId
            };
            transaction.set(newClaimRef, claimData);

            // 3. Reiniciar sellos automáticamente
            transaction.update(loyaltyDocRef, {
                stamps: 0,
                stampDays: [],
                manualStamps: [],
                prizeClaimed: true,
                prizeClaimedAt: now.toISOString(),
                autoReset: true,
                lastUpdated: now.toISOString()
            });

            // Logging de auditoría (se registra dentro de la transacción)
            // Nota: addDoc no funciona en transacciones, pero el claim ya se crea con set()
            // así que el logging se hace después fuera de la transacción

            console.log('✅ [confirmPrizeRedemption] Transacción completada exitosamente');
            return { claimRef: newClaimRef, stampsAtClaim: loyaltyData.stamps };
        });

        // 4. Logging de auditoría (fuera de la transacción)
        await logAudit('prize_confirmed', {
            userId,
            orderId,
            claimId: claimRef.claimRef.id,
            stampsAtClaim: claimRef.stampsAtClaim,
            month: monthKey
        });

        // 5. Limpiar estado temporal (fuera de la transacción)
        await clearPrizeRedemptionState(userId);

        console.log('✅ [confirmPrizeRedemption] Premio confirmado y sellos reiniciados:', {
            userId,
            orderId,
            claimId: claimRef.claimRef.id
        });

        return {
            success: true,
            claimId: claimRef.claimRef.id,
            message: 'Premio confirmado. Sellos reiniciados.'
        };
    } catch (error) {
        console.error('❌ [confirmPrizeRedemption] Error fatal:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene todos los reclamos de premios (para admin)
 */
export async function getPrizeClaims(monthFilter = null) {
    try {
        const now = new Date();
        const monthKey = monthFilter || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const claimsRef = collection(db, 'prizeClaims');
        const q = query(
            claimsRef,
            where('month', '==', monthKey),
            orderBy('claimedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting prize claims:', error);
        return [];
    }
}

/**
 * Actualiza el estado de un reclamo (para admin)
 */
export async function updatePrizeClaimStatus(claimId, status, note = '') {
    try {
        const claimRef = doc(db, 'prizeClaims', claimId);

        // Leer el claim actual para logging
        const claimSnap = await getDoc(claimRef);
        const previousStatus = claimSnap.exists() ? claimSnap.data().status : 'unknown';

        await updateDoc(claimRef, {
            status,
            note,
            updatedAt: new Date().toISOString()
        });

        // Logging de auditoría
        await logAudit('prize_claim_status_updated', {
            claimId,
            previousStatus,
            newStatus: status,
            note,
            userId: claimSnap.exists() ? claimSnap.data().userId : 'unknown'
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating prize claim:', error);
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
