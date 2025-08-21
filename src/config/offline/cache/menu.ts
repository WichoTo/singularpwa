import type { ItemMenu } from '../../types'
import { getDB } from '../db'

export async function cacheMenu(items: ItemMenu[]) {
  const db = await getDB()
  const tx = db.transaction('menu', 'readwrite')
  const store = tx.objectStore('menu')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(items.map(it => store.put(it)))
  await tx.done
}

export async function readMenuCache(): Promise<ItemMenu[]> {
  const db = await getDB()
  const store = db.transaction('menu').objectStore('menu')
  return await store.getAll() as ItemMenu[]
}
