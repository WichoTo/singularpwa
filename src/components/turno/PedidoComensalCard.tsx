import React from 'react'
import {
  Card, CardContent, CardActions, Typography, Button,
  Box, Chip, Stack, Tooltip
} from '@mui/material'
import TableBarIcon from '@mui/icons-material/TableBar'
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'

import type { CuentaComensal, Mesa, ConceptoCuenta } from '../../config/types'

type Props = {
  comensal: CuentaComensal
  mesas: Mesa[]
  conceptos: ConceptoCuenta[]
  onSelect: (c: CuentaComensal) => void
}

const PedidoComensalCard: React.FC<Props> = ({ comensal, mesas, conceptos, onSelect }) => {
  const mesa = mesas.find(m => m.id === comensal.mesaid) ?? null
  const mesaLabel = mesa?.nomesa ?? 'Sin mesa'

  // Cantidad de conceptos del comensal aún SIN cuentameseroid y en 'pendiente'
  const pendientes = (conceptos ?? []).filter(k =>
    k.cuentacomensalid === comensal.id &&
    !k.cuentameseroid &&
    k.estado === 'pendiente'
  ).length

  const isSinMesa = !comensal.mesaid

  return (
    <Card
      onClick={() => onSelect(comensal)}
      sx={{
        borderRadius: 3,
        p: 1.5,
        minWidth: 260,
        maxWidth: 320,
        cursor: 'pointer',
        bgcolor: '#fffdfa',
        border: isSinMesa ? '1.5px dashed #ff9800' : '1px solid #ffe0b2',
        boxShadow: '0 2px 10px rgba(44,62,80,0.08)',
        '&:hover': { boxShadow: 6 }
      }}
      elevation={2}
    >
      {/* Header */}
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {isSinMesa ? (
            <TakeoutDiningIcon color="warning" />
          ) : (
            <TableBarIcon color="warning" />
          )}
          <Typography fontWeight={800}>
            {isSinMesa ? 'Pedido (sin mesa)' : `Mesa ${mesaLabel}`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Chip size="small" color="warning" label="SIN CUENTA" sx={{ fontWeight: 800 }} />
          {isSinMesa && <Chip size="small" variant="outlined" label="SIN MESA" sx={{ fontWeight: 700 }} />}
        </Stack>
      </Box>

      {/* Body */}
      <CardContent sx={{ px: 0, pt: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <RestaurantMenuIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2" color="text.secondary">
            Pendientes: <b>{pendientes}</b>
          </Typography>
        </Stack>
        {comensal.nomesa && (
          <Typography variant="caption" color="text.secondary">
            Cliente: {comensal.nomesa}
          </Typography>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: 0, pt: 0.5 }}>
        <Tooltip title="Crear cuenta de mesero y administrar pedidos" arrow>
          <Button
            variant="contained"
            color="warning"
            fullWidth
            onClick={e => {
              e.stopPropagation()
              onSelect(comensal)
            }}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Crear cuenta
          </Button>
        </Tooltip>
      </CardActions>
    </Card>
  )
}

export default PedidoComensalCard
