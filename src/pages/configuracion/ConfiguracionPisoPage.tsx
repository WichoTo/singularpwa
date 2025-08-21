// src/pages/ConfiguracionPisoPage.tsx
import React, { useState, useCallback } from 'react'
import { Box, Button, Typography, Stack, Paper } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import type { Mesa } from '../../config/types'
import { useAuthStore } from '../../config/stores/useAuthStore'
import { useSucursal } from '../../config/context/SucursalContext'
import Spinner from '../../components/general/Spinner'
import { useFetchMesas, upsertMesa } from '../../config/hooks/useFetchFunctions'
import MesasCard from '../../components/configuracion/mesas/MesaCard'
import MesaModal from '../../components/configuracion/mesas/MesaModal'

const ConfiguracionPisoPage: React.FC = () => {
  const { user } = useAuthStore()
  const { selectedSucursal } = useSucursal()
  const sucursalId = selectedSucursal?.id ?? ''
  const { mesas } = useFetchMesas(sucursalId)

  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [mesa, setMesa] = useState<Mesa | null>(null)

  // Factory para crear una mesa nueva cuando haga falta
  const createNewMesa = useCallback((): Mesa => ({
    id: crypto.randomUUID(),
    userid: user?.id ?? '',
    sucursalid: sucursalId,
    nomesa: '',
    comensales: 0,
    area: '',
  }), [user?.id, sucursalId])

  const handleAdd = () => {
    if (!sucursalId) return // opcional: aviso al usuario
    setMesa(createNewMesa())
    setModalOpen(true)
  }

  const handleEdit = (m: Mesa) => {
    // garantiza que siempre lleve sucursalid
    setMesa({ ...m, sucursalid: sucursalId || m.sucursalid })
    setModalOpen(true)
  }

  const handleSave = async (m: Mesa) => {
    setLoading(true)
    try {
      await upsertMesa({ ...m, sucursalid: sucursalId || m.sucursalid })
    } catch (err) {
      console.error(err)
    } finally {
      setModalOpen(false)
      setMesa(null)
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMesa(null)
    setModalOpen(false)
  }

  return (
    <>
      {loading && <Spinner open />}
      <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              Configuración de Piso
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Administra las mesas de tu sucursal y mantenlas organizadas.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddCircleOutlineIcon />}
            size="large"
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 17, px: 3, borderRadius: 3, boxShadow: 1, minWidth: 180 }}
            onClick={handleAdd}
            disabled={!sucursalId}
          >
            Agregar Mesa
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ bgcolor: '#fafbfc', borderRadius: 4, p: { xs: 1, sm: 2, md: 3 }, minHeight: 300 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: { xs: 'center', md: 'flex-start' },
              minHeight: 260,
            }}
          >
            {(!mesas || mesas.length === 0) && (
              <Box sx={{ color: 'text.disabled', textAlign: 'center', fontStyle: 'italic', py: 8, fontSize: 18, width: '100%' }}>
                No hay mesas registradas.
              </Box>
            )}
            {mesas && mesas.map(m => (
              <Box key={m.id} sx={{ flex: '1 0 230px', maxWidth: 270, minWidth: 210, mb: 2 }}>
                <MesasCard mesa={m} onEdit={handleEdit} />
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Render condicional del modal para evitar efectos innecesarios */}
        {modalOpen && mesa && (
          <MesaModal
            open={modalOpen}
            mesa={mesa}
            setMesa={setMesa}
            onSave={handleSave}
            onClose={handleClose}
            selectedSucursal={selectedSucursal}
          />
        )}
      </Box>
    </>
  )
}

export default ConfiguracionPisoPage
