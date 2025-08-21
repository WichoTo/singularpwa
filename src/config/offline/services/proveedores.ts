// src/offline/services/proveedores.ts
import { supabase } from '../../../config/supabaseClient'
import type { Proveedor } from '../../../config/types'
import { cacheProveedores, readProveedoresCache } from '../cache/proveedores'
import { enqueueMutation } from '../outbox/queue'
import { getDB } from '../db'
import { isOnline } from '../utils'

export async function fetchProveedoresAware(): Promise<{ data: Proveedor[]; fromCache: boolean; }> {
  if (isOnline()) {
    const { data, error } = await supabase.from('proveedores').select('*')
    if (!error && Array.isArray(data)) {
      await cacheProveedores(data as Proveedor[])
      return { data: data as Proveedor[], fromCache: false }
    }
  }
  const cached = await readProveedoresCache()
  return { data: cached, fromCache: true }
}

export async function upsertProveedorAware(p: Proveedor) {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('proveedores')
      .upsert(p, { onConflict: 'id' })
      .select()
      .single()
    if (!error) {
      const db = await getDB()
      await db.put('proveedores', (data ?? p) as Proveedor)
      return { ok: true, proveedor: (data ?? p) as Proveedor }
    }
    // con red pero error backend → encola
    await enqueueMutation({ type: 'UPSERT_PROVEEDOR', payload: p })
    const db = await getDB()
    await db.put('proveedores', p)
    return { ok: true, fromQueue: true, localOnly: true, proveedor: p }
  }
  // offline → encola
  await enqueueMutation({ type: 'UPSERT_PROVEEDOR', payload: p })
  const db = await getDB()
  await db.put('proveedores', p)
  return { ok: true, fromQueue: true, localOnly: true, proveedor: p }
}

export async function deleteProveedorAware(id: string) {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('proveedores').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('proveedores', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_PROVEEDOR', payload: { id } })
      const db = await getDB()
      await db.delete('proveedores', id)
      return { ok: true, fromQueue: true }
    }
  }
  await enqueueMutation({ type: 'DELETE_PROVEEDOR', payload: { id } })
  const db = await getDB()
  await db.delete('proveedores', id)
  return { ok: true, fromQueue: true }
}
