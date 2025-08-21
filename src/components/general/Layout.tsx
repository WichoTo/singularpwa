// src/components/general/Layout.tsx
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  Box, AppBar, Toolbar, useTheme, FormControl,
  InputLabel, Select, MenuItem,
} from '@mui/material'
import Sidebar from './SideBar'
import HamburguerMenu from './HamburguerMenu'
import { logoprincipal, routesNav } from '../../config/routes'
import type { RouteConfig } from '../../config/routes'
import { useSucursal } from '../../config/context/SucursalContext'
import { useAuthStore } from '../../config/stores/useAuthStore'

const drawerWidth = 250

const Layout: React.FC = () => {
  const { role, loading } = useAuthStore()
  const theme = useTheme()
  const location = useLocation()
  const { sucursales, selectedSucursal, setSelectedSucursal } = useSucursal()

  const [sidebarVisible, setSidebarOpen] = useState(false)
  if (loading) return null
  const toggleSidebar = () => setSidebarOpen(open => !open)

  // 🔧 Normaliza y separa segmentos de la URL
  const segments = location.pathname
    .replace(/^\/+|\/+$/g, '')   // quita slashes inicial/final
    .split('/')
    .filter(Boolean)

  // Busca el padre por el primer segmento (case-insensitive)
  const parent =
    routesNav.find(r => r.path.toLowerCase() === (segments[0] ?? '').toLowerCase())

  // Si hay hijo y el padre tiene children, busca el hijo por el segundo segmento
  let currentRoute: RouteConfig | undefined = parent
  if (parent?.children && segments[1]) {
    const child = parent.children.find(
      c => c.path.toLowerCase() === segments[1].toLowerCase()
    )
    if (child) currentRoute = child
  }

  // Si solo hay ruta top-level (sin hijo), currentRoute ya es el padre
  // Si no encontró nada, currentRoute queda undefined

  const showSelector = !!currentRoute && !currentRoute.hideSucursalSelector

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, background: 'var(--color-primary)' }}>
        <Toolbar>
          <HamburguerMenu onToggle={toggleSidebar} />
          <img src={logoprincipal} alt="Logo La Singular" style={{ maxWidth: '160px', marginBottom: '1rem' }} />

          {showSelector && (
            <FormControl size="small" sx={{ minWidth: 150, ml: 2 }}>
              <InputLabel sx={{ color: '#fff' }}>Sucursal</InputLabel>
              <Select
                value={selectedSucursal?.id || ''}
                label="Sucursal"
                onChange={e => {
                  const sel = sucursales.find(s => s.id === e.target.value)
                  if (sel) setSelectedSucursal(sel)
                }}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' } }}
              >
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Toolbar>
      </AppBar>

      {sidebarVisible && <Sidebar visible role={role!} onClose={() => setSidebarOpen(false)} />}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 10,
          ml: { xs: 0, sm: sidebarVisible ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout
