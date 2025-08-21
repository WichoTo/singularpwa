// src/config/context/RequireAuth.tsx
import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../supabaseClient'

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuthStore()
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Forzamos una lectura de sesión por si el store aún no se enteró.
      await supabase.auth.getSession()
      if (alive) setHydrating(false)
    })()
    return () => { alive = false }
  }, [])

  if (loading || hydrating) return <div>Cargando…</div>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default RequireAuth
