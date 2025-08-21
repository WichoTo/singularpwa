import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import type { Preparacion, PreparacionProduccion } from '../../config/types'

interface Props {
  preparacion: Preparacion
  producciones: PreparacionProduccion[]
  cantidadPropuesta?: number // Cuánto "debería haber"
  disponible?: boolean        // Viene del dashboard: incluye hijas
}

const PreparacionResumenCard: React.FC<Props> = ({
  preparacion,
  producciones,
  cantidadPropuesta = 10,
  disponible = true, // Por defecto se asume disponible si no lo calculan fuera
}) => {
  // Suma todas las entradas y salidas
  const entradas = producciones
    .filter(p => p.tipo === 'entrada' || p.tipo === 'inicial')
    .reduce((sum, p) => sum + p.cantidad, 0)
  const salidas = producciones
    .filter(p => p.tipo === 'salida')
    .reduce((sum, p) => sum + p.cantidad, 0)
  const inventario = entradas - salidas

  return (
    <Box
      flex="1 1 320px"
      maxWidth={360}
      minWidth={260}
      sx={{
        mb: 2,
        borderRadius: 4,
        boxShadow: 5,
        bgcolor: disponible ? '#e8f5e9' : '#fff3e0',
        borderLeft: `6px solid ${disponible ? '#43a047' : '#ffa726'}`,
        display: 'flex',
        flexDirection: 'column',
        transition: '0.18s',
        '&:hover': {
          boxShadow: 10,
          bgcolor: disponible ? '#66bb6a' : '#ffb74d',
          color: 'white'
        }
      }}
    >
      <Box p={2}>
        <Typography fontWeight={900} fontSize={20} color="inherit" mb={1}>
          {preparacion.nombre}
        </Typography>
        <Typography fontSize={15} mb={1}>
          Producción registrada:{' '}
          <b>
            {entradas > 0
              ? `${entradas} (Entradas${salidas ? `, ${salidas} Salidas` : ''})`
              : 'No hay producción'}
          </b>
        </Typography>
        <Typography fontSize={15} mb={1}>
          Inventario actual: <b>{inventario}</b>
        </Typography>
        <Typography fontSize={15} mb={1} color="info.main">
          Propuesta: <b>{cantidadPropuesta}</b>
        </Typography>
        <Box mt={2}>
          <Chip
            label={disponible ? '¡Todo bien!' : '¡Falta producción (o insumo hijo)!'}
            color={disponible ? 'success' : 'warning'}
            sx={{
              fontWeight: 700,
              fontSize: 16,
              px: 2,
              py: 1,
              fontFamily: 'inherit',
              letterSpacing: 0.5,
              borderRadius: 2
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default PreparacionResumenCard
