// src/components/UsuarioModal.tsx
import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormGroup,
  FormControlLabel,
  IconButton,
  Chip,
  Stack,
  Fade,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ROLES, type Sucursal, type User } from '../../../config/types'

interface UsuarioModalProps {
  open: boolean
  usuario: User
  sucursales: Sucursal[]
  setUsuario: React.Dispatch<React.SetStateAction<User>>
  onCancel: () => void
  onSave: () => void
}

const fallbackAreas = ['Cocina', 'Caja', 'Barra', 'Servicio']

// Helper para obtener el nombre de un área cuando puede venir como string u objeto
type WorkAreaLike = string | { id: string; nombre?: string; [k: string]: any }
const getAreaName = (a: WorkAreaLike): string =>
  typeof a === 'string' ? a : (a.nombre ?? String(a.id ?? ''))

const UsuarioModal: React.FC<UsuarioModalProps> = ({
  open,
  usuario,
  sucursales,
  setUsuario,
  onCancel,
  onSave,
}) => {
  // Asegurar arrays controlados
  const userAreas: string[] = usuario.areas ?? []
  const userSucursales: string[] = usuario.sucursales ?? []

  // Sucursales seleccionadas
  const selectedSucursales = sucursales.filter(s => userSucursales.includes(s.id))

  // Normalizar áreas disponibles: siempre como nombres (strings) y únicas
  const areasDisponibles: string[] = React.useMemo(() => {
    const names = selectedSucursales.flatMap(s =>
      (s as any).workAreas ? (s as any).workAreas.map(getAreaName) : []
    )
    const uniq = Array.from(new Set(names.filter(Boolean)))
    return uniq.length > 0 ? uniq : fallbackAreas
  }, [selectedSucursales])

  // Si cambian las sucursales o las áreas posibles, limpiar las áreas no válidas
  React.useEffect(() => {
    if (userAreas.some(area => !areasDisponibles.includes(area))) {
      setUsuario(prev => ({
        ...prev,
        areas: (prev.areas ?? []).filter(a => areasDisponibles.includes(a)),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSucursales.join(','), areasDisponibles.join(',')])

  const handleField = (field: keyof User, value: any) => {
    setUsuario({ ...usuario, [field]: value })
  }

  const handleSucursalToggle = (id: string) => {
    const updated = userSucursales.includes(id)
      ? userSucursales.filter(x => x !== id)
      : [...userSucursales, id]
    setUsuario({ ...usuario, sucursales: updated })
  }

  // Derivar la KEY del rol actual para que el Select tenga el value correcto
  const rolKey = React.useMemo(() => {
    const entry = Object.entries(ROLES).find(
      ([, rolObj]) => rolObj.tipo === usuario.rol?.tipo
    )
    return entry?.[0] ?? ''
  }, [usuario.rol])

  const rolTipoActual = usuario.rol?.tipo ?? ''

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return
        onCancel()
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 5 } }}
      disableEscapeKeyDown
      TransitionComponent={Fade}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            {usuario.id ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Typography>
          <IconButton size="small" onClick={onCancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent dividers sx={{ bgcolor: '#f9fafb', px: 3, py: 3 }}>
        {/* Datos Básicos */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, letterSpacing: 1.1 }}>
          Datos básicos
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Nombre"
            value={usuario.nombre ?? ''}
            onChange={e => handleField('nombre', e.target.value)}
            fullWidth
            autoFocus
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Correo"
            type="email"
            value={usuario.correo ?? ''}
            onChange={e => handleField('correo', e.target.value)}
            fullWidth
          />
          <TextField
            label="Teléfono"
            value={usuario.telefono ?? ''}
            onChange={e => handleField('telefono', e.target.value)}
            fullWidth
          />
        </Stack>

        {/* Selección de Rol */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, letterSpacing: 1.1 }}>
          Rol
        </Typography>

        <FormControl fullWidth>
          <InputLabel id="rol-label">Rol</InputLabel>
          <Select
            labelId="rol-label"
            label="Rol"
            value={rolKey}
            onChange={e => {
              const key = e.target.value as keyof typeof ROLES
              setUsuario({ ...usuario, rol: ROLES[key] })
            }}
          >
            {Object.entries(ROLES)
              .filter(([key]) => key !== 'Plataforma')
              .map(([key, rolObj]) => (
                <MenuItem key={key} value={key}>
                  {rolObj.tipo}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Áreas: solo para Usuario */}
        {rolTipoActual === 'Usuario' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1, letterSpacing: 1.1 }}
            >
              Áreas
            </Typography>

            <FormControl fullWidth>
              <InputLabel id="areas-label">Áreas</InputLabel>
              <Select
                labelId="areas-label"
                multiple
                value={userAreas}
                onChange={e => handleField('areas', e.target.value as string[])}
                renderValue={selected => (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(selected as string[]).map(area => (
                      <Chip key={area} label={area} color="primary" size="small" />
                    ))}
                  </Box>
                )}
              >
                {areasDisponibles.length > 0 ? (
                  areasDisponibles.map(areaName => (
                    <MenuItem key={areaName} value={areaName}>
                      <Checkbox checked={userAreas.includes(areaName)} />
                      <ListItemText primary={areaName} />
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    <ListItemText primary="Selecciona sucursales para ver áreas disponibles" />
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </>
        )}

        {/* Sucursales: para Usuario y Gerente */}
        {(rolTipoActual === 'Usuario' || rolTipoActual === 'Gerente') && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1, letterSpacing: 1.1 }}
            >
              Sucursales asignadas
            </Typography>

            <FormGroup>
              {sucursales.map(s => (
                <FormControlLabel
                  key={s.id}
                  control={
                    <Checkbox
                      checked={userSucursales.includes(s.id)}
                      onChange={() => handleSucursalToggle(s.id)}
                    />
                  }
                  label={s.nombre}
                  sx={{ mb: 0.5, pl: 1 }}
                />
              ))}
            </FormGroup>

            {/* Chips resumen de sucursales seleccionadas */}
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {userSucursales.length > 0 &&
                sucursales
                  .filter(s => userSucursales.includes(s.id))
                  .map(s => <Chip key={s.id} label={s.nombre} color="secondary" size="small" />)}
            </Box>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} variant="outlined" color="inherit" sx={{ fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button onClick={onSave} variant="contained" color="primary" sx={{ fontWeight: 700 }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UsuarioModal
