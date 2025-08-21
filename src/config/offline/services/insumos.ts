// src/offline/services/insumos.ts
import { supabase } from '../../../config/supabaseClient'
import type { Insumo } from '../../../config/types'
import { getDB } from '../db'
import { isOnline, uuid } from '../utils'
import { enqueueMutation } from '../outbox/queue'

export async function fetchInsumosAware(): Promise<{ data: Insumo[]; fromCache: boolean; }> {
  if (isOnline()) {
    const { data, error } = await supabase.from('insumos').select('*')
    if (!error && Array.isArray(data)) {
      const db = await getDB()
      const tx = db.transaction('insumos', 'readwrite')
      const store = tx.objectStore('insumos')
      const keys = await store.getAllKeys()
      await Promise.all(keys.map(k => store.delete(k)))
      await Promise.all((data as Insumo[]).map(it => store.put(it)))
      await tx.done
      return { data: data as Insumo[], fromCache: false }
    }
  }
  const db = await getDB()
  const store = db.transaction('insumos').objectStore('insumos')
  const cached = await store.getAll() as Insumo[]
  return { data: cached, fromCache: true }
}

export async function upsertInsumoAware(insumo: Insumo): Promise<{
  ok: boolean; insumo?: Insumo; fromQueue?: boolean; localOnly?: boolean; error?: string;
}> {
  const payload: Insumo = {
    ...insumo,
    id: insumo.id?.trim() ? insumo.id : uuid(),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('insumos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('insumos', (data ?? payload) as Insumo)

      return { ok: true, insumo: (data ?? payload) as Insumo }
    } catch (e: any) {
      await enqueueMutation({ type: 'UPSERT_INSUMO', payload })
      const db = await getDB()
      await db.put('insumos', payload)
      return { ok: true, fromQueue: true, localOnly: true, insumo: payload }
    }
  }

  // offline
  await enqueueMutation({ type: 'UPSERT_INSUMO', payload })
  const db = await getDB()
  await db.put('insumos', payload)
  return { ok: true, fromQueue: true, localOnly: true, insumo: payload }
}

export async function deleteInsumoAware(id: string): Promise<{ ok: boolean; fromQueue?: boolean; }> {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('insumos').delete().eq('id', id)
      if (error) throw error

      const db = await getDB()
      await db.delete('insumos', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_INSUMO', payload: { id } })
      const db = await getDB()
      await db.delete('insumos', id)
      return { ok: true, fromQueue: true }
    }
  }

  await enqueueMutation({ type: 'DELETE_INSUMO', payload: { id } })
  const db = await getDB()
  await db.delete('insumos', id)
  return { ok: true, fromQueue: true }
}
