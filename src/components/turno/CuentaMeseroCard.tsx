import React from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Badge,
  Chip,
  Stack,
  Tooltip
} from '@mui/material'
import TableBarIcon from '@mui/icons-material/TableBar'
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'

import type { CuentaMesero, Mesa, ConceptoCuenta } from '../../config/types'

type Props = {
  cuenta: CuentaMesero
  mesas: Mesa[]
  conceptos: ConceptoCuenta[]
  onSelect: (c: CuentaMesero) => void
  /** Nº de pedidos de comensal pendientes sin asignar a esta cuenta (misma mesa) */
  pendingPedidos?: number
}

/** Precio unitario con fallback: importe || (pu - desc) */
const unitPrice = (c: ConceptoCuenta) => {
  const v = c.importe ?? (c.preciounitario - (c.descuento ?? 0))
  return Number.isFinite(v as any) ? Number(v) : 0
}

const estadoChipColor = (e: CuentaMesero['estado']) =>
  e === 'pagada' ? 'success' : e === 'cancelada' ? 'default' : 'warning'

const CuentaMeseroCard: React.FC<Props> = ({
  cuenta,
  mesas,
  conceptos,
  onSelect,
  pendingPedidos = 0
}) => {
  const isLlevar = cuenta.tipo === 'para_llevar'
  const mesa = mesas.find(m => m.id === cuenta.mesaid)
  const mesaLabel = isLlevar ? (cuenta.nomesa || 'Cliente') : (mesa?.nomesa || 'Sin asignar')

  // Conceptos de esta cuenta (no cancelados)
  const conceptosDeCuenta = (conceptos || []).filter(
    c => c.cuentameseroid === cuenta.id && c.estado !== 'cancelado'
  )

  const totalItems = conceptosDeCuenta.length
  const totalPrice = conceptosDeCuenta.reduce((sum, c) => sum + unitPrice(c), 0)

  return (
    <Card
      sx={{
        width: 248,
        minHeight: 220,
        borderRadius: 4,
        p: 1,
        position: 'relative',
        bgcolor: '#f8fafc',
        boxShadow: '0 2px 10px 0 rgba(44,62,80,0.10)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 18px 0 rgba(44,62,80,0.15)'
        }
      }}
      elevation={pendingPedidos > 0 ? 6 : 2}
      onClick={() => onSelect(cuenta)}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pt: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isLlevar
            ? <TakeoutDiningIcon color="secondary" fontSize="large" />
            : <TableBarIcon color="primary" fontSize="large" />
          }
          <Typography fontWeight={700} fontSize={17}>
            {isLlevar ? `Para llevar${cuenta.nomesa ? `: ${cuenta.nomesa}` : ''}` : `Mesa ${mesaLabel}`}
          </Typography>
        </Stack>

        {pendingPedidos > 0 && (
          <Tooltip title="Pedidos pendientes por asignar a esta cuenta" arrow>
            <Badge
              badgeContent={pendingPedidos}
              color="error"
              sx={{ "& .MuiBadge-badge": { fontSize: 13, minWidth: 22, height: 22 } }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Body */}
      <CardContent sx={{ px: 1, pb: 0, pt: 0.7 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Chip
            label={cuenta.estado.toUpperCase()}
            color={estadoChipColor(cuenta.estado) as any}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700, letterSpacing: .3 }}
          />
          <Chip
            label={`#${cuenta.id.slice(0, 4)}`}
            size="small"
            variant="outlined"
          />
        </Stack>

        {!isLlevar && (
          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
            <PeopleAltIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography variant="body2" color="text.secondary">
              {mesa?.comensales ?? 1} comensal(es)
            </Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="center">
          <LocalDiningIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2">
            <b>{totalItems}</b> producto{totalItems === 1 ? '' : 's'}
          </Typography>
        </Stack>
      </CardContent>

      {/* Total */}
      <CardContent sx={{ px: 1, pt: 0.5, pb: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          <ReceiptLongIcon sx={{ color: '#0288d1', fontSize: 20 }} />
          <Typography variant="h6" fontWeight={800} color="primary">
            ${totalPrice.toFixed(2)}
          </Typography>
        </Stack>
      </CardContent>

      <CardActions sx={{ mt: 1, pt: 0, pb: 1 }}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          fullWidth
          onClick={e => {
            e.stopPropagation()
            onSelect(cuenta)
          }}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          Ver / Editar
        </Button>
      </CardActions>
    </Card>
  )
}

export default CuentaMeseroCard
