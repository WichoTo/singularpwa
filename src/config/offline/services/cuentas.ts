// src/config/offline/services/cuentas.ts
import { supabase } from '../../supabaseClient'
import { isOnline, uuid } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import type { CuentaMesero, CuentaComensal, ConceptoCuenta } from '../../types'
import {
  cacheConceptos,
  readCuentasMeseroByTurno,
  readCuentasComensalByTurno,
  readConceptosByTurno,
  // Reemplazo atómico (limpia lo que no viene del server)
  replaceCuentasMeseroByTurno,
  replaceCuentasComensalByTurno,
  replaceConceptosByTurno,
} from '../cache/cuentas'

/* ================= Utilidades ================= */

/** Sube version y updated_at sin tocar created_at. */
function bump<T extends { id: string; updated_at?: string; version?: number }>(row: T): T {
  return { ...row, updated_at: new Date().toISOString(), version: (row.version ?? 0) + 1 }
}

/** Asegura importes con fallback: si falta precio/desc, tómalo como 0. */
function normalizaConcepto(row: ConceptoCuenta): ConceptoCuenta {
  const precio = Number.isFinite(row.preciounitario as any) ? Number(row.preciounitario) : 0
  const desc = Number.isFinite(row.descuento as any) ? Number(row.descuento) : 0
  const importe = Number.isFinite(row.importe as any) ? Number(row.importe) : (precio - desc)
  return { ...row, preciounitario: precio, descuento: desc, importe }
}

/** Verifica en el server si existe la cuenta (mesero/comensal) referenciada por el concepto. */
async function serverHasCuenta(opts: { cuentacomensalid?: string | null; cuentameseroid?: string | null }): Promise<boolean> {
  try {
    if (opts.cuentacomensalid) {
      const { data, error } = await supabase
        .from('cuentascomensal')
        .select('id')
        .eq('id', opts.cuentacomensalid)
        .maybeSingle()
      if (!error && data?.id) return true
    }
    if (opts.cuentameseroid) {
      const { data, error } = await supabase
        .from('cuentasmesero')
        .select('id')
        .eq('id', opts.cuentameseroid)
        .maybeSingle()
      if (!error && data?.id) return true
    }
  } catch {
    // si falla el check, asumimos que NO existe para evitar el 23503
  }
  return false
}

/* ================== FETCH ================== */

/** CUENTAS MESERO */
export async function fetchCuentasMeseroAware(turnoid: string): Promise<{ data: CuentaMesero[]; fromCache: boolean }>
export async function fetchCuentasMeseroAware(sucursalid: string, turnoid: string): Promise<{ data: CuentaMesero[]; fromCache: boolean }>
export async function fetchCuentasMeseroAware(a: string, b?: string): Promise<{ data: CuentaMesero[]; fromCache: boolean }> {
  const turnoid = b ?? a
  const sucursalid = b ? a : undefined

  if (isOnline()) {
    let q = supabase.from('cuentasmesero').select('*').eq('turnoid', turnoid)
    if (sucursalid) q = q.eq('sucursalid', sucursalid)
    const { data, error } = await q
    if (!error && Array.isArray(data)) {
      await replaceCuentasMeseroByTurno(turnoid, data as CuentaMesero[])
      return { data: data as CuentaMesero[], fromCache: false }
    }
  }
  const cached = await readCuentasMeseroByTurno(turnoid)
  return { data: cached, fromCache: true }
}

/** CUENTAS COMENSAL */
export async function fetchCuentasComensalAware(turnoid: string): Promise<{ data: CuentaComensal[]; fromCache: boolean }>
export async function fetchCuentasComensalAware(sucursalid: string, turnoid: string): Promise<{ data: CuentaComensal[]; fromCache: boolean }>
export async function fetchCuentasComensalAware(a: string, b?: string): Promise<{ data: CuentaComensal[]; fromCache: boolean }> {
  const turnoid = b ?? a
  const sucursalid = b ? a : undefined

  if (isOnline()) {
    let q = supabase.from('cuentascomensal').select('*').eq('turnoid', turnoid)
    if (sucursalid) q = q.eq('sucursalid', sucursalid)
    const { data, error } = await q
    if (!error && Array.isArray(data)) {
      await replaceCuentasComensalByTurno(turnoid, data as CuentaComensal[])
      return { data: data as CuentaComensal[], fromCache: false }
    }
  }
  const cached = await readCuentasComensalByTurno(turnoid)
  return { data: cached, fromCache: true }
}

/** CONCEPTOS */
type ConceptoFetchArgs =
  | string
  | {
      turnoid: string
      sucursalid?: string
      cuentameseroid?: string | null
      cuentacomensalid?: string | null
    }

export async function fetchConceptosAware(args: ConceptoFetchArgs): Promise<{ data: ConceptoCuenta[]; fromCache: boolean }> {
  const turnoid = typeof args === 'string' ? args : args.turnoid
  const sucursalid = typeof args === 'string' ? undefined : args.sucursalid
  const cuentameseroid = typeof args === 'string' ? undefined : args.cuentameseroid
  const cuentacomensalid = typeof args === 'string' ? undefined : args.cuentacomensalid

  if (isOnline()) {
    let query = supabase.from('conceptoscuentas').select('*').eq('turnoid', turnoid)
    if (sucursalid) query = query.eq('sucursalid', sucursalid)
    const conFiltroCuenta = (cuentameseroid != null) || (cuentacomensalid != null)
    if (cuentameseroid != null) query = query.eq('cuentameseroid', cuentameseroid)
    if (cuentacomensalid != null) query = query.eq('cuentacomensalid', cuentacomensalid)

    const { data, error } = await query
    if (!error && Array.isArray(data)) {
      if (!conFiltroCuenta) {
        await replaceConceptosByTurno(turnoid, (data as ConceptoCuenta[]).map(normalizaConcepto))
      } else {
        await cacheConceptos((data as ConceptoCuenta[]).map(normalizaConcepto))
      }
      return { data: (data as ConceptoCuenta[]).map(normalizaConcepto), fromCache: false }
    }
  }
  const cached = await readConceptosByTurno(turnoid)
  return { data: cached, fromCache: true }
}

/* ================== UPSERT ================== */

/* --- Cuenta Mesero --- */
export async function upsertCuentaMeseroAware(
  row: CuentaMesero
): Promise<{ ok: boolean; cuenta?: CuentaMesero; fromQueue?: boolean; localOnly?: boolean }> {
  const payload: CuentaMesero = bump({ ...row, id: row.id?.trim() ? row.id : uuid() })

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('cuentasmesero')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      const db = await getDB()
      await db.put('cuentasmesero', (data ?? payload) as CuentaMesero)
      return { ok: true, cuenta: (data ?? payload) as CuentaMesero }
    } catch {
      // fallback offline
    }
  }
  await enqueueMutation({ type: 'UPSERT_CUENTA_MESERO', payload })
  const db = await getDB()
  await db.put('cuentasmesero', payload)
  return { ok: true, fromQueue: true, localOnly: true, cuenta: payload }
}

/* --- Cuenta Comensal --- */
export async function upsertCuentaComensalAware(
  row: CuentaComensal
): Promise<{ ok: boolean; cuenta?: CuentaComensal; fromQueue?: boolean; localOnly?: boolean }> {
  const payload: CuentaComensal = bump({ ...row, id: row.id?.trim() ? row.id : uuid() })

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('cuentascomensal')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      const db = await getDB()
      await db.put('cuentascomensal', (data ?? payload) as CuentaComensal)
      return { ok: true, cuenta: (data ?? payload) as CuentaComensal }
    } catch {
      // fallback offline
    }
  }
  await enqueueMutation({ type: 'UPSERT_CUENTA_COMENSAL', payload })
  const db = await getDB()
  await db.put('cuentascomensal', payload)
  return { ok: true, fromQueue: true, localOnly: true, cuenta: payload }
}

/* --- Concepto --- */
export async function upsertConceptoAware(row: ConceptoCuenta) {
  const importe = row.importe ?? (row.preciounitario - (row.descuento ?? 0))
  const payload: ConceptoCuenta = {
    ...row,
    id: row.id?.trim() ? row.id : uuid(),
    updated_at: new Date().toISOString(),
    version: (row.version ?? 0) + 1,
    importe,
  }

  const referenciaCuenta =
    (payload.cuentacomensalid != null && payload.cuentacomensalid !== '') ||
    (payload.cuentameseroid != null && payload.cuentameseroid !== '')

  // 🛡️ Si hay FK a cuenta y estamos online, verifica que exista en el server para evitar 23503
  if (isOnline() && referenciaCuenta) {
    const exists = await serverHasCuenta({
      cuentacomensalid: payload.cuentacomensalid ?? undefined,
      cuentameseroid: payload.cuentameseroid ?? undefined,
    })

    if (!exists) {
      // La cuenta aún no está en el server → encola y cachea local (actúa como offline)
      // Si tu outbox soporta dependencias, puedes pasar meta.dependsOn:
      // await enqueueMutation({ type: 'UPSERT_CONCEPTO', payload, meta: { dependsOn: payload.cuentacomensalid || payload.cuentameseroid } })
      await enqueueMutation({ type: 'UPSERT_CONCEPTO', payload })
      const db = await getDB()
      await db.put('conceptoscuentas', payload)
      window.dispatchEvent(new CustomEvent('turno-cache-updated', {
        detail: { store: 'conceptoscuentas', row: payload }
      }))
      return { ok: true, fromQueue: true, localOnly: true, concepto: payload }
    }
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('conceptoscuentas')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('conceptoscuentas', (data ?? payload) as ConceptoCuenta)

      // Notifica a la UI
      window.dispatchEvent(new CustomEvent('turno-cache-updated', {
        detail: { store: 'conceptoscuentas', row: (data ?? payload) }
      }))

      return { ok: true, concepto: (data ?? payload) as ConceptoCuenta }
    } catch (e: any) {
      // 🔄 Si truena por FK (23503) → encola y cachea
      if (e?.code === '23503') {
        await enqueueMutation({ type: 'UPSERT_CONCEPTO', payload })
        const db = await getDB()
        await db.put('conceptoscuentas', payload)
        window.dispatchEvent(new CustomEvent('turno-cache-updated', {
          detail: { store: 'conceptoscuentas', row: payload }
        }))
        return { ok: true, fromQueue: true, localOnly: true, concepto: payload }
      }
      // Otros errores → propaga o maneja según tu estrategia
      throw e
    }
  }

  // Offline
  await enqueueMutation({ type: 'UPSERT_CONCEPTO', payload })
  const db = await getDB()
  await db.put('conceptoscuentas', payload)
  window.dispatchEvent(new CustomEvent('turno-cache-updated', {
    detail: { store: 'conceptoscuentas', row: payload }
  }))
  return { ok: true, fromQueue: true, localOnly: true, concepto: payload }
}

/* --- Delete Concepto --- */
export async function deleteConceptoAware(id: string): Promise<{ ok: boolean; fromQueue?: boolean; localOnly?: boolean }> {
  if (!id?.trim()) return { ok: true }

  if (isOnline()) {
    try {
      const { error } = await supabase.from('conceptoscuentas').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('conceptoscuentas', id) // store IDB (plural)
      return { ok: true }
    } catch {
      // fallback offline
    }
  }

  await enqueueMutation({ type: 'DELETE_CONCEPTO', payload: { id } })
  const db = await getDB()
  await db.delete('conceptoscuentas', id) // store IDB (plural)
  return { ok: true, fromQueue: true, localOnly: true }
}
