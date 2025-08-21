// src/components/turno/TurnoActivoComponent.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Card,
  CardContent,
  Button,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import AddIcon from '@mui/icons-material/Add'
import type {
  ItemMenu,
  Mesa,
  TurnoActivo,
  CuentaMesero,
  CuentaComensal,
  ConceptoCuenta,
} from '../../config/types'

// Modal
import MesaActivaModal from './MesaActivaModal'
import {
  useFetchCuentasMesero,
  useFetchCuentasComensal,
  useFetchConceptos,
  upsertCuentaMesero,
} from '../../config/hooks/useFetchFunctions'

// --- Helpers de formato ---
function formatTime(dateIso: string) {
  const d = new Date(dateIso)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  const s = String(seconds).padStart(2, '0')
  if (days > 0) return `${days}d ${h}:${m}:${s}`
  return `${h}:${m}:${s}`
}

const SummaryTile: React.FC<{
  title: string
  value: string | number
  icon?: React.ReactNode
  hint?: string
}> = ({ title, value, icon, hint }) => (
  <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        {icon}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      <Typography variant="h5" fontWeight={900}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
)

const TurnoActivoComponent: React.FC<{
  sucursalid: string
  turnoid: string
  turnoActivo: TurnoActivo
  mesas: Mesa[]
  menu: ItemMenu[]
  userid: string
}> = ({ sucursalid, turnoid, turnoActivo, mesas, menu, userid }) => {
  // Tiempo transcurrido en vivo
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedMs = useMemo(
    () => Math.max(0, now - new Date(turnoActivo.fechainicio).getTime()),
    [now, turnoActivo.fechainicio]
  )

  // ====== Datos tiempo real (hooks) ======
  const { cuentas: cuentasMesero } = useFetchCuentasMesero(sucursalid, turnoid)
  const { cuentas: cuentasComensal } = useFetchCuentasComensal(sucursalid, turnoid)
  const { conceptos } = useFetchConceptos(sucursalid, turnoid)

  // ====== Derivados para KPIs ======
  const cuentasAbiertas =
    (cuentasMesero?.filter(c => c.estado === 'abierta').length ?? 0) +
    (cuentasComensal?.filter(c => c.estado === 'abierta').length ?? 0)

  const pedidosPendientes =
    conceptos?.filter(
      c => c.estado === 'pendiente' && c.sucursalid === sucursalid && c.turnoid === turnoid
    ).length ?? 0

  const ventasBrutas = useMemo(() => {
    const valid = new Set<ConceptoCuenta['estado']>([
      'pendiente',
      'aceptado',
      'en_preparacion',
      'listo',
      'por_entregar',
      'entregado',
      'cobrado',
    ])
    return (conceptos ?? [])
      .filter(c => c.turnoid === turnoid && c.sucursalid === sucursalid && valid.has(c.estado))
      .reduce((sum, c) => sum + (c.importe ?? c.preciounitario - (c.descuento ?? 0)), 0)
  }, [conceptos, sucursalid, turnoid])

  const entregasPendientes =
    conceptos?.filter(
      c =>
        c.turnoid === turnoid &&
        c.sucursalid === sucursalid &&
        (c.estado === 'listo' || c.estado === 'por_entregar')
    ).length ?? 0

  // ====== Lógica de "swap" Comensal ↔︎ Mesero ======
  const isAceptadoNoCancelado = (e: ConceptoCuenta['estado']) =>
    e !== 'pendiente' && e !== 'cancelado'

  const cuentaMeseroPorComensal = (ccId: string) =>
    (cuentasMesero ?? []).find(cm => cm.estado === 'abierta' && cm.cuentacomensalid === ccId) || null

  const tieneAceptadosEnCuenta = (cuentaId: string) =>
    (conceptos ?? []).some(k => k.cuentameseroid === cuentaId && isAceptadoNoCancelado(k.estado))

  // Comensales que deben seguir mostrando card de comensal:
  //  - sin cuenta mesero, o
  //  - con cuenta mesero pero aún sin conceptos aceptados/asignados.
  const comensalesVisiblesComoComensal = useMemo(() => {
    const abiertas = (cuentasComensal ?? []).filter(cc => cc.estado === 'abierta')
    return abiertas.filter(cc => {
      const cm = cuentaMeseroPorComensal(cc.id)
      if (!cm) return true
      return !tieneAceptadosEnCuenta(cm.id)
    })
  }, [cuentasComensal, cuentasMesero, conceptos])

  // Cuentas mesero a mostrar:
  //  - todas las abiertas sin vínculo a comensal, o
  //  - las abiertas con vínculo que ya tienen algún concepto aceptado/asignado.
  const cuentasMeseroVisibles = useMemo(
    () =>
      (cuentasMesero ?? []).filter(c => {
        if (c.estado !== 'abierta') return false
        if (!c.cuentacomensalid) return true
        return tieneAceptadosEnCuenta(c.id)
      }),
    [cuentasMesero, conceptos]
  )

  // ====== Acciones: crear/abrir cuentas ======
  const [openMesaDialog, setOpenMesaDialog] = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaMesero | null>(null)

  const handleNuevaCuenta = async () => {
    const nueva: CuentaMesero = {
      id: crypto.randomUUID(),
      sucursalid,
      turnoid,
      mesaid: null,
      userid,
      cuentacomensalid: null,
      fechainicio: new Date().toISOString(),
      tipo: 'piso',
      estado: 'abierta',
      totalbruto: 0,
      totalpagado: 0,
      version: 1,
    }
    const saved = await upsertCuentaMesero(nueva).catch(() => nueva)
    setCuentaSeleccionada(saved)
    setOpenMesaDialog(true)
  }

  // Si ya existe una cuenta mesero para el comensal → abrirla; si no, crearla.
  const handleAbrirOCrearDesdeComensal = async (cc: CuentaComensal) => {
    const existente = cuentaMeseroPorComensal(cc.id)
    if (existente) {
      setCuentaSeleccionada(existente)
      setOpenMesaDialog(true)
      return
    }
    const nueva: CuentaMesero = {
      id: crypto.randomUUID(),
      sucursalid,
      turnoid,
      mesaid: cc.mesaid ?? null,
      userid,
      cuentacomensalid: cc.id,
      fechainicio: new Date().toISOString(),
      tipo: cc.mesaid ? 'piso' : 'para_llevar',
      estado: 'abierta',
      totalbruto: 0,
      totalpagado: 0,
      version: 1,
    }
    const saved = await upsertCuentaMesero(nueva).catch(() => nueva)
    setCuentaSeleccionada(saved)
    setOpenMesaDialog(true)
  }

  // ====== Utils UI ======
  const nombreMesa = (mesaid: string | null | undefined) =>
    mesaid ? mesas.find(m => m.id === mesaid)?.nomesa ?? '—' : 'Sin mesa'

  const pendientesSinCuenta = (cc: CuentaComensal) =>
    (conceptos ?? []).filter(
      k =>
        k.turnoid === turnoid &&
        k.sucursalid === sucursalid &&
        k.cuentacomensalid === cc.id &&
        !k.cuentameseroid && // sin asignar a mesero
        k.estado === 'pendiente'
    ).length

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={4}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          background: 'linear-gradient(100deg, #E3F2FD 0%, #FFFFFF 60%)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              label={turnoActivo.abierto ? 'Turno ABIERTO' : 'Turno CERRADO'}
              color={turnoActivo.abierto ? 'success' : 'default'}
              sx={{ fontWeight: 800 }}
            />
            <Typography variant="h6" fontWeight={900}>
              Sucursal #{sucursalid.slice(0, 6)} — Turno {turnoid.slice(0, 6)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2">
                <b>Apertura:</b> {formatTime(turnoActivo.fechainicio)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2">
                <b>Transcurrido:</b> {formatElapsed(elapsedMs)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* KPI mini-dashboard */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <SummaryTile
            title="Cuentas abiertas"
            value={cuentasAbiertas}
            icon={<ReceiptLongIcon fontSize="small" />}
            hint="Mesero + Comensal"
          />
        </Box>
        <Box sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <SummaryTile
            title="Pedidos pendientes"
            value={pedidosPendientes}
            icon={<RestaurantMenuIcon fontSize="small" />}
            hint="A preparar / en curso"
          />
        </Box>
        <Box sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <SummaryTile
            title="Ventas brutas"
            value={`$ ${ventasBrutas.toFixed(2)}`}
            icon={<PointOfSaleIcon fontSize="small" />}
            hint="Antes de descuentos/propinas"
          />
        </Box>
        <Box sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <SummaryTile
            title="Entregas pendientes"
            value={entregasPendientes}
            icon={<AssignmentTurnedInIcon fontSize="small" />}
            hint="Listo para entregar"
          />
        </Box>
      </Box>

      {/* Botones de acción */}
      <Stack direction="row" spacing={2} mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNuevaCuenta}
          sx={{ fontWeight: 800, borderRadius: 2 }}
        >
          Nueva cuenta
        </Button>
      </Stack>

      {/* Listado de cards: comensal (sin/with cuenta sin aceptados) + cuentas mesero */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {/* Cards "Pedido (comensal)" visibles hasta que haya aceptados en su cuenta */}
        {comensalesVisiblesComoComensal.map((cc) => {
          const cm = cuentaMeseroPorComensal(cc.id)
          const sinMesa = !cc.mesaid
          const pendientes = pendientesSinCuenta(cc)
          const cuentaCreadaSinAceptados = !!cm && !tieneAceptadosEnCuenta(cm.id)

          return (
            <Card
              key={cc.id}
              elevation={3}
              onClick={() => handleAbrirOCrearDesdeComensal(cc)}
              sx={{
                borderRadius: 3,
                p: 2,
                minWidth: 260,
                maxWidth: 320,
                cursor: 'pointer',
                bgcolor: 'warning.light',
                transition: '0.15s',
                '&:hover': { boxShadow: 6, bgcolor: 'warning.main' },
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Pedido (comensal)
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight={800}>
                  Mesa: {nombreMesa(cc.mesaid)}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {!cm && <Chip size="small" color="warning" label="SIN CUENTA" sx={{ fontWeight: 800 }} />}
                  {cuentaCreadaSinAceptados && (
                    <Chip size="small" color="info" variant="outlined" label="CUENTA CREADA" sx={{ fontWeight: 800 }} />
                  )}
                  {sinMesa && (
                    <Chip size="small" variant="outlined" label="SIN MESA" sx={{ fontWeight: 700 }} />
                  )}
                </Stack>
              </Stack>

              <Typography color="text.secondary">Pendientes: {pendientes}</Typography>
            </Card>
          )
        })}

        {/* Cards de cuentas abiertas del mesero (ya con aceptados o sin vínculo a comensal) */}
        {cuentasMeseroVisibles.map(c => {
          const total = (conceptos ?? [])
            .filter(k => k.cuentameseroid === c.id && k.estado !== 'cancelado')
            .reduce((s, k) => s + (k.importe ?? k.preciounitario - (k.descuento ?? 0)), 0)

          const pendientesDeMesa =
            (conceptos ?? []).filter(
              k =>
                k.mesaid === c.mesaid &&
                k.origen === 'comensal' &&
                k.estado === 'pendiente' &&
                !k.cuentameseroid
            ).length

          return (
            <Card
              key={c.id}
              elevation={2}
              onClick={() => {
                setCuentaSeleccionada(c)
                setOpenMesaDialog(true)
              }}
              sx={{
                borderRadius: 3,
                p: 2,
                minWidth: 260,
                maxWidth: 320,
                cursor: 'pointer',
                '&:hover': { boxShadow: 6 },
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Cuenta abierta
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {c.tipo === 'piso'
                  ? `Mesa: ${nombreMesa(c.mesaid)}`
                  : `Para llevar${c.nomesa ? `: ${c.nomesa}` : ''}`}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <Chip size="small" label={`$${total.toFixed(2)}`} />
                {pendientesDeMesa > 0 && (
                  <Chip size="small" color="warning" label={`${pendientesDeMesa} pend.`} />
                )}
              </Stack>
            </Card>
          )
        })}
      </Box>

      {/* Modal */}
      <MesaActivaModal
        open={openMesaDialog}
        onClose={() => {
          setOpenMesaDialog(false)
          setCuentaSeleccionada(null)
        }}
        sucursalid={sucursalid}
        turnoid={turnoid}
        userid={userid}
        mesas={mesas}
        menuItems={menu}
        cuenta={cuentaSeleccionada}
        setCuenta={setCuentaSeleccionada}
        cuentasMesero={cuentasMesero}
        cuentasComensal={cuentasComensal}
        conceptos={conceptos}
      />
    </Box>
  )
}

export default TurnoActivoComponent
