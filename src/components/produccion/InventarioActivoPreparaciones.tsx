// src/components/produccion/InventarioActivoPreparaciones.tsx
import React, { useMemo } from 'react'
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Typography
} from '@mui/material'
import type { Preparacion, PreparacionProduccion } from '../../config/types'

type Props = {
  preparaciones: Preparacion[]
  producciones?: PreparacionProduccion[]
  title?: string
}

const InventarioActivoPreparaciones: React.FC<Props> = ({
  preparaciones = [],
  producciones = [],
  title = 'Inventario Activo de Preparaciones',
}) => {
  const tieneMovimientos = (producciones?.length ?? 0) > 0

  const resumen = useMemo(() => {
    return (preparaciones ?? []).map(prep => {
      let entradas = 0
      let salidas = 0
      let inventarioActual = 0

      if (tieneMovimientos) {
        entradas =
          producciones
            ?.filter(p => p.preparacionid === prep.id && (p.tipo === 'entrada' || p.tipo === 'inicial'))
            .reduce((sum, p) => sum + (p.cantidad ?? 0), 0) ?? 0

        salidas =
          producciones
            ?.filter(p => p.preparacionid === prep.id && p.tipo === 'salida')
            .reduce((sum, p) => sum + (p.cantidad ?? 0), 0) ?? 0

        inventarioActual = entradas - salidas
      } else {
        // 🔁 Fallback sin movimientos: usa lo que tenga la preparación
        entradas = Number((prep as any).cantidadpreparada ?? 0)
        salidas = 0
        inventarioActual = entradas
      }

      return {
        ...prep,
        entradas,
        salidas,
        inventarioActual,
      }
    })
  }, [preparaciones, producciones, tieneMovimientos])

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 4,
        background: 'linear-gradient(120deg, #ffe0b2 50%, #fafafa 100%)',
        boxShadow: 3,
        mb: 2
      }}
    >
      <Typography variant="h5" fontWeight={800} color="secondary" gutterBottom>
        {title}
      </Typography>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Preparación</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Unidad</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Entradas</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Salidas</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 15 }}>Inventario Actual</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resumen.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 3 }}>
                  No hay preparaciones para mostrar.
                </TableCell>
              </TableRow>
            )}

            {resumen.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.nombre}</TableCell>
                <TableCell>{row.insumos?.[0]?.unidad || '-'}</TableCell>
                <TableCell>{row.entradas}</TableCell>
                <TableCell>{row.salidas}</TableCell>
                <TableCell><b>{row.inventarioActual}</b></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  )
}

export default InventarioActivoPreparaciones
