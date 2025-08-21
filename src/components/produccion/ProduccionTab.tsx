// src/components/produccion/ProduccionTab.tsx
import React, { useMemo, useState } from 'react'
import { Box, Stack, Typography, Tabs, Tab, Button } from '@mui/material'
import type { WorkArea, InsumoInventario, PreparacionProduccion } from '../../config/types'
import {
  useFetchInsumos,
  useFetchPreparaciones,
  useFetchMenu,
  useFetchProduccion,
  upsertPreparacionProduccion,
  useFetchInventario,
} from '../../config/hooks/useFetchFunctions'
import { upsertInsumoInventario } from '../../config/hooks/useFetchFunctions'
import { useAuthStore } from '../../config/stores/useAuthStore'

import InventarioActivoPreparaciones from './InventarioActivoPreparaciones'
import PreparacionesCards from './PreparacionesDashboard'
import InsumosNecesariosTable from './InsumosNecesariosTable'
import AltaPreparacionModal from './AltaPreparacionModal'
import NuevaEntradaInventarioModal from './NuevaEntradaInventarioModal'

type Props = {
  sucursalid: string
  area: WorkArea
}

const ProduccionTab: React.FC<Props> = ({ sucursalid, area }) => {
  const { preparaciones, loading: loadingPreps } = useFetchPreparaciones()
  const { insumos, loading: loadingInsumos } = useFetchInsumos()
  const { menu, loading: loadingMenu } = useFetchMenu()
  const { producciones, loading: loadingProd } = useFetchProduccion(sucursalid)
  const { inventario, fetch: refetchInventario } = useFetchInventario(sucursalid)
  const { user } = useAuthStore()
  const userid = user?.id ?? ''

  const [tabIndex, setTabIndex] = useState(0)

  // Estado para modales
  const [modalProdOpen, setModalProdOpen] = useState(false)
  const [modalInvOpen, setModalInvOpen] = useState(false)
  const [insumoinventario, setInsumoInventario] = useState<InsumoInventario | null>(null)

  // Recetas e insumos visibles para esta área
  const prepsArea = useMemo(
    () => (preparaciones ?? []).filter(p => (p as any).workareaid === area.id),
    [preparaciones, area.id]
  )
  const insumosArea = useMemo(
    () => (insumos ?? []).filter(i => (i as any).workareaid == null || (i as any).workareaid === area.id),
    [insumos, area.id]
  )

  const loading = loadingPreps || loadingInsumos || loadingMenu || loadingProd

  // Mapa: insumoid -> existencias netas (a partir de movimientos de inventario)
  const inventarioByInsumo = useMemo(() => {
    const map: Record<string, number> = {}
    for (const mov of inventario ?? []) {
      if (!mov?.insumoid) continue
      const cur = map[mov.insumoid] ?? 0
      const qty = Number(mov.cantidad || 0)
      switch (mov.tipo) {
        case 'inicial':
        case 'entrada':
          map[mov.insumoid] = cur + qty
          break
        case 'salida':
          map[mov.insumoid] = cur - qty
          break
        case 'ajuste':
          // asumimos que 'cantidad' ya trae signo
          map[mov.insumoid] = cur + qty
          break
        default:
          map[mov.insumoid] = cur + qty
      }
    }
    return map
  }, [inventario])

  // Handlers de alta (producción y entrada insumo)
  const abrirAltaProduccion = () => setModalProdOpen(true)

  const abrirAltaEntradaInsumo = () => {
    setInsumoInventario({
      id: crypto.randomUUID(),
      insumoid: null,
      sucursalid,
      userid,
      cantidad: 0,
      tipo: 'entrada',
      fecha: new Date().toISOString(),
    } as InsumoInventario)
    setModalInvOpen(true)
  }

  const guardarProduccion = async (row: PreparacionProduccion) => {
    try {
      await upsertPreparacionProduccion(row)
      // opcional: toast éxito
    } catch (e) {
      console.error('Error guardando producción', e)
      // opcional: toast error
    } finally {
      setModalProdOpen(false)
    }
  }

  const guardarEntradaInsumo = async (row: InsumoInventario) => {
    try {
      await upsertInsumoInventario(row)
      // Refresca inventario para que la tabla se actualice de inmediato
      await refetchInventario()
      // opcional: toast éxito
    } catch (e) {
      console.error('Error guardando entrada', e)
      // opcional: toast error
    } finally {
      setModalInvOpen(false)
      setInsumoInventario(null)
    }
  }

  return (
    <Box>
      {/* Header + acciones rápidas */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2, gap: 1 }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          Producción — {area.nombre}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="primary" onClick={abrirAltaProduccion}>
            Registrar producción
          </Button>
          <Button variant="outlined" color="primary" onClick={abrirAltaEntradaInsumo}>
            Registrar entrada de insumo
          </Button>
        </Stack>
      </Stack>

      <Tabs
        value={tabIndex}
        onChange={(_, idx) => setTabIndex(idx)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}
      >
        <Tab label="Dashboard" />
        <Tab label="Inventario activo" />
        <Tab label="Insumos necesarios" />
      </Tabs>

      {/* TAB 0: Dashboard (solo cards) */}
      {tabIndex === 0 && (
        <Box sx={{ mb: 2 }}>
          <PreparacionesCards
            preparaciones={prepsArea}
            menu={menu ?? []}
            producciones={producciones ?? []}
            loading={loading}
          />
        </Box>
      )}

      {/* TAB 1: Inventario activo */}
      {tabIndex === 1 && (
        <InventarioActivoPreparaciones
          preparaciones={prepsArea}
          producciones={producciones ?? []}
          title={`Inventario activo — ${area.nombre}`}
        />
      )}

      {/* TAB 2: Insumos necesarios */}
      {tabIndex === 2 && (
        <InsumosNecesariosTable
          preparaciones={prepsArea}
          menu={menu ?? []}
          insumos={insumosArea}
          inventoryByInsumo={inventarioByInsumo}  // <<— Inventario real
          debug                                   // <<— Logs de depuración
        />
      )}

      {/* Modales */}
      <AltaPreparacionModal
        open={modalProdOpen}
        onClose={() => setModalProdOpen(false)}
        preparaciones={prepsArea}
        userid={userid}
        sucursalid={sucursalid}
        onSave={guardarProduccion}
      />

      <NuevaEntradaInventarioModal
        open={modalInvOpen}
        onClose={() => setModalInvOpen(false)}
        insumos={insumosArea}
        insumoinventario={insumoinventario}
        setInsumoInventario={setInsumoInventario}
        onSave={guardarEntradaInsumo}
      />
    </Box>
  )
}

export default ProduccionTab
