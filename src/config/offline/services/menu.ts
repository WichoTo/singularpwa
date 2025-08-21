import type { ItemMenu } from '../../types'
import { supabase } from '../../supabaseClient'
import { isOnline, uuid } from '../utils'
import { cacheMenu, readMenuCache } from '../cache/menu'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { uploadToStorageMenu } from '../storage'
import { putFileAndGetKey } from '../blobs'

export async function fetchMenuAware() {
  if (isOnline()) {
    const { data, error } = await supabase.from('menu').select('*')
    if (!error && Array.isArray(data)) {
      await cacheMenu(data as ItemMenu[])
      return { data: data as ItemMenu[], fromCache: false }
    }
  }
  const cached = await readMenuCache()
  return { data: cached, fromCache: true }
}

export async function upsertMenuItemAware(item: ItemMenu) {
  const menuId = item.id?.trim() ? item.id : uuid()
  const sucursalId = item.sucursalid

  if (isOnline()) {
    try {
      const finalRefs = await Promise.all(
        (item.referencias ?? []).map(async (doc: any) => {
          if (doc?.file) {
            return await uploadToStorageMenu(sucursalId, menuId, doc.file, doc.file.name)
          }
          const { file, ...rest } = doc ?? {}
          return rest
        })
      )

      const payload: ItemMenu = {
        ...item,
        id: menuId,
        referencias: finalRefs,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('menu')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error

      const db = await getDB()
      await db.put('menu', (data ?? payload) as ItemMenu)
      return { ok: true, item: (data ?? payload) as ItemMenu }
    } catch {
      const queued = await materializeMenuForQueue({ ...item, id: menuId })
      await enqueueMutation({ type: 'UPSERT_MENU', payload: queued })
      const db = await getDB()
      await db.put('menu', queued as ItemMenu)
      return { ok: true, fromQueue: true, localOnly: true, item: queued as ItemMenu }
    }
  }

  const queued = await materializeMenuForQueue({ ...item, id: menuId })
  await enqueueMutation({ type: 'UPSERT_MENU', payload: queued })
  const db = await getDB()
  await db.put('menu', queued as ItemMenu)
  return { ok: true, fromQueue: true, localOnly: true, item: queued as ItemMenu }
}

export async function deleteMenuItemAware(id: string) {
  if (isOnline()) {
    try {
      const { error } = await supabase.from('menu').delete().eq('id', id)
      if (error) throw error
      const db = await getDB()
      await db.delete('menu', id)
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'DELETE_MENU', payload: { id } })
      const db = await getDB()
      await db.delete('menu', id)
      return { ok: true, fromQueue: true }
    }
  }
  await enqueueMutation({ type: 'DELETE_MENU', payload: { id } })
  const db = await getDB()
  await db.delete('menu', id)
  return { ok: true, fromQueue: true }
}

async function materializeMenuForQueue(item: ItemMenu) {
  const refs = await Promise.all(
    (item.referencias ?? []).map(async (doc: any) => {
      if (doc?.file) {
        const key = await putFileAndGetKey(doc.file as File | Blob)
        return { _fileKey: key, nombre: doc.file.name }
      }
      const { file, ...rest } = doc ?? {}
      return rest
    })
  )
  return { ...item, referencias: refs }
}
