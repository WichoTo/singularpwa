import React from 'react'
import {
  Card, CardContent, Typography, Box, Avatar, IconButton, Stack, Tooltip,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FastfoodIcon from '@mui/icons-material/Fastfood'
import DeleteIcon from '@mui/icons-material/Delete'
import SignedImageCarousel from '../../general/SinedImageCarousel'
import type { ItemMenu } from '../../../config/types'

interface ItemMenuCardProps {
  item: ItemMenu
  onEdit: (item: ItemMenu) => void
  onDelete: (id: string) => void

}

const CARD_WIDTH = 320
const IMAGE_HEIGHT = 160
const CARD_MIN_HEIGHT = 420 // Puedes ajustar para que siempre estén parejas

const ItemMenuCard: React.FC<ItemMenuCardProps> = ({ item, onEdit,onDelete }) => {
  const hasImages = item.referencias && item.referencias.length > 0
  const costoFijoUnitario = item.precioVenta && item.porcentajeCostosFijos
    ? (item.precioVenta * item.porcentajeCostosFijos / 100)
    : null
  const utilidadNeta = item.precioVenta && item.costoProduccion && costoFijoUnitario !== null
    ? item.precioVenta - item.costoProduccion - costoFijoUnitario
    : null
  const margenNeto = utilidadNeta !== null && item.precioVenta
    ? (utilidadNeta / item.precioVenta) * 100
    : null

  return (
    <Card
      sx={{
        width: CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
        borderRadius: 4,
        boxShadow: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        position: 'relative',
        background: '#fff',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 }
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: IMAGE_HEIGHT, overflow: 'hidden' }}>
        {hasImages ? (
          <SignedImageCarousel
            items={item.referencias}
            width={CARD_WIDTH}
            height={IMAGE_HEIGHT}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: IMAGE_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f5f6fa',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'grey.200' }}>
              <FastfoodIcon sx={{ fontSize: 32, color: 'grey.500' }} />
            </Avatar>
          </Box>
        )}

        {/* IconButton flotante */}
        <Tooltip title="Ver detalles">
          <IconButton
            size="medium"
            onClick={() => onEdit(item)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: 'rgba(255,255,255,0.90)',
              boxShadow: 1,
              zIndex: 10,
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            <VisibilityIcon fontSize="medium" sx={{ color: 'primary.main' }} />
          </IconButton>
        </Tooltip>
          <Tooltip title="Eliminar producto">
            <IconButton
              size="medium"
              onClick={() => onDelete(item.id)}
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                bgcolor: 'rgba(255,255,255,0.90)',
                boxShadow: 1,
                zIndex: 10,
                '&:hover': { bgcolor: 'error.light' },
              }}
            >
              <DeleteIcon fontSize="medium" sx={{ color: 'default' }} />
            </IconButton>
          </Tooltip>
      </Box>

      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: 0.5,
          p: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', pr: 2, mb: 0.5 }}>
          {item.nombre}
        </Typography>
        <Stack direction="row" spacing={1} mt={0.5} mb={1}>
          <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
            {item.categoria}
          </Typography>
          <Typography variant="body2" sx={{ color: 'grey.500' }}>|</Typography>
          <Typography variant="body2" sx={{ color: 'grey.600' }}>{item.area}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ fontSize: 15 }}>
          <b>Ingredientes:</b> {item.ingredientes.length}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 15, color: 'success.main' }}>
          <b>Costo:</b> ${item.costoProduccion?.toFixed(2) ?? '0.00'}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 15, color: 'info.main' }}>
          <b>Costo fijo:</b> {costoFijoUnitario !== null ? `$${costoFijoUnitario.toFixed(2)}` : '—'}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 15, color: 'primary.main' }}>
          <b>Precio:</b> ${item.precioVenta?.toFixed(2) ?? '0.00'}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 15, color: 'grey.700' }}>
          <b>Utilidad neta:</b> {utilidadNeta !== null ? `$${utilidadNeta.toFixed(2)}` : '—'}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 15, color: 'secondary.main' }}>
          <b>Margen neto:</b> {margenNeto !== null ? `${margenNeto.toFixed(1)}%` : '—'}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default ItemMenuCard
