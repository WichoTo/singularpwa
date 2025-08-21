import { supabase } from '../../supabaseClient'
import type { InsumoInventario } from '../../types'
import { isOnline, uuid } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { cacheInventario, readInventarioCache } from '../cache/inventario'

export async function fetchInventarioAware(
  sucursalid?: string
): Promise<{ data: InsumoInventario[]; fromCache: boolean }> {
  if (!sucursalid) return { data: [], fromCache: true }

  if (isOnline()) {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .eq('sucursalid', sucursalid)

    if (!error && Array.isArray(data)) {
      await cacheInventario(sucursalid, data as InsumoInventario[])
      return { data: data as InsumoInventario[], fromCache: false }
    }
  }

  const cached = await readInventarioCache(sucursalid)
  return { data: cached, fromCache: true }
}

export async function upsertInventarioAware(row: InsumoInventario): Promise<{
  ok: boolean
  inventario?: InsumoInventario
  fromQueue?: boolean
  localOnly?: boolean
}> {
  const payload: InsumoInventario = {
    ...row,
    id: row.id?.trim() ? row.id : uuid(),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('inventario', (data ?? payload) as InsumoInventario)
      return { ok: true, inventario: (data ?? payload) as InsumoInventario }
    } catch {
      await enqueueMutation({ type: 'UPSERT_INVENTARIO', payload })
      const db = await getDB()
      await db.put('inventario', payload)
      return { ok: true, fromQueue: true, localOnly: true, inventario: payload }
    }
  }

  // offline
  await enqueueMutation({ type: 'UPSERT_INVENTARIO', payload })
  const db = await getDB()
  await db.put('inventario', payload)
  return { ok: true, fromQueue: true, localOnly: true, inventario: payload }
}

export async function deleteInventarioAware(id: string): Promise<{ ok: boolean; fromQueue?: boolean }> {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('inventario', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_INVENTARIO', payload: { id } })
      const db = await getDB()
      await db.delete('inventario', id)
      return { ok: true, fromQueue: true }
    }
  }

  await enqueueMutation({ type: 'DELETE_INVENTARIO', payload: { id } })
  const db = await getDB()
  await db.delete('inventario', id)
  return { ok: true, fromQueue: true }
}
