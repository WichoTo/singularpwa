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
  Alert,
  Skeleton,
  Fade,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { motion } from 'framer-motion'
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

  // 🎨 Calcular duración del turno
  const duracionTurno = useMemo(() => {
    if (!turnoActivoRemoto?.fechainicio) return null
    const inicio = new Date(turnoActivoRemoto.fechainicio)
    const ahora = new Date()
    const diff = ahora.getTime() - inicio.getTime()
    const horas = Math.floor(diff / (1000 * 60 * 60))
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }, [turnoActivoRemoto])

  // 🎨 Loading con skeleton más atractivo
  if (loadingTurnos) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
        </Stack>
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        {/* 🎨 Header mejorado con más información */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={800}>
              Turno
            </Typography>
            <Chip
              label={selectedSucursal?.nombre ?? 'Sin sucursal'}
              color="primary"
              variant="outlined"
              size="small"
            />
            {turnoActivoRemoto && duracionTurno && (
              <Chip
                icon={<AccessTimeIcon />}
                label={duracionTurno}
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
          
          {turnoActivoRemoto && (
            <Tooltip title="Cerrar y registrar efectivo final" arrow>
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
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
              >
                Cerrar Turno
              </Button>
            </Tooltip>
          )}
        </Stack>

        {/* 🎨 Alerta informativa cuando hay turno activo */}
        {turnoActivoRemoto && (
          <Fade in>
            <Alert 
              severity="info" 
              icon={<InfoOutlinedIcon />}
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <IconButton size="small" color="inherit">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              }
            >
              <Typography variant="body2" fontWeight={600}>
                Turno iniciado por {turnoActivoRemoto.userid || 'Usuario'}
              </Typography>
              <Typography variant="caption">
                Efectivo inicial: ${turnoActivoRemoto.efectivoInicial?.toFixed(2) || '0.00'}
              </Typography>
            </Alert>
          </Fade>
        )}

        {turnoActivoRemoto ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <TurnoActivoComponent
              sucursalid={turnoActivoRemoto.sucursalid}
              turnoid={turnoActivoRemoto.id}
              turnoActivo={turnoActivoRemoto}
              mesas={mesas}
              menu={menu}
              userid={userid}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight={{ xs: 300, md: 400 }}
              gap={2}
              sx={{
                borderRadius: 4,
                bgcolor: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                maxWidth: 520,
                mx: 'auto',
                p: 5,
                mt: 6,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <PlayCircleFilledWhiteIcon 
                  sx={{ 
                    fontSize: 80, 
                    color: 'primary.main',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                  }} 
                />
              </motion.div>
              
              <Typography 
                variant="h4" 
                fontWeight={900} 
                color="primary.main" 
                textAlign="center"
                sx={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                  letterSpacing: '-0.5px',
                }}
              >
                Inicia tu turno
              </Typography>
              
              <Typography 
                color="text.secondary" 
                sx={{ 
                  mb: 2, 
                  textAlign: 'center', 
                  fontSize: 17,
                  maxWidth: 400,
                  lineHeight: 1.6,
                }}
              >
                Registra el efectivo inicial y comienza a gestionar las operaciones del día
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip 
                  label="📊 Control total" 
                  sx={{ fontWeight: 600 }}
                />
                <Chip 
                  label="💰 Caja registrada" 
                  sx={{ fontWeight: 600 }}
                />
                <Chip 
                  label="⚡ Tiempo real" 
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Button
                size="large"
                variant="contained"
                onClick={handleOpenTurnoClick}
                startIcon={<PlayCircleFilledWhiteIcon />}
                sx={{
                  mt: 3,
                  px: 6,
                  py: 2,
                  fontWeight: 900,
                  fontSize: 19,
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(25, 118, 210, 0.4)',
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': { 
                    bgcolor: 'primary.dark',
                    boxShadow: '0 12px 32px rgba(25, 118, 210, 0.5)',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                }}
                disabled={!sucursalid || !userid}
              >
                Abrir Turno Ahora
              </Button>

              {(!sucursalid || !userid) && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="caption">
                    Selecciona una sucursal para continuar
                  </Typography>
                </Alert>
              )}
            </Box>
          </motion.div>
        )}
      </Box>

      {/* 🎨 Modal ABRIR con mejor diseño */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: 'white', 
            bgcolor: 'primary.main',
            fontWeight: 900,
            fontSize: 24,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <PlayCircleFilledWhiteIcon sx={{ fontSize: 32 }} />
          Abrir nuevo turno
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 3 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Registra el efectivo disponible al inicio del turno
          </Alert>
          <TextField
            autoFocus
            label="Efectivo inicial en caja"
            type="number"
            fullWidth
            value={turnoDraft?.efectivoInicial ?? 0}
            onChange={e =>
              setTurnoDraft(prev => (prev ? { ...prev, efectivoInicial: Number(e.target.value) } : prev))
            }
            inputProps={{ 
              min: 0,
              step: 0.01,
            }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 20,
                fontWeight: 600,
              }
            }}
            helperText="Cuenta todo el efectivo disponible antes de iniciar"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            size="large"
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleConfirmStart}
            disabled={!turnoDraft || !sucursalid || !userid || saving}
            startIcon={saving ? null : <PlayCircleFilledWhiteIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              boxShadow: 3,
            }}
          >
            {saving ? 'Iniciando turno...' : 'Iniciar Turno'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🎨 Modal CERRAR con advertencias visuales */}
      <Dialog
        open={openCerrarDialog}
        onClose={() => setOpenCerrarDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: 'white', 
            bgcolor: 'error.main',
            fontWeight: 900,
            fontSize: 24,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <StopCircleIcon sx={{ fontSize: 32 }} />
          Cerrar Turno
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 3 }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              ⚠️ Esta acción no se puede deshacer
            </Typography>
            <Typography variant="caption">
              Verifica cuidadosamente el efectivo final antes de confirmar
            </Typography>
          </Alert>

          {turnoActivoRemoto && (
            <Box 
              sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Efectivo inicial:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    ${turnoActivoRemoto.efectivoInicial?.toFixed(2) || '0.00'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Duración del turno:
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {duracionTurno}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          <TextField
            autoFocus
            label="Efectivo final en caja"
            type="number"
            fullWidth
            value={efectivoFinal}
            onChange={(e) => setEfectivoFinal(Number(e.target.value))}
            inputProps={{ 
              min: 0,
              step: 0.01,
            }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 20,
                fontWeight: 600,
              }
            }}
            helperText="Cuenta todo el efectivo disponible al cerrar"
          />

          {/* 🎨 Mostrar diferencia si hay efectivo inicial */}
          {turnoActivoRemoto && efectivoFinal > 0 && (
            <Alert 
              severity={
                efectivoFinal >= (turnoActivoRemoto.efectivoInicial || 0) 
                  ? 'success' 
                  : 'error'
              } 
              sx={{ mt: 2, borderRadius: 2 }}
            >
              <Typography variant="body2" fontWeight={600}>
                Diferencia: ${(efectivoFinal - (turnoActivoRemoto.efectivoInicial || 0)).toFixed(2)}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setOpenCerrarDialog(false)}
            size="large"
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={handleConfirmCerrar}
            disabled={savingCerrar || efectivoFinal < 0}
            startIcon={savingCerrar ? null : <StopCircleIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              boxShadow: 3,
            }}
          >
            {savingCerrar ? 'Cerrando turno...' : 'Confirmar Cierre'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TurnoPage
