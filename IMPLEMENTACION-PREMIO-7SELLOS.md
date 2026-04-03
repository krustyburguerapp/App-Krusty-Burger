# 🏆 Sistema de Reclamo de Premio - 7 Sellos

## ✅ Implementación Completada

El sistema permite a los usuarios con 7 sellos reclamar su premio (comida individual + bebida pequeña gratis) directamente desde la app, con reinicio automático de sellos al confirmar el pedido.

---

## 🔄 Flujo Completo

### **1. Usuario tiene 7 sellos**
- Va a "Mis Pedidos"
- Hace click en la tarjeta de "Sellos Krusty"
- Ve que completó los 7 sellos

### **2. Inicia el reclamo**
- Click en "🎁 Reclamar mi premio AHORA"
- Modal de confirmación explica el proceso
- Click en "Sí, ir al menú"
- Sistema guarda estado temporal en localStorage

### **3. Usuario va al menú**
- Banner dorado aparece en la parte superior
- Indica que está en "modo reclamo de premio"
- Debe seleccionar:
  - ✅ 1 Comida individual (cualquiera de la categoría "individual")
  - ✅ 1 Bebida pequeña (categoría "bebidas_pequenas")

### **4. Usuario puede agregar más items**
- Puede agregar adicionales (papas, aros, etc.) → **SE COBRAN**
- Puede agregar más bebidas → **SE COBRAN**
- El domicilio → **SE COBRA**

### **5. Va al carrito/checkout**
- Sistema detecta que es pedido de premio
- Muestra banner dorado: "🎉 Premio de 7 Sellos Aplicado"
- La primera comida individual aparece como **GRATIS**
- La primera bebida pequeña aparece como **GRATIS**
- Demás items se cobran normal
- Muestra cuánto ahorró

### **6. Usuario confirma pedido**
- Llena datos de entrega
- Selecciona método de pago
- Click en "Confirmar Pedido"

### **7. Sistema procesa**
- Crea el pedido en Firestore con `isPrizeOrder: true`
- **Automáticamente** ejecuta `confirmPrizeRedemption()`
- Reinicia los sellos a 0
- Crea registro en colección `prizeClaims`
- Limpia estado temporal

### **8. Usuario ve confirmación**
- Pedido creado exitosamente
- Sellos reiniciados: 0/7
- Puede empezar a acumular de nuevo

---

## 📁 Archivos Modificados/Creados

### **Modificados:**

| Archivo | Cambios |
|---------|---------|
| `src/utils/loyaltySystem.js` | + `startPrizeRedemption()`, `getPrizeRedemptionState()`, `clearPrizeRedemptionState()`, `confirmPrizeRedemption()` |
| `src/contexts/CartContext.jsx` | + Lógica para hacer gratis 1 comida + 1 bebida, + `prizeSavings`, + `hasRequiredPrizeItems()` |
| `src/contexts/OrdersContext.jsx` | + Llama a `confirmPrizeRedemption()` al crear pedido con `isPrizeOrder` |
| `src/pages/OrderTracking/OrderTracking.jsx` | + `handleLoyaltyClick()` actualizado para iniciar reclamo |
| `src/pages/Menu/Menu.jsx` | + Incluye `PrizeRedemptionBanner` |
| `src/pages/Checkout/Checkout.jsx` | + Muestra desglose del premio, items gratis, ahorro |
| `src/pages/Checkout/Checkout.css` | + Estilos para items gratis y banner de premio |

### **Creados:**

| Archivo | Descripción |
|---------|-------------|
| `src/components/UI/PrizeRedemptionBanner.jsx` | Banner que muestra estado del reclamo en el menú |
| `src/components/UI/PrizeRedemptionBanner.css` | Estilos del banner |

---

## 🗄️ Estructura de Datos

### **Estado Temporal (localStorage):**
```javascript
{
  isActive: true,
  userId: "abc123...",
  month: "2026-03",
  stampsAtStart: 7,
  startedAt: "2026-03-30T15:30:00Z",
  userName: "Juan Pérez",
  userEmail: "juan@email.com",
  userPhone: "3001234567"
}
```

**Expira después de 30 minutos**

### **Pedido en Firestore:**
```javascript
orders/
└── {orderId}/
    ├── userId: "abc123..."
    ├── isPrizeOrder: true              ← Indica que es pedido de premio
    ├── prizeSavings: 23000             ← Cuánto ahorró
    ├── items: [...]
    ├── subtotal: 8000                  ← Solo items no-gratis
    ├── deliveryFee: 3000
    ├── total: 11000                    ← A pagar
    └── ...
```

### **Reclamo en Firestore:**
```javascript
prizeClaims/
└── {claimId}/
    ├── userId: "abc123..."
    ├── userName: "Juan Pérez"
    ├── month: "2026-03"
    ├── stampsAtClaim: 7
    ├── claimedAt: "2026-03-30T15:30:00Z"
    ├── status: "pending"
    ├── orderId: "xyz789..."           ← Vinculado al pedido
    └── ...
```

### **loyaltyStamps (reiniciado):**
```javascript
loyaltyStamps/
└── {userId}_2026-03/
    ├── stamps: 0                       ← Reiniciado
    ├── stampDays: []                   ← Vacío
    ├── manualStamps: []                ← Vacío
    ├── prizeClaimed: true              ← Marcado
    ├── prizeClaimedAt: "..."
    ├── autoReset: true                 ← Indica reinicio automático
    └── lastUpdated: "..."
```

---

## 🎨 Interfaz Visual

### **Banner en Menú:**
```
┌─────────────────────────────────────────────────┐
│  🎁 Reclamo de Premio - 7 Sellos               │
│  Selecciona 1 comida individual y 1 bebida     │
│  pequeña para tu premio gratis.                │
│                                      [X]       │
├─────────────────────────────────────────────────┤
│  🍔 Comida Individual  ✓                       │
│  🥤 Bebida Pequeña     ✓                       │
└─────────────────────────────────────────────────┘
```

### **Checkout - Resumen:**
```
┌─────────────────────────────────────────────────┐
│  🎉 Premio de 7 Sellos Aplicado                │
│  1 Comida Individual + 1 Bebida Pequeña GRATIS │
├─────────────────────────────────────────────────┤
│  1x Hamburguesa Clásica (GRATIS)      $0       │
│  1x Bebida Pequeña   (GRATIS)         $0       │
│  1x Papas Francesas                   $8.000   │
│  ─────────────────────────────────────────────  │
│  Subtotal                             $8.000   │
│  Descuento Premio (7 sellos)         -$23.000  │
│  Domicilio (2.5 km)                   $3.000   │
│  ─────────────────────────────────────────────  │
│  TOTAL                               $11.000   │
│                                                 │
│  🎉 ¡Ahorraste $23.000 con tu premio!          │
└─────────────────────────────────────────────────┘
```

---

## 🔒 Reglas de Seguridad

### **Firestore Rules (firestore.rules):**

```javascript
// Colección prizeClaims
match /prizeClaims/{claimId} {
  allow create: if request.auth != null &&
                   request.resource.data.userId == request.auth.uid;
  allow read: if request.auth != null &&
                 (resource.data.userId == request.auth.uid || isAdmin());
  allow update, delete: if request.auth != null && isAdmin();
}
```

---

## ⚙️ Configuración Requerida

### **1. Índices de Firestore**

La colección `prizeClaims` requiere un índice para la página de admin:

```
Collection ID: prizeClaims

Fields:
┌─────────────┬───────────────┐
│ Field       │ Order         │
├─────────────┼───────────────┤
│ month       │ Ascending     │
│ claimedAt   │ Descending    │
└─────────────┴───────────────┘
```

**Cómo crear:**
1. Ir a Firebase Console → Firestore → Indexes
2. Click en "Create Index"
3. Agregar campos
4. Esperar 1-5 minutos

### **2. Subir Reglas de Firestore**

```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Pruebas Recomendadas

### **Flujo Completo:**

1. **Usuario con 7 sellos:**
   - Ir a "Mis Pedidos"
   - Click en tarjeta de sellos
   - Click en "Reclamar premio"
   - Confirmar
   - Verificar que va al menú

2. **En el menú:**
   - Verificar que aparece banner dorado
   - Agregar 1 comida individual
   - Agregar 1 bebida pequeña
   - Verificar que banner muestra checkmarks

3. **En checkout:**
   - Verificar banner de premio
   - Verificar que comida y bebida dicen "GRATIS"
   - Verificar que muestra ahorro
   - Completar datos
   - Confirmar pedido

4. **Después de confirmar:**
   - Verificar que pedido se creó
   - Ir a "Mis Pedidos"
   - Verificar que sellos están en 0
   - Verificar que dice "Premio ya reclamado"

5. **Admin:**
   - Ir a Admin → Reclamos de Premios
   - Verificar que el reclamo aparece
   - Verificar datos del usuario
   - Marcar como "Entregado"

---

## 🐛 Solución de Problemas

### **Banner no aparece en menú:**
- Verificar que `PrizeRedemptionBanner` está importado en `Menu.jsx`
- Verificar que localStorage tiene `krustyPrizeRedemption`
- Abrir consola y buscar logs de `getPrizeRedemptionState()`

### **Items no salen gratis:**
- Verificar que categories de productos son correctas:
  - Comida: `category: 'individual'`
  - Bebida: `category: 'bebidas_pequenas'`
- Verificar que `isPrizeOrder` es `true` en checkout

### **Sellos no se reinician:**
- Abrir consola
- Buscar logs de `confirmPrizeRedemption()`
- Verificar que pedido tiene `isPrizeOrder: true`
- Verificar reglas de Firestore

### **Error "Permission denied":**
- Subir archivo `firestore.rules` a Firebase
- Verificar que usuario está autenticado

---

## 📊 Métricas

### **Comandos útiles (consola):**

```javascript
// Ver todos los reclamos del mes
import { db } from './config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const claimsRef = collection(db, 'prizeClaims');
const q = query(claimsRef, where('month', '==', monthKey));
const snapshot = await getDocs(q);
const claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
console.log('Reclamos del mes:', claims);
```

---

## ✅ Checklist Final

- [x] Funciones de reclamo en `loyaltySystem.js`
- [x] Lógica de descuento en `CartContext.jsx`
- [x] Reinicio automático en `OrdersContext.jsx`
- [x] Botón en `OrderTracking.jsx`
- [x] Banner en `Menu.jsx`
- [x] Desglose en `Checkout.jsx`
- [x] Estilos CSS
- [x] Build exitoso
- [ ] Subir `firestore.rules` a Firebase
- [ ] Crear índice de Firestore para `prizeClaims`

---

## 🎉 ¡Listo!

El sistema de reclamo de premios está **completamente implementado**. Los usuarios pueden:
- ✅ Reclamar premio desde la app
- ✅ Elegir comida y bebida gratis
- ✅ Agregar adicionales (pago)
- ✅ Tener sellos reiniciados automáticamente

Y el admin puede:
- ✅ Ver todos los reclamos
- ✅ Gestionar estado (pendiente/entregado)
- ✅ Ver historial completo
