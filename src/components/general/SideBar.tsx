// src/components/Sidebar.tsx
import React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import { routesNav } from '../../config/routes'
import { type Role } from '../../config/types'
import { logout } from '../../config/auth'

interface SidebarProps {
  visible: boolean
  role: Role
  onClose: () => void
}
const drawerWidth = 250

// helpers para asegurar paths ABSOLUTOS y sin // dobles
const clean = (p: string) => p.replace(/^\/|\/$/g, '')
const abs = (p: string) => `/${clean(p)}`

const Sidebar: React.FC<SidebarProps> = ({ visible, role, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!visible) return null

  const allowedRoutes = routesNav
    .filter(route => !route.rol || route.rol.includes(role.tipo))
    .map(route => ({
      ...route,
      children: route.children?.filter(child => !child.rol || child.rol.includes(role.tipo)) ?? []
    }))

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 1050,
        }}
      />

      {/* Drawer */}
      <aside
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '100px',
          left: 0,
          width: `${drawerWidth}px`,
          height: `calc(100vh - 100px)`,
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1100,
        }}
      >
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {allowedRoutes.map((route, idx) => {
              const parentPath = abs(route.path) // ej: "/configuracion" o "/inicio"
              const activeParent = location.pathname === parentPath
              return (
                <li key={idx} style={{ marginBottom: '1rem' }}>
                  <NavLink
                    to={parentPath}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: activeParent ? '#000' : '#fff',
                      backgroundColor: activeParent ? '#fff' : 'transparent',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    {route.icon && <route.icon style={{ marginRight: '0.5rem' }} />}
                    {route.name}
                  </NavLink>

                  {route.children.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: '0.5rem' }}>
                      {route.children.map((child, cidx) => {
                        const fullChildPath = `${parentPath}/${clean(child.path)}` // ej: "/configuracion/usuarios"
                        const activeChild = location.pathname === fullChildPath
                        return (
                          <li key={cidx} style={{ margin: '0.25rem 0' }}>
                            <NavLink
                              to={fullChildPath}
                              onClick={onClose}
                              style={{
                                display: 'block',
                                padding: '0.4rem 0.5rem',
                                paddingLeft: '2rem',
                                borderRadius: '4px',
                                color: activeChild ? '#000' : '#fff',
                                backgroundColor: activeChild ? '#fff' : 'transparent',
                                textDecoration: 'none',
                              }}
                            >
                              {child.icon && <child.icon fontSize="small" style={{ marginRight: '0.5rem' }} />}
                              {child.name}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}

            <li style={{ marginTop: 'auto' }}>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 1rem',
                  width: '100%',
                }}
              >
                <ExitToAppIcon fontSize="small" style={{ marginRight: '0.5rem' }} />
                Cerrar sesión
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
