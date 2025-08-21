import type { Sucursal } from '../../types'
import { supabase } from '../../supabaseClient'
import { isOnline } from '../utils'
import { cacheSucursales, readSucursalesCache } from '../cache/sucursales'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { uploadToStorageSucursal } from '../storage'
import { putFileAndGetKey } from '../blobs'

export async function fetchSucursalesAware() {
  if (isOnline()) {
    const { data, error } = await supabase.from('sucursales').select('*')
    if (!error && Array.isArray(data)) {
      await cacheSucursales(data as Sucursal[])
      return { data: data as Sucursal[], fromCache: false }
    }
  }
  const cached = await readSucursalesCache()
  return { data: cached, fromCache: true }
}

export async function upsertSucursalAware(sucursal: Sucursal) {
  const imgs = sucursal.imagenes ?? []
  if (isOnline()) {
    try {
      const finalImgs = await Promise.all(
        imgs.map(async (doc: any) => {
          if (doc?.file) {
            const uploaded = await uploadToStorageSucursal(sucursal.id, doc.file, doc.file.name)
            return uploaded
          }
          const { file, ...rest } = doc ?? {}
          return rest
        })
      )

      const payload: Sucursal = { ...sucursal, imagenes: finalImgs }
      const { data, error } = await supabase
        .from('sucursales')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const { data: freshAll } = await supabase.from('sucursales').select('*')
      if (freshAll) await cacheSucursales(freshAll as Sucursal[])

      return { ok: true, sucursal: data as Sucursal }
    } catch {
      const withFileKeys = await materializeSucursalForQueue(sucursal)
      await enqueueMutation({ type: 'UPSERT_SUCURSAL', payload: withFileKeys })
      await upsertSucursalCacheOnly(sucursal)
      return { ok: true, fromQueue: true, localOnly: true }
    }
  }

  const withFileKeys = await materializeSucursalForQueue(sucursal)
  await enqueueMutation({ type: 'UPSERT_SUCURSAL', payload: withFileKeys })
  await upsertSucursalCacheOnly(sucursal)
  return { ok: true, fromQueue: true, localOnly: true }
}

export async function deleteSucursalAware(sucursalId: string) {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('sucursales').delete().eq('id', sucursalId)
      if (error) throw error
      const db = await getDB()
      await db.delete('sucursales', sucursalId)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_SUCURSAL', payload: { id: sucursalId } })
      const db = await getDB()
      await db.delete('sucursales', sucursalId)
      return { ok: true, fromQueue: true }
    }
  }
  await enqueueMutation({ type: 'DELETE_SUCURSAL', payload: { id: sucursalId } })
  const db = await getDB()
  await db.delete('sucursales', sucursalId)
  return { ok: true, fromQueue: true }
}

// helpers internos
async function upsertSucursalCacheOnly(s: Sucursal) {
  const db = await getDB()
  await db.put('sucursales', s)
}

async function materializeSucursalForQueue(s: Sucursal) {
  const imgs = await Promise.all(
    (s.imagenes ?? []).map(async (doc: any) => {
      if (doc?.file) {
        const key = await putFileAndGetKey(doc.file)
        return { _fileKey: key, nombre: doc.file.name }
      }
      const { file, ...rest } = doc ?? {}
      return rest
    })
  )
  return { ...s, imagenes: imgs }
}
