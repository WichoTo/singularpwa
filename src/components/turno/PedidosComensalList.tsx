import React, { useMemo, useState } from 'react'
import {
  Box, Typography, List, ListItem, ListItemText, Chip, Button, Stack, Paper, Divider
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import type { ItemMenu, ConceptoCuenta } from '../../config/types'

type Props = {
  pendientes: ConceptoCuenta[]
  menuItems: ItemMenu[]
  onAceptar: (concepto: ConceptoCuenta) => Promise<void> | void
  onRechazar: (concepto: ConceptoCuenta) => Promise<void> | void
}

/* ===== helpers ===== */
 
const precioUnit = (c: ConceptoCuenta) => {
  const fallback = c.preciounitario - (c.descuento ?? 0)
  const v = c.importe ?? fallback
  return Number.isFinite(v) ? v : 0
}

const buildMenuIdx = (menu: ItemMenu[]) => {
  const m = new Map<string, ItemMenu>()
  for (const it of menu) m.set(it.id, it)
  return m
}

/* ===== component ===== */

const PedidosComensalList: React.FC<Props> = ({ pendientes, menuItems, onAceptar, onRechazar }) => {
  const [accionEnProceso, setAccionEnProceso] = useState<string | null>(null)
  const idx = useMemo(() => buildMenuIdx(menuItems), [menuItems])

  // Grupo por nombre de cliente (alias)
  const grupos = useMemo(() => {
    const map = new Map<string, ConceptoCuenta[]>()
    for (const c of pendientes) {
      const k = c.nombrecliente || '—'
      const arr = map.get(k) || []
      arr.push(c)
      map.set(k, arr)
    }
    // Ordena por alias, y dentro por nombre de ítem
    for (const [_, arr] of map) {
      arr.sort((a,b) => {
        const an = idx.get(a.itemmenuid)?.nombre ?? ''
        const bn = idx.get(b.itemmenuid)?.nombre ?? ''
        return an.localeCompare(bn)
      })
    }
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]))
  }, [pendientes, idx])

  if (!pendientes.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fafcff' }}>
        <Typography color="text.secondary">No hay pedidos pendientes.</Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fafcff' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={800} color="primary.main">
          Pedidos de comensales
        </Typography>
        <Chip size="small" color="warning" label={`Pendientes: ${pendientes.length}`} sx={{ fontWeight: 700 }} />
      </Stack>

      {/* grupos por comensal */}
      <Stack spacing={2}>
        {grupos.map(([alias, rows]) => {
          const subtotal = rows.reduce((s, r) => s + precioUnit(r), 0)

          const aceptarTodos = async () => {
            // pequeña protección visual: bloquea la UI mientras corre el batch
            setAccionEnProceso(`__all_${alias}`)
            for (const r of rows) { await onAceptar(r) }
            setAccionEnProceso(null)
          }
          const rechazarTodos = async () => {
            setAccionEnProceso(`__all_${alias}`)
            for (const r of rows) { await onRechazar(r) }
            setAccionEnProceso(null)
          }

          return (
            <Box key={alias} sx={{ border: '1px solid #eef2f7', borderRadius: 2, overflow: 'hidden', bgcolor: 'white' }}>
              {/* header de grupo */}
              <Box sx={{ p: 1.25, bgcolor: '#f7f9fe', borderBottom: '1px solid #eef2f7' }}>
                <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems={{ xs:'flex-start', sm:'center' }} justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={800} sx={{ mr: .5 }}>
                      {alias === '—' ? 'Sin asignar' : alias}
                    </Typography>
                    <Chip size="small" color="warning" label="PENDIENTE" sx={{ fontWeight: 700 }} />
                    <Typography variant="body2" color="text.secondary">
                      {rows.length} {rows.length === 1 ? 'pedido' : 'pedidos'} · Subtotal: <b>${subtotal.toFixed(2)}</b>
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={aceptarTodos}
                      disabled={accionEnProceso === `__all_${alias}`}
                    >
                      Aceptar todos
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={rechazarTodos}
                      disabled={accionEnProceso === `__all_${alias}`}
                    >
                      Rechazar todos
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              {/* lista del grupo */}
              <List disablePadding>
                {rows.map((concepto, i) => {
                  const nombre = idx.get(concepto.itemmenuid)?.nombre ?? 'Ítem'
                  const precio = precioUnit(concepto)
                  const loading = accionEnProceso === concepto.id

                  return (
                    <React.Fragment key={concepto.id}>
                      <ListItem
                        sx={{
                          px: 1.5, py: 1,
                          alignItems: 'flex-start',
                          '&:hover': { bgcolor: '#fafbff' }
                        }}
                        secondaryAction={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LoadingButton
                              size="small"
                              variant="contained"
                              color="success"
                              loading={loading}
                              onClick={async () => {
                                setAccionEnProceso(concepto.id)
                                await onAceptar(concepto)
                                setAccionEnProceso(null)
                              }}
                              sx={{ fontWeight: 700 }}
                            >
                              Aceptar
                            </LoadingButton>
                            <Button
                              size="small"
                              color="error"
                              disabled={loading}
                              onClick={async () => {
                                setAccionEnProceso(concepto.id)
                                await onRechazar(concepto)
                                setAccionEnProceso(null)
                              }}
                            >
                              Rechazar
                            </Button>
                          </Stack>
                        }
                      >
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="baseline">
                              <Typography fontWeight={700}>{nombre}</Typography>
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              ${precio.toFixed(2)}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {i < rows.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  )
                })}
              </List>
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )
}

export default PedidosComensalList
