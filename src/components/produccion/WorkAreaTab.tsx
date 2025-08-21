// src/components/produccion/WorkAreaTab.tsx
import React, { useState } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import type { WorkArea } from '../../config/types'
import ProduccionTab from './ProduccionTab'
import PedidosTab from './PedidosTab'

type Props = {
  sucursalid: string
  area: WorkArea
  initialTab?: 'pedidos' | 'produccion'
  onTabChange?: (tab: 'pedidos' | 'produccion') => void
}

const WorkAreaTab: React.FC<Props> = ({ sucursalid, area, initialTab = 'pedidos', onTabChange }) => {
  const [tab, setTab] = useState<number>(initialTab === 'pedidos' ? 0 : 1)

  const handleChange = (_: React.SyntheticEvent, value: number) => {
    setTab(value)
    onTabChange?.(value === 0 ? 'pedidos' : 'produccion')
  }

  return (
    <Box sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
      <Tabs
        value={tab}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ px: 1, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}
      >
        <Tab label="Pedidos" />
        <Tab label="Producción" />
      </Tabs>

      {tab === 0 && (
        <Box p={2}>
          <PedidosTab sucursalid={sucursalid} area={area} />
        </Box>
      )}

      {tab === 1 && (
        <Box p={2}>
          <ProduccionTab sucursalid={sucursalid} area={area} />
        </Box>
      )}
    </Box>
  )
}

export default WorkAreaTab
