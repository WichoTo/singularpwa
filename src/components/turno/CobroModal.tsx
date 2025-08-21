import React, { useEffect, useMemo, useState } from 'react'
import type { ConceptoCuenta, ItemMenu, Pago, SeleccionPorConcepto } from '../../config/types'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Button, Typography, TextField, IconButton, MenuItem,
  FormControl, InputLabel, Select, List, ListItem, ListItemText,
  Divider, FormControlLabel, Checkbox, Chip, Fade, Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
  import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import PaymentIcon from '@mui/icons-material/Payment'

/* ========= Helpers compat (v1/v2) ========= */
const getNombreCliente = (c: any): string | undefined =>
  c?.nombrecliente ?? c?.nombreCliente ?? undefined

const getItemMenuId = (c: any): string =>
  c?.itemmenuid ?? c?.itemMenuId

const getCantidad = (c: any): number =>
  Number.isFinite(c?.cantidad) ? c.cantidad : 1 // v2: 1 por fila

const getPrecioUnit = (c: any): number => {
  const v2 = (c?.importe ?? ((c?.preciounitario ?? 0) - (c?.descuento ?? 0)))
  const v1 = c?.precio
  const n = Number.isFinite(v2) ? v2 : (Number.isFinite(v1) ? v1 : 0)
  return n > 0 ? n : 0
}

// num helpers
const EPS = 0.009
const r2 = (n: number) => Math.round(n * 100) / 100

/* ========= Tipos ========= */
export interface CobroLinea {
  method: 'efectivo' | 'tarjeta' | string
  amount: number
  tipPercent: number
  tip: number
}

export interface CobroParams {
  lineas: CobroLinea[]
  total: number
  pagado: number
  restante: number
  seleccion: SeleccionPorConcepto
}

interface CobroModalProps {
  open: boolean
  conceptos?: ConceptoCuenta[]
  total?: number
  pagosPrevios?: Pago[]
  onClose: () => void
  onConfirm: (params: CobroParams) => void
  menuItems?: ItemMenu[]
}

/* ========= utils selección ========= */
const shallowEqualSeleccion = (a: SeleccionPorConcepto, b: SeleccionPorConcepto) => {
  if (a === b) return true
  const ka = Object.keys(a); const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) { if ((a as any)[k] !== (b as any)[k]) return false }
  return true
}

const buildZeroSeleccion = (conceptos: ConceptoCuenta[]): SeleccionPorConcepto =>
  conceptos.reduce((acc, c) => { acc[c.id] = 0; return acc }, {} as Record<string, number>)

const buildPagosPreviosIndex = (pagos: Pago[]) => {
  const map = new Map<string, number>()
  for (const p of pagos) {
    const list = p?.detalles?.productos ?? []
    for (const it of list) {
      if (!it?.conceptoId) continue
      map.set(it.conceptoId, (map.get(it.conceptoId) || 0) + (it.cantidad || 0))
    }
  }
  return map
}

const CobroModal: React.FC<CobroModalProps> = ({
  open,
  conceptos = [],
  menuItems = [],
  pagosPrevios = [],
  onClose,
  onConfirm,
}) => {
  const [lineas, setLineas] = useState<CobroLinea[]>([])
  const [error, setError] = useState<string>('')
  const [seleccion, setSeleccion] = useState<SeleccionPorConcepto>({})
  const [nombresSeleccionados, setNombresSeleccionados] = useState<string[]>([])

  /* ===== claves estables ===== */
  const conceptosKey = useMemo(() => conceptos.map(c => c.id).join('|'), [conceptos])
  const nombresSelKey = useMemo(() => nombresSeleccionados.join('|'), [nombresSeleccionados])
  const pagosPreviosKey = useMemo(() => {
    const parts: string[] = []
    for (const p of pagosPrevios) {
      const arr = p?.detalles?.productos ?? []
      for (const it of arr) {
        if (!it?.conceptoId) continue
        parts.push(`${it.conceptoId}:${it.cantidad || 0}`)
      }
    }
    parts.sort()
    return parts.join(',')
  }, [pagosPrevios])

  /* ===== índices/memos útiles ===== */
  const pagosIdx = useMemo(() => buildPagosPreviosIndex(pagosPrevios), [pagosPreviosKey])

  const maxById = useMemo(() => {
    const m = new Map<string, number>()
    conceptos.forEach(con => {
      const pagados = pagosIdx.get(con.id) || 0
      m.set(con.id, Math.max(0, getCantidad(con) - pagados))
    })
    return m
  }, [conceptosKey, pagosPreviosKey])

  const nombrePorItemId = useMemo(() => {
    const m: Record<string, string> = {}
    for (const it of menuItems) m[it.id] = it.nombre ?? `Producto #${it.id}`
    return m
  }, [menuItems])

  /* ===== nombres únicos (chips) ===== */
  const nombresUnicos = useMemo(() => {
    const set = new Set<string>()
    conceptos.forEach(c => { const nom = getNombreCliente(c); if (nom) set.add(nom) })
    return Array.from(set)
  }, [conceptosKey])

  /* ===== reset al abrir: SIN preselección y línea vacía ===== */
  useEffect(() => {
    if (!open) return
    setSeleccion(buildZeroSeleccion(conceptos)) // nada seleccionado
    setNombresSeleccionados([])                // chips apagados
    setError('')
    setLineas([{ method: 'efectivo', amount: 0, tipPercent: 0, tip: 0 }]) // 1 línea vacía
  }, [open, conceptosKey])

  /* ===== auto-selección por chips (opcional) ===== */
  useEffect(() => {
    if (!open) return
    const next: SeleccionPorConcepto = { ...seleccion }
    let changed = false
    for (const con of conceptos) {
      const nombre = getNombreCliente(con)
      if (!nombre) continue
      const max = maxById.get(con.id) || 0
      const should = nombresSeleccionados.includes(nombre) ? max : 0
      if ((next[con.id] ?? 0) !== should) { next[con.id] = should; changed = true }
    }
    if (changed && !shallowEqualSeleccion(seleccion, next)) setSeleccion(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nombresSelKey, conceptosKey, pagosPreviosKey])

  /* ===== métodos disponibles ===== */
  const metodoList = [
    { value: 'efectivo', label: 'Efectivo', icon: <MonetizationOnIcon color="success" fontSize="small" /> },
    { value: 'tarjeta',  label: 'Tarjeta',  icon: <PaymentIcon color="info" fontSize="small" /> },
  ]

  /* ===== totales ===== */
  const totalSeleccionado = useMemo(() => {
    return conceptos.reduce((sum, con) => {
      const sel = seleccion[con.id] ?? 0
      const unit = getPrecioUnit(con)
      return sum + sel * unit
    }, 0)
  }, [conceptos, seleccion])

  const totalPagosPrevios = useMemo(
    () => pagosPrevios.reduce((sum, p) => sum + (p.total ?? 0), 0),
    [pagosPreviosKey]
  )

  const pagadoActual = useMemo(
    () => lineas.reduce((sum, l) => sum + (l.amount || 0), 0),
    [lineas]
  )

  const pagado = totalPagosPrevios + pagadoActual
  const restante = Math.max(0, totalSeleccionado - pagadoActual)

  /* ===== normalización: si sum(amount) > total, mueve exceso a tip ===== */
  const normalizeLineas = (arr: CobroLinea[], editedIdx?: number): CobroLinea[] => {
    let out = arr.map(l => ({
      ...l,
      amount: Math.max(0, Number.isFinite(l.amount) ? r2(l.amount) : 0),
      tip: Math.max(0, Number.isFinite(l.tip) ? r2(l.tip) : 0),
      tipPercent: Math.max(0, Number.isFinite(l.tipPercent) ? r2(l.tipPercent) : 0),
    }))

    const sum = out.reduce((s, l) => s + l.amount, 0)
    if (sum <= totalSeleccionado + EPS) {
      return out.map(l => ({
        ...l,
        tipPercent: l.amount ? r2((l.tip / l.amount) * 100) : 0
      }))
    }

    let overflow = r2(sum - totalSeleccionado)
    const preferIdx = typeof editedIdx === 'number' ? editedIdx : out.length - 1

    const pullFrom = (idx: number) => {
      if (overflow <= EPS) return
      const can = out[idx].amount
      const dec = r2(Math.min(can, overflow))
      out[idx].amount = r2(out[idx].amount - dec)
      out[idx].tip = r2(out[idx].tip + dec)
      out[idx].tipPercent = out[idx].amount ? r2((out[idx].tip / out[idx].amount) * 100) : 0
      overflow = r2(overflow - dec)
    }

    if (preferIdx >= 0) pullFrom(preferIdx)
    for (let i = out.length - 1; i >= 0 && overflow > EPS; i--) {
      if (i === preferIdx) continue
      pullFrom(i)
    }

    return out
  }

  // ⚠️ SIN autollenado del monto con el total seleccionado

  /* ===== validaciones ===== */
  useEffect(() => {
    let next = ''
    if (totalSeleccionado === 0) {
      next = 'Selecciona al menos un producto para cobrar.'
    } else if (pagadoActual + EPS < totalSeleccionado) {
      next = 'El monto ingresado no alcanza el total seleccionado.'
    }
    setError(prev => (prev === next ? prev : next))
  }, [totalSeleccionado, pagadoActual])

  /* ===== Agrupación: por comensal -> por producto ===== */
  type Grupo = { key: string; itemmenuid: string; unit: number; nombre: string; conceptoIds: string[] }
  type GruposPorCliente = Record<string, Grupo[]>

  const gruposPorCliente = useMemo<GruposPorCliente>(() => {
    const map: Record<string, Map<string, Grupo>> = {}
    for (const con of conceptos) {
      const cliente = getNombreCliente(con) || '(Sin asignar)'
      const item = getItemMenuId(con)
      const unit = getPrecioUnit(con)
      const gkey = `${item}|${unit}`

      if (!map[cliente]) map[cliente] = new Map()
      const inner = map[cliente]

      if (!inner.has(gkey)) {
        inner.set(gkey, {
          key: gkey,
          itemmenuid: item,
          unit,
          nombre: nombrePorItemId[item] || `Producto #${item}`,
          conceptoIds: []
        })
      }
      inner.get(gkey)!.conceptoIds.push(con.id)
    }

    const out: GruposPorCliente = {}
    Object.keys(map).forEach(cliente => {
      out[cliente] = Array.from(map[cliente].values())
    })
    return out
  }, [conceptosKey, nombrePorItemId])

  /* ===== Handlers + / – a nivel grupo ===== */
  const incGrupo = (ids: string[]) => {
    setSeleccion(prev => {
      const next = { ...prev }
      for (const id of ids) {
        const max = maxById.get(id) || 0
        const curr = next[id] ?? 0
        if (curr < max) { next[id] = curr + 1; return next }
      }
      return prev
    })
  }

  const decGrupo = (ids: string[]) => {
    setSeleccion(prev => {
      const next = { ...prev }
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i]
        const curr = next[id] ?? 0
        if (curr > 0) { next[id] = curr - 1; return next }
      }
      return prev
    })
  }

  /* ===== confirmar ===== */
  const handleConfirm = () => {
    if (error) return
    onConfirm({
      lineas,
      total: totalSeleccionado,
      pagado,
      restante,
      seleccion,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 4, p: 0, width: '90vw', maxWidth: 760 } }}
      TransitionComponent={Fade}
    >
      {/* HEADER */}
      <DialogTitle sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white', borderRadius: '16px 16px 0 0', px: 4 }}>
        Procesar cobro
        <Typography fontSize={13} sx={{ opacity: 0.85, mt: .25 }}>
          Selecciona productos, asigna métodos y propinas
        </Typography>
      </DialogTitle>

      {/* BODY */}
      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        {/* Selección de productos */}
        <Box mb={2}>
          <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1}>
            Selecciona los productos a pagar
          </Typography>

          {/* chips de comensal */}
          {nombresUnicos.length > 0 && (
            <Box mb={1}>
              <Typography fontSize={14} mb={0.5} color="text.secondary">
                Puedes seleccionar uno o varios comensales
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {nombresUnicos.map(nom => {
                  const active = nombresSeleccionados.includes(nom)
                  return (
                    <Chip
                      key={nom}
                      label={nom}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      clickable
                      onClick={() =>
                        setNombresSeleccionados(sel =>
                          sel.includes(nom) ? sel.filter(n => n !== nom) : [...sel, nom]
                        )
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  )
                })}
                {nombresSeleccionados.length < nombresUnicos.length && nombresUnicos.length > 1 && (
                  <Chip
                    label="Todos"
                    color="info"
                    variant="outlined"
                    clickable
                    onClick={() => setNombresSeleccionados([...nombresUnicos])}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* seleccionar todos */}
          <FormControlLabel
            control={
              <Checkbox
                checked={conceptos.every(con => (seleccion[con.id] ?? 0) === (maxById.get(con.id) || 0))}
                onChange={(_, checked) => {
                  if (checked) {
                    const next = conceptos.reduce((acc, con) => {
                      acc[con.id] = maxById.get(con.id) || 0
                      return acc
                    }, {} as Record<string, number>)
                    setSeleccion(prev => shallowEqualSeleccion(prev, next) ? prev : next)
                    setNombresSeleccionados(nombresUnicos)
                  } else {
                    const zero = buildZeroSeleccion(conceptos)
                    setSeleccion(prev => shallowEqualSeleccion(prev, zero) ? prev : zero)
                    setNombresSeleccionados([])
                  }
                }}
              />
            }
            label="Seleccionar todos"
            sx={{ fontWeight: 600, color: 'primary.main' }}
          />

          {/* ====== LISTA AGRUPADA ====== */}
          {Object.keys(gruposPorCliente).length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>No hay productos cobrables.</Typography>
          ) : (
            Object.entries(gruposPorCliente).map(([cliente, grupos]) => (
              <Box key={cliente} sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: .5 }}>
                  {cliente}
                </Typography>
                <List sx={{ bgcolor: '#f9f9fc', borderRadius: 2, p: 1 }}>
                  {grupos.map(g => {
                    const maxCount = g.conceptoIds.reduce((s, id) => s + (maxById.get(id) || 0), 0)
                    const selectedCount = g.conceptoIds.reduce((s, id) => s + (seleccion[id] || 0), 0)
                    const faltan = Math.max(0, maxCount - selectedCount)

                    return (
                      <ListItem key={g.key} disableGutters secondaryAction={
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton size="small" onClick={() => decGrupo(g.conceptoIds)} disabled={selectedCount === 0}>
                            <RemoveCircleOutlineIcon />
                          </IconButton>
                          <Chip label={selectedCount} size="small" color={selectedCount ? 'primary' : 'default'} sx={{ minWidth: 32, fontWeight: 700 }} />
                          <IconButton size="small" onClick={() => incGrupo(g.conceptoIds)} disabled={selectedCount >= maxCount}>
                            <AddIcon />
                          </IconButton>
                        </Box>
                      }>
                        <ListItemText
                          primary={<Typography fontWeight={600}>{g.nombre}</Typography>}
                          secondary={
                            <Typography color="text.secondary" fontSize={14}>
                              ${g.unit.toFixed(2)} x {maxCount} &nbsp;
                              <b style={{ color: '#b0b0b0' }}>(Faltan: {faltan})</b>
                            </Typography>
                          }
                        />
                      </ListItem>
                    )
                  })}
                </List>
              </Box>
            ))
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Totales */}
        <Stack direction="row" spacing={4} alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="subtitle1" color="text.secondary">Total a pagar</Typography>
            <Typography variant="h4" fontWeight={900} color="primary">
              ${totalSeleccionado.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" color="text.secondary">
              Pagado en esta operación: <b style={{ color: '#1aaf5d' }}>${pagadoActual.toFixed(2)}</b>
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Restante: <b style={{ color: '#f57c00' }}>${restante.toFixed(2)}</b>
            </Typography>
          </Box>
        </Stack>

        {/* Pagos previos */}
        {pagosPrevios.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" fontWeight={700} mb={1} color="secondary">
              Pagos previos
            </Typography>
            <List dense>
              {pagosPrevios.map(p => (
                <ListItem key={p.id} disableGutters>
                  <ListItemText
                    primary={
                      <Typography color="success.dark" fontWeight={700}>
                        ${Number(p.total || 0).toFixed(2)} &nbsp; <span style={{ color: '#888' }}>{p.metodo}</span>
                      </Typography>
                    }
                    secondary={<Typography fontSize={13}>{new Date(p.fecha).toLocaleString()}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}

        {/* Métodos de pago */}
        <Box mb={2}>
          <Typography variant="h6" color="primary">Métodos de pago</Typography>

          {lineas.map((line, idx) => (
            <Box display="flex" alignItems="center" gap={2} my={1} key={idx}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel>Método</InputLabel>
                <Select
                  value={line.method}
                  label="Método"
                  onChange={e => {
                    const v = e.target.value as 'efectivo' | 'tarjeta'
                    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, method: v } : l))
                  }}
                >
                  {metodoList.map(m => (
                    <MenuItem key={m.value} value={m.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {'icon' in m && (m as any).icon}
                        {m.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Monto"
                type="number"
                size="small"
                value={line.amount}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  setLineas(prev => {
                    const arr = prev.map((l,i) => i === idx ? { ...l, amount: Number.isFinite(val) ? val : 0 } : l)
                    return normalizeLineas(arr, idx)
                  })
                }}
                sx={{ width: 110 }}
              />
              <TextField
                label="Propina %"
                type="number"
                size="small"
                value={line.tipPercent}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  setLineas(prev => {
                    const arr = prev.map((l,i) => {
                      if (i !== idx) return l
                      const tipPercent = Number.isFinite(val) ? val : 0
                      const tip = r2((tipPercent / 100) * l.amount)
                      return { ...l, tipPercent, tip }
                    })
                    return arr
                  })
                }}
                sx={{ width: 110 }}
              />
              <TextField
                label="Propina $"
                type="number"
                size="small"
                value={line.tip}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  setLineas(prev => prev.map((l,i) => {
                    if (i !== idx) return l
                    const tip = Math.max(0, Number.isFinite(val) ? r2(val) : 0)
                    const tipPercent = l.amount ? r2((tip / l.amount) * 100) : 0
                    return { ...l, tip, tipPercent }
                  }))
                }}
                sx={{ width: 110 }}
              />

              <IconButton
                size="small"
                color="error"
                disabled={lineas.length === 1}
                onClick={() => setLineas(prev => prev.filter((_, i) => i !== idx))}
              >
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={() => setLineas(prev => [...prev, { method: 'efectivo', amount: 0, tip: 0, tipPercent: 0 }])}
            variant="outlined"
          >
            Agregar método
          </Button>
        </Box>

        {error && (
          <Typography color="error" variant="body2" mt={2} sx={{ fontWeight: 700 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      {/* FOOTER */}
      <DialogActions sx={{
        position: 'sticky', bottom: 0, bgcolor: 'background.paper',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)', px: 3, py: 2, borderRadius: '0 0 16px 16px'
      }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!!error || totalSeleccionado === 0}
          color="primary"
          sx={{ fontWeight: 700, minWidth: 160 }}
        >
          Cobrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CobroModal
