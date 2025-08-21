// src/components/common/StatusChip.tsx
import React, { useEffect } from 'react'
import {
  Fade,
  Box,
  Typography,
  IconButton,
  useTheme,
  Paper,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

export type ChipStatus = 'success' | 'warning' | 'error'

interface StatusChipProps {
  message: string
  status: ChipStatus
  open: boolean
  onAccept: () => void
  onCancel: () => void
  direction?: 'down' | 'left' | 'up' | 'right'
}

const StatusChip: React.FC<StatusChipProps> = ({
  message,
  status,
  open,
  onAccept,
  onCancel,
}) => {
  const theme = useTheme()

  // Cierra automáticamente tras 5 segundos
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onCancel, 5000)
    return () => clearTimeout(timer)
  }, [open, onCancel])

  // Mapea el status a un color de círculo
  const circleColor = React.useMemo(() => {
    switch (status) {
      case 'success':
        return theme.palette.success.main
      case 'warning':
        return theme.palette.warning.main
      case 'error':
        return theme.palette.error.main
      default:
        return theme.palette.grey[500]
    }
  }, [status, theme])

  if (!open) return null

  return (
    <>
      {/* Fondo gris semitransparente */}
      <Box
        onClick={onCancel}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: theme.zIndex.snackbar,
        }}
      />

      {/* Chip con fade */}
      <Fade in={open}>
        <Box
          sx={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: theme.zIndex.snackbar + 1,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              pl: 2.5,
              borderRadius: '20px',
              bgcolor: theme.palette.background.paper,
              boxShadow: theme.shadows[6],
              minWidth: 300,
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: circleColor,
                mr: 2,
              }}
            />

            <Typography variant="body1" sx={{ flexGrow: 1, fontSize: '1rem' }}>
              {message}
            </Typography>

            <IconButton
              size="medium"
              onClick={onAccept}
              aria-label="Aceptar"
              sx={{
                color: theme.palette.success.main,
                '&:hover': {
                  bgcolor: `${theme.palette.success.light}20`,
                },
                ml: 1,
              }}
            >
              <CheckIcon fontSize="medium" />
            </IconButton>

            <IconButton
              size="medium"
              onClick={onCancel}
              aria-label="Cancelar"
              sx={{
                color: theme.palette.error.main,
                '&:hover': {
                  bgcolor: `${theme.palette.error.light}20`,
                },
                ml: 1,
              }}
            >
              <CloseIcon fontSize="medium" />
            </IconButton>
          </Paper>
        </Box>
      </Fade>
    </>
  )
}

export default StatusChip
