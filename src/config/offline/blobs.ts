import { getDB } from './db'

export async function putFileAndGetKey(file: File | Blob): Promise<string> {
  const db = await getDB()
  const key = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  await db.put('files', { key, blob: file })
  return key
}

export async function getFileByKey(key: string): Promise<Blob | null> {
  const db = await getDB()
  const rec = await db.get('files', key)
  return rec?.blob ?? null
}

export async function deleteFileKey(key: string) {
  const db = await getDB()
  await db.delete('files', key)
}
