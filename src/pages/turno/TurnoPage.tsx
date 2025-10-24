// src/pages/turno/TurnoPage.tsx
import React, { useMemo, useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Stack,
} from '@mui/material'
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { useSucursal } from '../../config/context/SucursalContext'
import { useAuthStore } from '../../config/stores/useAuthStore'
import type { TurnoActivo } from '../../config/types'
import TurnoActivoComponent from '../../components/turno/TurnoActivoComponent'

// hooks offline-aware
import {
  useFetchTurno,
  upsertTurnoActivo,
  useFetchMenu,
  useFetchMesas,
} from '../../config/hooks/useFetchFunctions'

// 👇 Realtime (nombrado)
import { startTurnoRealtime } from '../../config/offline/live'

const TurnoPage: React.FC = () => {
  const { selectedSucursal } = useSucursal()
  const { user } = useAuthStore()

  const sucursalid = selectedSucursal?.id ?? ''
  const userid = user?.id ?? ''

  const { menu } = useFetchMenu()
  const { mesas } = useFetchMesas(sucursalid)

  // Turnos desde BD (y revalidación)
  const { turnos, loading: loadingTurnos, fetchTurno } = useFetchTurno(sucursalid)

  const turnoActivoRemoto = useMemo(
    () => (turnos ?? []).find(t => t.abierto) ?? null,
    [turnos]
  )

  // ⬇️ Suscripción realtime por turnoid (se monta/limpia sola)
  useEffect(() => {
    if (!turnoActivoRemoto?.id) return
    const stop = startTurnoRealtime(turnoActivoRemoto.id)
    return stop
  }, [turnoActivoRemoto?.id])

  // ⬇️ Si tu capa offline dispara el CustomEvent, aquí forzamos revalidar
  useEffect(() => {
    const handler = () => {
      // Relee turnos (por si cerraron/abrieron desde otro cliente)
      fetchTurno()
    }
    window.addEventListener('turno-cache-updated', handler)
    return () => window.removeEventListener('turno-cache-updated', handler)
  }, [fetchTurno])

  // Estado local de modal ABRIR
  const [turnoDraft, setTurnoDraft] = useState<TurnoActivo | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado local de modal CERRAR
  const [openCerrarDialog, setOpenCerrarDialog] = useState(false)
  const [efectivoFinal, setEfectivoFinal] = useState(0)
  const [savingCerrar, setSavingCerrar] = useState(false)

  const handleOpenTurnoClick = () => {
    if (!sucursalid || !userid) return
    setTurnoDraft({
      id: crypto.randomUUID(),
      sucursalid,
      userid,
      abierto: true,
      fechainicio: new Date().toISOString(),
      efectivoInicial: 0,
    })
    setOpenDialog(true)
  }

  const handleConfirmStart = async () => {
    if (!turnoDraft) return
    setSaving(true)
    try {
      // Guarda offline/online
      await upsertTurnoActivo(turnoDraft)

      // Cierra modal y limpia draft
      setOpenDialog(false)
      setTurnoDraft(null)

      // Revalida inmediatamente (la suscripción realtime cubrirá los siguientes cambios)
      await fetchTurno()
    } finally {
      setSaving(false)
    }
  }

  const handleCerrarTurnoClick = () => {
    setEfectivoFinal(0)
    setOpenCerrarDialog(true)
  }

  const handleConfirmCerrar = async () => {
    if (!turnoActivoRemoto) return
    setSavingCerrar(true)
    try {
      // Guarda el turno como cerrado
      await upsertTurnoActivo({
        ...turnoActivoRemoto,
        abierto: false,
        fechafin: new Date().toISOString(),
        efectivoFinal,
      })

      // Cierra modal
      setOpenCerrarDialog(false)

      // Revalida inmediatamente
      await fetchTurno()
    } finally {
      setSavingCerrar(false)
    }
  }

  if (loadingTurnos) return <Box sx={{ p: 3 }}>Cargando…</Box>

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800}>
            Turno — {selectedSucursal?.nombre ?? 'Sin sucursal'}
          </Typography>
          
          {/* Botón cerrar turno en el header */}
          {turnoActivoRemoto && (
            <Button
              variant="outlined"
              color="error"
              size="medium"
              startIcon={<StopCircleIcon />}
              onClick={handleCerrarTurnoClick}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
              }}
            >
              Cerrar Turno
            </Button>
          )}
        </Stack>

        {turnoActivoRemoto ? (
          <TurnoActivoComponent
            sucursalid={turnoActivoRemoto.sucursalid}
            turnoid={turnoActivoRemoto.id}
            turnoActivo={turnoActivoRemoto}
            mesas={mesas}
            menu={menu}
            userid={userid}
          />
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight={{ xs: 220, md: 300 }}
            gap={3}
            sx={{
              borderRadius: 3,
              bgcolor: '#e3f2fd',
              boxShadow: 2,
              maxWidth: 460,
              mx: 'auto',
              p: 4,
              mt: 6,
            }}
          >
            <PlayCircleFilledWhiteIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={800} color="primary.main" mb={1}>
              Abrir turno de caja
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center', fontSize: 16 }}>
              Inicia un nuevo turno para comenzar la operación del día.
              Registra el efectivo inicial y ¡manos a la obra!
            </Typography>
            <Button
              size="large"
              variant="contained"
              onClick={handleOpenTurnoClick}
              startIcon={<PlayCircleFilledWhiteIcon />}
              sx={{
                px: 5,
                py: 1.5,
                fontWeight: 800,
                fontSize: 18,
                borderRadius: 2,
                boxShadow: 4,
                textTransform: 'none',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark', boxShadow: 8, transform: 'scale(1.03)' },
              }}
              disabled={!sucursalid || !userid}
            >
              Abrir Turno
            </Button>
          </Box>
        )}
      </Box>

      {/* Modal ABRIR turno */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'white', bgcolor: 'var(--color-primary)', fontWeight: 800 }}>
          Abrir nuevo turno
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Efectivo inicial"
            type="number"
            fullWidth
            value={turnoDraft?.efectivoInicial ?? 0}
            onChange={e =>
              setTurnoDraft(prev => (prev ? { ...prev, efectivoInicial: Number(e.target.value) } : prev))
            }
            sx={{ mt: 2 }}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmStart}
            disabled={!turnoDraft || !sucursalid || !userid || saving}
          >
            {saving ? 'Guardando…' : 'Abrir Turno'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal CERRAR turno */}
      <Dialog
        open={openCerrarDialog}
        onClose={() => setOpenCerrarDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: 'white', bgcolor: 'error.main', fontWeight: 800 }}>
          Cerrar Turno
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 3 }}>
            ¿Estás seguro de cerrar el turno? Esta acción no se puede deshacer.
          </Typography>
          <TextField
            autoFocus
            label="Efectivo final en caja"
            type="number"
            fullWidth
            value={efectivoFinal}
            onChange={(e) => setEfectivoFinal(Number(e.target.value))}
            inputProps={{ min: 0 }}
            helperText="Ingresa el monto total de efectivo al cerrar"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCerrarDialog(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCerrar}
            disabled={savingCerrar}
          >
            {savingCerrar ? 'Cerrando…' : 'Confirmar Cierre'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TurnoPage
