import React, { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import type { Preparacion, PreparacionProduccion, ItemMenu, IngredienteMenu, InsumoPreparacion } from '../../config/types'
import PreparacionResumenCard from './ProduccionCard'

type Props = {
  preparaciones: Preparacion[]
  menu: ItemMenu[]
  producciones: PreparacionProduccion[]
  /** Si no lo pasas, por defecto “10” por preparación */
  getPropuesta?: (prepId: string) => number
  loading?: boolean
}

const PreparacionesCards: React.FC<Props> = ({
  preparaciones,
  menu,
  producciones,
  getPropuesta = () => 10,
  loading = false,
}) => {
  // inventario por preparación con movimientos
  const inventarioPorPreparacion = useMemo(() => {
    const inv: Record<string, number> = {}
    ;(preparaciones ?? []).forEach(prep => {
      const entradas = (producciones ?? [])
        .filter(p => p.preparacionid === prep.id && (p.tipo === 'entrada' || p.tipo === 'inicial'))
        .reduce((s, p) => s + (p.cantidad ?? 0), 0)
      const salidas = (producciones ?? [])
        .filter(p => p.preparacionid === prep.id && p.tipo === 'salida')
        .reduce((s, p) => s + (p.cantidad ?? 0), 0)
      inv[prep.id] = entradas - salidas
    })
    return inv
  }, [preparaciones, producciones])

  // si el menú referencia preps, muestra solo esas; si no, muestra todas
  function getAllPreparacionesIds(items: ItemMenu[], preps: Preparacion[]): string[] {
    const ids = new Set<string>()
    const prepIdSet = new Set(preps.map(p => p.id))
    items.forEach(item => {
      item.ingredientes?.forEach((ing: IngredienteMenu) => {
        if (prepIdSet.has(ing.idinsumo)) ids.add(ing.idinsumo)
      })
    })
    let added = true
    while (added) {
      added = false
      preps.forEach(prep => {
        if (ids.has(prep.id)) {
          prep.insumos.forEach((ing: InsumoPreparacion) => {
            if (prepIdSet.has(ing.idinsumo) && !ids.has(ing.idinsumo)) {
              ids.add(ing.idinsumo)
              added = true
            }
          })
        }
      })
    }
    return Array.from(ids)
  }

  const preparacionesEnMenuIds = useMemo(
    () => (preparaciones && menu ? getAllPreparacionesIds(menu, preparaciones) : []),
    [menu, preparaciones]
  )

  const preparacionesMostrar = useMemo(() => {
    if (!preparaciones?.length) return []
    if (!preparacionesEnMenuIds.length) return preparaciones
    return preparaciones.filter(p => preparacionesEnMenuIds.includes(p.id))
  }, [preparaciones, preparacionesEnMenuIds])

  function isPreparacionDisponible(
    prepId: string,
    preps: Preparacion[],
    inventario: Record<string, number>,
    cantidadNecesaria: number,
    visitados = new Set<string>()
  ): boolean {
    if (visitados.has(prepId)) return true
    visitados.add(prepId)
    if ((inventario[prepId] ?? 0) < cantidadNecesaria) return false
    const prep = preps.find(p => p.id === prepId)
    if (!prep) return false
    for (const insumo of prep.insumos) {
      if ((insumo as any).tipo === 'preparacion' || preps.some(p => p.id === insumo.idinsumo)) {
        if (!isPreparacionDisponible(insumo.idinsumo, preps, inventario, insumo.cantidad, visitados)) {
          return false
        }
      }
    }
    return true
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="primary" mb={3} mt={2}>
        Resumen de Preparaciones
      </Typography>
      {loading ? (
        <Typography color="text.secondary">Cargando…</Typography>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={3} alignItems="stretch" mt={2}>
          {preparacionesMostrar.map(prep => {
            const propuesta = getPropuesta(prep.id)
            const disponible = isPreparacionDisponible(
              prep.id,
              preparaciones ?? [],
              inventarioPorPreparacion,
              propuesta
            )
            return (
              <PreparacionResumenCard
                key={prep.id}
                preparacion={prep}
                producciones={(producciones ?? []).filter(p => p.preparacionid === prep.id)}
                cantidadPropuesta={propuesta}
                disponible={disponible}
              />
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default PreparacionesCards
