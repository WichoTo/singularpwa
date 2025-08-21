// src/components/turno/MisPedidosTabPanelComensal.tsx
import React from 'react'
import {
  Box, Typography, List, ListItem, ListItemText, Chip, Divider, IconButton
} from '@mui/material'
import type { ChipProps } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import type { ConceptoCuenta, ItemMenu } from '../../config/types'

type Props = {
  pedidosPendientesComensal: ConceptoCuenta[]
  conceptosPagados: ConceptoCuenta[]
  conceptosPendientes: ConceptoCuenta[]
  pagosPorConcepto: Record<string, number>
  menu: ItemMenu[]
  totalCuenta: number
  onEliminarPedido: (id: string) => void
  onIncreasePedido: (id: string) => void
  onDecreasePedido: (id: string) => void
}

function unitPrice(con: ConceptoCuenta) {
  return con.importe ?? (con.preciounitario - (con.descuento ?? 0))
}
function nombreDe(menu: ItemMenu[], itemmenuid: string) {
  return menu.find(m => m.id === itemmenuid)?.nombre || 'Ítem'
}

/** Mapeo → estado visual del chip */
function estadoChipProps(estado?: string): { label: string; color: ChipProps['color'] } {
  switch ((estado ?? '').toLowerCase()) {
    case 'pendiente':       return { label: 'Pendiente',       color: 'warning' }
    case 'aceptado':        return { label: 'Aceptado',        color: 'primary' }
    case 'en_preparacion':  return { label: 'En preparación',  color: 'info' }
    case 'preparacion':     return { label: 'En preparación',  color: 'info' }
    case 'servido':
    case 'entregado':
    case 'listo':           return { label: 'Listo',           color: 'default' }
    case 'cobrado':         return { label: 'Pagado',          color: 'success' }
    case 'cancelado':       return { label: 'Cancelado',       color: 'error' }
    default:                return { label: (estado ?? '—'),   color: 'default' }
  }
}

const MisPedidosTabPanelComensal: React.FC<Props> = ({
  pedidosPendientesComensal,
  conceptosPagados,
  conceptosPendientes,
  pagosPorConcepto,
  menu,
  totalCuenta,
  onEliminarPedido,
  onIncreasePedido,
  onDecreasePedido,
}) => (
  <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 0.5, sm: 1 }, bgcolor: 'background.paper' }}>
    <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'primary.main', mb: 1 }}>
      Tus pedidos
    </Typography>

    {/* Pendientes (creados por comensal aún sin aceptar) */}
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      Pendientes
    </Typography>
    <List disablePadding>
      {pedidosPendientesComensal.length > 0 ? (
        pedidosPendientesComensal.map(con => {
          const pagados = pagosPorConcepto[con.id] || 0
          const faltan = Math.max(0, 1 - pagados)
          const isPaid = pagados >= 1
          const nombre = nombreDe(menu, con.itemmenuid)
          const precio = unitPrice(con)
          const chip = estadoChipProps(con.estado)

          return (
            <ListItem
              key={con.id}
              divider
              secondaryAction={
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton
                    aria-label="Disminuir"
                    size="small"
                    onClick={() => onDecreasePedido(con.id)}
                    disabled={isPaid}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography minWidth={18} textAlign="center">{faltan}</Typography>
                  <IconButton
                    aria-label="Aumentar"
                    size="small"
                    onClick={() => onIncreasePedido(con.id)}
                  >
                    <AddIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Eliminar"
                    size="small"
                    onClick={() => onEliminarPedido(con.id)}
                    disabled={isPaid}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <>
                    {nombre}{' '}
                    <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 700 }} />
                  </>
                }
                secondary={`$${precio.toFixed(2)} × 1`}
              />
            </ListItem>
          )
        })
      ) : (
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          No hay pedidos pendientes.
        </Typography>
      )}
    </List>

    <Divider sx={{ my: 2 }} />

    {/* Conceptos pagados */}
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
      Conceptos pagados
    </Typography>
    <List disablePadding>
      {conceptosPagados.length > 0 ? (
        conceptosPagados.map(con => {
          const pagadosQty = pagosPorConcepto[con.id] || 1
          const nombre = nombreDe(menu, con.itemmenuid)
          const precio = unitPrice(con)

          return (
            <ListItem key={con.id} divider>
              <ListItemText
                primary={
                  <>
                    {nombre}{' '}
                    <Chip label="Pagado" color="success" size="small" sx={{ fontWeight: 700 }} />
                  </>
                }
                secondary={`$${precio.toFixed(2)} × 1 (Pagados: ${pagadosQty})`}
              />
            </ListItem>
          )
        })
      ) : (
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          No hay conceptos pagados.
        </Typography>
      )}
    </List>

    <Divider sx={{ my: 2 }} />

    {/* Aún no pagados – muestra también el ESTADO actual del concepto */}
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
      Pendiente por pagar
    </Typography>
    <List disablePadding>
      {conceptosPendientes.length > 0 ? (
        conceptosPendientes.map(con => {
          const pagadosQty = pagosPorConcepto[con.id] || 0
          const faltan = Math.max(0, 1 - pagadosQty)
          const nombre = nombreDe(menu, con.itemmenuid)
          const precio = unitPrice(con)
          const chip = estadoChipProps(con.estado)

          return (
            <ListItem key={con.id} divider>
              <ListItemText
                primary={
                  <>
                    {nombre}{' '}
                    <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 700 }} />
                  </>
                }
                secondary={`$${precio.toFixed(2)} × 1 (Pagados: ${pagadosQty} | Faltan: ${faltan})`}
              />
            </ListItem>
          )
        })
      ) : (
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          No hay conceptos pendientes.
        </Typography>
      )}
    </List>

    <Divider sx={{ my: 2 }} />

    {/* Total (referencia) */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
      <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
      <Typography variant="h6" color="primary">${totalCuenta.toFixed(2)}</Typography>
    </Box>
  </Box>
)

export default MisPedidosTabPanelComensal
