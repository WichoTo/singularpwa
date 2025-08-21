import React from 'react'
import { routesNav } from '../../config/routes'

interface HamburguerMenuProps {
  onToggle: () => void
}

const HamburguerMenu: React.FC<HamburguerMenuProps> = ({ onToggle }) => {

  // ocultar el select cuando estemos en rutas de configuración
  const flatten = (arr: typeof routesNav): typeof routesNav =>
    arr.reduce((acc, r) => {
      acc.push(r)
      if (r.children) acc.push(...flatten(r.children))
      return acc
    }, [] as typeof routesNav)



  return (
    <header
      style={{
        padding: '1rem',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* botón hamburguesa */}
      <button
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          color:"var(--color-accent)",
        }}
        aria-label="Toggle Sidebar"
      >
        &#9776;
      </button>

     
    </header>
  )
}

export default HamburguerMenu
