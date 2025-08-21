import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import GroupIcon from '@mui/icons-material/Group'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { ROLES, type User } from '../../config/types'
import Spinner from '../../components/general/Spinner'
import UsuarioModal from '../../components/configuracion/usuarios/UsuarioModal'
import { actualizarUsuario, useFetchSucursales, useFetchUsuarios } from '../../config/hooks/useFetchFunctions'

const UsuariosPage: React.FC = () => {
  const { usuarios, fetchUsuarios } = useFetchUsuarios()
  const { sucursales, fetchSucursales } = useFetchSucursales()
  const visibleUsers = usuarios.filter(u => u.rol?.tipo !== 'Plataforma')

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usuario, setUsuario] = useState<User>({
    id: '',
    nombre: '',
    correo: '',
    telefono: '',
    rol: ROLES.Usuario,
    areas: [],
    sucursales: [],
  })

  useEffect(() => {
    fetchUsuarios()
    fetchSucursales()
  }, [])

  const handleAddClick = () => {
    setUsuario({ id: '', nombre: '', correo: '', telefono: '', rol: ROLES.Usuario, areas: [], sucursales: [] })
    setOpen(true)
  }

  const handleSave = async () => {
  setLoading(true)
  try {
    // si no hay id, genera uno; si ya hay, respétalo
    const id = usuario.id && usuario.id.trim().length > 0 ? usuario.id : crypto.randomUUID()
    const payload: User = {
      ...usuario,
      id,
      correo: usuario.correo?.trim().toLowerCase(),
    }
    await actualizarUsuario(payload)
  } finally {
    setLoading(false)    
    setUsuario({ id: '', nombre: '', correo: '', telefono: '', rol: ROLES.Usuario, areas: [], sucursales: [] })
    setOpen(false)
  }
}

  const handleDelete = async (id: string) => {
    // Aquí puedes mostrar un confirm, un modal o implementar el delete real
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      // tu lógica de borrado aquí
      console.log(id)
    }
  }

  const handleViewClick = (u: User) => {
    setUsuario(u)
    setOpen(true)
  }

  if (loading) return <Spinner open={true} />

  // Cards resumen
  const uniqueRoles = [
    ...new Set(
      visibleUsers
        .map(u => u.rol?.tipo)
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
    )
  ];

  const adminCount = visibleUsers.filter(u => u.rol?.tipo?.toLowerCase().includes('admin')).length

  return (
    <Box sx={{ p: { xs: 1, sm: 3, md: 5 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} color="secondary.main" mb={0.5}>
        Usuarios registrados
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Administra y consulta los usuarios registrados en tu plataforma.
      </Typography>

      {/* Resumen rápido */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 2,
          mb: 3,
          justifyContent: { xs: 'center', sm: 'flex-start' },
        }}
      >
        <Paper sx={{ p: 2, textAlign: 'center', flex: 1, minWidth: 180, maxWidth: 300 }} elevation={0}>
          <GroupIcon fontSize="large" color="primary" />
          <Typography variant="subtitle2" color="text.secondary">Usuarios</Typography>
          <Typography variant="h5" fontWeight={600}>{visibleUsers.length}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', flex: 1, minWidth: 180, maxWidth: 300 }} elevation={0}>
          <SupervisorAccountIcon fontSize="large" color="secondary" />
          <Typography variant="subtitle2" color="text.secondary">Roles únicos</Typography>
          <Typography variant="h5" fontWeight={600}>{uniqueRoles.length}</Typography>
          <Stack direction="row" spacing={1} mt={0.5} justifyContent="center">
            {uniqueRoles.map(r => (
              <Chip key={r} label={r} size="small" color="secondary" variant="outlined" />
            ))}
          </Stack>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center', flex: 1, minWidth: 180, maxWidth: 300 }} elevation={0}>
          <AccountCircleIcon fontSize="large" sx={{ color: '#388e3c' }} />
          <Typography variant="subtitle2" color="text.secondary">Admins</Typography>
          <Typography variant="h5" fontWeight={600}>{adminCount}</Typography>
        </Paper>
      </Box>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          sx={{
            fontWeight: 700,
            borderRadius: 3,
            fontSize: 17,
            px: 3,
            minWidth: 180,
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' }
          }}
        >
          Nuevo usuario
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{
        borderRadius: 4,
        boxShadow: 1,
        bgcolor: '#fafbfc',
        overflowX: 'auto',
      }}>
        <Table size="medium" sx={{
          minWidth: 650,
          '& th': { position: 'sticky', top: 0, bgcolor: 'primary.main', color: 'common.white', zIndex: 2 },
          '& tr:hover': { bgcolor: 'grey.100' },
          '& td': { verticalAlign: 'middle' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleUsers.map(u => (
              <TableRow key={u.id} hover sx={{
                transition: 'background 0.2s',
                '&:nth-of-type(even)': { bgcolor: 'grey.50' }
              }}>
                <TableCell>{u.nombre}</TableCell>
                <TableCell>{u.correo}</TableCell>
                <TableCell>
                  <Chip label={u.rol?.tipo ?? '— sin rol —'} color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver o editar usuario">
                    <IconButton onClick={() => handleViewClick(u)} sx={{ mr: 1 }}>
                      <VisibilityIcon sx={{ color: 'primary.main' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar usuario">
                    <IconButton onClick={() => handleDelete(u.id)}>
                      <DeleteIcon sx={{ color: 'error.main' }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <UsuarioModal
        open={open}
        usuario={usuario}
        sucursales={sucursales}
        setUsuario={setUsuario}
        onCancel={() => setOpen(false)}
        onSave={handleSave}
      />
    </Box>
  )
}

export default UsuariosPage
