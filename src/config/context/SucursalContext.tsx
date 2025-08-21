// src/config/context/SucursalContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Sucursal } from '../types' // ✅ ruta corregida
import { useFetchSucursales } from '../hooks/useFetchFunctions'

export interface SucursalContextType {
  sucursales: Sucursal[]
  selectedSucursal: Sucursal | null
  setSelectedSucursal: (s: Sucursal | null) => void
  refresh: () => Promise<void>
}

const SucursalContext = createContext<SucursalContextType | undefined>(undefined)

export const SucursalProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { sucursales = [], fetchSucursales } = useFetchSucursales()
  const [selectedSucursal, setSelected] = useState<Sucursal | null>(null)

  // Restaura selección desde storage cuando ya hay sucursales cargadas
  useEffect(() => {
    const id =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('selectedSucursalId')
        : null
    if (id && sucursales.length) {
      const found = sucursales.find(s => s.id === id) || null
      if (found) setSelected(found)
    }
  }, [sucursales])

  // Si no hay selección válida, elige la primera disponible
  useEffect(() => {
    if (!selectedSucursal && sucursales.length) {
      setSelected(sucursales[0])
    } else if (selectedSucursal && sucursales.length) {
      const stillThere = sucursales.some(s => s.id === selectedSucursal.id)
      if (!stillThere) setSelected(sucursales[0])
    }
  }, [sucursales, selectedSucursal])

  const setSelectedSucursal = (s: Sucursal | null) => {
    setSelected(s)
    if (typeof window !== 'undefined') {
      if (s) localStorage.setItem('selectedSucursalId', s.id)
      else localStorage.removeItem('selectedSucursalId')
    }
  }

  const refresh = async () => {
    await fetchSucursales()
  }

  const value = useMemo(
    () => ({ sucursales, selectedSucursal, setSelectedSucursal, refresh }),
    [sucursales, selectedSucursal]
  )

  return (
    <SucursalContext.Provider value={value}>
      {children}
    </SucursalContext.Provider>
  )
}

export const useSucursal = (): SucursalContextType => {
  const ctx = useContext(SucursalContext)
  if (!ctx) throw new Error('useSucursal debe usarse dentro de <SucursalProvider>')
  return ctx
}
