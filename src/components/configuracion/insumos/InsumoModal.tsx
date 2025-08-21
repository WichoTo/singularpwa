import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Box, Typography
} from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { formatoMoneda } from '../../../config/hooks/useUtilsFunctions'
import type { Insumo, Proveedor, WorkArea } from '../../../config/types'

interface InsumoModalProps {
  open: boolean
  insumo: Insumo
  insumos: Insumo[]
  onSave: (insumo: Insumo) => void
  onClose: () => void
  proveedores: Proveedor[]
  workAreas: WorkArea[]           // ← NUEVO: lista de áreas
}

const InsumoModal: React.FC<InsumoModalProps> = ({
  open, insumo, onSave, onClose, proveedores, insumos, workAreas = []
}) => {
  const [local, setLocal] = useState<Insumo>(insumo)

  useEffect(() => { if (open) setLocal(insumo) }, [open, insumo])

  const categorias = useMemo(
    () => Array.from(new Set((insumos ?? []).map(i => i.categoria).filter(Boolean))),
    [insumos]
  )

  // Calcula costoMerma automáticamente
  const costoMermaCalc = Number(local.costoUnitario) * (1 + (Number(local.merma || 0) / 100))

  const handleChange = (field: keyof Insumo, value: any) => {
    if (field === 'costoUnitario' || field === 'merma') {
      setLocal(prev => ({
        ...prev,
        [field]: value,
        costoMerma:
          field === 'costoUnitario'
            ? Number(value) * (1 + (Number(prev.merma || 0) / 100))
            : Number(prev.costoUnitario) * (1 + (Number(value || 0) / 100)),
      }))
    } else {
      setLocal(prev => ({ ...prev, [field]: value }))
    }
  }

  const selectedWorkArea =
    (workAreas ?? []).find(w => w.id === local.workareaid) ?? null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontWeight: 700 }}>
        <Inventory2OutlinedIcon sx={{ fontSize: 26, color: 'primary.main', mr: 1 }} />
        {local.id ? 'Editar Insumo' : 'Nuevo Insumo'}
      </DialogTitle>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 3, mb: 1 }}>
        Registra o edita un insumo, asigna su proveedor, categoría, Work Area y costos.
      </Typography>

      <DialogContent dividers>
        <TextField
          label="Nombre del insumo"
          value={local.nombre}
          onChange={e => handleChange('nombre', e.target.value)}
          fullWidth sx={{ mb: 2, bgcolor: '#f5f5fa', borderRadius: 1 }}
        />

        {/* Selector de Work Area (guarda solo el id) */}
        <Autocomplete
          options={workAreas ?? []}
          getOptionLabel={(w) => w?.nombre ?? ''}
          groupBy={(w) => w?.sucursalid ?? 'Sin sucursal'}
          value={selectedWorkArea}
          onChange={(_, va) => handleChange('workareaid', va?.id ?? null)}
          renderInput={(params) => (
            <TextField {...params} label="Área de trabajo (Work Area)" placeholder="Selecciona el área donde se usa" />
          )}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="proveedor-label">Proveedor</InputLabel>
          <Select
            labelId="proveedor-label"
            label="Proveedor"
            value={local.idproveedor ?? '' }
            onChange={e => handleChange('idproveedor', e.target.value)}
          >
            <MenuItem value="">Sin proveedor</MenuItem>
            {proveedores.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Autocomplete
          freeSolo
          options={categorias}
          value={local.categoria}
          onChange={(_, v) => handleChange('categoria', v ?? '')}
          onInputChange={(_, v) => handleChange('categoria', v)}
          renderInput={params => (
            <TextField {...params} label="Categoría" fullWidth sx={{ mb: 2, bgcolor: '#f5f5fa', borderRadius: 1 }} />
          )}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Unidad de medida"
          value={local.unidad}
          onChange={e => handleChange('unidad', e.target.value)}
          fullWidth sx={{ mb: 2, bgcolor: '#f5f5fa', borderRadius: 1 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Costo Unitario"
            type="number"
            value={local.costoUnitario}
            onChange={e => handleChange('costoUnitario', Number(e.target.value))}
            sx={{ flex: 1, bgcolor: '#f5f5fa', borderRadius: 1 }}
          />
          <TextField
            label="Merma Esperada (%)"
            type="number"
            value={local.merma}
            onChange={e => handleChange('merma', Number(e.target.value))}
            sx={{ flex: 1, bgcolor: '#f5f5fa', borderRadius: 1 }}
            InputProps={{ endAdornment: <span>%</span> }}
          />
        </Box>

        <Box sx={{
          p: 2, mb: 2, borderRadius: 2, bgcolor: '#e3f2fd',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Typography sx={{ fontWeight: 500, color: 'text.secondary' }}>
            <b>Costo con Merma:</b>
          </Typography>
          <Typography sx={{ fontWeight: 700, color: 'primary.main', fontSize: 18 }}>
            {formatoMoneda(costoMermaCalc)}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(local)} sx={{ fontWeight: 700 }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InsumoModal
