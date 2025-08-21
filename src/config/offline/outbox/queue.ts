import { getDB } from '../db'
import type { OfflineMutation } from './types'
import { uuid } from '../utils'

export async function enqueueMutation(m: Omit<OfflineMutation, 'id' | 'createdAt'>) {
  const db = await getDB()
  const full: OfflineMutation = { ...m, id: uuid(), createdAt: Date.now() }
  await db.put('outbox', full)
  return full.id
}

export async function dequeueMutation(id: string) {
  const db = await getDB()
  await db.delete('outbox', id)
}

export async function getOutbox(): Promise<OfflineMutation[]> {
  const db = await getDB()
  const store = db.transaction('outbox').objectStore('outbox')
  return await store.getAll() as OfflineMutation[]
}
