// src/config/offline/sync.ts
import { supabase } from '../supabaseClient'
import type {
  Insumo,
  ItemMenu,
  Mesa,
  Preparacion,
  PreparacionProduccion,
  Proveedor,
  Sucursal,
  User,
  WorkArea,
  InsumoInventario,
  CuentaMesero,
  CuentaComensal,
  ConceptoCuenta,
  TurnoActivo, // 👈 añadido para CLOSE_TURNO / UPSERT_TURNO
} from '../types'
import { getOutbox, dequeueMutation } from './outbox/queue'
import { getDB } from './db'
import { isOnline } from './utils'
import { getFileByKey, deleteFileKey } from './blobs'
import { uploadToStorageMenu, uploadToStorageSucursal } from './storage'

/* ===== Helpers comunes ===== */
function nowIso() { return new Date().toISOString() }
function withTimestamps<T extends { created_at?: string; updated_at?: string }>(row: T, isNew: boolean) {
  const ts = nowIso()
  return { ...row, created_at: isNew ? (row.created_at ?? ts) : (row.created_at ?? ts), updated_at: ts }
}
function withVersion<T extends { version?: number }>(row: T): T {
  return { ...row, version: (row.version ?? 0) + 1 }
}

/* ===== Reintentos y backoff ===== */
const MAX_FK_RETRIES = 3
const BASE_BACKOFF_MS = 15_000 // 15s
function nextBackoff(prevAttempts = 0) {
  // 15s, 30s, 60s, 120s, ... (cap en factor 4)
  return BASE_BACKOFF_MS * Math.pow(2, Math.min(prevAttempts, 4))
}

/** Verifica en server si existe la cuenta (mesero/comensal) referenciada por un concepto. */
async function serverHasCuenta(opts: { cuentacomensalid?: string | null; cuentameseroid?: string | null }): Promise<boolean> {
  try {
    if (opts.cuentacomensalid) {
      const { data, error } = await supabase
        .from('cuentascomensal').select('id').eq('id', opts.cuentacomensalid).maybeSingle()
      if (!error && data?.id) return true
    }
    if (opts.cuentameseroid) {
      const { data, error } = await supabase
        .from('cuentasmesero').select('id').eq('id', opts.cuentameseroid).maybeSingle()
      if (!error && data?.id) return true
    }
  } catch {
    // si falla el check por red, tratamos como "no existe" para evitar 23503
  }
  return false
}

export async function processOutbox() {
  if (!isOnline()) return { processed: 0, errors: 0 }

  const now = Date.now()
  // solo procesar items cuya ventana de intento ya venció
  const queue = (await getOutbox())
    .filter(m => !m.nextAttempt || m.nextAttempt <= now)
    .sort((a, b) => a.createdAt - b.createdAt)

  let processed = 0
  let errors = 0

  for (const m of queue) {
    try {
      switch (m.type) {
        /* ===== USERS ===== */
        case 'UPSERT_USER': {
          const u: User = m.payload
          const { data, error } = await supabase
            .from('users')
            .upsert([{
              id: u.id, nombre: u.nombre, correo: u.correo,
              telefono: u.telefono, rol: u.rol, areas: u.areas,
              sucursales: u.sucursales || [],
            }])
            .select('*').single()
          if (error) throw error
          const db = await getDB()
          await db.put('users', (data ?? u) as User)
          break
        }

        /* ===== SUCURSALES ===== */
        case 'UPSERT_SUCURSAL': {
          const s: Sucursal = m.payload
          const finalImgs = await Promise.all(
            (s.imagenes ?? []).map(async (doc: any) => {
              if (doc?._fileKey) {
                const blob = await getFileByKey(doc._fileKey)
                if (blob) {
                  const uploaded = await uploadToStorageSucursal(s.id, blob, doc.nombre)
                  await deleteFileKey(doc._fileKey)
                  return uploaded
                }
                return null
              }
              return doc
            })
          )
          const payload: Sucursal = { ...s, imagenes: finalImgs.filter(Boolean) as any[] }
          const { error } = await supabase.from('sucursales').upsert(payload, { onConflict: 'id' })
          if (error) throw error
          const db = await getDB()
          await db.put('sucursales', payload)
          break
        }
        case 'DELETE_SUCURSAL': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('sucursales').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('sucursales', id)
          break
        }

        /* ===== MESAS ===== */
        case 'UPSERT_MESA': {
          const mesa = m.payload as Mesa
          const { data, error } = await supabase.from('mesas').upsert(mesa, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('mesas', (data ?? mesa) as Mesa)
          break
        }
        case 'DELETE_MESA': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('mesas').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('mesas', id)
          break
        }

        /* ===== MENÚ ===== */
        case 'UPSERT_MENU': {
          const it = m.payload as ItemMenu
          const menuId = it.id
          const sucursalId = it.sucursalid
          const finalRefs = await Promise.all(
            (it.referencias ?? []).map(async (doc: any) => {
              if (doc?._fileKey) {
                const blob = await getFileByKey(doc._fileKey)
                if (blob) {
                  const uploaded = await uploadToStorageMenu(sucursalId, menuId, blob, doc.nombre)
                  await deleteFileKey(doc._fileKey)
                  return uploaded
                }
                return null
              }
              return doc
            })
          )
          const payload: ItemMenu = { ...it, referencias: finalRefs.filter(Boolean) as any[], updated_at: nowIso() }
          const { data, error } = await supabase.from('menu').upsert(payload, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('menu', (data ?? payload) as ItemMenu)
          break
        }
        case 'DELETE_MENU': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('menu').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('menu', id)
          break
        }

        /* ===== PROVEEDORES ===== */
        case 'UPSERT_PROVEEDOR': {
          const p = m.payload as Proveedor
          const { data, error } = await supabase.from('proveedores').upsert(p, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('proveedores', (data ?? p) as Proveedor)
          break
        }
        case 'DELETE_PROVEEDOR': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('proveedores').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('proveedores', id)
          break
        }

        /* ===== INSUMOS ===== */
        case 'UPSERT_INSUMO': {
          const it = m.payload as Insumo
          const { data, error } = await supabase.from('insumos').upsert(it, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('insumos', (data ?? it) as Insumo)
          break
        }
        case 'DELETE_INSUMO': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('insumos').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('insumos', id)
          break
        }

        /* ===== PREPARACIONES ===== */
        case 'UPSERT_PREPARACION': {
          const it = m.payload as Preparacion
          const { data, error } = await supabase.from('preparaciones').upsert(it, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('preparaciones', (data ?? it) as Preparacion)
          break
        }
        case 'DELETE_PREPARACION': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('preparaciones').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('preparaciones', id)
          break
        }

        /* ===== WORKAREAS ===== */
        case 'UPSERT_WORKAREAS': {
          const { areas } = m.payload as { areas: WorkArea[] }
          if (areas?.length) {
            const { data, error } = await supabase
              .from('workareas')
              .upsert(
                areas.map(a => ({
                  id: a.id,
                  sucursalid: a.sucursalid,
                  nombre: a.nombre,
                  orden: a.orden ?? null,
                  color: a.color ?? null,
                  is_active: a.is_active ?? true,
                  printer_id: a.printer_id ?? null,
                })), { onConflict: 'id' })
              .select('*')
            if (error) throw error
            const db = await getDB()
            for (const row of (data ?? areas) as WorkArea[]) await db.put('workareas', row)
          }
          break
        }
        case 'DELETE_WORKAREAS': {
          const { ids } = m.payload as { ids: string[] }
          if (ids?.length) {
            const { error } = await supabase.from('workareas').delete().in('id', ids)
            if (error) throw error
            const db = await getDB()
            for (const id of ids) await db.delete('workareas', id)
          }
          break
        }

        /* ===== PRODUCCIÓN ===== */
        case 'UPSERT_PRODUCCION': {
          const it = m.payload as PreparacionProduccion
          const { data, error } = await supabase.from('produccion').upsert(it, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('produccion', (data ?? it) as PreparacionProduccion)
          break
        }
        case 'DELETE_PRODUCCION': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('produccion').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('produccion', id)
          break
        }

        /* ===== INVENTARIO ===== */
        case 'UPSERT_INVENTARIO': {
          const it = m.payload as InsumoInventario
          const { data, error } = await supabase.from('inventario').upsert(it, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('inventario', (data ?? it) as InsumoInventario)
          break
        }
        case 'DELETE_INVENTARIO': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('inventario').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('inventario', id)
          break
        }

        /* ===== CUENTAS / CONCEPTOS ===== */
        case 'UPSERT_CUENTA_MESERO': {
          const raw = m.payload as CuentaMesero
          const payload = withVersion(withTimestamps(raw, !raw.created_at))
          const { data, error } = await supabase.from('cuentasmesero').upsert(payload as any, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('cuentasmesero', (data ?? payload) as CuentaMesero)
          break
        }
        case 'UPSERT_CUENTA_COMENSAL': {
          const raw = m.payload as CuentaComensal
          const payload = withVersion(withTimestamps(raw, !raw.created_at))
          const { data, error } = await supabase.from('cuentascomensal').upsert(payload as any, { onConflict: 'id' }).select().single()
          if (error) throw error
          const db = await getDB()
          await db.put('cuentascomensal', (data ?? payload) as CuentaComensal)
          break
        }
        case 'UPSERT_CONCEPTO': {
          const raw = m.payload as ConceptoCuenta
          const importe = raw.importe ?? (raw.preciounitario - (raw.descuento ?? 0))
          const payload = withVersion(withTimestamps({ ...raw, importe }, !raw.created_at))

          // Log diagnóstico
          console.debug('[OUTBOX] UPSERT_CONCEPTO intento', {
            id: payload.id,
            turnoid: payload.turnoid,
            cuentacomensalid: payload.cuentacomensalid,
            cuentameseroid: payload.cuentameseroid,
          })

          // Pre-chequeo de FK
          const refs = {
            cuentacomensalid: (payload as any).cuentacomensalid ?? undefined,
            cuentameseroid:  (payload as any).cuentameseroid  ?? undefined,
          }
          const hasRef = !!(refs.cuentacomensalid || refs.cuentameseroid)
          if (hasRef) {
            const exists = await serverHasCuenta(refs)
            if (!exists) {
              const db = await getDB()
              const stored = await db.get('outbox', m.id)
              const attempts = (stored?.attempts ?? 0) + 1

              if (attempts >= MAX_FK_RETRIES) {
                // Opción: mandar a DLQ; aquí simplemente eliminamos el item de la outbox
                console.error('[OUTBOX] Concepto huérfano. Se descarta tras reintentos', {
                  id: payload.id,
                  attempts,
                  refs,
                })
                await dequeueMutation(m.id) // lo sacamos de la cola
                processed++
                // (Opcional) limpiar cache local del concepto huérfano:
                // if (payload.id) await db.delete('conceptoscuentas', payload.id).catch(() => {})
                break
              } else {
                const wait = nextBackoff(attempts - 1)
                const nextAttempt = Date.now() + wait
                console.warn('[OUTBOX] FK ausente; difiriendo', { id: payload.id, attempts, wait })
                await db.put('outbox', {
                  ...stored,
                  attempts,
                  lastError: 'FK parent missing',
                  nextAttempt,
                })
                // No se de-queuea. Se reintentará cuando venza nextAttempt
                continue
              }
            }
          }

          const { data, error } = await supabase
            .from('conceptoscuentas')
            .upsert(payload as any, { onConflict: 'id' })
            .select()
            .single()

          if (error) throw error

          const db = await getDB()
          await db.put('conceptoscuentas', (data ?? payload) as ConceptoCuenta)
          break
        }
        case 'DELETE_CONCEPTO': {
          const { id } = m.payload as { id: string }
          const { error } = await supabase.from('conceptoscuentas').delete().eq('id', id)
          if (error) throw error
          const db = await getDB()
          await db.delete('conceptoscuentas', id)
          break
        }

        /* ===== TURNOS ===== */
        case 'UPSERT_TURNO': {
          const it = m.payload as TurnoActivo
          const { data, error } = await supabase
            .from('turnos')
            .upsert(it, { onConflict: 'id' })
            .select()
            .single()
          if (error) throw error
          const db = await getDB()
          await db.put('turnos', (data ?? it) as TurnoActivo)
          break
        }
        case 'CLOSE_TURNO': {
          // payload: { id, abierto: false, fechafin: ISOString, efectivoFinal?: number|null }
          const patch = m.payload as (Partial<TurnoActivo> & { id: string })

          const { error } = await supabase
            .from('turnos')
            .upsert(patch, { onConflict: 'id' })
          if (error) throw error

          const db = await getDB()
          const prev = (await db.get('turnos', patch.id)) as TurnoActivo | undefined
          await db.put('turnos', { ...(prev ?? { id: patch.id }), ...patch } as TurnoActivo)
          break
        }

        /* ===== PAGOS ===== */
        case 'UPSERT_PAGO': {
          const p = m.payload as import('../types').Pago
          const { data, error } = await supabase
            .from('pagos')
            .upsert(p, { onConflict: 'id' })
            .select()
            .single()
          if (error) throw error
          const confirmed = { ...(data ?? p), estado: 'confirmado' }
          const db = await getDB()
          await db.put('pagos', confirmed)
          break
        }
      }

      // Si llegamos aquí sin throw, el item se procesó OK → de-queue
      await dequeueMutation(m.id)
      processed++
    } catch (e: any) {
      if (e?.code === '23503') {
        console.error('[processOutbox] 23503 FK en mutación', m.type, {
          payload: m.payload,
          message: e.message,
        })
      } else {
        console.warn('[processOutbox] error procesando mutación', m.type, e)
      }
      errors++
      // No de-queueamos: se volverá a intentar, respetando nextAttempt si ya lo tiene
    }
  }

  return { processed, errors }
}

export function initOfflineSyncListeners() {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    processOutbox().catch(() => {})
  })
}

/* ===== Depuración desde consola ===== */
/** Lista conceptos en outbox con intentos y ventana de reintento. */
;(window as any).__dumpOutboxConceptos = async function () {
  try {
    const db = await getDB()
    const all = await db.getAll('outbox')
    const conceptos = all.filter((x: any) => x?.type === 'UPSERT_CONCEPTO')
    console.table(conceptos.map((x: any) => ({
      id: x.payload?.id,
      turnoid: x.payload?.turnoid,
      cuentacomensalid: x.payload?.cuentacomensalid,
      cuentameseroid: x.payload?.cuentameseroid,
      attempts: x.attempts ?? 0,
      nextAttempt: x.nextAttempt ? new Date(x.nextAttempt).toLocaleString() : null,
      lastError: x.lastError ?? null,
    })))
    return conceptos
  } catch (e) {
    console.error('__dumpOutboxConceptos error', e)
    return []
  }
}

/** Purga conceptos huérfanos (sin cuenta en server) de la outbox (y opcionalmente del cache local). */
;(window as any).__purgeOrphanConcepts = async function (options?: { alsoDeleteLocal?: boolean }) {
  const alsoDeleteLocal = !!options?.alsoDeleteLocal
  const db = await getDB()
  const all = await db.getAll('outbox')
  const candidatos = all.filter((x: any) => x?.type === 'UPSERT_CONCEPTO')

  const deleted: string[] = []
  const kept: string[] = []
  for (const it of candidatos) {
    const p = it.payload || {}
    const exists = await serverHasCuenta({
      cuentacomensalid: p.cuentacomensalid,
      cuentameseroid: p.cuentameseroid,
    })
    if (!exists) {
      await db.delete('outbox', it.id)
      if (alsoDeleteLocal && p.id) {
        await db.delete('conceptoscuentas', p.id).catch(() => {})
      }
      deleted.push(p.id)
    } else {
      kept.push(p.id)
    }
  }
  console.table([{ action: 'deleted', count: deleted.length }, { action: 'kept', count: kept.length }])
  return { deleted, kept }
}
