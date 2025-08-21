// src/App.tsx
import { Suspense, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/general/Layout'
import './styles/global.css'

import { useAuthStore } from './config/stores/useAuthStore'
import RequireAuth from './config/context/RequireAuth'
import RequireRole from './config/context/RequireRole'
import { StatusChipProvider } from './config/context/useStatusChip'
import { SucursalProvider } from './config/context/SucursalContext'
import LoginPage from './pages/LoginPage'
import { supabase } from './config/supabaseClient'
import { type RouteConfig, routesNav } from './config/routes'
import { initOfflineSyncListeners, processOutbox } from './config/offline'

// 👇 NUEVO: página pública para el QR
import PedidoMesaPage from './pages/turno/PedidoMesaPage'

// Helper para aplanar rutas (padre/hijo) para React Router
const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  const out: RouteConfig[] = []
  routes.forEach((r) => {
    out.push(r)
    if (r.children?.length) {
      r.children.forEach((c) => {
        out.push({
          ...c,
          path: `${r.path.replace(/\/$/, '')}/${c.path.replace(/^\//, '')}`,
        })
      })
    }
  })
  return out
}

function App() {
  const { loading, setSessionFromSupabase } = useAuthStore()

  // Bootstrap de sesión al montar
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        await setSessionFromSupabase(data.session)
      } else {
        useAuthStore.setState({ loading: false })
      }
    })()
  }, [setSessionFromSupabase])

  // Suscripción a cambios de sesión
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionFromSupabase(session)
      } else {
        useAuthStore.setState({ session: null, user: null, role: null, loading: false })
      }
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [setSessionFromSupabase])
useEffect(() => {
  // Solo en dev y con ?purge=...
  if (import.meta.env.MODE !== 'development') return
  const params = new URLSearchParams(window.location.search)
  const purge = params.get('purge')
  if (!purge) return

  ;(async () => {
    try {
      // 👇 RUTA CORRECTA
      const mod = await import('./config/offline/outbox/mantenance')

      if (purge === 'all') {
        const res = await mod.purgeAllLocalData()
        console.info('[purgeAllLocalData] done:', res)
        alert(`Purga completa.\nOutbox borrado: ${res.outboxRemoved}\nLocalStorage borrado: ${res.lsRemoved}\nRecarga la página.`)
      } else if (purge === 'pagos') {
        const n = await mod.purgePendingPagosFromOutbox()
        console.info('[purgePendingPagosFromOutbox] removed:', n)
        alert(`Eliminados ${n} pagos pendientes del outbox. Recarga la página.`)
      } else if (purge === 'migratePagos') {
        const n = await mod.migratePagosCuentaIdToCuentaid()
        alert(`Migrados ${n} pagos en outbox (cuentaId → cuentaid).`)
      } else {
        alert(`Parámetro ?purge desconocido: ${purge}`)
      }
    } catch (e) {
      console.error('Fallo import ./config/offline/maintenance', e)
      alert('No pude cargar las utilidades de mantenimiento. Revisa la ruta del import.')
    }
  })()
}, [])



  // Listeners offline + intento de sync
  useEffect(() => {
    initOfflineSyncListeners()
    processOutbox().catch(() => {})
  }, [])

  // Aplana routesNav una sola vez
  const allRoutes = useMemo(() => flattenRoutes(routesNav), [])

  if (loading) return <div>Cargando…</div>

  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <StatusChipProvider>
        <Routes>
          {/* Redirección raíz a /inicio (privado) */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          {/* 👇 Ruta pública para clientes al escanear QR; NO requiere login */}
          <Route path="/pedido/:mesaId" element={<PedidoMesaPage />} />

          {/* Bloque de rutas protegidas (requiere sesión) */}
          <Route
            element={
              <RequireAuth>
                <SucursalProvider>
                  <Layout />
                </SucursalProvider>
              </RequireAuth>
            }
          >
            {allRoutes.map((r) => {
              const allowed = Array.isArray(r.rol) ? r.rol : [r.rol]
              const Page = r.element
              return (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <RequireRole allowed={allowed as string[]}>
                      <Suspense fallback={<div>Cargando…</div>}>
                        <Page />
                      </Suspense>
                    </RequireRole>
                  }
                />
              )
            })}

            {/* Si una ruta privada no existe, manda a /inicio */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Route>

          {/* Fallback global para cualquier otra ruta no encontrada */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </StatusChipProvider>
    </Suspense>
  )
}

export default App
