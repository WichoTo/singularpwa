import { supabase } from '../../../config/supabaseClient'
import type { PreparacionProduccion } from '../../types'
import { isOnline, uuid } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { cacheProduccion, readProduccionCache } from '../cache/produccion'

export async function fetchProduccionAware(sucursalid?: string): Promise<{ data: PreparacionProduccion[]; fromCache: boolean; }> {
  if (!sucursalid) return { data: [], fromCache: true }

  if (isOnline()) {
    const { data, error } = await supabase
      .from('produccion')
      .select('*')
      .eq('sucursalid', sucursalid)

    // Si hay error -> intenta cache
    if (error) {
      const cached = await readProduccionCache(sucursalid)
      return { data: cached, fromCache: true }
    }

    // data puede ser [] por RLS. No pises la cache si había algo
    if (Array.isArray(data)) {
      const cached = await readProduccionCache(sucursalid)
      if (data.length === 0 && cached.length > 0) {
        // mantenemos cache para no “desaparecer” datos por políticas/latencia
        return { data: cached, fromCache: true }
      }
      await cacheProduccion(sucursalid, data as PreparacionProduccion[])
      return { data: data as PreparacionProduccion[], fromCache: false }
    }
  }

  // Offline o algo falló: cache
  const cached = await readProduccionCache(sucursalid)
  return { data: cached, fromCache: true }
}

export async function upsertProduccionAware(row: PreparacionProduccion): Promise<{
  ok: boolean; produccion?: PreparacionProduccion; fromQueue?: boolean; localOnly?: boolean;
}> {
  const payload: PreparacionProduccion = {
    ...row,
    id: row.id?.trim() ? row.id : uuid(),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('produccion')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('produccion', (data ?? payload) as PreparacionProduccion)
      return { ok: true, produccion: (data ?? payload) as PreparacionProduccion }
    } catch {
      await enqueueMutation({ type: 'UPSERT_PRODUCCION', payload })
      const db = await getDB()
      await db.put('produccion', payload)
      return { ok: true, fromQueue: true, localOnly: true, produccion: payload }
    }
  }

  // offline
  await enqueueMutation({ type: 'UPSERT_PRODUCCION', payload })
  const db = await getDB()
  await db.put('produccion', payload)
  return { ok: true, fromQueue: true, localOnly: true, produccion: payload }
}

export async function deleteProduccionAware(id: string): Promise<{ ok: boolean; fromQueue?: boolean }> {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('produccion').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('produccion', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_PRODUCCION', payload: { id } })
      const db = await getDB()
      await db.delete('produccion', id)
      return { ok: true, fromQueue: true }
    }
  }

  await enqueueMutation({ type: 'DELETE_PRODUCCION', payload: { id } })
  const db = await getDB()
  await db.delete('produccion', id)
  return { ok: true, fromQueue: true }
}
