// src/components/produccion/InsumosNecesariosTable.tsx
import React, { useMemo, useEffect } from 'react'
import { Box, Typography, Chip } from '@mui/material'
import type {
  Preparacion,
  ItemMenu,
  IngredienteMenu,
  InsumoPreparacion,
  Insumo,
} from '../../config/types'

type Props = {
  preparaciones: Preparacion[]
  menu: ItemMenu[]
  insumos: Insumo[]
  /** Inventario real por insumo (id -> existencias) */
  inventoryByInsumo?: Record<string, number>
  /** Si no lo pasas, por defecto “10” por preparación */
  getPropuesta?: (prepId: string) => number
  /** habilita logs de depuración */
  debug?: boolean
}

const InsumosNecesariosTable: React.FC<Props> = ({
  preparaciones,
  menu,
  insumos,
  inventoryByInsumo = {},
  getPropuesta = () => 10,
  debug = true,
}) => {
  // --- helpers ---

  function getAllPreparacionesIds(items: ItemMenu[], preps: Preparacion[]): string[] {
    const ids = new Set<string>()
    const prepIdSet = new Set(preps.map(p => p.id))

    items.forEach(item => {
      item.ingredientes?.forEach((ing: IngredienteMenu) => {
        if (prepIdSet.has(ing.idinsumo)) ids.add(ing.idinsumo)
      })
    })

    // Propagar a sub-preparaciones
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

  function sumarInsumosDePreparacion(
    prep: Preparacion,
    cantidad: number,
    preps: Preparacion[],
    insumosTotales: Record<string, { nombre: string; requerido: number }>,
    insumosBase: Insumo[]
  ) {
    prep.insumos.forEach(ing => {
      const prepHija = preps.find(p => p.id === ing.idinsumo)
      if (prepHija) {
        sumarInsumosDePreparacion(prepHija, cantidad * ing.cantidad, preps, insumosTotales, insumosBase)
      } else {
        const iData = insumosBase.find(i => i.id === ing.idinsumo)
        const nombreInsumo = iData?.nombre || 'Insumo sin nombre'
        if (!insumosTotales[ing.idinsumo]) {
          insumosTotales[ing.idinsumo] = { nombre: nombreInsumo, requerido: 0 }
        }
        insumosTotales[ing.idinsumo].requerido += cantidad * ing.cantidad
      }
    })
  }

  function calcularInsumosNecesarios(
    prepsObjetivo: Preparacion[],
    getProp: (prepId: string) => number,
    preps: Preparacion[],
    insumosBase: Insumo[]
  ): Record<string, { nombre: string; requerido: number }> {
    const totales: Record<string, { nombre: string; requerido: number }> = {}
    prepsObjetivo.forEach(prep => {
      const faltante = getProp(prep.id)
      if (faltante <= 0) return
      sumarInsumosDePreparacion(prep, faltante, preps, totales, insumosBase)
    })
    return totales
  }

  // --- memos ---

  const preparacionesEnMenuIds = useMemo(
    () => (preparaciones && menu ? getAllPreparacionesIds(menu, preparaciones) : []),
    [menu, preparaciones]
  )

  // Si el menú no referencia ninguna, mostramos TODAS las preps del área
  const preparacionesObjetivo = useMemo(() => {
    if (!preparaciones?.length) return []
    if (!preparacionesEnMenuIds.length) return preparaciones
    return preparaciones.filter(p => preparacionesEnMenuIds.includes(p.id))
  }, [preparaciones, preparacionesEnMenuIds])

  const insumosNecesarios = useMemo(
    () =>
      calcularInsumosNecesarios(
        preparacionesObjetivo,
        getPropuesta,
        preparaciones ?? [],
        insumos ?? []
      ),
    [preparacionesObjetivo, preparaciones, insumos, getPropuesta]
  )

  /** Inventario “usado”: prop si viene, o fallback a insumos[i].existencias */
  const inventarioInsumosBase: Record<string, number> = useMemo(() => {
    if (inventoryByInsumo && Object.keys(inventoryByInsumo).length > 0) {
      return inventoryByInsumo
    }
    const map: Record<string, number> = {}
    ;(insumos ?? []).forEach(i => {
      const exist = (i as any).existencias
      map[i.id] = typeof exist === 'number' ? exist : Number(exist ?? 0)
    })
    return map
  }, [inventoryByInsumo, insumos])

  // ---- DEBUG LOGS ----
  useEffect(() => {
    if (!debug) return
    console.groupCollapsed('[InsumosNecesariosTable] Debug')
    console.log('insumos (len):', insumos?.length ?? 0, insumos)
    console.log('inventoryByInsumo (prop):', inventoryByInsumo)
    console.log('inventarioInsumosBase (usado):', inventarioInsumosBase)
    console.log('preparacionesObjetivo (len):', preparacionesObjetivo.length, preparacionesObjetivo)
    console.log('insumosNecesarios (requeridos):', insumosNecesarios)
    Object.keys(insumosNecesarios).forEach(id => {
      const actual = inventarioInsumosBase[id]
      if (actual == null) {
        console.warn('No hay existencias cargadas para insumo requerido:', {
          id,
          nombre: insumosNecesarios[id]?.nombre,
          requerido: insumosNecesarios[id]?.requerido,
        })
      }
    })
    console.groupEnd()
  }, [debug, insumos, inventoryByInsumo, inventarioInsumosBase, preparacionesObjetivo, insumosNecesarios])

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="primary" mb={3} mt={2}>
        Insumos necesarios para cumplir la producción propuesta
      </Typography>
      <Box sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: 2, p: 2, overflowX: 'auto' }}>
        <table style={{ minWidth: 400, width: '100%' }}>
          <thead>
            <tr style={{ background: '#f5f7fb' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Insumo</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Requerido</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Inventario actual</th>
              <th style={{ textAlign: 'center', padding: 8 }}>¿Falta?</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(insumosNecesarios).map(([id, info]) => {
              const actual = inventarioInsumosBase[id] ?? 0
              const falta = actual < info.requerido

              const insumoObj = insumos.find(i => i.id === id)
              const unidad = insumoObj?.unidad?.toLowerCase?.() ?? 'g'
              const requerido = info.requerido

              let requeridoDisplay = ''
              if (['g', 'gr', 'gramo', 'gramos'].includes(unidad)) {
                requeridoDisplay = `${requerido} g (${(requerido / 1000).toFixed(2)} kg)`
              } else if (['kg', 'kilogramo', 'kilogramos'].includes(unidad)) {
                requeridoDisplay = `${requerido} kg`
              } else {
                requeridoDisplay = `${requerido} ${unidad}`
              }

              return (
                <tr key={id} style={{ background: falta ? '#fff3e0' : '#e8f5e9' }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{info.nombre}</td>
                  <td style={{ textAlign: 'center', padding: 8 }}>{requeridoDisplay}</td>
                  <td style={{ textAlign: 'center', padding: 8 }}>{actual}</td>
                  <td style={{ textAlign: 'center', padding: 8 }}>
                    {falta ? (
                      <Chip color="warning" label="¡Pide más!" size="small" sx={{ fontWeight: 700 }} />
                    ) : (
                      <Chip color="success" label="Ok" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  )
}

export default InsumosNecesariosTable
