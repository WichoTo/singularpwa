import React, { useMemo } from 'react'
import {
  Box, Typography, Card, CardContent, Stack, Chip,
  Divider, Tooltip, FormControl, Select, MenuItem, IconButton
} from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import type { ConceptoCuenta, ItemMenu } from '../../config/types'

type Props = {
  conceptos: ConceptoCuenta[]
  menuItems: ItemMenu[]
  onChangeEstado: (id: string, estado: ConceptoCuenta['estado']) => void | Promise<void>
  onEliminar: (id: string) => void | Promise<void>   // compat
  onDecrease: (id: string) => void | Promise<void>   // elimina UNA unidad (fila)
  onIncrease: (id: string) => void | Promise<void>   // agrega UNA unidad (duplica fila)
}

/* ===== utils ===== */

const ESTADO_ORDER: ConceptoCuenta['estado'][] = [
  'pendiente','aceptado','en_preparacion','listo',
  'por_entregar','entregado','cobrado','cancelado'
]

const ESTADO_OPTIONS: ConceptoCuenta['estado'][] = [
  'pendiente','aceptado','en_preparacion','listo',
  'por_entregar','entregado','cancelado','cobrado'
]

const estadoLabel = (e: ConceptoCuenta['estado']) => ({
  pendiente:'Pendiente', aceptado:'Aceptado', en_preparacion:'En preparación',
  listo:'Listo', por_entregar:'Por entregar', entregado:'Entregado',
  cobrado:'Cobrado', cancelado:'Cancelado',
}[e] ?? e)

const estadoChipColor = (e: ConceptoCuenta['estado']) => {
  switch (e) {
    case 'pendiente': return 'warning'
    case 'aceptado':
    case 'en_preparacion':
    case 'listo':
    case 'por_entregar': return 'info'
    case 'entregado': return 'success'
    case 'cobrado': return 'primary'
    case 'cancelado': return 'default'
    default: return 'default'
  }
}

const unitPrice = (c: ConceptoCuenta) => {
  const fallback = c.preciounitario - (c.descuento ?? 0)
  const v = c.importe ?? fallback
  return Number.isFinite(v) ? v : 0
}

const buildItemIndex = (menu: ItemMenu[]) => {
  const map = new Map<string, ItemMenu>()
  for (const it of menu) map.set(it.id, it)
  return map
}

const tipoDeItem = (idx: Map<string, ItemMenu>, id: string): string => {
  const it = idx.get(id) as any
  return it?.tipo ?? it?.category ?? it?.categoria ?? it?.familia ?? 'General'
}

/* ===== agrupación: estado -> cliente -> tipo ===== */

type Grupo = {
  ids: string[]
  itemmenuid: string
  nombre: string
  unit: number
  count: number
  estado: ConceptoCuenta['estado']
  cliente?: string
}

function agrupaTresNiveles(conceptos: ConceptoCuenta[], menu: ItemMenu[]) {
  const idx = buildItemIndex(menu)
  const grupos = new Map<string, Grupo>() // key = itemmenuid|estado|cliente

  for (const c of conceptos) {
    const key = `${c.itemmenuid}|${c.estado}|${c.nombrecliente ?? ''}`
    if (!grupos.has(key)) {
      const it = idx.get(c.itemmenuid)
      grupos.set(key, {
        ids: [c.id],
        itemmenuid: c.itemmenuid,
        nombre: it?.nombre ?? 'Ítem',
        unit: unitPrice(c),
        count: 1,
        estado: c.estado,
        cliente: c.nombrecliente ?? undefined,
      })
    } else {
      const g = grupos.get(key)!; g.ids.push(c.id); g.count += 1
    }
  }

  const tree: Record<string, Record<string, Record<string, Grupo[]>>> = {}
  for (const g of grupos.values()) {
    const estado = g.estado
    const cliente = g.cliente || '—'
    const tipo = tipoDeItem(idx, g.itemmenuid)
    tree[estado] ??= {}; tree[estado][cliente] ??= {}; tree[estado][cliente][tipo] ??= []
    tree[estado][cliente][tipo].push(g)
  }

  // ordenar por nombre dentro de cada tipo
  Object.values(tree).forEach(byCliente =>
    Object.values(byCliente).forEach(byTipo =>
      Object.values(byTipo).forEach(arr => arr.sort((a,b)=>a.nombre.localeCompare(b.nombre)))
    )
  )
  return tree
}

/* ===== componente ===== */

const PedidoActualList: React.FC<Props> = ({
  conceptos, menuItems, onChangeEstado, onDecrease, onIncrease
}) => {
  const tree = useMemo(() => agrupaTresNiveles(conceptos, menuItems), [conceptos, menuItems])

  const changeEstadoGrupo = async (g: Grupo, next: ConceptoCuenta['estado']) =>
    Promise.all(g.ids.map(id => onChangeEstado(id, next)))

  // Bloquear acciones para cobrados/cancelados
  const quitarUno = async (g: Grupo) => {
    if (g.estado === 'cobrado' || g.estado === 'cancelado') return
    const lastId = g.ids[g.ids.length - 1]
    if (!lastId) return
    try {
      await onDecrease(lastId)
    } catch (err) {
      console.warn('[PedidoActualList] onDecrease falló, fallback → cancelado', { lastId, err })
      await onChangeEstado(lastId, 'cancelado')
    }
  }

  const agregarUno = (g: Grupo) => {
    if (g.estado === 'cobrado' || g.estado === 'cancelado') return
    return onIncrease(g.ids[0])
  }

  const totalPorEstado = (estado: string) => {
    let sum = 0
    const byCliente = tree[estado] || {}
    Object.values(byCliente).forEach(byTipo => {
      Object.values(byTipo).forEach(arr => {
        arr.forEach(g => { sum += g.unit * g.count })
      })
    })
    return sum
  }

  const estadosPresentes = Object.keys(tree).sort((a, b) => {
    const ia = ESTADO_ORDER.indexOf(a as any), ib = ESTADO_ORDER.indexOf(b as any)
    const aa = ia < 0 ? 999 : ia, bb = ib < 0 ? 999 : ib
    return aa !== bb ? aa - bb : a.localeCompare(b)
  })

  return (
    <Box flex={1} sx={{ bgcolor:'#fff', borderRadius:3, overflow:'hidden', minHeight: 240 }}>
      <Box sx={{ p:1.5, borderBottom:'1px solid #e6e8f0', bgcolor:'#f8fafc' }}>
        <Typography fontWeight={800}>Pedido actual</Typography>
      </Box>

      <Box sx={{ p:1.5, maxHeight: '56vh', overflowY: 'auto' }}>
        {estadosPresentes.map(estado => {
          const byCliente = tree[estado]
          const isCanceled = estado === 'cancelado'
          const isPaid = estado === 'cobrado'
          const isLockedGroup = isCanceled || isPaid

          return (
            <Card
              key={estado}
              variant="outlined"
              sx={{
                mb:2, borderRadius:2,
                opacity: isLockedGroup ? 0.75 : 1,
                bgcolor: isCanceled ? '#fafafa' : isPaid ? '#f5f9ff' : 'background.paper',
                borderColor: isPaid ? 'primary.light' : undefined
              }}
            >
              <CardContent sx={{ p:1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={estadoLabel(estado as any)} color={estadoChipColor(estado as any)} size="small" sx={{ fontWeight:700 }}/>
                    <Typography variant="body2" color="text.secondary">
                      Total: <b>${totalPorEstado(estado).toFixed(2)}</b>
                    </Typography>
                    {isCanceled && <Chip size="small" label="Solo información" sx={{ ml:1, bgcolor:'#eee' }} />}
                    {isPaid && <Chip size="small" color="primary" label="Pagado (bloqueado)" sx={{ ml:1 }} />}
                  </Stack>
                </Stack>

                {Object.keys(byCliente).sort((a,b)=>a.localeCompare(b)).map(cliente => {
                  const byTipo = byCliente[cliente]
                  return (
                    <Box key={cliente} sx={{ mb:1.5 }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ mb:1 }}>
                        {cliente === '—' ? 'Sin asignar' : cliente}
                      </Typography>

                      {Object.keys(byTipo).sort((a,b)=>a.localeCompare(b)).map(tipo => {
                        const arr = byTipo[tipo]
                        return (
                          <Box key={tipo} sx={{ mb:1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb:0.5 }}>
                              <Typography variant="caption" sx={{ letterSpacing:.3, textTransform:'uppercase', color:'text.secondary' }}>
                                {tipo}
                              </Typography>
                              <Divider sx={{ flex:1 }}/>
                            </Stack>

                            <Stack spacing={0.75}>
                              {arr.map(g => {
                                const subtotal = g.unit * g.count
                                const locked = g.estado === 'cobrado' || g.estado === 'cancelado'
                                return (
                                  <Stack
                                    key={`${g.itemmenuid}|${g.estado}|${g.cliente ?? ''}`}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ px:1, py:0.75, borderRadius:1.5, bgcolor:'#fafbff', border:'1px solid #eef0f6' }}
                                  >
                                    <Stack spacing={0.25}>
                                      <Typography fontWeight={700}>{g.nombre}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        ${g.unit.toFixed(2)} · x{g.count} · Subtotal: <b>${subtotal.toFixed(2)}</b>
                                      </Typography>
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                      <FormControl size="small" sx={{ minWidth: 170 }}>
                                        <Tooltip title={locked ? (g.estado === 'cobrado' ? 'Concepto pagado: no editable' : 'Concepto cancelado') : ''}>
                                          <span>
                                            <Select
                                              size="small"
                                              value={g.estado}
                                              disabled={locked}
                                              onChange={e => changeEstadoGrupo(g, e.target.value as ConceptoCuenta['estado'])}
                                            >
                                              {ESTADO_OPTIONS.map(opt => (
                                                <MenuItem key={opt} value={opt}>{estadoLabel(opt)}</MenuItem>
                                              ))}
                                            </Select>
                                          </span>
                                        </Tooltip>
                                      </FormControl>

                                      <Tooltip title={locked ? 'No disponible' : 'Eliminar 1'}>
                                        <span>
                                          <IconButton
                                            size="small"
                                            disabled={locked || g.count <= 0}
                                            onClick={() => quitarUno(g)}
                                          >
                                            <RemoveIcon/>
                                          </IconButton>
                                        </span>
                                      </Tooltip>

                                      <Typography sx={{ mx:0.5, minWidth: 20, textAlign:'center' }}>{g.count}</Typography>

                                      <Tooltip title={locked ? 'No disponible' : 'Agregar 1'}>
                                        <span>
                                          <IconButton size="small" disabled={locked} onClick={() => agregarUno(g)}>
                                            <AddIcon/>
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    </Stack>
                                  </Stack>
                                )
                              })}
                            </Stack>
                          </Box>
                        )
                      })}
                    </Box>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}

        {estadosPresentes.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 1 }}>No hay conceptos</Typography>
        )}
      </Box>
    </Box>
  )
}

export default PedidoActualList
