// src/offline/services/preparaciones.ts
import { supabase } from '../../../config/supabaseClient'
import type { Preparacion } from '../../../config/types'
import { getDB } from '../db'
import { isOnline, uuid } from '../utils'
import { enqueueMutation } from '../outbox/queue'

export async function fetchPreparacionesAware(): Promise<{ data: Preparacion[]; fromCache: boolean; }> {
  if (isOnline()) {
    const { data, error } = await supabase.from('preparaciones').select('*')
    if (!error && Array.isArray(data)) {
      const db = await getDB()
      const tx = db.transaction('preparaciones', 'readwrite')
      const store = tx.objectStore('preparaciones')
      const keys = await store.getAllKeys()
      await Promise.all(keys.map(k => store.delete(k)))
      await Promise.all((data as Preparacion[]).map(it => store.put(it)))
      await tx.done
      return { data: data as Preparacion[], fromCache: false }
    }
  }

  const db = await getDB()
  const store = db.transaction('preparaciones').objectStore('preparaciones')
  const cached = await store.getAll() as Preparacion[]
  return { data: cached, fromCache: true }
}

export async function upsertPreparacionAware(prep: Preparacion): Promise<{
  ok: boolean; preparacion?: Preparacion; fromQueue?: boolean; localOnly?: boolean; error?: string;
}> {
  const payload: Preparacion = {
    ...prep,
    id: prep.id?.trim() ? prep.id : uuid(),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('preparaciones')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('preparaciones', (data ?? payload) as Preparacion)

      return { ok: true, preparacion: (data ?? payload) as Preparacion }
    } catch {
      await enqueueMutation({ type: 'UPSERT_PREPARACION', payload })
      const db = await getDB()
      await db.put('preparaciones', payload)
      return { ok: true, fromQueue: true, localOnly: true, preparacion: payload }
    }
  }

  // offline
  await enqueueMutation({ type: 'UPSERT_PREPARACION', payload })
  const db = await getDB()
  await db.put('preparaciones', payload)
  return { ok: true, fromQueue: true, localOnly: true, preparacion: payload }
}

export async function deletePreparacionAware(id: string): Promise<{ ok: boolean; fromQueue?: boolean; }> {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('preparaciones').delete().eq('id', id)
      if (error) throw error

      const db = await getDB()
      await db.delete('preparaciones', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_PREPARACION', payload: { id } })
      const db = await getDB()
      await db.delete('preparaciones', id)
      return { ok: true, fromQueue: true }
    }
  }

  await enqueueMutation({ type: 'DELETE_PREPARACION', payload: { id } })
  const db = await getDB()
  await db.delete('preparaciones', id)
  return { ok: true, fromQueue: true }
}
