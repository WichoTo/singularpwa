import type { User } from '../../types'
import { getDB } from '../db'

export async function cacheUsers(users: User[]) {
  const db = await getDB()
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  const keys = await store.getAllKeys()
  await Promise.all(keys.map(k => store.delete(k)))
  await Promise.all(users.map(u => store.put(u)))
  await tx.done
}

export async function readUsersCache(): Promise<User[]> {
  const db = await getDB()
  const store = db.transaction('users').objectStore('users')
  return await store.getAll() as User[]
}
