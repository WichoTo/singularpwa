// src/components/produccion/PedidosTab.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Paper, Stack, Typography, Divider
} from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'

import type { ConceptoCuenta, ItemMenu, TurnoActivo, WorkArea } from '../../config/types'
import {
  useFetchTurno,
  useFetchMenu,
  useFetchConceptos,
  useFetchMesas,
  upsertConcepto
} from '../../config/hooks/useFetchFunctions'
import ConceptoCard from './ConceptoCard'
import { getMesaLabel } from '../../config/hooks/useUtilsFunctions'

type Props = {
  sucursalid: string
  area: WorkArea
}

const isNuevo = (e?: string | null) => {
  const v = (e || '').toLowerCase()
  return v === 'pedido' || v === 'aceptado' || v === 'pendiente'
}
const isPrep = (e?: string | null) => {
  const v = (e || '').toLowerCase()
  return v === 'preparacion' || v === 'en_preparacion'
}

const PedidosTab: React.FC<Props> = ({ sucursalid, area }) => {
  // Turno activo (por sucursal)
  const { turnos, loading: loadingTurno } = useFetchTurno(sucursalid)
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null)
  useEffect(() => {
    if (!loadingTurno && turnos) setTurnoActivo(turnos.find(t => t.abierto) ?? null)
  }, [turnos, loadingTurno])
  const turnoid = turnoActivo?.id ?? ''

  // Catálogo y mesas
  const { menu = [], loading: loadingMenu } = useFetchMenu()
  const { mesas = [] } = useFetchMesas(sucursalid)

  // Conceptos del turno (todos; se filtra por área)
  const { conceptos = [], loading: loadingConceptos } = useFetchConceptos(sucursalid, turnoid)

  // índice de menú para resolver área/nombre
  const idxMenu = useMemo(() => {
    const m = new Map<string, ItemMenu>()
    ;(menu as ItemMenu[]).forEach(it => m.set(it.id, it))
    return m
  }, [menu])

  // Filtra conceptos por área y los separa por estado
  const conceptosFiltrados = useMemo(() => {
    const enArea: ConceptoCuenta[] = []
    ;(conceptos as ConceptoCuenta[]).forEach(c => {
      const it = idxMenu.get((c as any).itemmenuid || (c as any).itemMenuId)
      if (!it) return
      const areaItem = (it as any).area || (it as any).areaNombre
      if (!areaItem) return
      if (String(areaItem).toLowerCase() !== String(area?.nombre).toLowerCase()) return
      enArea.push(c)
    })
    return enArea
  }, [conceptos, idxMenu, area?.nombre])

  const nuevos = useMemo(
    () => conceptosFiltrados.filter(c => isNuevo(c.estado)),
    [conceptosFiltrados]
  )
  const prep = useMemo(
    () => conceptosFiltrados.filter(c => isPrep(c.estado)),
    [conceptosFiltrados]
  )

  // Agrupar por comensal (alias). Key vacío → 'Sin asignar'
  function groupByAlias(rows: ConceptoCuenta[]) {
    const map = new Map<string, ConceptoCuenta[]>()
    rows.forEach(c => {
      const k = (c.nombrecliente || '').trim() || 'Sin asignar'
      const arr = map.get(k) || []
      arr.push(c)
      map.set(k, arr)
    })
    // orden: alias alfabético; dentro, por created_at asc
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([alias, arr]) =>
        [alias, arr.sort((x, y) =>
          new Date(x.created_at || 0).getTime() - new Date(y.created_at || 0).getTime()
        )] as [string, ConceptoCuenta[]]
      )
  }

  const gruposNuevos = useMemo(() => groupByAlias(nuevos), [nuevos])
  const gruposPrep = useMemo(() => groupByAlias(prep), [prep])

  // Acciones: actualiza SOLO el concepto
  async function updateEstado(id: string, next: ConceptoCuenta['estado']) {
    const row = (conceptos as ConceptoCuenta[]).find(c => c.id === id)
    if (!row) return
    await upsertConcepto({
      ...row,
      estado: next,
      updated_at: new Date().toISOString(),
      version: (row.version ?? 0) + 1,
    }).catch(() => {})
  }
  const onStart    = (id: string) => updateEstado(id, 'en_preparacion')
  const onReady    = (id: string) => updateEstado(id, 'por_entregar' as any)
  const onCancel   = (id: string) => updateEstado(id, 'cancelado')

  const nombreItem = (c: ConceptoCuenta) => {
    const it = idxMenu.get((c as any).itemmenuid || (c as any).itemMenuId)
    return it?.nombre ?? 'Ítem'
  }
  const mesaLabel = (c: ConceptoCuenta) => getMesaLabel(mesas as any, c.mesaid)

  if (loadingTurno || loadingMenu || loadingConceptos) {
    return <Typography color="text.secondary">Cargando…</Typography>
  }

  const Seccion: React.FC<{
    icon: React.ReactNode
    title: string
    groups: [string, ConceptoCuenta[]][]
    renderActions: (c: ConceptoCuenta) => {
      onStart?: (id: string) => void
      onReady?: (id: string) => void
      onDeliver?: (id: string) => void
      onCancel?: (id: string) => void
    }
  }> = ({ icon, title, groups, renderActions }) => (
    <Paper elevation={2} sx={{ p: 2, flex: 1, borderRadius: 3, bgcolor: '#fff' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        {icon}
        <Typography variant="subtitle1" fontWeight={800}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1 }} />

      {groups.length === 0 ? (
        <Typography color="text.secondary">Nada por ahora.</Typography>
      ) : (
        <Stack spacing={2}>
          {groups.map(([alias, rows]) => (
            <Box key={alias} sx={{ border: '1px solid #eef2f7', borderRadius: 2, p: 1.25 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                {alias}
              </Typography>
              <Stack spacing={1.25}>
                {rows.map(c => (
                  <ConceptoCard
                    key={c.id}
                    concepto={c}
                    itemName={nombreItem(c)}
                    mesaLabel={mesaLabel(c)}
                    {...renderActions(c)}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  )

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
      <Seccion
        icon={<RestaurantIcon />}
        title={`Pedidos nuevos (${nuevos.length})`}
        groups={gruposNuevos}
        renderActions={() => ({ onStart, onCancel })}
      />
      <Seccion
        icon={<AssignmentTurnedInIcon />}
        title={`En preparación (${prep.length})`}
        groups={gruposPrep}
        renderActions={() => ({ onReady, onCancel })}
      />
    </Stack>
  )
}

export default PedidosTab
