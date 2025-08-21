// src/pages/ProduccionPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useSucursal } from '../../config/context/SucursalContext'
import { useFetchWorkAreas } from '../../config/hooks/useFetchFunctions'
import WorkAreaTab from '../../components/produccion/WorkAreaTab' // ⬅️ usa el componente

const ProduccionPage: React.FC = () => {
  const { selectedSucursal } = useSucursal()
  const sucursalid = selectedSucursal?.id ?? ''

  // Trae las áreas de la sucursal seleccionada
  const { workAreas, loading, error, fetchWorkAreas } = useFetchWorkAreas(sucursalid)

  // Ordenar por orden/nombre
  const areas = useMemo(
    () =>
      (workAreas ?? [])
        .slice()
        .sort(
          (a, b) =>
            (a.orden ?? 1e9) - (b.orden ?? 1e9) ||
            (a.nombre ?? '').localeCompare(b.nombre ?? '')
        ),
    [workAreas]
  )

  // Índice del área activa (una sola barra de tabs)
  const [areaIndex, setAreaIndex] = useState(0)

  // Reset al cambiar sucursal o cuando cambia la cantidad de áreas
  useEffect(() => {
    setAreaIndex(0)
  }, [sucursalid])
  useEffect(() => {
    if (areaIndex > areas.length - 1) setAreaIndex(0)
  }, [areas.length, areaIndex])

  return (
    <Box sx={{ bgcolor: '#f9fafc', minHeight: '100vh', py: 2 }}>
      <Box maxWidth={1100} mx="auto" px={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h5" fontWeight={900}>
            Producción · {selectedSucursal?.nombre ?? 'Selecciona una sucursal'}
          </Typography>

          {sucursalid && (
            <Tooltip title="Actualizar áreas">
              <IconButton onClick={() => fetchWorkAreas()} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {!sucursalid && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No hay sucursal seleccionada. Elige una sucursal para ver sus áreas de trabajo.
            </Typography>
          </Paper>
        )}

        {sucursalid && loading && (
          <Typography sx={{ mt: 2 }}>Cargando áreas de trabajo…</Typography>
        )}

        {sucursalid && !loading && error && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography color="error">Error: {error}</Typography>
          </Paper>
        )}

        {sucursalid && !loading && !error && areas.length === 0 && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Esta sucursal aún no tiene áreas configuradas.
            </Typography>
          </Paper>
        )}

        {sucursalid && !loading && !error && areas.length > 0 && (
          <>
            {/* 🔹 UNA sola barra de tabs: una pestaña por área */}
            <Tabs
              value={areaIndex}
              onChange={(_, v) => setAreaIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              indicatorColor="primary"
              textColor="primary"
              sx={{
                mb: 2,
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' },
              }}
            >
              {areas.map((a) => (
                <Tab key={a.id} label={a.nombre} />
              ))}
            </Tabs>

            {/* Contenido del área activa: WorkAreaTab con pestañas vacías */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={800} mb={1}>
                Área: {areas[areaIndex]?.nombre}
              </Typography>

              {areas[areaIndex] && (
                <WorkAreaTab
                  sucursalid={sucursalid}
                  area={areas[areaIndex]}
                  initialTab="pedidos"
                />
              )}
            </Paper>
          </>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.secondary">
          Tip: La barra superior cambia el área; dentro, WorkAreaTab muestra “Pedidos / Producción”.
        </Typography>
      </Box>
    </Box>
  )
}

export default ProduccionPage
