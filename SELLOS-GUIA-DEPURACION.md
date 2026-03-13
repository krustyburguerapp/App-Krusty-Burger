# 🔧 Guía de Solución de Problemas - Sistema de Sellos Krusty

## 📋 Problemas Comunes y Soluciones

### 1️⃣ LOS SELLOS NO SE AGREGAN AL COMPLETAR PEDIDOS

**Síntoma:** Marcas un pedido como "Entregado" pero el usuario no recibe su sello.

**Causas posibles:**
- El `userId` del pedido es `null` o `undefined`
- Error de conexión a Firebase
- El pedido ya tenía un sello para ese mismo día

**Cómo depurar:**

1. **Abrí la consola del navegador** (F12 o Ctrl+Shift+J)
2. **Filtrá por `[OrdersContext]`** para ver los logs del sistema
3. **Buscá este mensaje:**
   ```
   🎯 [OrdersContext] Intentando agregar sello por pedido delivered
   ```

4. **Verificá que el userId exista:**
   ```javascript
   {
       userId: "abc123...",  // ✅ Debe existir
       orderId: "xyz789...",
       createdAt: "2026-03-13T..."
   }
   ```

5. **Buscá el resultado:**
   ```
   ✅ [OrdersContext] Sello agregado correctamente
   ```
   o
   ```
   ❌ [OrdersContext] Error al agregar sello: [mensaje de error]
   ```

**Solución manual:**
Si los sellos no se agregan automáticamente, podés usar el panel de admin para agregarlos manualmente:
1. Ir a `Admin > Fidelización`
2. Buscar al usuario por nombre, email o teléfono
3. Click en "Agregar" sello manual

---

### 2️⃣ LA BÚSQUEDA DE USUARIOS NO FUNCIONA EN EL ADMIN

**Síntoma:** Escribís el nombre de un usuario en el buscador del admin pero no aparece ningún resultado.

**Causa:** La búsqueda ahora funciona **en memoria** (sin índices de Firebase), pero puede ser lenta si hay muchos usuarios.

**Cómo depurar:**

1. **Abrí la consola del navegador** (F12)
2. **Filtrá por `[searchUsers]`**
3. **Buscá estos mensajes:**
   ```
   🔍 [searchUsers] Buscando con término: "juan"
   🚀 [searchUsers] Iniciando búsqueda en memoria...
   📡 [searchUsers] Intentando búsqueda en memoria por displayName...
   📊 [searchUsers] Total usuarios en DB: 50
   📊 [searchUsers] Usuarios filtrados por displayName: 5
   ✅ [searchUsers] Búsqueda completada: 5 usuarios únicos
   ```

**Si ves un error:**
```
❌ [searchUsers] Error buscando por displayName: [mensaje]
```

**Posibles soluciones:**
- Verificá que el término tenga **al menos 3 caracteres**
- Verificá que el usuario exista en Firebase Console > Firestore > users
- Intentá buscar por email o teléfono en lugar del nombre

---

### 3️⃣ EL ADMIN NO PUEDE AGREGAR SELLOS MANUALES

**Síntoma:** Click en "Agregar" sello pero aparece un error.

**Cómo depurar:**

1. **Abrí la consola del navegador** (F12)
2. **Filtrá por `[AdminLoyalty]` y `[addManualStamp]`**
3. **Buscá la secuencia completa:**
   ```
   🔘 [AdminLoyalty] Intentando agregar sello manual: {...}
   📍 [addManualStamp] Iniciando proceso: {...}
   📄 [addManualStamp] Documento existe: {stamps: 3}
   ✏️ [addManualStamp] Actualizando documento: {newStamps: 4}
   ✅ [addManualStamp] Sello manual agregado exitosamente: 4
   📍 [AdminLoyalty] Resultado de addManualStamp: {success: true, stamps: 4}
   ```

**Si hay error:**
```
❌ [addManualStamp] Error fatal: [mensaje del error]
```

**Causas comunes:**
- Usuario ya tiene 7 sellos (máximo alcanzado)
- Problema de conexión a Firebase
- Permisos de Firestore incorrectos

---

## 🔥 CÓMO VERIFICAR QUE LOS SELLOS ESTÁN FUNCIONANDO

### Paso 1: Abrir la consola del navegador
- En Chrome/Edge: `F12` o `Ctrl + Shift + J`
- En la pestaña "Console"

### Paso 2: Filtrar los logs
Escribí en el filtro: `[stamp]` para ver todos los logs relacionados con sellos

### Paso 3: Verificar en Firebase Console

1. **Ir a:** https://console.firebase.google.com/
2. **Seleccionar el proyecto:** `app-krusty-burger`
3. **Ir a:** Firestore Database
4. **Buscar la colección:** `loyaltyStamps`
5. **Verificar documentos:** Deberían verse así:
   ```
   userId_2026-03
   ├── userId: "abc123..."
   ├── month: "2026-03"
   ├── stamps: 3
   ├── stampDays: ["2026-03-05", "2026-03-10", "2026-03-13"]
   ├── manualStamps: []
   ├── prizeClaimed: false
   └── lastUpdated: "2026-03-13T..."
   ```

---

## 📱 FLUJO COMPLETO DE UN SELLO

### Flujo Automático (cuando se completa un pedido):

```
1. Admin marca pedido como "Entregado"
   ↓
2. OrdersContext detecta el cambio
   ↓
3. Llama a addStamp(userId, orderDate)
   ↓
4. loyaltySystem.js verifica:
   - ¿Usuario existe en Firestore?
   - ¿Ya tiene sello para este día? → Si sí, no hace nada
   - ¿Ya completó 7 sellos? → Si sí, no hace nada
   ↓
5. Si todo está bien:
   - stamps: +1
   - stampDays: agrega el día actual
   - lastUpdated: ahora
   ↓
6. Log en consola: ✅ [OrdersContext] Sello agregado correctamente
```

### Flujo Manual (desde el admin):

```
1. Admin va a Admin > Fidelización
   ↓
2. Busca usuario por nombre/email/teléfono
   ↓
3. Click en "Agregar" sello
   ↓
4. Escribe nota (opcional)
   ↓
5. Confirma
   ↓
6. addManualStamp() se ejecuta:
   - Verifica usuario no tenga 7 sellos
   - Agrega sello al contador
   - Agrega día actual a stampDays
   - Agrega entrada en manualStamps con adminId y nota
   ↓
7. Log en consola: ✅ [addManualStamp] Sello manual agregado exitosamente
```

---

## 🛠️ COMANDOS ÚTILES PARA DEPURAR

### Ver sellos de un usuario específico:
```javascript
// En la consola del navegador (como admin):
import { getUserStamps } from './utils/loyaltySystem';
const stamps = await getUserStamps('USER_ID_AQUI');
console.log('Sellos del usuario:', stamps);
```

### Agregar sello manual de prueba:
```javascript
// En la consola del navegador:
import { addManualStamp } from './utils/loyaltySystem';
const result = await addManualStamp('USER_ID_AQUI', 'admin123', 'Sello de prueba');
console.log('Resultado:', result);
```

### Buscar usuarios:
```javascript
// En la consola del navegador:
import { searchUsers } from './utils/loyaltySystem';
const results = await searchUsers('juan');
console.log('Usuarios encontrados:', results);
```

### Ver colección de sellos en Firestore:
```javascript
// En la consola del navegador:
import { db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const stampsRef = collection(db, 'loyaltyStamps');
const snapshot = await getDocs(stampsRef);
const allStamps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log('Todos los sellos:', allStamps);
```

---

## ⚠️ ERRORES CONOCIDOS Y SOLUCIONES

### Error: "Missing or insufficient permissions"
**Causa:** Reglas de Firestore muy restrictivas

**Solución:**
1. Ir a Firebase Console > Firestore > Rules
2. Verificar que los usuarios autenticados puedan leer/escribir en `loyaltyStamps`
3. Regla recomendada:
   ```
   match /loyaltyStamps/{document} {
     allow read: if request.auth != null;
     allow write: if request.auth != null && 
                     (request.auth.uid == resource.data.userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
   }
   ```

### Error: "The query requires an index"
**Causa:** Búsquedas compuestas sin índice en Firestore

**Solución:** Ya no aplica - el sistema ahora usa búsqueda en memoria

### Error: "Network error" o "Timeout"
**Causa:** Problemas de conexión a Internet o Firebase caído

**Solución:**
1. Verificar conexión a Internet
2. Ir a https://status.firebase.google.com/ para ver si hay outage
3. Reintentar en unos minutos

---

## 📊 ESTADÍSTICAS Y MONITOREO

### Ver todos los usuarios con 7 sellos:
```javascript
// En la consola del navegador:
import { db } from './config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const stampsRef = collection(db, 'loyaltyStamps');
const q = query(stampsRef, where('stamps', '==', 7));
const snapshot = await getDocs(q);
const completeUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log('Usuarios con 7 sellos:', completeUsers);
```

### Ver sellos agregados manualmente:
```javascript
// En la consola del navegador:
import { db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const stampsRef = collection(db, 'loyaltyStamps');
const snapshot = await getDocs(stampsRef);
const allStamps = snapshot.docs.map(doc => doc.data());

const withManual = allStamps.filter(s => s.manualStamps && s.manualStamps.length > 0);
console.log('Sellos manuales:', withManual);
```

---

## 🎯 MEJORES PRÁCTICAS

1. **Siempre verificar los logs** antes de reportar un bug
2. **Usar la búsqueda en el admin** con al menos 3 caracteres
3. **Reiniciar sellos SOLO después de entregar el premio**
4. **Anotar en la nota** el motivo del sello manual (ej: "Pedido #123 entregado, sistema no agregó sello automático")
5. **Verificar en Firestore** que los cambios se reflejen inmediatamente

---

## 📞 SOPORTE

Si después de seguir esta guía el problema persiste:

1. **Recolectar información:**
   - Capturas de pantalla del error
   - Logs de la consola (F12)
   - ID del usuario afectado
   - ID del pedido (si aplica)

2. **Verificar en Firebase:**
   - ¿El usuario existe en `users`?
   - ¿El documento de sellos existe en `loyaltyStamps`?
   - ¿Hay errores en Firebase Console > Crashlytics (si está configurado)?

3. **Contactar al desarrollador** con toda la información recolectada
