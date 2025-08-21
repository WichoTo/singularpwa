// src/offline/cache/workareas.ts
import type { WorkArea } from '../../types'
import { getDB } from '../db'

/** Reescribe en el store local todas las áreas de esa sucursal */
export async function cacheWorkAreas(sucursalid: string, areas: WorkArea[]) {
  const db = await getDB()
  // Limpia las existentes de esa sucursal
  const all = await db.getAll('workareas')
  for (const a of all) {
    if ((a as WorkArea).sucursalid === sucursalid) {
      await db.delete('workareas', (a as WorkArea).id)
    }
  }
  // Inserta nuevas
  for (const a of areas) {
    await db.put('workareas', a)
  }
}

/** Lee del store local filtrando por sucursal */
export async function readWorkAreasCache(sucursalid: string): Promise<WorkArea[]> {
  const db = await getDB()
  const all = (await db.getAll('workareas')) as WorkArea[]
  return all
    .filter(a => a.sucursalid === sucursalid)
    .sort(
      (a, b) =>
        (a.orden ?? 1e9) - (b.orden ?? 1e9) ||
        (a.nombre ?? '').localeCompare(b.nombre ?? '')
    )
}

/** 🌐 Cachea TODAS las work areas (reemplaza el store completo). */
export async function cacheAllWorkAreas(areas: WorkArea[]): Promise<void> {
  const db = await getDB()
  // Limpiamos todo el store porque recibimos el universo completo
  await db.clear('workareas')
  for (const a of areas) {
    await db.put('workareas', a)
  }
}

/** 📖 Lee TODAS las work areas desde cache (ordenadas). */
export async function readAllWorkAreasCache(): Promise<WorkArea[]> {
  const db = await getDB()
  const all = (await db.getAll('workareas')) as WorkArea[]
  return all
    .slice()
    .sort(
      (a, b) =>
        (a.orden ?? 1e9) - (b.orden ?? 1e9) ||
        (a.nombre ?? '').localeCompare(b.nombre ?? '')
    )
}
