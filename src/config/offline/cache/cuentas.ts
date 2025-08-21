// src/config/offline/cache/cuentas.ts
import type { CuentaMesero, CuentaComensal, ConceptoCuenta } from '../../types'
import { getDB } from '../db'

/* ====== REPLACE helpers (por turno) ====== */
export async function replaceCuentasMeseroByTurno(turnoid: string, rows: CuentaMesero[]) {
  const db = await getDB()
  const tx = db.transaction('cuentasmesero', 'readwrite')
  const store = tx.store
  const idx = store.index('by_turnoid')
  const existingKeys = await idx.getAllKeys(turnoid) as string[]
  const keep = new Set(rows.map(r => r.id))
  for (const k of existingKeys) {
    if (!keep.has(String(k))) await store.delete(k)
  }
  for (const r of rows) await store.put(r)
  await tx.done
}

export async function replaceCuentasComensalByTurno(turnoid: string, rows: CuentaComensal[]) {
  const db = await getDB()
  const tx = db.transaction('cuentascomensal', 'readwrite')
  const store = tx.store
  const idx = store.index('by_turnoid')
  const existingKeys = await idx.getAllKeys(turnoid) as string[]
  const keep = new Set(rows.map(r => r.id))
  for (const k of existingKeys) {
    if (!keep.has(String(k))) await store.delete(k)
  }
  for (const r of rows) await store.put(r)
  await tx.done
}

export async function replaceConceptosByTurno(turnoid: string, rows: ConceptoCuenta[]) {
  const db = await getDB()
  const tx = db.transaction('conceptoscuentas', 'readwrite')
  const store = tx.store
  const idx = store.index('by_turnoid')
  const existingKeys = await idx.getAllKeys(turnoid) as string[]
  const keep = new Set(rows.map(r => r.id))
  for (const k of existingKeys) {
    if (!keep.has(String(k))) await store.delete(k)
  }
  for (const r of rows) await store.put(r)
  await tx.done
}

/* ====== Cache “append/merge” (si quieres mantenerlos) ====== */
export async function cacheCuentasMesero(rows: CuentaMesero[]) {
  const db = await getDB()
  const tx = db.transaction('cuentasmesero', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
}
export async function readCuentasMeseroByTurno(turnoid: string) {
  const db = await getDB()
  const idx = db.transaction('cuentasmesero').store.index('by_turnoid')
  const list = await idx.getAll(turnoid) as CuentaMesero[]
  return list.sort((a,b)=>String(a.fechainicio).localeCompare(String(b.fechainicio)))
}

export async function cacheCuentasComensal(rows: CuentaComensal[]) {
  const db = await getDB()
  const tx = db.transaction('cuentascomensal', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
}
export async function readCuentasComensalByTurno(turnoid: string) {
  const db = await getDB()
  const idx = db.transaction('cuentascomensal').store.index('by_turnoid')
  const list = await idx.getAll(turnoid) as CuentaComensal[]
  return list.sort((a,b)=>String(a.fechainicio).localeCompare(String(b.fechainicio)))
}

export async function cacheConceptos(rows: ConceptoCuenta[]) {
  const db = await getDB()
  const tx = db.transaction('conceptoscuentas', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
}
export async function readConceptosByTurno(turnoid: string) {
  const db = await getDB()
  const idx = db.transaction('conceptoscuentas').store.index('by_turnoid')
  const list = await idx.getAll(turnoid) as ConceptoCuenta[]
  return list.sort((a,b)=>String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
}
