import { getDB } from "../db"
import { getOutbox, dequeueMutation, enqueueMutation } from "./queue"

/** Borra TODO el outbox, o solo los tipos especificados. Devuelve cuántos elementos borró. */
export async function purgeOutbox(types?: string[] | null) {
  const q = await getOutbox()
  let removed = 0
  for (const m of q) {
    if (!types || types.includes(m.type)) {
      await dequeueMutation(m.id)
      removed++
    }
  }
  return removed
}

/** Limpia por completo los object stores que pases por nombre. */
export async function clearStores(storeNames: string[]) {
  const db = await getDB()
  for (const name of storeNames) {
    try {
      await db.clear(name)
    } catch (e) {
      // fallback, por si el driver no soporta clear:
      try {
        // @ts-ignore
        const tx = db.transaction(name, 'readwrite')
        // @ts-ignore
        const keys = await tx.store.getAllKeys()
        // @ts-ignore
        for (const k of keys) await tx.store.delete(k)
        await tx.done
      } catch {}
    }
  }
}

/** Elimina claves de localStorage que empiecen con alguno de estos prefijos. */
export function purgeLocalStorageByPrefix(prefixes: string[]) {
  let removed = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!
    if (prefixes.some(p => key.startsWith(p))) {
      localStorage.removeItem(key)
      removed++
      i-- // ajusta índice por haber borrado una entrada
    }
  }
  return removed
}

/** Palanca roja: outbox + caches principales + bindings/aliases. */
export async function purgeAllLocalData() {
  const outboxRemoved = await purgeOutbox() // todo outbox

  // Ajusta la lista a tus stores reales. Estos son los principales del flujo de pedidos:
  await clearStores([
    'cuentasmesero',
    'cuentascomensal',
    'conceptoscuentas',
    'pagos',
    // agrega más si quieres hacer limpieza profunda:
    // 'mesas','menu','sucursales','users','workareas','preparaciones','produccion','inventario','proveedores'
  ])

  const lsRemoved = purgeLocalStorageByPrefix([
    'cc_bind_',          // binding cuenta comensal ↔ cuenta mesero
    'alias_comensal_',   // alias de comensal por mesa
  ])

  return { outboxRemoved, lsRemoved }
}

/** Versión quirúrgica: borra SOLO los UPSERT_PAGO pendientes del outbox. */
export async function purgePendingPagosFromOutbox() {
  return purgeOutbox(['UPSERT_PAGO'])
}

/** (Opcional) Migración ejemplo: cuentaId → cuentaid dentro del outbox, por si reaparece. */
export async function migratePagosCuentaIdToCuentaid() {
  const q = await getOutbox()
  let fixed = 0
  for (const m of q) {
    if (m.type !== 'UPSERT_PAGO') continue
    const p = m.payload || {}
    if (p && p.cuentaId && !p.cuentaid) {
      const payload = { ...p, cuentaid: p.cuentaId }
      delete payload.cuentaId
      await dequeueMutation(m.id)
      await enqueueMutation({ type: 'UPSERT_PAGO', payload })
      fixed++
    }
  }
  return fixed
}
export async function clean(params: {
  outboxId?: string
  type?: string
  payloadId?: string
  removeLocalConcept?: boolean
}): Promise<{ removed: number; details: Array<{ outboxId: string; type: string; payloadId?: string }> }> {
  const { outboxId, type, payloadId, removeLocalConcept } = params || {}
  const db = await getDB()
  const details: Array<{ outboxId: string; type: string; payloadId?: string }> = []
  let removed = 0

  if (!outboxId && !type && !payloadId) {
    return { removed: 0, details }
  }

  if (outboxId) {
    // borra por id directo
    const q = await getOutbox()
    const hit = q.find(m => m.id === outboxId)
    if (hit) {
      await dequeueMutation(hit.id)
      removed++
      details.push({ outboxId: hit.id, type: hit.type, payloadId: hit?.payload?.id })
      // opcional: si pidieron limpiar el concepto local también
      if (removeLocalConcept && hit.type === 'UPSERT_CONCEPTO' && hit?.payload?.id) {
        await db.delete('conceptoscuentas', hit.payload.id).catch(() => {})
      }
    }
    return { removed, details }
  }

  // si no se dio outboxId, filtra por type/payloadId
  const q = await getOutbox()
  const matches = q.filter(m => {
    const matchType = type ? m.type === type : true
    const matchPayload = payloadId ? m?.payload?.id === payloadId : true
    return matchType && matchPayload
  })

  for (const m of matches) {
    await dequeueMutation(m.id)
    removed++
    details.push({ outboxId: m.id, type: m.type, payloadId: m?.payload?.id })
    if (removeLocalConcept && m.type === 'UPSERT_CONCEPTO' && m?.payload?.id) {
      await db.delete('conceptoscuentas', m.payload.id).catch(() => {})
    }
  }

  return { removed, details }
}

/* ===== Exponer helpers para consola del navegador ===== */
;(window as any).__purgeOutbox = purgeOutbox
;(window as any).__clearStores = clearStores
;(window as any).__purgeLocalStorageByPrefix = purgeLocalStorageByPrefix
;(window as any).__purgeAllLocalData = purgeAllLocalData
;(window as any).__cleanOutbox = clean
