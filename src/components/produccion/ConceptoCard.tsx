// src/components/produccion/ConceptoCard.tsx
import React from 'react'
import {
  Card, CardContent, Stack, Box, Typography, Chip, Button, Divider
} from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import PersonIcon from '@mui/icons-material/Person'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import NotesIcon from '@mui/icons-material/Notes'
import type { ConceptoCuenta } from '../../config/types'

/* ================= helpers ================= */

function unitImporte(c: ConceptoCuenta) {
  const base = (c.preciounitario ?? 0) - (c.descuento ?? 0)
  const v = c.importe ?? base
  return Number.isFinite(v) ? Number(v) : 0
}

function since(dateIso?: string | null) {
  if (!dateIso) return ''
  const ts = new Date(dateIso).getTime()
  if (!Number.isFinite(ts)) return ''
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  const m = Math.floor(s / 60)
  if (m < 1) return `${s}s`
  const h = Math.floor(m / 60)
  if (h < 1) return `${m}m`
  return `${h}h ${m % 60}m`
}

type EstadoKey =
  | 'pedido' | 'aceptado'
  | 'preparacion' | 'en_preparacion'
  | 'por_entregar' | 'por entregar'
  | 'entregado'
  | 'cobrado'
  | 'cancelado'
  | string

const STATUS_META: Record<
  EstadoKey,
  { label: string; color: 'default'|'primary'|'secondary'|'success'|'info'|'warning'|'error'; icon: React.ReactNode; leftBar: string }
> = {
  pedido:         { label: 'Nuevo',          color: 'warning',  icon: <RestaurantIcon/>,        leftBar: '#ffb74d' },
  aceptado:       { label: 'Aceptado',       color: 'primary',  icon: <RestaurantIcon/>,        leftBar: '#64b5f6' },
  preparacion:    { label: 'En preparación', color: 'info',     icon: <LocalDiningIcon/>,       leftBar: '#29b6f6' },
  en_preparacion: { label: 'En preparación', color: 'info',     icon: <LocalDiningIcon/>,       leftBar: '#29b6f6' },
  'por_entregar': { label: 'Por entregar',   color: 'secondary',icon: <AssignmentTurnedInIcon/>,leftBar: '#9575cd' },
  'por entregar': { label: 'Por entregar',   color: 'secondary',icon: <AssignmentTurnedInIcon/>,leftBar: '#9575cd' },
  entregado:      { label: 'Entregado',      color: 'success',  icon: <DoneAllIcon/>,           leftBar: '#66bb6a' },
  cobrado:        { label: 'Cobrado',        color: 'success',  icon: <DoneAllIcon/>,           leftBar: '#43a047' },
  cancelado:      { label: 'Cancelado',      color: 'error',    icon: <DoneAllIcon/>,           leftBar: '#ef5350' },
}

/** Normaliza a grupos de flujo para habilitar acciones */
function flow(e: string) {
  const est = (e || '').toLowerCase()
  return {
    isNew: ['pedido', 'aceptado', 'pendiente'].includes(est),
    isPrep: ['preparacion', 'en_preparacion'].includes(est),
    isReady: ['por_entregar', 'por entregar'].includes(est),
    isDone: ['entregado', 'cobrado', 'cancelado'].includes(est),
  }
}

/* ================= component ================= */

type Props = {
  concepto: ConceptoCuenta
  /** Nombre ya resuelto del item (más rápido que buscar dentro del card) */
  itemName?: string
  /** Texto/etiqueta de mesa (opcional) */
  mesaLabel?: string | null
  /** Acciones (opcionales) */
  onStart?: (id: string) => void       // → 'preparacion'
  onReady?: (id: string) => void       // → 'por_entregar'
  onDeliver?: (id: string) => void     // → 'entregado'
  onCancel?: (id: string) => void      // → 'cancelado' (no se muestra botón)
}

const ConceptoCardProd: React.FC<Props> = ({
  concepto,
  itemName,
  mesaLabel,
  onStart,
  onReady,
  onDeliver,
}) => {
  const estKey = concepto.estado as EstadoKey
  const meta = STATUS_META[estKey] ?? {
    label: concepto.estado,
    color: 'default' as const,
    icon: <RestaurantIcon/>,
    leftBar: '#cfd8dc',
  }

  const { isNew, isPrep, isReady } = flow(concepto.estado as string)
  const unit = unitImporte(concepto)
  const alias = (concepto.nombrecliente ?? '').trim()

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: 2,
        bgcolor: '#fdfefe',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' },
        transition: 'all .15s ease',
        '::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          bgcolor: meta.leftBar,
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box sx={{ color: 'text.secondary' }}>{meta.icon}</Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
              {itemName ?? 'Ítem'}
            </Typography>
          </Stack>

          <Chip size="small" color={meta.color} label={meta.label} sx={{ fontWeight: 700 }} />
        </Stack>

        {/* Pills info */}
        <Stack direction="row" spacing={1} alignItems="center" mt={1} flexWrap="wrap" rowGap={1}>
          <Chip
            size="small"
            icon={<PersonIcon />}
            label={alias || 'Sin asignar'}
            sx={{ fontWeight: 700, bgcolor: alias ? '#eef5ff' : 'transparent' }}
            variant={alias ? 'filled' : 'outlined'}
          />
          {mesaLabel && (
            <Chip
              size="small"
              icon={<TableRestaurantIcon />}
              label={mesaLabel}
              variant="outlined"
            />
          )}
          <Chip
            size="small"
            icon={<AccessTimeIcon />}
            label={since(concepto.created_at)}
            variant="outlined"
          />
          <Chip size="small" label={`Origen: ${concepto.origen}`} variant="outlined" />
        </Stack>

        {/* Notas */}
        {!!concepto.notas && (
          <Stack direction="row" spacing={1} alignItems="flex-start" mt={1}>
            <NotesIcon fontSize="small" />
            <Typography variant="body2" color="text.secondary">{concepto.notas}</Typography>
          </Stack>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Footer: precio + acciones */}
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Unitario:&nbsp;<b>${unit.toFixed(2)}</b> · Cant:&nbsp;<b>1</b>
          </Typography>

          <Stack direction="row" spacing={1}>
            {isNew && onStart && (
              <Button size="small" variant="contained" onClick={() => onStart(concepto.id)}>
                Iniciar
              </Button>
            )}
            {isPrep && onReady && (
              <Button size="small" variant="contained" color="secondary" onClick={() => onReady(concepto.id)}>
                Terminar
              </Button>
            )}
            {isReady && onDeliver && (
              <Button size="small" variant="contained" color="success" onClick={() => onDeliver(concepto.id)}>
                Entregar
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ConceptoCardProd
