import React from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Avatar,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import { useAuthStore } from '../config/stores/useAuthStore'

const HomePage: React.FC = () => {
  const { role, user, loading } = useAuthStore()

  if (loading || !role) return <div>Cargando…</div>

  return (
    <Box sx={{ p: 4, maxWidth: '1000px', margin: '0 auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        ¡Hola, {user?.nombre || 'Usuario'}!
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar color="primary">
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1">
              Rol actual: <strong>{role.tipo}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Áreas asignadas: {user?.areas?.join(', ') || 'Ninguna'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {role.tipo === 'Gerente' ? (
        <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6">Accesos rápidos</Typography>
          <Grid container spacing={2} mt={1}>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              fullWidth
              href="/usuarios"
            >
              Gestión de usuarios
            </Button>
          </Grid>
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6">Accesos para tu rol</Typography>
          <Typography variant="body2">
            Desde el menú puedes acceder a las funciones según tu rol y áreas asignadas.
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default HomePage
