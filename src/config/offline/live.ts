// src/config/offline/realtime.ts
import { supabase } from '../supabaseClient'
import { getDB } from './db'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function startTurnoRealtime(turnoid: string) {
  const ch = supabase.channel(`turno:${turnoid}`)

  function upsertStore(store: 'cuentasmesero'|'cuentascomensal'|'conceptoscuentas', row: any) {
    getDB().then(db => db.put(store, row))
  }
  function deleteFromStore(store: 'cuentasmesero'|'cuentascomensal'|'conceptoscuentas', id: string) {
    getDB().then(db => db.delete(store, id))
  }

  const onChange = (store: 'cuentasmesero'|'cuentascomensal'|'conceptoscuentas') =>
    (payload: RealtimePostgresChangesPayload<any>) => {
      const r = payload.new ?? payload.old
      if (r?.turnoid !== turnoid) return
      if (payload.eventType === 'DELETE') deleteFromStore(store, payload.old.id)
      else upsertStore(store, payload.new)
      // aquí podrías emitir un CustomEvent para que la UI re-leea
      window.dispatchEvent(new CustomEvent('turno-cache-updated', { detail: { store } }))
    }

  ch
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentasmesero' }, onChange('cuentasmesero'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentascomensal' }, onChange('cuentascomensal'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conceptoscuentas' }, onChange('conceptoscuentas'))
    .subscribe()

  return () => { supabase.removeChannel(ch) }
}
