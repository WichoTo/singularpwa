// src/components/mesas/MesasCard.tsx
import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Stack,
  Avatar,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant'
import type { Mesa } from '../../../config/types'

interface MesasCardProps {
  mesa: Mesa
  onEdit: (m: Mesa) => void
}

const MesasCard: React.FC<MesasCardProps> = ({ mesa, onEdit }) => {
  return (
    <Card
      sx={{
        width: 230,
        minHeight: 190,
        borderRadius: 4,
        boxShadow: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        position: 'relative',
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.100', width: 52, height: 52 }}>
          <TableRestaurantIcon sx={{ color: 'primary.main', fontSize: 36 }} />
        </Avatar>
        <Tooltip title="Editar mesa">
          <IconButton
            onClick={() => onEdit(mesa)}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: 1,
              zIndex: 2,
              '&:hover': { bgcolor: 'primary.light' },
            }}
            size="small"
          >
            <EditIcon sx={{ color: 'primary.main' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', mb: 0.5, textAlign: 'center' }}>
          {mesa.nomesa}
        </Typography>
        <Stack spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            <b>Área:</b> {mesa.area || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <b>Comensales:</b> {mesa.comensales}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MesasCard
