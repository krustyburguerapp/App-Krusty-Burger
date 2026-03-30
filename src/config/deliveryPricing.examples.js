/**
 * Configuración de Ejemplo para Precios de Domicilio
 * 
 * Este archivo muestra diferentes estrategias de precios que el administrador puede usar.
 * Copia y pega los valores en el panel de administración según tu necesidad.
 * 
 * Para usar:
 * 1. Ve a /admin/delivery-pricing
 * 2. Ingresa los valores de la estrategia que prefieras
 * 3. Haz clic en "Guardar Cambios"
 */

// ============================================================================
// ESTRATEGIA 1: PRECIOS PROMOCIONALES (Para impulsar pedidos)
// ============================================================================
// Ideal para: Lanzamiento, días de baja demanda, competencia agresiva
const estrategiaPromocional = {
    maxDistanceKm: 5,
    prices: {
        '0.5': 1000,   // Casi simbólico
        '1.0': 1500,   // Muy económico
        '1.5': 2000,   // Accesible
        '2.0': 2500,   // Justo
        '2.5': 3000,   // Razonable
        '3.0': 3500,   // Medio
        '3.5': 4500,   // Empieza a subir
        '4.0': 5500,   // Distancia considerable
        '4.5': 6500,   // Lejos
        '5.0': 7500    // Máximo
    },
    descripcion: 'Precios bajos para fomentar pedidos. Margen reducido.'
};

// ============================================================================
// ESTRATEGIA 2: PRECIOS ESTÁNDAR (Recomendada)
// ============================================================================
// Ideal para: Operación normal, equilibrio entre costo y rentabilidad
const estrategiaEstandar = {
    maxDistanceKm: 5,
    prices: {
        '0.5': 2000,   // Base
        '1.0': 2000,   // Misma tarifa cercana
        '1.5': 3500,   // Transición
        '2.0': 4000,   // Media
        '2.5': 4500,   // Media-alta
        '3.0': 5000,   // Estándar
        '3.5': 7500,   // Salto por distancia
        '4.0': 10000,  // Lejos
        '4.5': 12500,  // Muy lejos
        '5.0': 15000   // Máximo
    },
    descripcion: 'Equilibrio entre cubrir costos y ser competitivo.'
};

// ============================================================================
// ESTRATEGIA 3: PRECIOS PREMIUM (Alta rentabilidad)
// ============================================================================
// Ideal para: Zonas de alto poder adquisitivo, horarios pico, lluvia
const estrategiaPremium = {
    maxDistanceKm: 6,
    prices: {
        '0.5': 3000,   // Base premium
        '1.0': 3500,   // Cercano premium
        '1.5': 5000,   // Transición alta
        '2.0': 6000,   // Media premium
        '2.5': 7000,   // Media-alta premium
        '3.0': 8000,   // Estándar premium
        '3.5': 10000,  // Distancia premium
        '4.0': 12000,  // Lejos premium
        '4.5': 14000,  // Muy lejos premium
        '5.0': 16000,  // Máximo estándar
        '5.5': 18000,  // Extra (si maxDistanceKm = 6)
        '6.0': 20000   // Máximo absoluto
    },
    descripcion: 'Maximiza rentabilidad. Solo para zonas específicas.'
};

// ============================================================================
// ESTRATEGIA 4: PRECIOS POR ZONAS (Diferenciada)
// ============================================================================
// Ideal para: Ciudades con zonas de difícil acceso o tráfico variable
const estrategiaZonas = {
    maxDistanceKm: 5,
    prices: {
        '0.5': 2000,   // Zona 1 - Muy cerca
        '1.0': 2000,   // Zona 1 - Cerca
        '1.5': 3000,   // Zona 2 - Transición
        '2.0': 3500,   // Zona 2 - Media
        '2.5': 4000,   // Zona 2 - Media-alta
        '3.0': 5000,   // Zona 3 - Límite razonable
        '3.5': 8000,   // Zona 4 - Salto significativo
        '4.0': 11000,  // Zona 4 - Lejos
        '4.5': 14000,  // Zona 5 - Muy lejos
        '5.0': 17000   // Zona 5 - Máximo
    },
    descripcion: 'Diferencia claramente zonas cercanas de lejanas.'
};

// ============================================================================
// ESTRATEGIA 5: PRECIOS FLAT (Simple)
// ============================================================================
// Ideal para: Operación simplificada, fácil de comunicar al cliente
const estrategiaFlat = {
    maxDistanceKm: 4,
    prices: {
        '0.5': 4000,   // Todo igual
        '1.0': 4000,   // Tarifa única
        '1.5': 4000,   // hasta
        '2.0': 4000,   // 4 km
        '2.5': 4000,
        '3.0': 4000,
        '3.5': 4000,
        '4.0': 4000
    },
    descripcion: 'Tarifa única hasta 4 km. Simple y fácil de entender.'
};

// ============================================================================
// ESTRATEGIA 6: PRECIOS DINÁMICOS POR HORARIO (Sugerencia)
// ============================================================================
// Ideal para: Implementación futura con automatización
// NOTA: Esta estrategia requeriría programación adicional para cambiar
// automáticamente según la hora del día.

const estrategiaDinamicaSugerida = {
    horarioNormal: {
        // 5:00 PM - 9:00 PM (Horario estándar)
        '0.5': 2000,
        '1.0': 2000,
        '1.5': 3500,
        '2.0': 4000,
        '2.5': 4500,
        '3.0': 5000,
        '3.5': 7500,
        '4.0': 10000,
        '4.5': 12500,
        '5.0': 15000
    },
    horarioPico: {
        // 9:00 PM - 11:00 PM (Recargo nocturno)
        '0.5': 3000,
        '1.0': 3000,
        '1.5': 5000,
        '2.0': 6000,
        '2.5': 7000,
        '3.0': 8000,
        '3.5': 10000,
        '4.0': 13000,
        '4.5': 16000,
        '5.0': 19000
    },
    descripcion: 'Requiere automatización. Cambia según hora del día.'
};

// ============================================================================
// RECOMENDACIONES POR TIPO DE NEGOCIO
// ============================================================================

const recomendaciones = {
    restauranteNuevo: {
        estrategia: 'Promocional',
        duracion: 'Primeros 3 meses',
        objetivo: 'Ganar clientes y visibilidad'
    },
    restauranteEstablecido: {
        estrategia: 'Estándar',
        duracion: 'Continuo',
        objetivo: 'Equilibrio entre costo y ganancia'
    },
    zonaExclusiva: {
        estrategia: 'Premium',
        duracion: 'Continuo',
        objetivo: 'Maximizar rentabilidad por pedido'
    },
    ciudadGrande: {
        estrategia: 'Por Zonas',
        duracion: 'Continuo',
        objetivo: 'Reflejar realidad de distancias y tráfico'
    },
    operacionSimple: {
        estrategia: 'Flat',
        duracion: 'Continuo',
        objetivo: 'Facilitar comprensión del cliente'
    }
};

// ============================================================================
// CÁLCULO DE RENTABILIDAD
// ============================================================================

/**
 * Función para calcular si una tarifa es rentable
 * 
 * Fórmula:
 * Rentabilidad = Tarifa - (Costo Combustible + Costo Domiciliario + Costos Operativos)
 * 
 * Ejemplo para 3 km:
 * - Tarifa: $5,000
 * - Combustible (moto 150cc, 35km/L, $20,000/galón): $1,714
 * - Domiciliario (por viaje): $2,000
 * - Operativos (empaque, administración): $500
 * - Utilidad: $5,000 - $1,714 - $2,000 - $500 = $786
 * 
 * Margen: $786 / $5,000 = 15.7%
 */

const ejemploRentabilidad = {
    distancia: '3.0 km',
    tarifa: 5000,
    costos: {
        combustible: 1714,  // Ida y vuelta (6 km total)
        domiciliario: 2000,
        operativos: 500,
        total: 4214
    },
    utilidad: 786,
    margen: '15.7%'
};

// ============================================================================
// EXPORTAR PARA USO EN CONSOLA (OPCIONAL)
// ============================================================================

// Si quieres probar los valores en la consola del navegador:
// console.log('Promocional:', estrategiaPromocional);
// console.log('Estándar:', estrategiaEstandar);
// console.log('Premium:', estrategiaPremium);
// console.log('Recomendaciones:', recomendaciones);

module.exports = {
    estrategiaPromocional,
    estrategiaEstandar,
    estrategiaPremium,
    estrategiaZonas,
    estrategiaFlat,
    recomendaciones
};
