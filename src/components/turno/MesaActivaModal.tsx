// src/components/turno/MesaActivaModal.tsx
import React, { useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, IconButton, Divider, Chip, Button,
  FormControl, FormControlLabel, RadioGroup, Radio,
  InputLabel, Select, MenuItem, TextField, Card, CardContent
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'

import type {
  ItemMenu, Mesa, CuentaMesero, CuentaComensal, ConceptoCuenta, CuentaTipo, EstadoConcepto
} from '../../config/types'

import {
  upsertCuentaMesero,
  upsertCuentaComensal,
  upsertConcepto,
  useFetchPagos,
  registrarCobro
} from '../../config/hooks/useFetchFunctions'

// NEW: impresión
import { printTicketHTML } from '../../config/utils/printTicket'

// vistas
import PedidosComensalList from './PedidosComensalList'
import PedidoActualList from './PedidoActualList'
import MenuSectionMesero from './MenuSectionMesero'
import { getMesaLabel, groupMenu } from '../../config/hooks/useUtilsFunctions'

// Modal de cobro
import CobroModal from './CobroModal'
import { restanteTrasCobro } from '../../config/hooks/useTurnoHelpers'

type Props = {
  open: boolean
  onClose: () => void
  sucursalid: string
  turnoid: string
  userid: string
  mesas: Mesa[]
  menuItems: ItemMenu[]
  cuenta: CuentaMesero | null
  setCuenta: React.Dispatch<React.SetStateAction<CuentaMesero | null>>
  cuentasMesero: CuentaMesero[]
  cuentasComensal: CuentaComensal[]
  conceptos: ConceptoCuenta[]
}

const EPS = 0.009

const MesaActivaModal: React.FC<Props> = ({
  open, onClose, sucursalid, turnoid, userid,
  mesas, menuItems, cuenta, setCuenta,
  cuentasMesero, cuentasComensal, conceptos
}) => {
  if (!open) return null
  if (!cuenta) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Sin cuenta seleccionada</DialogTitle>
        <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
      </Dialog>
    )
  }

  // ===== Modal de Cobro
  const [openCobro, setOpenCobro] = useState<boolean>(false)
  const onCobrar = () => setOpenCobro(true)

  // Menú agrupado
  const grouped = groupMenu(menuItems, { fallbackCategory: 'General', fallbackSubcategory: '—' })

  // ===== derivados
  const usadas = useMemo(() => {
    const set = new Set<string>()
    cuentasMesero
      .filter(c => c.estado === 'abierta' && c.id !== cuenta.id)
      .forEach(c => c.mesaid && set.add(c.mesaid))
    return set
  }, [cuentasMesero, cuenta.id])


  // Chips con alias detectados por nombrecliente (de cualquier origen)
  const aliasChips = useMemo(() => {
    const s = new Set<string>()
    conceptos
      .filter(c =>
        c.turnoid === turnoid &&
        c.sucursalid === sucursalid &&
        c.mesaid === (cuenta.mesaid ?? null)
      )
      .forEach(c => {
        const a = (c.nombrecliente ?? '').trim()
        if (a) s.add(a)
      })
    return Array.from(s).sort((a,b) => a.localeCompare(b))
  }, [conceptos, turnoid, sucursalid, cuenta.mesaid])

  const pendientesComensal = useMemo(
    () => conceptos.filter(
      c => c.turnoid === turnoid &&
           c.sucursalid === sucursalid &&
           c.mesaid === (cuenta.mesaid ?? null) &&
           c.origen === 'comensal' &&
           c.estado === 'pendiente' &&
           !c.cuentameseroid
    ),
    [conceptos, turnoid, sucursalid, cuenta.mesaid]
  )

  const conceptosDeCuenta = useMemo(
    () => conceptos.filter(
      c => c.turnoid === turnoid &&
           c.sucursalid === sucursalid &&
           c.cuentameseroid === cuenta.id
    ),
    [conceptos, turnoid, sucursalid, cuenta.id]
  )

  // Solo conceptos cobrables (no cancelados ni ya cobrados)
  const conceptosCobrables = useMemo(
    () => conceptosDeCuenta.filter(c => c.estado !== 'cancelado' && c.estado !== 'cobrado'),
    [conceptosDeCuenta]
  )

  const totalCuenta = useMemo(() => {
    return conceptosDeCuenta.reduce((sum, c) => {
      if (c.estado === 'cancelado') return sum
      const unit = c.importe ?? ((c.preciounitario) ?? 0 - (c.descuento ?? 0)) ?? 0
      return sum + unit
    }, 0)
  }, [conceptosDeCuenta])

  // Pagos por cuenta
  const {
    pagos,
    totalConfirmado,
    loading: pagosLoading
  } = useFetchPagos(sucursalid, turnoid, cuenta.id)

  const pagado = totalConfirmado
  const porPagar = Math.max(0, totalCuenta - pagado)
  const tieneArticulos = conceptosDeCuenta.length > 0

  // ===== estado local
  const [aliasNuevo, setAliasNuevo] = useState('')
  const [asignarA, setAsignarA] = useState<string | null>(null)

  // ===== cuenta (setters)
  const setTipo = (t: CuentaTipo) => {
    const updated: CuentaMesero = {
      ...cuenta,
      tipo: t,
      mesaid: t === 'para_llevar' ? null : cuenta.mesaid ?? null,
      nomesa: t === 'para_llevar' ? (cuenta.nomesa ?? '') : undefined,
      updated_at: new Date().toISOString(),
    }
    setCuenta(updated)
    upsertCuentaMesero(updated).catch(() => {})
  }

  const setMesa = (mesaid: string | '') => {
    const mesa = mesas.find(m => m.id === mesaid)
    const label =
      (mesa as any)?.nomesa ??
      (mesa as any)?.nombre ??
      (mesa as any)?.numero ??
      (mesa as any)?.etiqueta ??
      null

    const updated: CuentaMesero = {
      ...cuenta,
      mesaid: mesaid || null,
      nomesa: mesaid ? label ?? undefined : undefined,
      updated_at: new Date().toISOString(),
    }
    setCuenta(updated)
    upsertCuentaMesero(updated).catch(() => {})
  }

  const setNombreLlevar = (nombre: string) => {
    const updated: CuentaMesero = { ...cuenta, nomesa: nombre, updated_at: new Date().toISOString() }
    setCuenta(updated)
    upsertCuentaMesero(updated).catch(() => {})
  }

  const crearComensal = async () => {
    if (!aliasNuevo.trim()) return
    const nuevo: CuentaComensal = {
      id: crypto.randomUUID(),
      sucursalid, turnoid,
      mesaid: cuenta.mesaid ?? null,
      cuentameseroid: cuenta.id,
      nomesa: aliasNuevo.trim(),
      estado: 'abierta',
      fechainicio: new Date().toISOString(),
      version: 1,
    }
    await upsertCuentaComensal(nuevo).catch(() => {})
    setAliasNuevo('')
  }

  // ===== pendientes comensal
  const aceptarConceptoPendiente = async (row: ConceptoCuenta) => {
    const payload: ConceptoCuenta = {
      ...row,
      cuentameseroid: cuenta.id,
      estado: 'aceptado',
      accepted_by: userid,
      updated_at: new Date().toISOString(),
      version: (row.version ?? 0) + 1,
      importe: row.importe ?? (row.preciounitario - (row.descuento ?? 0)),
    }
    await upsertConcepto(payload).catch(() => {})
  }

  const rechazarConceptoPendiente = async (row: ConceptoCuenta) => {
    const payload: ConceptoCuenta = {
      ...row,
      estado: 'cancelado',
      canceled_by: userid,
      updated_at: new Date().toISOString(),
      version: (row.version ?? 0) + 1,
    }
    await upsertConcepto(payload).catch(() => {})
  }

  // ===== menú
  const agregarDesdeMenu = async (
    item: ItemMenu,
    opts?: { nombrecliente?: string | null; estado?: EstadoConcepto }
  ) => {
    const price = Number(item.precioVenta)
    if (!Number.isFinite(price) || price <= 0) {
      console.warn('[agregarDesdeMenu] Precio inválido para item', { item })
      return
    }

    const requireMesaId = (cuenta.tipo === 'piso')
    if (requireMesaId && !cuenta.mesaid) {
      console.warn('[agregarDesdeMenu] La cuenta es "piso" pero no tiene mesaid asignada')
      return
    }

    const estado: EstadoConcepto = opts?.estado ?? 'aceptado'
    const descuento = Number(0)
    const importe = price - descuento

    const nuevo: ConceptoCuenta = {
      id: crypto.randomUUID(),
      sucursalid,
      turnoid,
      mesaid: cuenta.tipo === 'piso' ? (cuenta.mesaid ?? null) : null,
      cuentameseroid: cuenta.id,
      cuentacomensalid: null,
      itemmenuid: item.id,
      preciounitario: price,
      descuento,
      importe,
      nombrecliente: opts?.nombrecliente ?? asignarA ?? undefined,
      notas: null,
      accepted_by: estado === 'aceptado' ? userid : null,
      canceled_by: null,
      estado,
      origen: 'mesero',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    }

    try {
      await upsertConcepto(nuevo)
    } catch (err: any) {
      console.error('[agregarDesdeMenu] ERROR', err)
    }
  }

  // ===== acciones pedido actual
  const onChangeEstado = async (id: string, next: EstadoConcepto) => {
    const row = conceptosDeCuenta.find(c => c.id === id)
    if (!row) return
    await upsertConcepto({ ...row, estado: next, updated_at: new Date().toISOString(), version: (row.version ?? 0) + 1 })
  }

  const onEliminar = async (id: string) => {
    const row = conceptosDeCuenta.find(c => c.id === id)
    if (!row) return
    await upsertConcepto({
      ...row,
      estado: 'cancelado',
      canceled_by: userid,
      updated_at: new Date().toISOString(),
      version: (row.version ?? 0) + 1,
    })
  }

  const onDecrease = async (id: string) => onEliminar(id)

  const onIncrease = async (id: string) => {
    const row = conceptosDeCuenta.find(c => c.id === id)
    if (!row) return
    const item = menuItems.find(m => m.id === row.itemmenuid)
    if (!item) return
    await agregarDesdeMenu(item, { nombrecliente: row.nombrecliente ?? null, estado: row.estado })
  }

  // ===== cuenta: cancelar
  const onCancelarCuenta = async () => {
    await Promise.all(
      conceptosDeCuenta.map(c =>
        upsertConcepto({
          ...c,
          estado: 'cancelado',
          canceled_by: userid,
          updated_at: new Date().toISOString(),
          version: (c.version ?? 0) + 1,
        }).catch(() => {})
      )
    )
    const updated: CuentaMesero = { ...cuenta, estado: 'cancelada', updated_at: new Date().toISOString() }
    setCuenta(updated)
    await upsertCuentaMesero(updated).catch(() => {})
    onClose()
  }

  const tituloMesa =
    cuenta.tipo === 'piso'
      ? `Mesa ${getMesaLabel(mesas, cuenta.mesaid)}`
      : `Para llevar${cuenta.nomesa ? `: ${cuenta.nomesa}` : ''}`

  // ===== Ticket: renglones + imprimir =====
  const conceptosTicket = useMemo(() => (
    conceptosDeCuenta
      .filter(c => c.estado !== 'cancelado')
      .map(c => {
        const nombre = menuItems.find(m => m.id === c.itemmenuid)?.nombre ?? 'Ítem'
        const unit = c.importe ?? ((c.preciounitario ?? 0) - (c.descuento ?? 0))
        return { nombre, qty: 1, unit, total: unit }
      })
  ), [conceptosDeCuenta, menuItems])

  const onImprimir = () => {
    const mesaTxt = cuenta.tipo === 'piso'
      ? (getMesaLabel(mesas, cuenta.mesaid) ?? '')
      : (cuenta.nomesa ?? '')
    const subtotal = conceptosTicket.reduce((s, r) => s + r.total, 0)

    printTicketHTML({
      negocio: { nombre: 'Mi Negocio' }, // <- si tienes datos de sucursal, pásalos aquí
      titulo: 'Cuenta',
      folio: cuenta.id.slice(0,6),
      mesa: mesaTxt || null,
      comensal: null,
      lineas: conceptosTicket,
      subtotal,
      total: subtotal,
      footer: 'Gracias por su visita',
    }, { width: 58 }) // o 80mm si tu rollo es de 80
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg"
      PaperProps={{ sx: { width:{ xs:'98vw', sm:'95vw', md:'80vw', lg:'72vw' }, height:{ xs:'98vh', sm:'92vh', md:'88vh' }, m:0, borderRadius:4, overflow:'hidden', bgcolor:'#f5f7fb' } }}>

      {/* HEADER */}
      <DialogTitle sx={{ display:'flex', alignItems:'center', bgcolor:'primary.main', color:'#fff', pb:1.5, pt:2, px:3 }}>
        <Box flex={1}>
          <Typography fontWeight={700} fontSize={20}>{tituloMesa}</Typography>
          <Typography fontSize={13} color="rgba(255,255,255,0.8)">
            #{cuenta.id.slice(0,6)} · {new Date(cuenta.fechainicio).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={cuenta.estado.toUpperCase()}
          color={cuenta.estado === 'pagada' ? 'success' : cuenta.estado === 'cancelada' ? 'error' : 'warning'}
          sx={{ fontWeight:700, mr:2, px:1.5, bgcolor:'white', color:'primary.main' }}
        />
        <IconButton edge="end" onClick={onClose} color="inherit"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider sx={{ m:0 }}/>

      {/* BODY */}
      <DialogContent dividers sx={{ p:{ xs:1.5, md:3 }, height:{ xs:'72vh', md:'68vh' }, bgcolor:'#f8fafc' }}>
        {/* Tipo + Mesa / Llevar */}
        <Box sx={{ mb:2, px:2, py:1.5, bgcolor:'#fff', borderRadius:3, boxShadow:1 }}>
          <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems="center">
            <FormControl component="fieldset">
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb:1, color:'primary.main' }}>Tipo de cuenta</Typography>
              <RadioGroup row value={cuenta.tipo} onChange={e => setTipo(e.target.value as CuentaTipo)}>
                <FormControlLabel value="piso" control={<Radio color="primary"/>} label="En mesa" />
                <FormControlLabel value="para_llevar" control={<Radio color="primary"/>} label="Para llevar" />
              </RadioGroup>
            </FormControl>

            {cuenta.tipo === 'piso' ? (
              <FormControl fullWidth sx={{ maxWidth: 420 }}>
                <InputLabel>Mesa</InputLabel>
                <Select label="Mesa" value={cuenta.mesaid || ''} onChange={e => setMesa(String(e.target.value))}>
                  <MenuItem value="">Sin asignar</MenuItem>
                  {mesas.map(m => (
                    <MenuItem key={m.id} value={m.id} disabled={usadas.has(m.id)}>{m.nomesa}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Nombre / Cliente" fullWidth sx={{ maxWidth:420 }} value={cuenta.nomesa ?? ''} onChange={e => setNombreLlevar(e.target.value)} />
            )}
          </Stack>
        </Box>

        {/* Comensales + alta rápida */}
        <Box sx={{ mb:2, px:2, py:1.5, bgcolor:'#fff', borderRadius:3, boxShadow:1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontWeight={800}>Comensales:</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Agregar comensal…" value={aliasNuevo} onChange={e => setAliasNuevo(e.target.value)} />
              <Button variant="contained" size="small" startIcon={<AddIcon/>} onClick={crearComensal} disabled={!aliasNuevo.trim()}>Agregar</Button>
            </Stack>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {aliasChips.length === 0 && (
              <Chip color="default" label="Sin comensales" />
            )}

            {aliasChips.map(name => (
              <Chip
                key={name}
                label={name}
                variant={name === (asignarA ?? undefined) ? 'filled' : 'outlined'}
                color={name === (asignarA ?? undefined) ? 'primary' : 'default'}
                onClick={() =>
                  setAsignarA(prev => (prev === name ? null : name))
                }
              />
            ))}

            <Chip
              label="(Asignar a nadie)"
              variant={!asignarA ? 'filled' : 'outlined'}
              color={!asignarA ? 'primary' : 'default'}
              onClick={() => setAsignarA(null)}
            />
          </Stack>

        </Box>

        {/* Pendientes de comensal */}
        <Card sx={{ borderRadius:3, mb:2 }}>
          <CardContent sx={{ py:1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <RestaurantMenuIcon fontSize="small" />
              <Typography fontWeight={800}>Pedidos de comensal (pendientes)</Typography>
            </Stack>
            <PedidosComensalList
              pendientes={pendientesComensal}
              menuItems={menuItems}
              onAceptar={aceptarConceptoPendiente}
              onRechazar={rechazarConceptoPendiente}
            />
          </CardContent>
        </Card>

        {/* 2 columnas */}
        <Box sx={{
          display:{ xs:'block', md:'grid' },
          gridTemplateColumns:'1fr 1fr',
          gap:2,
          alignItems:'stretch'
        }}>
          <MenuSectionMesero
            grouped={grouped}
            onAgregar={item => agregarDesdeMenu(item)}
            showSearch
            searchPlaceholder="Buscar en el menú…"
          />

          <Card sx={{ borderRadius:3 }}>
            <CardContent sx={{ height:'100%' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography fontWeight={800}>Pedido actual</Typography>
                <Typography color="text.secondary">Total: <b>${totalCuenta.toFixed(2)}</b></Typography>
              </Stack>
              <PedidoActualList
                conceptos={conceptosDeCuenta}
                menuItems={menuItems}
                onChangeEstado={onChangeEstado}
                onEliminar={onEliminar}
                onDecrease={onDecrease}
                onIncrease={onIncrease}
              />
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      {/* FOOTER */}
      <DialogActions sx={{
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        px:3, py:2,
        bgcolor:'#fff'
      }}>
        <Box>
          <Typography fontSize={13} color="text.secondary">Total</Typography>
          <Typography fontWeight={800}>${totalCuenta.toFixed(2)}</Typography>
        </Box>
        <Box>
          <Typography fontSize={13} color="text.secondary">Pagado</Typography>
          <Typography fontWeight={800} color="success.main">${pagado.toFixed(2)}</Typography>
        </Box>
        <Box>
          <Typography fontSize={13} color="text.secondary">Restante</Typography>
          <Typography fontWeight={900} color="warning.main">${porPagar.toFixed(2)}</Typography>
        </Box>

        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="outlined" onClick={onImprimir} disabled={conceptosDeCuenta.length === 0}>
            Imprimir ticket
          </Button>
          <Button onClick={onCancelarCuenta} variant="text" color="inherit" disabled={tieneArticulos}>
            Cancelar cuenta
          </Button>
          <Button
            variant="contained"
            onClick={onCobrar}
            disabled={conceptosCobrables.length === 0 || pagosLoading || cuenta.estado !== 'abierta'}
            sx={{ fontWeight: 700, minWidth: 160 }}
          >
            Cobrar
          </Button>
        </Box>
      </DialogActions>

      {/* ===== Modal de Cobro ===== */}
      <CobroModal
        open={openCobro}
        conceptos={conceptosCobrables} // ← solo cobrables
        pagosPrevios={pagos.filter(p => p.cuentaid === cuenta.id)}
        menuItems={menuItems}
        onClose={() => setOpenCobro(false)}
        onConfirm={async (params) => {
          try {
            await registrarCobro({
              turnoid,
              sucursalid,
              cuentaId: cuenta.id,
              mesaid: cuenta.mesaid ?? null,
              userid,
              lineas: params.lineas.map(l => ({
                method: l.method as 'efectivo' | 'tarjeta',
                amount: l.amount,
                tip: l.tip || 0
              })),
              seleccion: params.seleccion,
              conceptosSource: conceptosDeCuenta
            })

            // Solo marcar pagada si YA no queda saldo por pagar
            const rest = restanteTrasCobro(totalCuenta, pagado, params.total)
            if (rest <= EPS) {
              const now = new Date().toISOString()

              const updated: CuentaMesero = {
                ...cuenta,
                estado: 'pagada',
                fechafin: now,
                updated_at: now
              }
              setCuenta(updated)
              await upsertCuentaMesero(updated).catch(() => {})

              // (Opcional) imprimir automáticamente el ticket al pagar:
              // onImprimir()

              // 🔒 Cerrar TODAS las cuentas comensal abiertas de la mesa/turno,
              // estén o no ligadas (cuentameseroid puede venir null).
              const comensalesAfectados = cuentasComensal.filter(cc =>
                cc.estado === 'abierta' &&
                cc.sucursalid === sucursalid &&
                cc.turnoid === turnoid &&
                cc.mesaid === (cuenta.mesaid ?? null)
              )

              await Promise.all(
                comensalesAfectados.map(cc =>
                  upsertCuentaComensal({
                    ...cc,
                    estado: 'pagada',
                    cuentameseroid: cc.cuentameseroid ?? cuenta.id, // opcional
                    fechafin: now,
                    updated_at: now as any,
                    version: (cc.version ?? 0) + 1,
                  }).catch(() => {})
                )
              )
            }
            setOpenCobro(false)
          } catch (e) {
            console.error('Error al cobrar', e)
            // si falla, mantenemos el modal abierto para reintentar
          }
        }}
      />
    </Dialog>
  )
}

export default MesaActivaModal
