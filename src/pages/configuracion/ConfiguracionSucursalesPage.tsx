import React, { useEffect, useState } from 'react'
import { Box, Typography, Button, Paper, Stack } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useAuthStore } from '../../config/stores/useAuthStore'
import { upsertSucursal, useFetchSucursales } from '../../config/hooks/useFetchFunctions'
import type { Sucursal } from '../../config/types'
import Spinner from '../../components/general/Spinner'
import SucursalCard from '../../components/configuracion/sucursales/SucursalCard'
import SucursalModal from '../../components/configuracion/sucursales/SucursalModal'

const ConfiguracionSucursalesPage: React.FC = () => {
  const { user } = useAuthStore()
  const initialSucursal: Sucursal = {
    id: crypto.randomUUID(),
    userid: user?.id ?? '',  
    nombre: '',
    ubicacion: '',
    telefono: '',
    turnos: [],
    imagenes: [],
  }
  const [loading, setLoading] = useState(false)
  const { sucursales, fetchSucursales } = useFetchSucursales()
  const [modalOpen, setModalOpen] = useState(false)
  const [sucursal, setSucursal] = useState<Sucursal>(initialSucursal)

  useEffect(() => {
    fetchSucursales()
  }, [fetchSucursales])

  const handleAdd = () => {
    setSucursal({
      ...initialSucursal,
      id: crypto.randomUUID(), // siempre id único nuevo para alta
    })
    setModalOpen(true)
  }

  const handleEdit = (s: Sucursal) => {
    setSucursal(s)
    setModalOpen(true)
  }

  const handleSave = async (sucursal: Sucursal) => {
    setLoading(true)
    try {
      if (sucursal.id) {
        await upsertSucursal(sucursal)
      }
    } finally {
      await fetchSucursales()
      setSucursal(initialSucursal)
      setModalOpen(false)
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSucursal(initialSucursal)
    setModalOpen(false)
    setLoading(false)
  }

  return (
    <>
      {loading && <Spinner open />}
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700} flex={1}>
            Configuración de Sucursales
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            color="primary"
            sx={{
              borderRadius: 3,
              fontWeight: 600,
              fontSize: 16,
              boxShadow: 1,
              textTransform: 'none'
            }}
            onClick={handleAdd}
          >
            Agregar Sucursal
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {sucursales.length === 0 && (
            <Paper sx={{ p: 5, textAlign: 'center', color: 'text.disabled', fontStyle: 'italic' }}>
              No hay sucursales registradas aún.
            </Paper>
          )}
          {sucursales.map(s => (
            <Paper
              key={s.id}
              elevation={3}
              sx={{
                borderRadius: 4,
                p: 2,
                bgcolor: '#fff',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 8, bgcolor: '#f2f7fa' }
              }}
            >
              <SucursalCard sucursal={s} onEdit={handleEdit} />
            </Paper>
          ))}
        </Box>
      </Box>

      <SucursalModal
        open={modalOpen}
        onSave={handleSave}
        onClose={handleClose}
        sucursal={sucursal}
        setSucursal={setSucursal}
      />
    </>
  )
}

export default ConfiguracionSucursalesPage
