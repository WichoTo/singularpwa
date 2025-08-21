// src/hooks/useFetchFunctions.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import type { ConceptoCuenta, CuentaComensal, CuentaMesero, Insumo, InsumoInventario, ItemMenu, Mesa, MetodoPago, Pago, Preparacion, PreparacionProduccion, Proveedor, SeleccionPorConcepto, Sucursal, TurnoActivo, User, WorkArea } from '../types'
import { fetchUsuariosAware, upsertUsuarioAware, fetchSucursalesAware, upsertSucursalAware, deleteSucursalAware, fetchMesasAware, upsertMesaAware, deleteMesaAware, fetchMenuAware, fetchInsumosAware, fetchPreparacionesAware, deleteMenuItemAware, upsertMenuItemAware, fetchProveedoresAware, deleteInsumoAware, deletePreparacionAware, upsertInsumoAware, upsertPreparacionAware, upsertWorkAreasAware, fetchWorkAreasAware, buildPagoLine, fetchPagosAware, markConceptosCobradosAware, upsertPagoAware } from '../offline'
import { fetchProduccionAware, upsertProduccionAware, deleteProduccionAware } from '../offline/services/produccion'
import { fetchInventarioAware, upsertInventarioAware, deleteInventarioAware } from '../offline/services/inventario'
import { fetchTurnosAware, upsertTurnoAware, closeTurnoAware } from '../offline/services/turnos'
import { fetchCuentasMeseroAware, upsertCuentaMeseroAware, fetchCuentasComensalAware, upsertCuentaComensalAware, fetchConceptosAware, upsertConceptoAware, deleteConceptoAware } from '../offline/services/cuentas'


/********************************* USUARIOS *********************************/

export function useFetchUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchUsuarios = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUsuariosAware()
      setUsuarios(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
    const channel = supabase
      .channel('users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsuarios)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return { usuarios, loading, error, fromCache, fetchUsuarios }
}

export async function actualizarUsuario(usuario: User) {
  const res = await upsertUsuarioAware(usuario)
  return res.ok ? (res.user ?? usuario) : null
}

/******************************** SUCURSALES ********************************/

export function useFetchSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchSucursales = async () => {
    setError(null)
    try {
      const res = await fetchSucursalesAware()
      setSucursales(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSucursales()
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel('sucursales_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sucursales' }, fetchSucursales)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onOnline = () => fetchSucursales()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return { sucursales, loading, error, fromCache, fetchSucursales }
}
function normalizeWorkAreas(input: Sucursal['workAreas'] | string[] | undefined, sucursalid: string): WorkArea[] {
  if (!input) return []
  if (Array.isArray(input) && typeof input[0] === 'object') {
    return (input as WorkArea[]).map((w, i) => ({
      id: w.id?.trim() ? w.id : crypto.randomUUID(),
      sucursalid,
      nombre: w.nombre ?? '',
      orden: typeof w.orden === 'number' ? w.orden : i,
      color: w.color ?? null,
      is_active: w.is_active ?? true,
      printer_id: w.printer_id ?? null,
    }))
  }
  return (input as string[]).map((nombre, i) => ({
    id: crypto.randomUUID(),
    sucursalid,
    nombre: nombre ?? '',
    orden: i,
    color: null,
    is_active: true,
    printer_id: null,
  }))
}

export async function upsertSucursal(sucursal: Sucursal): Promise<Sucursal> {
  const id = sucursal.id?.trim() ? sucursal.id : crypto.randomUUID()
  const payload: Sucursal = { ...sucursal, id, imagenes: [...(sucursal.imagenes ?? [])] }

  const { ok, sucursal: saved } = await upsertSucursalAware(payload)
  if (!ok) throw new Error('No se pudo guardar la sucursal (cola offline)')
  const finalSucursal = saved ?? payload

  // ⛓️ Cascada: upsert WorkAreas normalizadas
  const areas = normalizeWorkAreas(finalSucursal.workAreas, finalSucursal.id)
  if (areas.length) await upsertWorkAreasAware(areas)  // queda en outbox si no hay red

  return finalSucursal
}


export async function eliminarSucursal(sucursalId: string) {
  const { ok } = await deleteSucursalAware(sucursalId)
  if (!ok) throw new Error('No se pudo eliminar la sucursal (cola offline)')
}

export function useFetchWorkAreas(sucursalid?: string) {
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

    const fetchWorkAreas = async () => {
        setError(null)
        try {
        const res = await fetchWorkAreasAware(sucursalid) // <-- puede ser undefined
        setWorkAreas(res.data)
        setFromCache(res.fromCache)
        } catch (e: any) {
        setError(e?.message ?? 'Error al cargar áreas de trabajo')
        } finally {
        setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchWorkAreas()
    }, [sucursalid])

    useEffect(() => {
        // si hay sucursal: suscripción filtrada; si no, puedes omitir o suscribirte global
        if (typeof navigator !== 'undefined' && !navigator.onLine) return
        if (!sucursalid) return
        const channel = supabase
        .channel(`workareas_${sucursalid}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workareas', filter: `sucursalid=eq.${sucursalid}` },
            fetchWorkAreas
        )
        .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [sucursalid])


  useEffect(() => {
    if (!sucursalid || (typeof navigator !== 'undefined' && !navigator.onLine)) return
    const channel = supabase
      .channel(`workareas_${sucursalid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workareas', filter: `sucursalid=eq.${sucursalid}` },
        fetchWorkAreas
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sucursalid])

  useEffect(() => {
    const onOnline = () => fetchWorkAreas()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [sucursalid])

  return { workAreas, loading, error, fromCache, fetchWorkAreas }
}


/*********************************** MESAS ***********************************/

export function useFetchMesas(sucursalid?: string) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchMesas = async () => {
    setError(null)
    try {
      const res = await fetchMesasAware(sucursalid)
      setMesas(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar mesas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchMesas()
  }, [sucursalid])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel(`mesas_${sucursalid ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, fetchMesas)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sucursalid])

  useEffect(() => {
    const onOnline = () => fetchMesas()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [sucursalid])

  return { mesas, loading, error, fromCache, fetchMesas }
}

export async function upsertMesa(mesa: Mesa): Promise<Mesa> {
  const id = mesa.id?.trim() ? mesa.id : crypto.randomUUID()
  const payload: Mesa = { ...mesa, id }
  const { ok, mesa: saved } = await upsertMesaAware(payload)
  if (!ok) throw new Error('No se pudo guardar la mesa (cola offline)')
  return saved ?? payload
}

export async function eliminarMesa(id: string) {
  const { ok } = await deleteMesaAware(id)
  if (!ok) throw new Error('No se pudo eliminar la mesa (cola offline)')
}

/************************************ MENÚ ************************************/

export function useFetchMenu() {
  const [menu, setMenu] = useState<ItemMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchMenu = async () => {
    setError(null)
    try {
      const res = await fetchMenuAware()
      setMenu(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar menú')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchMenu()
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel('menu_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, fetchMenu)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onOnline = () => fetchMenu()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return { menu, loading, error, fromCache, fetchMenu }
}
export async function upsertMenuItem(item: ItemMenu): Promise<ItemMenu> {
  const id = item.id?.trim() ? item.id : crypto.randomUUID()

  // No procesamos files aquí; el aware ya sube a Storage cuando haya red
  const payload: ItemMenu = {
    ...item,
    id,
    referencias: [...(item.referencias ?? [])],
    updated_at: new Date().toISOString(),
  }

  const { ok, item: saved } = await upsertMenuItemAware(payload)
  if (!ok) throw new Error('No se pudo guardar el producto (se encoló offline)')
  return saved ?? payload
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { ok } = await deleteMenuItemAware(id)
  if (!ok) throw new Error('No se pudo eliminar el producto (se encoló offline)')
}

/********************************** INSUMOS **********************************/

export function useFetchInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetch = async () => {
    setError(null)
    try {
      const res = await fetchInsumosAware()
      setInsumos(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar insumos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetch()
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel('insumos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onOnline = () => fetch()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return { insumos, loading, error, fromCache, fetch }
}

export async function upsertInsumo(i: Insumo): Promise<Insumo> {
  const { ok, insumo } = await upsertInsumoAware(i)
  if (!ok) throw new Error('No se pudo guardar el insumo (cola offline)')
  return insumo ?? i
}

export async function deleteInsumo(id: string): Promise<void> {
  const { ok } = await deleteInsumoAware(id)
  if (!ok) throw new Error('No se pudo eliminar el insumo (cola offline)')
}

/******************************* PREPARACIONES *******************************/

export function useFetchPreparaciones() {
  const [preparaciones, setPreparaciones] = useState<Preparacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetch = async () => {
    setError(null)
    try {
      const res = await fetchPreparacionesAware()
      setPreparaciones(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar preparaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetch()
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel('preparaciones_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preparaciones' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onOnline = () => fetch()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return { preparaciones, loading, error, fromCache, fetch }
}
export async function upsertPreparaciones(p: Preparacion): Promise<Preparacion> {
  const { ok, preparacion } = await upsertPreparacionAware(p)
  if (!ok) throw new Error('No se pudo guardar la preparación (cola offline)')
  return preparacion ?? p
}

export async function deletePreparacion(id: string): Promise<void> {
  const { ok } = await deletePreparacionAware(id)
  if (!ok) throw new Error('No se pudo eliminar la preparación (cola offline)')
}


/******************************* PROVEEDORES *******************************/

export function useFetchProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchData = async () => {
    setError(null)
    try {
      const { data, fromCache } = await fetchProveedoresAware()
      setProveedores(data)
      setFromCache(fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const channel = supabase
      .channel('proveedores_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proveedores' },
        () => fetchData()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const onOnline = () => fetchData()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return { proveedores, loading, error, fromCache, fetchProveedores: fetchData }
}
/******************************* PRODUCCION *******************************/

export function useFetchProduccion(sucursalid?: string) {
  const [producciones, setProducciones] = useState<PreparacionProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!sucursalid) { 
      setProducciones([]) 
      setFromCache(true)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const res = await fetchProduccionAware(sucursalid)
      setProducciones(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar producción')
    } finally {
      setLoading(false)
    }
  }, [sucursalid])

  // carga inicial + suscripción realtime
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchAll()

    if (!sucursalid || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return () => { mounted = false }
    }

    const channel = supabase
      .channel(`produccion_${sucursalid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produccion', filter: `sucursalid=eq.${sucursalid}` },
        () => { if (mounted) fetchAll() }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sucursalid, fetchAll])

  // refresca al volver online
  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  return { producciones, loading, error, fromCache, fetch: fetchAll }
}

// helpers
export async function upsertPreparacionProduccion(row: PreparacionProduccion): Promise<PreparacionProduccion> {
  const { ok, produccion } = await upsertProduccionAware(row)
  if (!ok) throw new Error('No se pudo guardar la producción (cola offline)')
  return produccion ?? row
}

export async function deleteProduccion(id: string): Promise<void> {
  const { ok } = await deleteProduccionAware(id)
  if (!ok) throw new Error('No se pudo eliminar (cola offline)')
}


export function useFetchInventario(sucursalid?: string) {
  const [inventario, setInventario] = useState<InsumoInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!sucursalid) {
      setInventario([])
      setFromCache(true)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const res = await fetchInventarioAware(sucursalid)
      setInventario(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [sucursalid])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchAll()

    if (!sucursalid || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return () => { mounted = false }
    }

    const channel = supabase
      .channel(`inventario_${sucursalid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventario', filter: `sucursalid=eq.${sucursalid}` },
        () => { if (mounted) fetchAll() }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sucursalid, fetchAll])

  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  return { inventario, loading, error, fromCache, fetch: fetchAll }
}

// helpers para crear/borrar movimientos de inventario (usados por tu modal)
export async function upsertInsumoInventario(row: InsumoInventario): Promise<InsumoInventario> {
  const { ok, inventario } = await upsertInventarioAware(row)
  if (!ok) throw new Error('No se pudo guardar (cola offline)')
  return inventario ?? row
}

export async function deleteInsumoInventario(id: string): Promise<void> {
  const { ok } = await deleteInventarioAware(id)
  if (!ok) throw new Error('No se pudo eliminar (cola offline)')
}


/******************************* TURNOS *******************************/

export const useFetchTurno = (sucursalid?: string) => {
  const [turnos, setTurnos] = useState<TurnoActivo[] | null>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchTurno = useCallback(async () => {
    if (!sucursalid) { setTurnos([]); setFromCache(true); setLoading(false); return }
    setError(null)
    try {
      const res = await fetchTurnosAware(sucursalid)
      setTurnos(res.data)
      setFromCache(res.fromCache)
    } catch (err: any) {
      setError(err?.message ?? 'Error al cargar turnos')
    } finally {
      setLoading(false)
    }
  }, [sucursalid])

  // carga inicial
  useEffect(() => {
    setLoading(true)
    fetchTurno()
  }, [fetchTurno])

  // realtime
  useEffect(() => {
    if (!sucursalid || (typeof navigator !== 'undefined' && !navigator.onLine)) return
    const channel = supabase
      .channel(`turnos_${sucursalid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'turnos', filter: `sucursalid=eq.${sucursalid}` },
        () => fetchTurno()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sucursalid, fetchTurno])

  // refresh al volver online
  useEffect(() => {
    const onOnline = () => fetchTurno()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchTurno])

  return { turnos, loading, error, fromCache, fetchTurno }
}

// helpers de acción (mismo nombre que usabas antes)
export async function upsertTurnoActivo(turno: TurnoActivo): Promise<TurnoActivo> {
  const { ok, turno: saved } = await upsertTurnoAware(turno)
  if (!ok) throw new Error('No se pudo guardar el turno (cola offline)')
  return saved ?? turno
}

export async function cerrarTurno(id: string, efectivoFinal?: number): Promise<void> {
  const { ok } = await closeTurnoAware(id, efectivoFinal)
  if (!ok) throw new Error('No se pudo cerrar el turno (cola offline)')
}


export function useFetchCuentasMesero(sucursalid?: string, turnoid?: string) {
  const [cuentas, setCuentas] = useState<CuentaMesero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!sucursalid || !turnoid) { setCuentas([]); setFromCache(true); setLoading(false); return }
    setError(null)
    try {
      const res = await fetchCuentasMeseroAware(sucursalid, turnoid)
      setCuentas(res.data); setFromCache(res.fromCache)
    } catch (e:any) { setError(e?.message ?? 'Error al cargar cuentas (mesero)') }
    finally { setLoading(false) }
  }, [sucursalid, turnoid])

  useEffect(() => {
    setLoading(true); fetchAll()
    if (!sucursalid || !turnoid || (typeof navigator!=='undefined' && !navigator.onLine)) return
    const ch = supabase
      .channel(`cuentasmesero_${sucursalid}_${turnoid}`)
      .on('postgres_changes',
        { event:'*', schema:'public', table:'cuentasmesero', filter:`sucursalid=eq.${sucursalid}` },
        fetchAll
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sucursalid, turnoid, fetchAll])

  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  return { cuentas, loading, error, fromCache, fetch: fetchAll }
}

export async function upsertCuentaMesero(c: CuentaMesero) {
  const { ok, cuenta } = await upsertCuentaMeseroAware(c)
  if (!ok) throw new Error('No se pudo guardar la cuenta de mesero (cola offline)')
  return cuenta ?? c
}
/************ CUENTAS COMENSAL ************/
export function useFetchCuentasComensal(sucursalid?: string, turnoid?: string) {
  const [cuentas, setCuentas] = useState<CuentaComensal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!sucursalid || !turnoid) { setCuentas([]); setFromCache(true); setLoading(false); return }
    setError(null)
    try {
      const res = await fetchCuentasComensalAware(sucursalid, turnoid)
      setCuentas(res.data); setFromCache(res.fromCache)
    } catch (e:any) { setError(e?.message ?? 'Error al cargar cuentas (comensal)') }
    finally { setLoading(false) }
  }, [sucursalid, turnoid])

  useEffect(() => {
    setLoading(true); fetchAll()
    if (!sucursalid || !turnoid || (typeof navigator!=='undefined' && !navigator.onLine)) return
    const ch = supabase
      .channel(`cuentascomensal_${sucursalid}_${turnoid}`)
      .on('postgres_changes',
        { event:'*', schema:'public', table:'cuentascomensal', filter:`sucursalid=eq.${sucursalid}` },
        fetchAll
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sucursalid, turnoid, fetchAll])

  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  return { cuentas, loading, error, fromCache, fetch: fetchAll }
}

export async function upsertCuentaComensal(c: CuentaComensal) {
  const { ok, cuenta } = await upsertCuentaComensalAware(c)
  if (!ok) throw new Error('No se pudo guardar la cuenta de comensal (cola offline)')
  return cuenta ?? c
}

/************ CONCEPTOS ************/
type ConceptoHookFilters = {
  cuentameseroid?: string | null
  cuentacomensalid?: string | null
}

export function useFetchConceptos(
  sucursalid?: string,
  turnoid?: string,
  filters: ConceptoHookFilters = {}
) {
  const [conceptos, setConceptos] = useState<ConceptoCuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!sucursalid || !turnoid) { setConceptos([]); setFromCache(true); setLoading(false); return }
    setError(null)
    try {
      const res = await fetchConceptosAware({ sucursalid, turnoid, ...filters })
      setConceptos(res.data); setFromCache(res.fromCache)
    } catch (e:any) { setError(e?.message ?? 'Error al cargar conceptos') }
    finally { setLoading(false) }
  }, [sucursalid, turnoid, filters.cuentameseroid, filters.cuentacomensalid])

  useEffect(() => {
    setLoading(true); fetchAll()
    if (!sucursalid || !turnoid || (typeof navigator!=='undefined' && !navigator.onLine)) return
    const ch = supabase
      .channel(`conceptoscuentas_${sucursalid}_${turnoid}`)
      .on('postgres_changes',
        { event:'*', schema:'public', table:'conceptoscuentas', filter:`sucursalid=eq.${sucursalid}` },
        fetchAll
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sucursalid, turnoid, fetchAll])

  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  return { conceptos, loading, error, fromCache, fetch: fetchAll }
}

export async function upsertConcepto(c: ConceptoCuenta) {
  const { ok, concepto } = await upsertConceptoAware(c)
  if (!ok) throw new Error('No se pudo guardar el concepto (cola offline)')
  return concepto ?? c
}
export async function deleteConcepto(id: string) {
  const { ok } = await deleteConceptoAware(id)
  if (!ok) throw new Error('No se pudo eliminar el concepto (cola offline)')
}


export function useFetchPagos(sucursalid?: string, turnoid?: string, cuentaId?: string) {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchAll = useCallback(async () => {
    // Sin llaves suficientes, devolvemos vacío (modo estable)
    if (!cuentaId && !turnoid) {
      setPagos([])
      setFromCache(true)
      setLoading(false)
      return
    }

    setError(null)
    try {
      const res = await (cuentaId
        ? fetchPagosAware({ cuentaId })
        : fetchPagosAware({ turnoid: turnoid as string, sucursalid })
      )
      setPagos(res.data)
      setFromCache(res.fromCache)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar pagos')
    } finally {
      setLoading(false)
    }
  }, [sucursalid, turnoid, cuentaId])

  // carga inicial
  useEffect(() => {
    setLoading(true)
    fetchAll()
  }, [fetchAll])

  // realtime (si hay red)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    let filter: string | undefined
    if (cuentaId) filter = `cuentaId=eq.${cuentaId}`
    else if (sucursalid) filter = `sucursalid=eq.${sucursalid}`

    const chName = `pagos_${sucursalid ?? 'all'}_${turnoid ?? 'all'}_${cuentaId ?? 'all'}`
    const ch = supabase
      .channel(chName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pagos', ...(filter ? { filter } : {}) },
        () => fetchAll()
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [sucursalid, turnoid, cuentaId, fetchAll])

  // refresh al volver online
  useEffect(() => {
    const onOnline = () => fetchAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [fetchAll])

  // totales útiles (ignorando cancelados)
  const totalConfirmado = useMemo(
    () => pagos.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + (p.total || 0), 0),
    [pagos]
  )
  const totalPendiente = useMemo(
    () => pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.total || 0), 0),
    [pagos]
  )

  return { pagos, totalConfirmado, totalPendiente, loading, error, fromCache, fetch: fetchAll }
}

/** Upsert de pago (offline-first). */
export async function upsertPago(
  pago: Omit<Pago, 'id' | 'fecha' | 'estado'> & { id?: string; fecha?: string; estado?: Pago['estado'] }
): Promise<Pago> {
  const { ok, pago: saved } = await upsertPagoAware(pago)
  if (!ok) throw new Error('No se pudo guardar el pago (cola offline)')
  return saved ?? (pago as Pago)
}

/**
 * Helper de “cobro” end-to-end:
 * - Crea 1 pago por cada línea (método) que venga de tu CobroModal.
 * - Marca conceptos como "cobrado" según `seleccion`.
 */
export async function registrarCobro(params: {
  turnoid: string
  sucursalid: string
  cuentaId: string
  mesaid?: string | null
  userid?: string
  lineas: { method: MetodoPago; amount: number; tip?: number }[]
  seleccion: SeleccionPorConcepto
  conceptosSource: ConceptoCuenta[]
}) {
  const {
    turnoid, sucursalid, cuentaId, mesaid = null, userid,
    lineas, seleccion, conceptosSource,
  } = params

  // 1) Construye snapshot de productos pagados (opcional, útil para auditoría)
  const productos = Object.entries(seleccion)
    .filter(([, cant]) => (cant ?? 0) > 0)
    .map(([conceptoId, cantidad]) => {
      const c = conceptosSource.find(x => x.id === conceptoId)
      const unit = (c?.importe ?? ((c?.preciounitario ?? 0) - (c?.descuento ?? 0))) || 0
      return {
        conceptoId,
        cantidad: cantidad || 0,
        unit,
        total: unit * (cantidad || 0),
        nombreCliente: c?.nombrecliente ?? undefined,
      }
    })

  // 2) Crea pagos por cada línea > 0
  for (const l of lineas.filter(x => (x.amount ?? 0) > 0)) {
    const base = buildPagoLine({
      turnoid,
      cuentaId,
      mesaid,
      sucursalid,
      userid,
      metodo: l.method,
      total: l.amount,
      tip: l.tip ?? 0,
      productos,
    })
    await upsertPagoAware(base) // offline-first
  }

  // 3) Marca conceptos como "cobrado" (solo los seleccionados)
  await markConceptosCobradosAware(conceptosSource, seleccion)
}
