import { normalizeFileName } from '../hooks/useUtilsFunctions'
import { supabase } from '../supabaseClient'
import { uuid } from './utils'

export async function uploadToStorageSucursal(
  sucursalId: string,
  file: File | Blob,
  originalName: string
) {
  const storage = supabase.storage.from('sucursales')
  const safeName = normalizeFileName(originalName)
  const path = `${sucursalId}/${safeName}`
  await storage.remove([path]).catch(() => {})
  const { error } = await storage.upload(path, file, { upsert: true })
  if (error) throw error
  return { id: path, nombre: originalName, url: path, path, bucket: 'sucursales' }
}

export async function uploadToStorageMenu(
  sucursalId: string,
  menuId: string,
  file: File | Blob,
  originalName: string
) {
  const bucket = 'menu'
  const safeName = normalizeFileName(originalName)
  const path = `${sucursalId}/${menuId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    id: uuid(),
    nombre: safeName,
    url: urlData.publicUrl,
    path,
    bucket,
  }
}
