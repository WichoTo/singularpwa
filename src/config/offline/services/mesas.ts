import type { Mesa } from '../../types'
import { supabase } from '../../supabaseClient'
import { isOnline } from '../utils'
import { cacheMesas, readMesasCache } from '../cache/mesa'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'

export async function fetchMesasAware(sucursalid?: string) {
  if (isOnline()) {
    let query = supabase.from('mesas').select('*')
    if (sucursalid) query = query.eq('sucursalid', sucursalid)
    const { data, error } = await query
    if (!error && Array.isArray(data)) {
      await cacheMesas(data as Mesa[])
      return { data: data as Mesa[], fromCache: false }
    }
  }
  const cached = await readMesasCache(sucursalid)
  return { data: cached, fromCache: true }
}

export async function upsertMesaAware(mesa: Mesa) {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('mesas')
      .upsert(mesa, { onConflict: 'id' })
      .select()
      .single()
    if (!error && data) {
      const db = await getDB()
      await db.put('mesas', data as Mesa)
      return { ok: true, mesa: data as Mesa }
    }
    await enqueueMutation({ type: 'UPSERT_MESA', payload: mesa })
    const db = await getDB()
    await db.put('mesas', mesa)
    return { ok: true, fromQueue: true, localOnly: true }
  }
  await enqueueMutation({ type: 'UPSERT_MESA', payload: mesa })
  const db = await getDB()
  await db.put('mesas', mesa)
  return { ok: true, fromQueue: true, localOnly: true }
}

export async function deleteMesaAware(id: string) {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('mesas').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('mesas', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_MESA', payload: { id } })
      const db = await getDB()
      await db.delete('mesas', id)
      return { ok: true, fromQueue: true }
    }
  }
  await enqueueMutation({ type: 'DELETE_MESA', payload: { id } })
  const db = await getDB()
  await db.delete('mesas', id)
  return { ok: true, fromQueue: true }
}
