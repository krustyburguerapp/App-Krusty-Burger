# 🏆 Configuración de Índices Firestore - Reclamos de Premios

## 📋 Descripción

El sistema de reclamos de premios requiere un **índice compuesto** en Firestore para funcionar correctamente. Sin este índice, la consulta de reclamos fallará.

---

## ⚠️ Error Esperado (la primera vez)

Cuando el admin abra la página de "Reclamos de Premios" por primera vez, verá un error en la consola:

```
The query requires an index. 
You can create it here: https://console.firebase.google.com/...
```

---

## ✅ Pasos para Crear el Índice

### Opción 1: Desde el Enlace en la Consola (Recomendado)

1. **Abrir la consola del navegador** (F12)
2. **Ir a la página:** Admin > Reclamos de Premios
3. **Buscar el error** en la consola que dice "The query requires an index"
4. **Hacer click en el enlace** que aparece en el mensaje de error
5. **Firebase creará el índice automáticamente**
6. **Esperar 1-5 minutos** a que el índice se construya

### Opción 2: Crear Manualmente

1. **Ir a:** [Firebase Console](https://console.firebase.google.com/)
2. **Seleccionar el proyecto:** `app-krusty-burger`
3. **Ir a:** Firestore Database > Indexes
4. **Click en:** "Create Index" o "Add Index"
5. **Configurar el índice:**

```
Collection ID: prizeClaims

Fields to index:
┌─────────────┬───────────────┐
│ Field       │ Order         │
├─────────────┼───────────────┤
│ month       │ Ascending     │
│ claimedAt   │ Descending    │
└─────────────┴───────────────┘
```

6. **Click en:** "Create" o "Save"
7. **Esperar 1-5 minutos** a que el estado cambie a "Enabled"

---

## 🔍 Verificar que el Índice Funciona

1. **Ir a:** Admin > Reclamos de Premios
2. **Esperar a que cargue** la lista de reclamos
3. **Verificar en la consola** que NO haya errores de índices
4. **Verificar que se muestren** los reclamos (si existen)

---

## 📊 Estructura de la Colección `prizeClaims`

Cada documento en la colección `prizeClaims` tiene esta estructura:

```javascript
{
  userId: "abc123...",              // ID del usuario
  userName: "Juan Pérez",           // Nombre del usuario
  userEmail: "juan@email.com",      // Email del usuario
  userPhone: "3001234567",          // Teléfono del usuario
  month: "2026-03",                 // Mes del reclamo
  stampsAtClaim: 7,                 // Sellos al momento de reclamar
  claimedAt: "2026-03-30T15:30:00Z", // Fecha y hora del reclamo
  status: "pending",                // pending, delivered, cancelled
  note: "",                         // Nota del admin
  updatedAt: "2026-03-30T16:00:00Z" // Última actualización
}
```

---

## 🎯 Flujo Completo del Reclamo

### **Desde la App del Usuario:**

```
1. Usuario completa 7 sellos
   ↓
2. Usuario hace click en tarjeta de sellos
   ↓
3. Click en "🎁 Reclamar mi premio AHORA"
   ↓
4. Confirmación del reclamo
   ↓
5. claimPrizeFromApp() ejecuta:
   - Crea documento en prizeClaims
   - Reinicia sellos a 0
   - Marca prizeClaimed: true
   ↓
6. Usuario ve confirmación con ID de reclamo
```

### **Desde el Panel Admin:**

```
1. Admin va a: Admin > Reclamos de Premios
   ↓
2. Ve lista de reclamos del mes actual
   ↓
3. Filtra por estado (Pendiente/Entregado/Cancelado)
   ↓
4. Click en "Gestionar" en un reclamo
   ↓
5. Cambia estado a "Entregado" cuando entrega el premio
   ↓
6. Agrega nota opcional (ej: "Pedido entregado al cliente")
```

---

## 🛠️ Comandos Útiles para Depurar

### Ver todos los reclamos en Firestore:

```javascript
// En la consola del navegador:
import { db } from './config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const claimsRef = collection(db, 'prizeClaims');
const q = query(claimsRef, orderBy('claimedAt', 'desc'));
const snapshot = await getDocs(q);
const claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log('Todos los reclamos:', claims);
```

### Ver reclamos del mes actual:

```javascript
const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const claimsRef = collection(db, 'prizeClaims');
const q = query(claimsRef, where('month', '==', monthKey));
const snapshot = await getDocs(q);
const claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log(`Reclamos del mes ${monthKey}:`, claims);
```

### Contar reclamos por estado:

```javascript
const claimsRef = collection(db, 'prizeClaims');
const snapshot = await getDocs(claimsRef);
const claims = snapshot.docs.map(doc => doc.data());

const byStatus = claims.reduce((acc, claim) => {
  acc[claim.status] = (acc[claim.status] || 0) + 1;
  return acc;
}, {});

console.log('Reclamos por estado:', byStatus);
```

---

## ⚡ Solución de Problemas

### Error: "Permission denied"

**Causa:** Reglas de Firestore muy restrictivas

**Solución:**
1. Ir a Firebase Console > Firestore > Rules
2. Agregar regla para `prizeClaims`:

```javascript
match /prizeClaims/{document} {
  // Los usuarios autenticados pueden leer sus propios reclamos
  allow read: if request.auth != null && 
                 (request.auth.uid == resource.data.userId ||
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
  
  // Solo los admins pueden escribir/editar reclamos
  allow write: if request.auth != null &&
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

### Error: "Index not found"

**Causa:** El índice no se ha creado o aún no está listo

**Solución:**
1. Verificar que el índice esté creado (ver pasos arriba)
2. Esperar 5-10 minutos para que se construya
3. Recargar la página

### Los reclamos no aparecen

**Causas posibles:**
- No hay reclamos aún (usuarios no han reclamado)
- Filtro de mes incorrecto
- Error de permisos

**Cómo verificar:**
1. Abrir consola del navegador
2. Ejecutar el comando "Ver todos los reclamos" (arriba)
3. Verificar si hay datos

---

## 📈 Estadísticas y Monitoreo

### Ver total de reclamos del mes:

```javascript
const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const claimsRef = collection(db, 'prizeClaims');
const q = query(claimsRef, where('month', '==', monthKey));
const snapshot = await getDocs(q);
console.log(`Total reclamos en ${monthKey}:`, snapshot.size);
```

### Ver reclamos pendientes:

```javascript
const claimsRef = collection(db, 'prizeClaims');
const q = query(claimsRef, where('status', '==', 'pending'));
const snapshot = await getDocs(q);
const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log('Reclamos pendientes:', pending);
```

### Calcular valor total de premios entregados:

```javascript
// Asumiendo que cada premio vale ~$15000 (comida individual + bebida)
const PRIZE_VALUE = 15000;

const claimsRef = collection(db, 'prizeClaims');
const snapshot = await getDocs(claimsRef);
const claims = snapshot.docs.map(doc => doc.data());

const deliveredCount = claims.filter(c => c.status === 'delivered').length;
const totalValue = deliveredCount * PRIZE_VALUE;

console.log(`Premios entregados: ${deliveredCount}`);
console.log(`Valor total: $${totalValue.toLocaleString('es-CO')}`);
```

---

## 🎉 ¡Listo!

Una vez configurado el índice, el sistema de reclamos funcionará automáticamente:

✅ Usuarios pueden reclamar desde la app  
✅ Sellos se reinician automáticamente  
✅ Admin ve todos los reclamos  
✅ Admin puede cambiar estado y agregar notas  
✅ Todo queda registrado en Firestore  

---

## 📞 Soporte

Si hay problemas después de seguir esta guía:

1. **Recolectar información:**
   - Captura del error en consola
   - URL del índice (si aparece en el error)
   - Estado del índice en Firebase Console

2. **Verificar:**
   - Índice está "Enabled" en Firebase Console
   - Reglas de Firestore permiten lectura/escritura
   - Hay conexión a Internet estable

3. **Contactar al desarrollador** con toda la información
