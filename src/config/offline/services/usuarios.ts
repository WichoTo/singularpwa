import type { User } from '../../types'
import { supabase } from '../../supabaseClient'
import { isOnline } from '../utils'
import { cacheUsers, readUsersCache } from '../cache/users'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'

export async function fetchUsuariosAware() {
  if (isOnline()) {
    const { data, error } = await supabase.from('users').select('*')
    if (!error && Array.isArray(data)) {
      await cacheUsers(data as User[])
      return { data: data as User[], fromCache: false }
    }
  }
  const cached = await readUsersCache()
  return { data: cached, fromCache: true }
}

export async function upsertUsuarioAware(usuario: User) {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('users')
      .upsert([{
        id: usuario.id, nombre: usuario.nombre, correo: usuario.correo,
        telefono: usuario.telefono, rol: usuario.rol, areas: usuario.areas,
        sucursales: usuario.sucursales || []
      }])
      .select('*')
      .single()

    if (!error && data) {
      const db = await getDB()
      await db.put('users', data)
      return { ok: true, user: data as User }
    }
    await enqueueMutation({ type: 'UPSERT_USER', payload: usuario })
    const db = await getDB()
    await db.put('users', usuario)
    return { ok: true, fromQueue: true, localOnly: true }
  }

  await enqueueMutation({ type: 'UPSERT_USER', payload: usuario })
  const db = await getDB()
  await db.put('users', usuario)
  return { ok: true, fromQueue: true, localOnly: true }
}
