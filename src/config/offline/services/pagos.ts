// src/config/offline/services/pagos.ts
import { supabase } from '../../supabaseClient'
import { isOnline, uuid } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import type { Pago, MetodoPago, PagoProducto, ConceptoCuenta, SeleccionPorConcepto } from '../../types'
import { cachePagos, readPagosByTurno, readPagosByCuenta, replacePagosByTurno } from '../cache/pagos'
import { upsertConceptoAware } from './cuentas'

function nowIso() { return new Date().toISOString() }

/* ========================= FETCH ========================= */

type FetchPagosArgs =
  | { turnoid: string; cuentaId?: string; sucursalid?: string }
  | { cuentaId: string }

export async function fetchPagosAware(args: FetchPagosArgs): Promise<{ data: Pago[]; fromCache: boolean }> {
  const hasTurno = (args as any).turnoid != null
  const hasCuenta = (args as any).cuentaId != null

  if (isOnline()) {
    let q = supabase.from('pagos').select('*')

    if (hasTurno) q = q.eq('turnoid', (args as any).turnoid)
    if (hasCuenta) q = q.eq('cuentaId', (args as any).cuentaId)
    if ((args as any).sucursalid) q = q.eq('sucursalid', (args as any).sucursalid)

    const { data, error } = await q
    if (!error && Array.isArray(data)) {
      const rows = data as Pago[]
      // Si pediste por turno y sin cuenta ⇒ reemplazo completo por turno
      if (hasTurno && !hasCuenta) {
        await replacePagosByTurno((args as any).turnoid, rows)
      } else {
        await cachePagos(rows)
      }
      return { data: rows, fromCache: false }
    }
  }

  // Offline: lee de cache según lo que pidieron
  if (hasCuenta) {
    const list = await readPagosByCuenta((args as any).cuentaId)
    return { data: list, fromCache: true }
  }
  // por turno
  const list = await readPagosByTurno((args as any).turnoid)
  return { data: list, fromCache: true }
}

/* ========================= UPSERT ========================= */

/** Crea/upsertea un pago (offline-first). NO borra. */
export async function upsertPagoAware(p: Omit<Pago, 'id' | 'estado' | 'fecha'> & { id?: string; fecha?: string; estado?: Pago['estado'] }) {
  const id = p.id?.trim() ? p.id : uuid()
  const payload: Pago = {
    ...p,
    id,
    fecha: p.fecha ?? nowIso(),
    estado: p.estado ?? (isOnline() ? 'confirmado' : 'pendiente'),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const row = (data ?? payload) as Pago
      // Forzamos estado confirmado al estar online
      const confirmed: Pago = { ...row, estado: 'confirmado' }

      const db = await getDB()
      await db.put('pagos', confirmed)
      return { ok: true, pago: confirmed }
    } catch {
      // caemos a offline
    }
  }

  // Offline: encola y cachea con estado 'pendiente'
  await enqueueMutation({ type: 'UPSERT_PAGO', payload })
  const db = await getDB()
  await db.put('pagos', payload)
  return { ok: true, fromQueue: true, localOnly: true, pago: payload }
}

/* =========== Helper: marcar conceptos como “cobrado” (batch) =========== */

export async function markConceptosCobradosAware(
  conceptos: ConceptoCuenta[],
  seleccion: SeleccionPorConcepto
) {
  const toMark = conceptos.filter(c => (seleccion[c.id] ?? 0) > 0)
  for (const c of toMark) {
    await upsertConceptoAware({
      ...c,
      estado: 'cobrado',
      updated_at: nowIso(),
      version: (c.version ?? 0) + 1,
    })
  }
}

/* =========== Helper: construir pago desde una “línea” del CobroModal =========== */

export function buildPagoLine(params: {
  turnoid: string
  cuentaId: string
  mesaid?: string | null
  sucursalid: string
  userid?: string
  metodo: MetodoPago
  total: number
  tip?: number
  productos?: PagoProducto[]
}): Omit<Pago, 'id' | 'estado' | 'fecha'> {
  return {
    turnoid: params.turnoid,
    cuentaid: params.cuentaId,
    mesaid: params.mesaid ?? null,
    sucursalid: params.sucursalid,
    userid: params.userid,
    metodo: params.metodo,
    total: params.total,
    tip: params.tip,
    detalles: params.productos?.length ? { productos: params.productos } : undefined,
  }
}
