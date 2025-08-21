// src/config/offline/cache/turnos.ts
import type { TurnoActivo } from '../../types'
import { getDB } from '../db'

export async function cacheTurnos(rows: TurnoActivo[]) {
  const db = await getDB()
  const tx = db.transaction('turnos', 'readwrite')
  const store = tx.objectStore('turnos')
  for (const r of rows) {
    const row: any = { ...r, abierto_num: r.abierto ? 1 : 0 }
    await store.put(row)
  }
  await tx.done
}


export async function readTurnosBySucursal(sucursalid: string): Promise<TurnoActivo[]> {
  const db = await getDB()
  const idx = db.transaction('turnos').store.index('by_sucursalid')
  const list = await idx.getAll(sucursalid) as TurnoActivo[]
  return list.sort((a, b) => String(a.fechainicio).localeCompare(String(b.fechainicio)))
}

export async function readTurnoActivo(sucursalid: string): Promise<TurnoActivo | null> {
  const db = await getDB()
  // clave compuesta: [sucursalid, 1]
  // @ts-ignore: clave compuesta (array) válida
  const idx = db.transaction('turnos').store.index('by_sucursalid_abierto')
  const list = await idx.getAll([sucursalid, 1]) as TurnoActivo[]
  return list[0] ?? null
}

