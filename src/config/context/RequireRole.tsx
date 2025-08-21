// src/config/context/RequireRole.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

const RequireRole: React.FC<{ allowed: string[]; children: React.ReactNode }> = ({ allowed, children }) => {
  const { role, loading } = useAuthStore()

  // Si aún cargamos (o todavía no hay rol), no decidas todavía
  if (loading || !role) {
    return <div>Cargando…</div>
  }

  // Ya hay rol y no está permitido -> fuera
  if (!allowed.includes(role.tipo)) {
    return <Navigate to="/inicio" replace />
  }

  return <>{children}</>
}

export default RequireRole
