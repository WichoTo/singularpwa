// src/lib/turno/turnoHelpers.ts
import type {
  Mesa,
  ItemMenu,
  CuentaMesero,
  CuentaComensal,
  ConceptoCuenta,
  EstadoConcepto,
  Pago,
} from '../../config/types'

/* =========================================================
   Utilidades numéricas
   - Acepta number | string | null/undefined y regresa un número válido
   - Fallback = 0 (útil cuando Supabase devuelve decimales como string)
========================================================= */
function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (typeof v === 'number' ? v : NaN)
  return Number.isFinite(n) ? n : fallback
}

/* =========================================================
   Etiquetas / normalización
========================================================= */
export function mesaLabel(mesas: Mesa[], mesaid?: string | null): string {
  if (!mesaid) return 'Sin asignar'
  const m = mesas.find(x => x.id === mesaid)
  const label =
    (m as any)?.nomesa ??
    (m as any)?.nombre ??
    (m as any)?.numero ??
    (m as any)?.etiqueta ??
    ''
  return label || 'Sin asignar'
}

/* =========================================================
   Precios, importes y totales
========================================================= */
/**
 * Precio unitario efectivo de un concepto.
 * - Si existe `importe`, se respeta.
 * - Si no, se calcula como `preciounitario - descuento`.
 * - Si algo falta/está inválido → 0.
 * - **Nunca negativo** por seguridad de negocio.
 */
export function precioUnitario(c: ConceptoCuenta): number {
  if (c.importe != null) return Math.max(0, num(c.importe, 0))
  const base = num(c.preciounitario, 0)
  const desc = num(c.descuento, 0)
  return Math.max(0, base - desc)
}

/** Total de un arreglo de conceptos (ignora cancelados por defecto).
 * Cada fila representa 1 unidad.
 */
export function totalConceptos(
  conceptos: ConceptoCuenta[],
  opts: { ignorarEstados?: EstadoConcepto[] } = { ignorarEstados: ['cancelado'] }
): number {
  const ignorar = new Set(opts.ignorarEstados ?? [])
  return conceptos
    .filter(c => !ignorar.has(c.estado))
    .reduce((sum, c) => sum + precioUnitario(c), 0)
}

/** Total por cuenta del mesero (misma regla que totalConceptos). */
export function totalCuentaMesero(conceptosDeEsaCuenta: ConceptoCuenta[]): number {
  return totalConceptos(conceptosDeEsaCuenta)
}

/* =========================================================
   Filtros consistentes
========================================================= */
export function conceptosDeCuentaMesero(
  conceptos: ConceptoCuenta[],
  cuentameseroid: string
): ConceptoCuenta[] {
  return conceptos.filter(
    c => c.cuentameseroid === cuentameseroid && c.estado !== 'cancelado'
  )
}

export function pendientesDeComensalEnMesa(
  conceptos: ConceptoCuenta[],
  ctx: { turnoid: string; sucursalid: string; mesaid: string | null }
): ConceptoCuenta[] {
  const { turnoid, sucursalid, mesaid } = ctx
  return conceptos.filter(
    c =>
      c.turnoid === turnoid &&
      c.sucursalid === sucursalid &&
      c.mesaid === mesaid &&
      c.origen === 'comensal' &&
      c.estado === 'pendiente' &&
      !c.cuentameseroid // aún no asignado a cuenta del mesero
  )
}

/* =========================================================
   Aceptar / Rechazar pedidos del comensal
========================================================= */
export function payloadAceptarComensal(
  row: ConceptoCuenta,
  ctx: { cuentameseroid: string; userid: string }
): ConceptoCuenta {
  return {
    ...row,
    cuentameseroid: ctx.cuentameseroid,
    estado: 'aceptado',
    accepted_by: ctx.userid,
    updated_at: new Date().toISOString(),
    version: (row.version ?? 0) + 1,
    // si no tenía importe unitario, calcúlalo (tolerante a 0)
    importe: row.importe != null ? Math.max(0, num(row.importe, 0)) : precioUnitario(row),
  }
}

export function payloadRechazarComensal(
  row: ConceptoCuenta,
  ctx: { userid: string }
): ConceptoCuenta {
  return {
    ...row,
    estado: 'cancelado',
    canceled_by: ctx.userid,
    updated_at: new Date().toISOString(),
    version: (row.version ?? 0) + 1,
  }
}

/* =========================================================
   Alta desde menú (mesero)
   - Permite precio 0 y descuento 0
========================================================= */
export function nuevoConceptoMeseroDesdeItem(
  item: ItemMenu,
  ctx: {
    sucursalid: string
    turnoid: string
    mesaid: string | null
    cuentameseroid: string
    userid: string
    nombrecliente?: string | null
    estado?: EstadoConcepto // default 'aceptado'
  }
): ConceptoCuenta {
  const estado: EstadoConcepto = ctx.estado ?? 'aceptado'
  const unit = Math.max(0, num(item.precioVenta, 0)) // permite 0, nunca negativo
  return {
    id: crypto.randomUUID(),
    sucursalid: ctx.sucursalid,
    turnoid: ctx.turnoid,
    mesaid: ctx.mesaid ?? null,
    cuentameseroid: ctx.cuentameseroid,
    cuentacomensalid: null,
    itemmenuid: item.id,
    preciounitario: unit,
    descuento: 0,
    importe: unit, // 1 unidad por fila
    nombrecliente: ctx.nombrecliente ?? undefined,
    notas: null,
    accepted_by: estado === 'aceptado' ? ctx.userid : null,
    canceled_by: null,
    estado,
    origen: 'mesero',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  }
}

/* =========================================================
   Cambios de estado / eliminar
========================================================= */
export function payloadCambioEstado(
  row: ConceptoCuenta,
  next: EstadoConcepto
): ConceptoCuenta {
  return {
    ...row,
    estado: next,
    updated_at: new Date().toISOString(),
    version: (row.version ?? 0) + 1,
  }
}

/** Estrategia de borrado:
 * - Si lo creó el mesero y sigue 'aceptado' → intentar hard-delete.
 * - En otro caso → soft-cancel (estado='cancelado').
 */
export function estrategiaBorrado(row: ConceptoCuenta):
  | { strategy: 'hard-delete' }
  | { strategy: 'soft-cancel'; payload: ConceptoCuenta } {
  if (row.origen === 'mesero' && row.estado === 'aceptado') {
    return { strategy: 'hard-delete' }
  }
  return {
    strategy: 'soft-cancel',
    payload: {
      ...row,
      estado: 'cancelado',
      updated_at: new Date().toISOString(),
      version: (row.version ?? 0) + 1,
    },
  }
}

/* =========================================================
   Agrupación para UI (1 fila por combinación)
========================================================= */
export type ConceptoUI = {
  id: string               // id representativo para acciones
  itemmenuid: string
  nombre: string
  cantidad: number
  precioUnit: number
  estado: EstadoConcepto
  nombrecliente?: string
}

/** Agrupa por itemmenuid + estado + nombrecliente (coincide con la UI de “Pedido actual”). */
export function agrupaParaUI(
  conceptos: ConceptoCuenta[],
  menu: ItemMenu[]
): ConceptoUI[] {
  type Key = string
  const map = new Map<Key, ConceptoUI>()
  const nombreDe = (id: string) => menu.find(m => m.id === id)?.nombre ?? 'Ítem'

  for (const c of conceptos) {
    const key = `${c.itemmenuid}__${c.estado}__${c.nombrecliente ?? ''}`
    const nombre = nombreDe(c.itemmenuid)
    if (!map.has(key)) {
      map.set(key, {
        id: c.id,
        itemmenuid: c.itemmenuid,
        nombre,
        cantidad: 1,                     // cada fila = 1 unidad
        precioUnit: precioUnitario(c),
        estado: c.estado,
        nombrecliente: c.nombrecliente ?? undefined,
      })
    } else {
      const ref = map.get(key)!
      ref.cantidad += 1
      // precioUnit se conserva (debe ser homogéneo dentro del grupo)
    }
  }
  return Array.from(map.values())
}

/* =========================================================
   Pagos
========================================================= */
/** Construye un índice conceptoId → cantidad pagada, basado en Pago.detalles.productos. */
export function pagosPorConcepto(pagos: Pago[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const p of pagos ?? []) {
    const prods = (p as any)?.detalles?.productos as Array<{ conceptoId: string; cantidad: number }> | undefined
    if (!Array.isArray(prods)) continue
    for (const prod of prods) {
      const cid = prod?.conceptoId
      const qty = num(prod?.cantidad, 0)
      if (!cid || !Number.isFinite(qty)) continue
      acc[cid] = (acc[cid] ?? 0) + qty
    }
  }
  return acc
}

/** Total pagado por cuenta (suma de p.total). */
export function totalPagadoPorCuenta(pagos: Pago[], cuentaId: string): number {
  return (pagos ?? [])
    .filter(p => p.cuentaid === cuentaId)
    .reduce((s, p) => s + num(p.total, 0), 0)
}

/** ¿Se puede cerrar? (tolerancia opcional, p.ej. 0.01) */
export function puedeCerrarCuenta(total: number, pagado: number, tolerancia = 0.009): boolean {
  return (total - pagado) <= tolerancia
}
// tolerancia común para redondeos
export const EPS = 0.009

/** Restante después de sumar lo recién cobrado a lo ya pagado (confirmado). */
export function restanteTrasCobro(total: number, pagadoConfirmado: number, cobradoAhora: number) {
  return Math.max(0, total - (pagadoConfirmado + cobradoAhora))
}

/** ¿Debo cerrar la cuenta después de este cobro? */
export function debeCerrarDespues(
  total: number,
  pagadoConfirmado: number,
  cobradoAhora: number,
  tolerancia = EPS
): boolean {
  // reutiliza tu helper existente
  return puedeCerrarCuenta(total, pagadoConfirmado + cobradoAhora, tolerancia)
}

/* =========================================================
   Sincronización de cuentas
========================================================= */
/** Si falta ligar la cuenta comensal con la del mesero, sugiere un payload actualizado (no escribe). */
export function linkComensalConMesero(
  cc: CuentaComensal,
  cm: CuentaMesero
): CuentaComensal {
  if (cc.cuentameseroid && cc.turnoid === cm.turnoid) return cc
  return {
    ...cc,
    cuentameseroid: cm.id,
    turnoid: cm.turnoid,
    updated_at: new Date().toISOString(),
    version: (cc.version ?? 0) + 1,
  }
}
