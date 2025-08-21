// src/components/turno/MesaCuentaTabPanel.tsx
import React from 'react'
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material'
import type { ConceptoCuenta, ItemMenu } from '../../config/types'

type Props = {
  conceptosMesa: ConceptoCuenta[]
  menu: ItemMenu[]
  pagosPorConcepto: Record<string, number> // por fila: 0 o 1 (pagado)
}

function unitPrice(con: ConceptoCuenta) {
  // 1 fila = 1 unidad
  return con.importe ?? (con.preciounitario - (con.descuento ?? 0))
}
function nombreDe(menu: ItemMenu[], itemmenuid: string) {
  return menu.find(m => m.id === itemmenuid)?.nombre || 'Ítem'
}

const MesaCuentaTabPanel: React.FC<Props> = ({
  conceptosMesa,
  menu,
  pagosPorConcepto,
}) => {
  const filasVigentes = conceptosMesa.filter(con => con.estado !== 'cancelado')

  const totalCuenta = filasVigentes.reduce((sum, con) => sum + unitPrice(con), 0)

  const totalPagado = filasVigentes.reduce((sum, con) => {
    const isPaid = (pagosPorConcepto[con.id] ?? 0) >= 1 || con.estado === 'cobrado'
    return sum + (isPaid ? unitPrice(con) : 0)
  }, 0)

  const totalRestante = Math.max(0, totalCuenta - totalPagado)

  const pendientes: ConceptoCuenta[] = []
  const enCurso: ConceptoCuenta[] = []
  const pagados: ConceptoCuenta[] = []

  filasVigentes.forEach(con => {
    const isPaid = (pagosPorConcepto[con.id] ?? 0) >= 1 || con.estado === 'cobrado'
    if (isPaid) {
      pagados.push(con)
    } else if (con.estado === 'pendiente') {
      pendientes.push(con)
    } else {
      // aceptado / en_preparacion / listo / por_entregar / entregado (no pagado)
      enCurso.push(con)
    }
  })

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 0.5, sm: 1 }, bgcolor: 'background.paper' }}>
      <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', mb: 2 }}>
        Cuenta de la mesa
      </Typography>

      {/* Pendientes */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Pendientes
      </Typography>
      <List disablePadding>
        {pendientes.length > 0 ? (
          pendientes.map(con => {
            const nombre = nombreDe(menu, con.itemmenuid)
            const precio = unitPrice(con)
            const pag = pagosPorConcepto[con.id] || 0
            const faltan = Math.max(0, 1 - pag) // por fila siempre 1
            return (
              <ListItem key={con.id} divider>
                <ListItemText
                  primary={nombre}
                  secondary={`$${precio.toFixed(2)} × 1 (Faltan: ${faltan})`}
                />
              </ListItem>
            )
          })
        ) : (
          <Typography color="text.secondary" sx={{ ml: 2 }}>
            No hay artículos pendientes.
          </Typography>
        )}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* En curso (aceptado/preparación/listo/por_entregar/entregado, no pagado) */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        En proceso
      </Typography>
      <List disablePadding>
        {enCurso.length > 0 ? (
          enCurso.map(con => {
            const nombre = nombreDe(menu, con.itemmenuid)
            const precio = unitPrice(con)
            const pag = pagosPorConcepto[con.id] || 0
            const faltan = Math.max(0, 1 - pag)
            return (
              <ListItem key={con.id} divider>
                <ListItemText
                  primary={nombre}
                  secondary={`$${precio.toFixed(2)} × 1 (Pagados: ${pag} | Faltan: ${faltan})`}
                />
              </ListItem>
            )
          })
        ) : (
          <Typography color="text.secondary" sx={{ ml: 2 }}>
            No hay artículos en proceso.
          </Typography>
        )}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Pagados */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Conceptos pagados
      </Typography>
      <List disablePadding>
        {pagados.length > 0 ? (
          pagados.map(con => {
            const nombre = nombreDe(menu, con.itemmenuid)
            const precio = unitPrice(con)
            return (
              <ListItem key={con.id} divider>
                <ListItemText
                  primary={nombre}
                  secondary={`$${precio.toFixed(2)} × 1`}
                />
              </ListItem>
            )
          })
        ) : (
          <Typography color="text.secondary" sx={{ ml: 2 }}>
            No hay conceptos pagados.
          </Typography>
        )}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Totales */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>Total:</Typography>
        <Typography variant="subtitle1" fontWeight={700}>${totalCuenta.toFixed(2)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">Pagado:</Typography>
        <Typography variant="body2">${totalPagado.toFixed(2)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2">Restante:</Typography>
        <Typography variant="body2">${totalRestante.toFixed(2)}</Typography>
      </Box>
    </Box>
  )
}

export default MesaCuentaTabPanel
