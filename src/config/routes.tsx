// src/config/variables.ts
import React from 'react'

import BusinessIcon from '@mui/icons-material/Business'
import PeopleIcon from '@mui/icons-material/PeopleOutline'

import logoprincipalImg from '../assets/logolasingular.png'
export const logoprincipal = logoprincipalImg


export interface RouteConfig {
  path: string
  name: string
  icon: React.ElementType
  element: React.LazyExoticComponent<React.FC>
  rol: string | string[]
  hideSucursalSelector?: boolean
  children?: RouteConfig[]
}

export const routesNav: RouteConfig[] = [
  {
    path: 'inicio',
    name: 'Home',
    icon: BusinessIcon,
    rol: ['Administrador','Plataforma','Gerente', 'Usuario'],
    element: React.lazy(() => import('.././pages/HomePage.tsx')),
    hideSucursalSelector: false,
  }, 
  {
    path: 'configuracion',
    name: 'Configuración',
    icon: BusinessIcon,
    element: React.lazy(() => import('../pages/HomePage.tsx')),
    rol: ['Gerente', 'Administrador','Plataforma'],
    hideSucursalSelector: true,   // opcional para el padre
    children: [
      {
        path: 'usuarios',
        name: 'Usuarios',
        icon: PeopleIcon,
        rol: ['Administrador','Plataforma'],
        element: React.lazy(() => import('.././pages/configuracion/UsuariosPage.tsx')),
        hideSucursalSelector: true,
      },
      {
        path: 'confinarcion-sucursales',
        name: 'Sucursales',
        icon: BusinessIcon,
        rol: ['Administrador','Plataforma'],
        element: React.lazy(() => import('../pages/configuracion/ConfiguracionSucursalesPage.tsx')),
        hideSucursalSelector: true,
      },
      {
        path: 'confinarcion-piso',
        name: 'Piso',
        icon: PeopleIcon,
        rol: ['Administrador','Plataforma'],
        element: React.lazy(() => import('../pages/configuracion/ConfiguracionPisoPage.tsx')),
        hideSucursalSelector: false,
      },
      {
        path: 'confinarcion-menu',
        name: 'Configuracion Menu',
        icon: PeopleIcon,
        rol: ['Administrador','Plataforma','Gerente'],
        element: React.lazy(() => import('../pages/configuracion/ConfiguracionMenuPage.tsx')),
        hideSucursalSelector: false,
      },
      {
        path: 'confinarcion-insumos',
        name: 'Configuracion Insumos',
        icon: PeopleIcon,
        rol: ['Administrador','Plataforma','Gerente'],
        element: React.lazy(() => import('../pages/configuracion/ConfiguracionInsumosPage.tsx')),
        hideSucursalSelector: false,
      },
    ]    
  }, 
  {
    path: 'produccionmenu',
    name: 'Produccion',
    icon: BusinessIcon,
    element: React.lazy(() => import('../pages/produccion/ProduccionPage.tsx')),
    rol: ['Gerente', 'Administrador','Plataforma', 'Usuario'],
    hideSucursalSelector: false,   
    children: [
      {
        path: 'produccion',
        name: 'Produccion',
        icon: PeopleIcon,
        rol: ['Gerente', 'Administrador','Plataforma', 'Usuario'],
        element: React.lazy(() => import('../pages/produccion/ProduccionPage.tsx')),
        hideSucursalSelector: false,
      },
    ]
  },   
  {
    path: 'turnomenu',
    name: 'Turno',
    icon: BusinessIcon,
    element: React.lazy(() => import('../pages/turno/TurnoPage.tsx')),
    rol: ['Gerente', 'Administrador','Plataforma', 'Usuario'],
    hideSucursalSelector: false,   
    children: [
      {
        path: 'turno',
        name: 'Turno',
        icon: PeopleIcon,
        rol: ['Gerente', 'Administrador','Plataforma', 'Usuario'],
        element: React.lazy(() => import('../pages/turno/TurnoPage.tsx')),
        hideSucursalSelector: false,
      },
    ]
  },
]