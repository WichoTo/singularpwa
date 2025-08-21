// src/config/offline/services/turnos.ts
import { supabase } from '../../../config/supabaseClient'
import type { TurnoActivo } from '../../types'
import { isOnline, uuid } from '../utils'
import { getDB } from '../db'
import { enqueueMutation } from '../outbox/queue'
import { cacheTurnos, readTurnosBySucursal, readTurnoActivo } from '../cache/turnos'

const TABLE = 'turnos'

export async function fetchTurnosAware(sucursalid?: string): Promise<{ data: TurnoActivo[]; fromCache: boolean }> {
  if (!sucursalid) return { data: [], fromCache: true }

  if (isOnline()) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('sucursalid', sucursalid)
    if (!error && Array.isArray(data)) {
      await cacheTurnos(data as TurnoActivo[])
      return { data: data as TurnoActivo[], fromCache: false }
    }
  }

  const cached = await readTurnosBySucursal(sucursalid)
  return { data: cached, fromCache: true }
}

export async function fetchTurnoActivoAware(sucursalid: string): Promise<{ data: TurnoActivo | null; fromCache: boolean }> {
  if (!sucursalid) return { data: null, fromCache: true }

  if (isOnline()) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('sucursalid', sucursalid)
      .eq('abierto', true)

    if (!error && Array.isArray(data)) {
      await cacheTurnos(data as TurnoActivo[])
      return { data: (data[0] as TurnoActivo) ?? null, fromCache: false }
    }
  }

  const cached = await readTurnoActivo(sucursalid)
  return { data: cached, fromCache: true }
}

export async function upsertTurnoAware(turno: TurnoActivo): Promise<{ ok: boolean; turno?: TurnoActivo; fromQueue?: boolean; localOnly?: boolean; }> {
  const payload: TurnoActivo = { ...turno, id: turno.id?.trim() ? turno.id : uuid() }

  if (isOnline()) {
    try {
      const { data, error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' }).select().single()
      if (error) throw error
      const db = await getDB()
      await db.put('turnos', (data ?? payload) as TurnoActivo)
      return { ok: true, turno: (data ?? payload) as TurnoActivo }
    } catch {
      await enqueueMutation({ type: 'UPSERT_TURNO', payload })
      const db = await getDB()
      await db.put('turnos', payload)
      return { ok: true, fromQueue: true, localOnly: true, turno: payload }
    }
  }

  await enqueueMutation({ type: 'UPSERT_TURNO', payload })
  const db = await getDB()
  await db.put('turnos', payload)
  return { ok: true, fromQueue: true, localOnly: true, turno: payload }
}

export async function closeTurnoAware(id: string, efectivoFinal?: number): Promise<{ ok: boolean; fromQueue?: boolean }> {
  const patch = { id, abierto: false, fechafin: new Date().toISOString(), efectivoFinal: efectivoFinal ?? null } as Partial<TurnoActivo> & { id: string }

  if (isOnline()) {
    try {
      const { error } = await supabase.from(TABLE).upsert(patch, { onConflict: 'id' })
      if (error) throw error
      const db = await getDB()
      const prev = await db.get('turnos', id) as TurnoActivo | undefined
      await db.put('turnos', { ...(prev ?? { id }), ...patch })
      return { ok: true }
    } catch {
      await enqueueMutation({ type: 'CLOSE_TURNO', payload: patch })
      const db = await getDB()
      const prev = await db.get('turnos', id) as TurnoActivo | undefined
      await db.put('turnos', { ...(prev ?? { id }), ...patch })
      return { ok: true, fromQueue: true }
    }
  }

  await enqueueMutation({ type: 'CLOSE_TURNO', payload: patch })
  const db = await getDB()
  const prev = await db.get('turnos', id) as TurnoActivo | undefined
  await db.put('turnos', { ...(prev ?? { id }), ...patch })
  return { ok: true, fromQueue: true }
}
