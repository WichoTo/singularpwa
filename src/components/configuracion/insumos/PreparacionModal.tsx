import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Autocomplete, Box, Typography,
  IconButton, Chip
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LayersIcon from '@mui/icons-material/Layers'
import type {
  Preparacion, Insumo, InsumoPreparacion, WorkArea
} from '../../../config/types'

interface PreparacionModalProps {
  open: boolean
  preparacion: Preparacion & { workareaid?: string | null }
  onSave: (prep: Preparacion & { workareaid?: string | null }) => void
  onClose: () => void
  insumos: Insumo[]
  preparaciones: Preparacion[]        // para sub-preparaciones
  workAreas: WorkArea[]               // ← TODAS las áreas disponibles
  userid: string
}

type OpcionCombo =
  | (Insumo & { tipo: 'insumo' })
  | ({
      id: string
      nombre: string
      unidad: string
      costoUnitario: number
      tipo: 'preparacion'
    })

const PreparacionModal: React.FC<PreparacionModalProps> = ({
  open,
  preparacion,
  onSave,
  onClose,
  insumos,
  preparaciones,
  workAreas = [],
  userid
}) => {
  const [local, setLocal] = useState<Preparacion & { workareaid?: string | null }>(preparacion)
  const [sel, setSel] = useState<OpcionCombo | string>('')
  const [cantidad, setCantidad] = useState<number>(0)

  // Combina insumos + preparaciones como opciones del autocomplete
  const opcionesCombo: OpcionCombo[] = useMemo(() => [
    ...(insumos ?? []).map(i => ({ ...i, tipo: 'insumo' as const })),
    ...(preparaciones ?? [])
      .filter(p => p.id !== local.id)
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        unidad: 'preparación',
        costoUnitario:
          ((p.insumos ?? []).reduce((sum, ing) => sum + ing.cantidad * (ing.costoUnitario ?? 0), 0)) /
          (p.cantidadpreparada || 1),
        tipo: 'preparacion' as const,
      })),
  ], [insumos, preparaciones, local.id])

  // Reset al abrir/cambiar preparación
  useEffect(() => { if (open) setLocal(preparacion) }, [open, preparacion])

  const addInsumo = () => {
    if (!sel || cantidad <= 0) return
    const isPrep = typeof sel !== 'string' && sel.tipo === 'preparacion'
    const ingrediente: InsumoPreparacion & { esPreparacion?: boolean } = {
      id: crypto.randomUUID(),
      userid,
      idinsumo: typeof sel === 'string' ? '' : sel.id,
      cantidad,
      unidad: typeof sel === 'string' ? '' : sel.unidad,
      costoUnitario: typeof sel === 'string' ? 0 : sel.costoUnitario,
      esPreparacion: isPrep ? true : undefined,
    }
    setLocal(prev => ({ ...prev, insumos: [...prev.insumos, ingrediente] }))
    setSel('')
    setCantidad(0)
  }

  const removeInsumo = (id: string) => {
    setLocal(prev => ({ ...prev, insumos: prev.insumos.filter(ing => ing.id !== id) }))
  }

  // Mantén costoUnitario/unidad sincronizados si cambian insumos/preparaciones
  useEffect(() => {
    if (!open) return
    setLocal(prev => ({
      ...prev,
      insumos: (prev.insumos ?? []).map(ing => {
        const op = opcionesCombo.find(x => x.id === ing.idinsumo)
        if (!op) return ing
        return {
          ...ing,
          costoUnitario: op.costoUnitario ?? ing.costoUnitario ?? 0,
          unidad: op.unidad ?? ing.unidad ?? '',
        }
      }),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opcionesCombo])

  // Totales
  const costoIngredientes = (local.insumos ?? []).reduce(
    (sum, ing) => sum + ing.cantidad * (ing.costoUnitario ?? 0),
    0
  )
  const costoUnitario = costoIngredientes / (local.cantidadpreparada || 1)

  // WorkArea seleccionada (por id)
  const selectedWorkArea =
    (workAreas ?? []).find(w => w.id === (local as any).workareaid) ?? null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontWeight: 700 }}>
        <RestaurantIcon sx={{ fontSize: 28, color: 'primary.main', mr: 1 }} />
        {local.id ? 'Editar Preparación' : 'Nueva Preparación'}
      </DialogTitle>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 3, mb: 1 }}>
        Puedes agregar insumos básicos y también sub-preparaciones.
      </Typography>

      <DialogContent dividers>
        <TextField
          label="Nombre de la preparación"
          value={local.nombre}
          onChange={e => setLocal(prev => ({ ...prev, nombre: e.target.value }))}
          fullWidth sx={{ mb: 2, bgcolor: '#f5f5fa', borderRadius: 1 }}
        />

        <TextField
          label="Cantidad total preparada (rendimiento)"
          type="number"
          value={local.cantidadpreparada}
          onChange={e => setLocal(prev => ({ ...prev, cantidadpreparada: Number(e.target.value) }))}
          fullWidth sx={{ mb: 2, bgcolor: '#f5f5fa', borderRadius: 1 }}
        />

        {/* Selector de Work Area (guarda solo el id) */}
        <Autocomplete
          options={workAreas ?? []}
          getOptionLabel={(w) => w?.nombre ?? ''}
          groupBy={(w) => w?.sucursalid ?? 'Sin sucursal'}
          value={selectedWorkArea}
          onChange={(_, va) => setLocal(prev => ({ ...prev, workareaid: va?.id ?? null }))}
          renderInput={(params) => (
            <TextField {...params} label="Área de trabajo (Work Area)" placeholder="Selecciona el área donde se elabora" />
          )}
          sx={{ mb: 3 }}
        />

        {/* Agregar insumo / sub-preparación */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', bgcolor: '#e3f2fd', borderRadius: 2, p: 1 }}>
          <Autocomplete
            freeSolo
            options={opcionesCombo}
            getOptionLabel={opt => (typeof opt === 'string' ? opt : `${opt.nombre}${opt.tipo === 'preparacion' ? ' (Preparación)' : ''}`)}
            groupBy={opt => (typeof opt === 'string' ? '' : (opt.tipo === 'preparacion' ? 'Preparaciones' : 'Insumos'))}
            value={sel}
            onChange={(_, v) => setSel(v || '')}
            onInputChange={(_, v) => setSel(v)}
            renderInput={params => <TextField {...params} label="Insumo o preparación" />}
            sx={{ flex: 2 }}
          />
          <TextField
            label="Cantidad"
            type="number"
            value={cantidad}
            onChange={e => setCantidad(Number(e.target.value))}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" color="primary" onClick={addInsumo} sx={{ minWidth: 48, borderRadius: 2, fontWeight: 700 }}>
            +
          </Button>
        </Box>

        {/* Lista de ingredientes */}
        <Box sx={{ border: '1px solid #eee', borderRadius: 2, p: 2, mb: 2, bgcolor: '#fafbfc' }}>
          <Box sx={{ display: 'flex', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
            <Box sx={{ flex: 2 }}>Ingrediente</Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>Cantidad</Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>Unidad</Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>Costo</Box>
            <Box sx={{ width: 32 }} />
          </Box>

          {(local.insumos ?? []).length === 0 && (
            <Typography sx={{ color: '#888', fontSize: 15, px: 1 }}>
              No hay insumos agregados todavía.
            </Typography>
          )}

          {(local.insumos ?? []).map((ing) => {
            const op = opcionesCombo.find(x => x.id === ing.idinsumo)
            const isPrep = (op as any)?.tipo === 'preparacion'
            const costo = Number(ing.cantidad * (op?.costoUnitario ?? ing.costoUnitario ?? 0)).toFixed(2)
            return (
              <Box key={ing.id} sx={{
                display: 'flex', alignItems: 'center', mb: 1, borderRadius: 1,
                bgcolor: isPrep ? '#ffe0b2' : '#fff', p: 0.5, border: isPrep ? '1px solid #ffa726' : undefined,
              }}>
                <Box sx={{ flex: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography component="span" sx={{ fontWeight: 500 }}>
                    {op?.nombre ?? ing.idinsumo}
                  </Typography>
                  {isPrep && (
                    <Chip
                      label="Preparación"
                      icon={<LayersIcon sx={{ fontSize: 16, color: '#ffa726' }} />}
                      size="small"
                      sx={{ ml: 1, bgcolor: '#ffe0b2', color: '#ff9800', fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography sx={{ flex: 1, textAlign: 'center' }}>{ing.cantidad}</Typography>
                <Typography sx={{ flex: 1, textAlign: 'center' }}>{op?.unidad ?? ing.unidad ?? ''}</Typography>
                <Typography sx={{ flex: 1, textAlign: 'center', color: 'primary.main' }}>${costo}</Typography>
                <IconButton color="default" sx={{ color: 'gray' }} size="small" onClick={() => removeInsumo(ing.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mb: 1, mt: 2 }}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>
            <b>Costo Ingredientes:</b> <span style={{ color: '#1976d2' }}>${costoIngredientes.toFixed(2)}</span>
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>
            <b>Costo unitario:</b> <span style={{ color: '#388e3c' }}>${costoUnitario.toFixed(2)}</span>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={() => onSave(local)} sx={{ fontWeight: 700, letterSpacing: 1 }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PreparacionModal
