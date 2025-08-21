import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Typography, Divider, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Button, Tab, Tabs, Chip, Stack
} from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

import Spinner from '../../components/general/Spinner'

import {
  useFetchMesas,
  useFetchTurno,
  useFetchCuentasMesero,
  useFetchCuentasComensal,
  useFetchConceptos,
  upsertCuentaComensal,
  upsertConcepto,
  deleteConcepto,
  useFetchPagos,
  // Si tu hook real se llama distinto, cámbialo aquí
  useFetchMenu,
} from '../../config/hooks/useFetchFunctions'

import type {
  Mesa,
  TurnoActivo,
  CuentaComensal,
  ConceptoCuenta,
  ItemMenu,
} from '../../config/types'

import { groupMenu } from '../../config/hooks/useUtilsFunctions'

import MesaCuentaTabPanel from '../../components/turno/MesaCuentaPanelTab'
import MisPedidosTabPanelComensal from '../../components/turno/MisPedidosTabPanelComensal'
import MenuTabPanelComensal from '../../components/turno/MenuTabComensalPanel'

/* ================= helpers ================= */
function getAliasStorageKey(mesaId: string) {
  return `alias_comensal_${mesaId}`
}
function bindKey(turnoId: string, mesaId: string) {
  return `cc_bind_${turnoId}_${mesaId}`
}
const unitImporte = (c: ConceptoCuenta) => {
  const base = (c.preciounitario ?? 0) - (c.descuento ?? 0)
  const v = c.importe ?? base
  return Number.isFinite(v) ? Number(v) : 0
}

/* ======================================================= */
const PedidoMesaPage: React.FC = () => {
  const { mesaId } = useParams<{ mesaId: string }>()
  const { mesas } = useFetchMesas()

  const [alias, setAlias] = useState('')
  const [showAliasDialog, setShowAliasDialog] = useState(false)
  const [tab, setTab] = useState(0)

  // Evita prompt nativo de instalación PWA
  useEffect(() => {
    const handler = (e: any) => e.preventDefault()
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  // Mesa + sucursal
  const mesa: Mesa | null = useMemo(() => {
    if (!mesaId || !Array.isArray(mesas)) return null
    return mesas.find(m => m.id === mesaId) ?? null
  }, [mesas, mesaId])
  const sucursalid = mesa?.sucursalid || ''

  // Turno activo de la sucursal
  const { turnos, loading: loadingTurnos } = useFetchTurno(sucursalid)
  const turnoActivo: TurnoActivo | null = useMemo(
    () => (turnos ?? []).find(t => t.abierto) ?? null,
    [turnos]
  )

  // Menú (acepta {menu} o {menuItems} desde el hook)
  const menuResp: any = useFetchMenu?.()
  const menuItems: ItemMenu[] = (menuResp?.menu ?? menuResp?.menuItems ?? []) as ItemMenu[]
  const loadingMenu: boolean = Boolean(menuResp?.loading)

  // Cuentas (mesero / comensal)
  const {
    cuentas: cuentasMesero,
    loading: loadingCM,
  } = useFetchCuentasMesero(sucursalid, turnoActivo?.id)

  const {
    cuentas: cuentasComensal,
    loading: loadingCC,
    fromCache: ccFromCache,
  } = useFetchCuentasComensal(sucursalid, turnoActivo?.id)

  // Conceptos del turno (los filtramos por mesa en cliente)
  const {
    conceptos: conceptosTurno,
    loading: loadingConceptos,
  } = useFetchConceptos(sucursalid, turnoActivo?.id)

  // Pagos del turno (solo lectura; se usa para marcar 0/1 pagado por concepto)
  const { pagos } = useFetchPagos(sucursalid, turnoActivo?.id)
  const pagosPorConcepto: Record<string, number> = useMemo(() => {
    const idx: Record<string, number> = {}
    ;(pagos ?? []).forEach(p => {
      p.detalles?.productos?.forEach((prod: any) => {
        const id = prod?.conceptoId
        if (!id) return
        const qty = Number(prod?.cantidad ?? 0)
        idx[id] = (idx[id] || 0) + (Number.isFinite(qty) ? qty : 0)
      })
    })
    return idx
  }, [pagos])

  // Estado local: cuenta comensal + banner
  const [miCuentaComensal, setMiCuentaComensal] = useState<CuentaComensal | null>(null)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const didSyncRef = useRef(false)

  // Alias dialog
  useEffect(() => {
    if (!mesaId) return
    const key = getAliasStorageKey(mesaId)
    const saved = localStorage.getItem(key)
    if (!saved) {
      setShowAliasDialog(true)
    } else {
      setAlias(saved)
    }
  }, [mesaId])

  // Permite re-sincronizar si cambia mesa o turno
  useEffect(() => {
    didSyncRef.current = false
  }, [mesa?.id, turnoActivo?.id])

  // Sincroniza: reusa o crea cuenta comensal; asocia a cuenta mesero si existe
  useEffect(() => {
    const run = async () => {
      if (!mesa || !turnoActivo?.id) return
      if (loadingCC || loadingCM) return
      if (didSyncRef.current) return
      if (typeof navigator !== 'undefined' && navigator.onLine && ccFromCache) {
        // esperamos a snapshot real para no duplicar
        return
      }
      didSyncRef.current = true
      setSyncing(true)

      const k = bindKey(turnoActivo.id, mesa.id)
      const boundId = localStorage.getItem(k)

      // 1) Usa binding previo si existe y está en la lista
      if (boundId) {
        let ccKnown = (cuentasComensal ?? []).find(c => c.id === boundId) || null
        // si no existe o no está abierta, limpiamos binding (y alias, para tablet compartida)
        if (!ccKnown || ccKnown.estado !== 'abierta') {
          localStorage.removeItem(k)
          const aliasKey = getAliasStorageKey(mesa.id)
          localStorage.removeItem(aliasKey)
          setAlias('')
          setShowAliasDialog(true)
        } else {
          const cmAbierta = (cuentasMesero ?? []).find(
            c => c.estado === 'abierta' && c.mesaid === mesa.id && c.turnoid === turnoActivo.id
          )
          if (cmAbierta && ccKnown.cuentameseroid !== cmAbierta.id) {
            const updated: CuentaComensal = {
              ...ccKnown,
              cuentameseroid: cmAbierta.id,
              updated_at: new Date().toISOString() as any,
              version: (ccKnown.version ?? 0) + 1,
            }
            try { await upsertCuentaComensal(updated); ccKnown = updated } catch { ccKnown = updated }
          }
          setMiCuentaComensal(ccKnown)
          setSyncMsg(cmAbierta
            ? `Tu cuenta comensal está vinculada a la cuenta del mesero #${cmAbierta.id.slice(0,6)}.`
            : 'Tu cuenta comensal está lista (aún sin cuenta del mesero).'
          )
          setSyncing(false)
          return
        }
      }

      // 2) Busca abierta existente por turno+mesa
      let cc = (cuentasComensal ?? []).find(
        c => c.estado === 'abierta' && c.mesaid === mesa.id && c.turnoid === turnoActivo.id
      ) || null

      // 3) Si no hay, crea
      if (!cc) {
        const nueva: CuentaComensal = {
          id: crypto.randomUUID(),
          sucursalid,
          turnoid: turnoActivo.id,
          mesaid: mesa.id,
          cuentameseroid: null,
          estado: 'abierta',
          fechainicio: new Date().toISOString(),
          version: 1,
        }
        try { await upsertCuentaComensal(nueva) } catch {}
        cc = nueva
      }

      // 4) Vincula a cuenta mesero abierta si existe
      const cmAbierta = (cuentasMesero ?? []).find(
        c => c.estado === 'abierta' && c.mesaid === mesa.id && c.turnoid === turnoActivo.id
      )
      if (cmAbierta && cc.cuentameseroid !== cmAbierta.id) {
        const updated: CuentaComensal = {
          ...cc,
          cuentameseroid: cmAbierta.id,
          updated_at: new Date().toISOString() as any,
          version: (cc.version ?? 0) + 1,
        }
        try { await upsertCuentaComensal(updated); cc = updated } catch { cc = updated }
      }

      localStorage.setItem(k, cc.id)
      setMiCuentaComensal(cc)
      setSyncMsg(cmAbierta
        ? `Tu cuenta comensal está vinculada a la cuenta del mesero #${cmAbierta.id.slice(0,6)}.`
        : 'Tu cuenta comensal está lista (aún sin cuenta del mesero).'
      )
      setSyncing(false)
    }

    run()
  }, [
    mesa, sucursalid, turnoActivo?.id,
    cuentasComensal, cuentasMesero,
    loadingCC, loadingCM, ccFromCache
  ])

  /* ============== Derivados para los tabs ============== */
  const conceptosMesa = useMemo(
    () => (conceptosTurno ?? []).filter(c => c.mesaid === mesa?.id),
    [conceptosTurno, mesa?.id]
  )

  // Mis filas: exigir mi cuentacomensalid (evita arrastrar pedidos viejos con mismo alias)
  const misFilas = useMemo(
    () => (conceptosMesa ?? []).filter(
      c => c.origen === 'comensal' &&
           c.cuentacomensalid === miCuentaComensal?.id &&
           c.nombrecliente === alias
    ),
    [conceptosMesa, alias, miCuentaComensal?.id]
  )

  // “Pendientes” = estado 'pendiente'
  const pedidosPendientesComensal = useMemo(
    () => misFilas.filter(c => c.estado === 'pendiente'),
    [misFilas]
  )

  // Pagados (por estado cobrado o porque aparece pagado en pagos)
  const conceptosPagados = useMemo(
    () => misFilas.filter(c => (pagosPorConcepto[c.id] ?? 0) >= 1 || c.estado === 'cobrado'),
    [misFilas, pagosPorConcepto]
  )

  // Pendiente por pagar (mis filas no pagadas del todo)
  const conceptosPendientes = useMemo(
    () => misFilas.filter(c => !((pagosPorConcepto[c.id] ?? 0) >= 1 || c.estado === 'cobrado')),
    [misFilas, pagosPorConcepto]
  )

  const totalCuentaMesa = useMemo(
    () => (conceptosMesa ?? [])
      .filter(c => c.estado !== 'cancelado')
      .reduce((sum, c) => sum + unitImporte(c), 0),
    [conceptosMesa]
  )

  // NUEVO: total visible en el badge (activos = no cancelados)
  const conteoMisPedidos = useMemo(
    () => misFilas.filter(c => c.estado !== 'cancelado').length,
    [misFilas]
  )

  // Menú agrupado para el tab “Menú”
  const groupedMenu = useMemo(
    () => groupMenu(menuItems ?? [], { fallbackCategory: 'General', fallbackSubcategory: '—' }),
    [menuItems]
  )

  /* ============== Acciones ============== */
  const handleAgregarDesdeMenu = async (item: ItemMenu) => {
    if (!mesa || !turnoActivo?.id || !sucursalid) return
    if (!alias) { setShowAliasDialog(true); return }
    if (!miCuentaComensal?.id) return

    const price = Number(item.precioVenta ?? 0)
    if (!Number.isFinite(price) || price <= 0) return

    const row: ConceptoCuenta = {
      id: crypto.randomUUID(),
      sucursalid,
      turnoid: turnoActivo.id,
      mesaid: mesa.id,
      cuentacomensalid: miCuentaComensal.id,
      cuentameseroid: null,
      itemmenuid: item.id,
      preciounitario: price,
      descuento: 0,
      importe: price,
      nombrecliente: alias,
      notas: null,
      accepted_by: null,
      canceled_by: null,
      estado: 'pendiente',
      origen: 'comensal',
      created_at: new Date().toISOString(),
      version: 1,
    }
    try { await upsertConcepto(row) } catch { /* offline ok */ }
  }

  const handleEliminarPedido = async (id: string) => {
    try { await deleteConcepto(id) } catch { /* offline ok */ }
  }

  // +1: modelo 1-fila=1-unidad → duplicar fila base
  const handleIncreasePedido = async (id: string) => {
    const base = misFilas.find(f => f.id === id)
    if (!base || !turnoActivo?.id || !mesa || !sucursalid) return
    const row: ConceptoCuenta = {
      ...base,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: undefined,
      version: 1,
      estado: 'pendiente',
    }
    try { await upsertConcepto(row) } catch {}
  }

  // -1: eliminar esa fila concreta
  const handleDecreasePedido = async (id: string) => {
    try { await deleteConcepto(id) } catch {}
  }

  /* ============== Loaders ============== */
  if (!mesas) return <Spinner open />
  if (loadingTurnos || loadingConceptos || loadingMenu) return <Spinner open />

  if (!mesa) {
    return (
      <Box p={4} textAlign="center">
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon fontSize="large" />}
          sx={{ bgcolor: '#ffebee', color: 'error.dark', boxShadow: 3, borderRadius: 2, p: 4, maxWidth: 480, mx: 'auto' }}
        >
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Mesa no encontrada
          </Typography>
          <Typography>Verifica el código QR o avisa al mesero.</Typography>
        </Alert>
      </Box>
    )
  }

  if (!turnoActivo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon fontSize="large" />}
          sx={{ bgcolor: '#ffebee', color: 'error.dark', boxShadow: 3, borderRadius: 2, p: 4, maxWidth: 480 }}
        >
          <Typography variant="h5" fontWeight={800} gutterBottom>
            No hay turno abierto
          </Typography>
          <Typography>Por favor, avisa al mesero para que inicie un turno.</Typography>
        </Alert>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 3 },
        maxWidth: 1100,
        mx: 'auto',
        bgcolor: 'background.paper',
        borderRadius: { xs: 1, sm: 3 },
        boxShadow: 7,
        minHeight: { xs: '90vh', sm: '80vh' },
        mt: { xs: 2, sm: 4 },
      }}
    >
      {/* Header */}
      <Typography variant="h4" align="center" sx={{ mb: 0.5, fontWeight: 800 }}>
        Mesa {mesa.nomesa}
      </Typography>
      <Typography align="center" color="text.secondary">
        Área: {mesa.area || '-'} | Comensales: {mesa.comensales ?? '-'}
      </Typography>

      {/* Tú eres: alias */}
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ my: 1 }}>
        <Typography variant="body2" color="text.secondary">Tú eres:</Typography>
        <Chip label={alias || '—'} size="small" color="primary" sx={{ fontWeight: 700 }} />
        <Button size="small" onClick={() => setShowAliasDialog(true)}>Cambiar nombre</Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Banner estado cuenta comensal */}
      {!!syncMsg && (
        <Alert severity="info" sx={{ mb: 2, fontWeight: 600 }}>
          {syncMsg} {syncing ? ' (sincronizando...)' : ''}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered variant="fullWidth" sx={{ mb: 2 }}>
        <Tab label="Menú" sx={{ fontWeight: 700 }} />
        <Tab label={`Mis pedidos · ${alias || 'tú'} (${conteoMisPedidos})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Cuenta Mesa (${conceptosMesa.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {tab === 0 && (
        <MenuTabPanelComensal
          grouped={groupedMenu}
          handleAgregarConceptoComensal={handleAgregarDesdeMenu}
        />
      )}

      {tab === 1 && (
        <MisPedidosTabPanelComensal
          pedidosPendientesComensal={pedidosPendientesComensal}
          conceptosPagados={conceptosPagados}
          conceptosPendientes={conceptosPendientes}
          pagosPorConcepto={pagosPorConcepto}
          menu={menuItems as ItemMenu[]}
          totalCuenta={totalCuentaMesa}
          onEliminarPedido={handleEliminarPedido}
          onIncreasePedido={handleIncreasePedido}
          onDecreasePedido={handleDecreasePedido}
        />
      )}

      {tab === 2 && (
        <MesaCuentaTabPanel
          conceptosMesa={conceptosMesa}
          menu={menuItems as ItemMenu[]}
          pagosPorConcepto={pagosPorConcepto}
        />
      )}

      {/* Dialog Alias */}
      <Dialog open={showAliasDialog} maxWidth="xs" fullWidth>
        <DialogTitle>¿Cómo te quieres llamar?</DialogTitle>
        <DialogContent>
          <TextField
            label="Tu nombre o alias"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 32 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              if (!alias || !mesaId) return
              const key = getAliasStorageKey(mesaId)
              localStorage.setItem(key, alias)
              setShowAliasDialog(false)
            }}
            disabled={!alias}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PedidoMesaPage
