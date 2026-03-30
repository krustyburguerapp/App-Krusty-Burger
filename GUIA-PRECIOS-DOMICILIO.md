# 📦 Guía de Configuración de Precios de Domicilio

## 🎯 Descripción General

El sistema ahora permite al administrador configurar **las tarifas de domicilio de forma flexible**, definiendo precios personalizados para cada intervalo de 0.5 km hasta la distancia máxima.

---

## 📍 Acceso al Panel

1. Inicia sesión como administrador (`krustyburguerco@gmail.com`)
2. Ve al **Panel de Administración** (`/admin`)
3. Haz clic en **"Precios Domicilio"** o navega a `/admin/delivery-pricing`

---

## ⚙️ Cómo Configurar las Tarifas

### 1. Distancia Máxima de Domicilio

En la sección **"Configuración General"**:
- Selecciona la distancia máxima (de 3 km a 8 km)
- Los pedidos que superen esta distancia **no podrán realizarse a domicilio**

### 2. Tarifas por Distancia

En la sección **"Tarifas por Distancia"**:
- Verás tarjetas para cada intervalo de 0.5 km (0.5, 1.0, 1.5, 2.0, etc.)
- Solo se muestran los intervalos hasta la distancia máxima seleccionada
- Ingresa el valor en pesos colombianos (COP) para cada intervalo

**Ejemplo de configuración:**

| Distancia | Precio Sugerido | Descripción |
|-----------|-----------------|-------------|
| 0.5 - 1.0 km | $2,000 | Tarifa base cercana |
| 1.5 - 2.0 km | $3,500 - $4,000 | Distancia media corta |
| 2.5 - 3.0 km | $4,500 - $5,000 | Distancia media |
| 3.5 - 4.0 km | $7,500 - $10,000 | Distancia larga |
| 4.5 - 5.0 km | $12,500 - $15,000 | Distancia máxima |

### 3. Vista Previa

La sección **"Vista Previa"** muestra ejemplos de cómo se calcularán las tarifas:
- Domicilio a 1.5 km
- Domicilio a 3.0 km
- Domicilio a 5.0 km

### 4. Guardar Cambios

- Haz clic en **"Guardar Cambios"** para aplicar la configuración
- Los cambios se guardan en Firestore y se aplican **inmediatamente**
- El sistema muestra un indicador `*` cuando hay cambios sin guardar

### 5. Restablecer Valores

- Haz clic en **"Restablecer valores"** para volver a la configuración por defecto
- ⚠️ **Advertencia**: Esta acción es irreversible si no has guardado antes

---

## 🔄 Cómo Funciona el Cálculo

El sistema:
1. **Obtiene las coordenadas GPS** del cliente (vía botón "Usar mi ubicación")
2. **Calcula la distancia en línea recta** entre el restaurante y el cliente (Fórmula Haversine)
3. **Redondea hacia arriba** al intervalo de 0.5 km más cercano
4. **Busca la tarifa** correspondiente en la configuración
5. **Aplica el precio** al pedido

**Ejemplo:**
- Distancia real: 2.3 km
- Intervalo aplicado: 2.5 km
- Precio: El configurado para 2.5 km

---

## 📊 Estructura de Datos en Firestore

La configuración se guarda en:
```
Colección: deliveryPricing
Documento: config
```

**Campos:**
```javascript
{
    maxDistanceKm: 5,           // Distancia máxima
    prices: {                   // Precios por intervalo
        "0.5": 2000,
        "1.0": 2000,
        "1.5": 3500,
        "2.0": 4000,
        "2.5": 4500,
        "3.0": 5000,
        "3.5": 7500,
        "4.0": 10000,
        "4.5": 12500,
        "5.0": 15000
    },
    updatedAt: "2026-03-30T...", // Fecha de última actualización
    updatedBy: "userId123"       // ID del admin que guardó
}
```

---

## 🎨 Integración con la App

### Para el Cliente:
1. En **Checkout**, el cliente selecciona "Domicilio"
2. El sistema muestra **"Calculando..."** mientras obtiene la ubicación
3. Una vez calculada la distancia, muestra:
   - Distancia exacta (ej: "2.3 km")
   - Tarifa calculada (ej: "$4,500")
   - Si supera el límite: mensaje de error

### Para el Administrador:
1. **BottomNav** muestra ícono de "Domicilios" cuando estás en secciones admin
2. **Dashboard** tiene acceso rápido en "Acciones Rápidas"
3. La configuración muestra **última actualización** con fecha y responsable

---

## ⚠️ Consideraciones Importantes

### 1. Distancia en Línea Recta vs. Ruta Real
- El sistema calcula distancia **en línea recta** (Haversine)
- Una dirección a 3 km en línea recta puede ser 5 km por carretera
- **Recomendación**: Ajusta los precios considerando esta diferencia

### 2. Caché de Configuración
- La configuración se almacena en caché por **5 minutos**
- Los cambios pueden tardar hasta 5 minutos en reflejarse completamente
- Para cambios urgentes, recarga la página del cliente

### 3. Validaciones
- Precios no pueden ser negativos
- Si un precio está vacío, se interpreta como $0
- Siempre debe haber un precio para la distancia máxima

### 4. Múltiples Administradores
- Varios admins pueden editar la configuración
- El sistema registra **quién** y **cuándo** hizo el último cambio
- No hay bloqueo de edición simultánea

---

## 🛠️ Solución de Problemas

### "Calculando..." no desaparece
- Verifica que el cliente haya dado permiso de ubicación
- Revisa que las coordenadas sean válidas
- Confirma que la distancia no supere el máximo configurado

### Precios no se actualizan
- Espera hasta 5 minutos por el caché
- Recarga la página del checkout
- Verifica en Firestore que la configuración se guardó

### Error al guardar
- Verifica conexión a internet
- Confirma permisos de escritura en Firestore
- Revisa la consola del navegador para errores específicos

---

## 📱 Flujo Completo del Pedido

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Cliente agrega productos al carrito                     │
│         ↓                                                    │
│ 2. Va a Checkout y selecciona "Domicilio"                  │
│         ↓                                                    │
│ 3. Sistema obtiene coordenadas GPS                         │
│         ↓                                                    │
│ 4. Calcula distancia usando configuración dinámica         │
│         ↓                                                    │
│ 5. Muestra tarifa calculada                                │
│         ↓                                                    │
│ 6. Cliente completa datos y paga                           │
│         ↓                                                    │
│ 7. Admin recibe pedido con tarifa aplicada                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Mejores Prácticas

1. **Revisa mensualmente** las tarifas de combustible
2. **Ajusta precios** según costos operativos reales
3. **Considera zonas** de difícil acceso con precios especiales
4. **Comunica cambios** a los clientes si son significativos
5. **Prueba la configuración** con diferentes distancias antes de publicar

---

## 📞 Soporte

Para problemas técnicos o preguntas sobre la configuración:
1. Revisa esta guía primero
2. Verifica la consola del navegador (F12) para errores
3. Revisa Firestore para confirmar que los datos se guardaron

---

**Última actualización de esta guía:** Marzo 30, 2026  
**Versión del sistema:** 1.0.0 - Configuración Dinámica de Domicilios
