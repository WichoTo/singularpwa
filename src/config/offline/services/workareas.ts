import type { WorkArea } from '../../types'
import { supabase } from '../../supabaseClient'
import { isOnline } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { cacheAllWorkAreas, cacheWorkAreas, readAllWorkAreasCache, readWorkAreasCache } from '../cache/workareas'

/** Leer por sucursalid con cache fallback */
export async function fetchWorkAreasAware(sucursalid?: string) {
  if (isOnline()) {
    let query = supabase.from('workareas').select('*')
    if (sucursalid) query = query.eq('sucursalid', sucursalid)
    query = query.order('orden', { ascending: true }).order('nombre', { ascending: true })

    const { data, error } = await query
    if (!error && Array.isArray(data)) {
      // cachea como ya lo haces por sucursal; si no hay sucursal, cachea “todas”
      if (sucursalid) {
        await cacheWorkAreas(sucursalid, data as WorkArea[])
      } else {
        await cacheAllWorkAreas(data as WorkArea[]) // <-- añade estos helpers
      }
      return { data: data as WorkArea[], fromCache: false }
    }
  }

  // offline
  if (sucursalid) {
    const cached = await readWorkAreasCache(sucursalid)
    return { data: cached, fromCache: true }
  } else {
    const cachedAll = await readAllWorkAreasCache() // <-- añade estos helpers
    return { data: cachedAll, fromCache: true }
  }
}
/** Upsert masivo. Si no hay red o falla, encola. Espejo de upsertUsuarioAware */
export async function upsertWorkAreasAware(areas: WorkArea[]) {
  if (!areas?.length) return { ok: true, localOnly: true, areas: [] as WorkArea[] }

  if (isOnline()) {
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
        })),
        { onConflict: 'id' }
      )
      .select('*')

    if (!error && Array.isArray(data)) {
      // Espejo local
      const db = await getDB()
      for (const row of data as WorkArea[]) await db.put('workareas', row)
      // También refrescamos cache de esa sucursal (tomamos la del primer área)
      const sucursalid = areas[0].sucursalid
      await cacheWorkAreas(sucursalid, await readWorkAreasCache(sucursalid)) // opcional
      return { ok: true, areas: data as WorkArea[] }
    }

    await enqueueMutation({ type: 'UPSERT_WORKAREAS', payload: { areas } })
    const db = await getDB()
    for (const a of areas) await db.put('workareas', a)
    return { ok: true, fromQueue: true, localOnly: true }
  }

  await enqueueMutation({ type: 'UPSERT_WORKAREAS', payload: { areas } })
  const db = await getDB()
  for (const a of areas) await db.put('workareas', a)
  return { ok: true, fromQueue: true, localOnly: true }
}

/** Borrado por ids. Igual patrón que usuarios */
export async function deleteWorkAreasAware(ids: string[], sucursalid: string) {
  if (!ids?.length) return { ok: true }

  if (isOnline()) {
    const { error } = await supabase.from('workareas').delete().in('id', ids)
    if (!error) {
      const db = await getDB()
      for (const id of ids) await db.delete('workareas', id)
      // refresca cache de esa sucursal
      await cacheWorkAreas(sucursalid, await readWorkAreasCache(sucursalid))
      return { ok: true }
    }
    await enqueueMutation({ type: 'DELETE_WORKAREAS', payload: { ids, sucursalid } })
    const db = await getDB()
    for (const id of ids) await db.delete('workareas', id)
    return { ok: true, fromQueue: true, localOnly: true }
  }

  await enqueueMutation({ type: 'DELETE_WORKAREAS', payload: { ids, sucursalid } })
  const db = await getDB()
  for (const id of ids) await db.delete('workareas', id)
  return { ok: true, fromQueue: true, localOnly: true }
}
