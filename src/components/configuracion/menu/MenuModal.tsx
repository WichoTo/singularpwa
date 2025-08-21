import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Box, TextField, Button, IconButton,
  Typography, FormControl, InputLabel, Select,
  MenuItem, Autocomplete, Paper
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteIcon from '@mui/icons-material/Delete'
import type { ItemMenu, Sucursal,  IngredienteMenu, Preparacion, Insumo } from '../../../config/types'
import FileUploadCarouselPreview from '../../general/FileUploadCarouselPreview'
import CurrencyFormatCustom from '../../general/InputMoneda'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PercentIcon from '@mui/icons-material/Percent';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useFetchMenu } from '../../../config/hooks/useFetchFunctions'
import { getSignedUrl, formatoMoneda } from '../../../config/hooks/useUtilsFunctions'

interface MenuModalProps {
  open: boolean
  item: ItemMenu
  setItem: (item: ItemMenu) => void
  onSave: (item: ItemMenu) => void
  onClose: () => void
  selectedSucursal: Sucursal | null
  insumos: Insumo[]
  preparaciones: Preparacion[]
}

const unitOptions = ['kl', 'l', 'pza']

// Opción combinada de insumo/preparación
type OpcionCombo =
  (Insumo & { tipo: 'insumo' }) |
  ({ id: string; nombre: string; unidad: string; costoUnitario: number; tipo: 'preparacion' });

const MenuModal: React.FC<MenuModalProps> = ({
  open, item, onSave, onClose, selectedSucursal, insumos, preparaciones,
}) => {
  const { menu: allMenu } = useFetchMenu()
  const [localItem, setLocalItem] = useState<ItemMenu>({
    ...item, referencias: item.referencias ?? [],
    porcentajeCostosFijos: item.porcentajeCostosFijos ?? 20, // default 20%
  })

  useEffect(() => {
    if (open) {
      setLocalItem({ ...item, referencias: item.referencias ?? [], porcentajeCostosFijos: item.porcentajeCostosFijos ?? 20 })
    }
  }, [open, item])

  useEffect(() => {
    localItem.referencias.forEach(async (doc, idx) => {
      if (!doc.file && !doc.url && doc.path && doc.bucket) {
        const signed = await getSignedUrl(doc.path, doc.bucket)
        if (signed) {
          setLocalItem(prev => {
            const refs = [...(prev.referencias ?? [])]
            refs[idx] = { ...refs[idx], url: signed }
            return { ...prev, referencias: refs }
          })
        }
      }
    })
  }, [localItem.referencias])

  const subcategoriaOptions = useMemo(
    () => Array.from(new Set(allMenu.map(i => i.subcategoria).filter(Boolean))),
    [allMenu]
  )

  const handleChange = (field: keyof ItemMenu, value: any) => {
    setLocalItem(prev => ({ ...prev, [field]: value }))
  }

  // Combinación de insumos y preparaciones para el Autocomplete
  const opcionesCombo: OpcionCombo[] = useMemo(() => [
    ...(insumos ?? []).map(i => ({ ...i, tipo: 'insumo' as const })),
    ...(preparaciones ?? []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      unidad: 'preparación',
      costoUnitario:
        p.insumos.reduce((sum, ing) => sum + ing.cantidad * ing.costoUnitario, 0) / (p.cantidadpreparada || 1),
      tipo: 'preparacion' as const,
    })),
  ], [insumos, preparaciones])

  // --- Ingredientes ---
  const handleIngredienteAdd = () => {
    setLocalItem(prev => ({
      ...prev,
      ingredientes: [
        ...prev.ingredientes,
        { id: '', idinsumo: '', nombre: '', cantidad: 0, unidad: '', costoUnitario: 0, tipo: 'insumo' },
      ],
    }))
  }

  const handleIngredienteRemove = (idx: number) => {
    setLocalItem(prev => ({
      ...prev,
      ingredientes: prev.ingredientes.filter((_, i) => i !== idx)
    }))
  }

  const handleIngredienteChange = (
    index: number,
    field: keyof IngredienteMenu,
    value: any
  ) => {
    const newInsumos = [...localItem.ingredientes]
    newInsumos[index] = { ...newInsumos[index], [field]: value }
    setLocalItem(prev => ({ ...prev, ingredientes: newInsumos }))
  }

  const handleIngredienteSelect = (
    idx: number,
    value: OpcionCombo | null
  ) => {
    if (!value) return
    setLocalItem(prev => {
      const newIngredientes = [...prev.ingredientes]
      newIngredientes[idx] = {
        ...newIngredientes[idx],
        id: value.id,
        idinsumo: value.id,
        nombre: value.nombre,
        unidad: value.unidad,
        costoUnitario: value.costoUnitario,
        tipo: value.tipo,
      }
      return { ...prev, ingredientes: newIngredientes }
    })
  }

  // --- Cálculos de costos, utilidad y margen ---
  const costoProduccion = localItem.ingredientes.reduce(
    (sum, ing) => sum + Number(ing.costoUnitario || 0) * Number(ing.cantidad || 0),
    0
  )

  const costoFijoUnitario = (localItem.precioVenta || 0) * (Number(localItem.porcentajeCostosFijos ?? 20) / 100)
  const utilidadNeta = (localItem.precioVenta || 0) - costoProduccion - costoFijoUnitario
  const margenNeto = localItem.precioVenta
    ? (utilidadNeta / localItem.precioVenta) * 100
    : 0

  const handleSave = () => {
    onSave({ ...localItem, costoProduccion })
  }

  const handleRemoveImage = (index: number) => {
    setLocalItem(prev => {
      const refs = [...(prev.referencias ?? [])]
      refs.splice(index, 1)
      return { ...prev, referencias: refs }
    })
  }

  const workAreaNames = React.useMemo(
  () => Array.from(new Set((selectedSucursal?.workAreas ?? [])
    .map(w => w?.nombre)
    .filter((n): n is string => !!n))),
  [selectedSucursal?.workAreas]
)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ pb: 0, fontWeight: 700 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {localItem.id ? 'Editar Producto' : 'Nuevo Producto'}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: 'grey.600' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField
            label="Nombre del producto"
            value={localItem.nombre}
            onChange={e => handleChange('nombre', e.target.value)}
            fullWidth
            sx={{ fontWeight: 600 }}
          />
          <FormControl fullWidth>
            <InputLabel id="area-label">Área</InputLabel>
            <Select
              labelId="area-label"
              label="Área"
              value={localItem.area ?? ''}                 // <-- string controlado
              onChange={e => handleChange('area', e.target.value as string)}
            >
              {workAreaNames.map(name => (
                <MenuItem key={name} value={name}>        {/* <-- key y value son strings */}
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            freeSolo
            options={subcategoriaOptions}
            value={localItem.subcategoria}
            onChange={(_, v) => handleChange('subcategoria', v || '')}
            onInputChange={(_, v) => handleChange('subcategoria', v)}
            renderInput={params => <TextField {...params} label="Subcategoría" fullWidth />}
            sx={{ mt: 1 }}
          />

          {/* Ingredientes */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
            Ingredientes
          </Typography>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafb' }}>
            {localItem.ingredientes.length === 0 && (
              <Typography color="text.disabled" fontStyle="italic">
                Agrega uno o más insumos o preparaciones a este platillo.
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleIngredienteAdd}
                sx={{ borderRadius: 2, fontWeight: 600, mb: 2 }}
              >
                Agregar insumo o preparación
              </Button>
            </Box>
            {localItem.ingredientes.map((ing, idx) => {
              // Busca el objeto seleccionado (insumo o preparación) por id
              const selected =
                opcionesCombo.find(opt => opt.id === ing.idinsumo || opt.id === ing.id) ?? null;
              return (
                <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Autocomplete
                    options={opcionesCombo}
                    value={selected}
                    onChange={(_, value) => handleIngredienteSelect(idx, value)}
                    getOptionLabel={opt =>
                      typeof opt === 'string'
                        ? opt
                        : `${opt.nombre}${opt.tipo === 'preparacion' ? ' (Preparación)' : ''}`
                    }
                    groupBy={opt => opt.tipo === 'preparacion' ? 'Preparaciones' : 'Insumos'}
                    renderInput={params => <TextField {...params} label="Insumo o preparación" sx={{ flex: 2 }} />}
                    sx={{ minWidth: 250, flex: 2 }}
                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                  />

                  <TextField
                    label="Cantidad"
                    type="number"
                    value={ing.cantidad}
                    onChange={e => handleIngredienteChange(idx, 'cantidad', Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <Autocomplete
                    options={unitOptions}
                    value={ing.unidad}
                    onChange={(_, v) => handleIngredienteChange(idx, 'unidad', v || '')}
                    renderInput={params => <TextField {...params} label="Unid." />}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Costo Unitario"
                    type="text"
                    value={formatoMoneda(ing.costoUnitario)}
                    onChange={e => handleIngredienteChange(idx, 'costoUnitario', Number(e.target.value))}
                    sx={{ flex: 1 }}
                    InputProps={{ readOnly: ing.tipo === 'preparacion' }}
                  />
                  <IconButton color="default" onClick={() => handleIngredienteRemove(idx)} sx={{ ml: 1 }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              )
            })}
          </Paper>

          {/* Precio y rentabilidad */}
          <Box
            component={Paper}
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 3,
              background: '#f7fafc',
              mb: 2,
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {/* Primera fila */}
            <TextField
              label="Precio Venta"
              name="precioVenta"
              value={localItem.precioVenta}
              onChange={e => handleChange('precioVenta', Number(e.target.value))}
              InputProps={{
                inputComponent: CurrencyFormatCustom as any,
                startAdornment: <MonetizationOnIcon color="primary" sx={{ mr: 1 }} />,
              }}
              size="small"
              helperText=" " // <-- Espacio reservado
              sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, minHeight: 82 }}
            />

            <TextField
              label="Costo producción (auto)"
              type="text"
              value={formatoMoneda(costoProduccion)}
              InputProps={{
                readOnly: true,
                startAdornment: <MonetizationOnIcon color="success" sx={{ mr: 1 }} />,
              }}
              size="small"
              helperText=" " // <-- Espacio reservado
              sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, minHeight: 82 }}
            />

            <TextField
              label="Costos fijos (%)"
              type="number"
              value={localItem.porcentajeCostosFijos ?? 20}
              onChange={e => handleChange('porcentajeCostosFijos', Number(e.target.value))}
              InputProps={{
                endAdornment: <PercentIcon color="secondary" />,
              }}
              helperText={<span style={{ color: '#8e24aa' }}>Sugerido: 20%. Ajusta cuando tengas tus costos reales.</span>}
              size="small"
              sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, minHeight: 82 }}
            />

            {/* Segunda fila */}
            <TextField
              label="Costo fijo estimado"
              value={formatoMoneda(costoFijoUnitario)}
              InputProps={{
                readOnly: true,
                startAdornment: <AssessmentIcon color="info" sx={{ mr: 1 }} />,
              }}
              size="small"
              helperText=" "
              sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, minHeight: 82 }}
            />
            <TextField
              label="Utilidad neta"
              value={formatoMoneda(utilidadNeta)}
              InputProps={{
                readOnly: true,
                startAdornment: <MonetizationOnIcon color="action" sx={{ mr: 1 }} />,
              }}
              size="small"
              helperText=" "
              sx={{
                flex: 1,
                bgcolor: '#fff',
                borderRadius: 2,
                minHeight: 82,
                color: utilidadNeta >= 0 ? 'success.main' : 'error.main',
              }}
            />
            <TextField
              label="Margen neto (%)"
              value={isNaN(margenNeto) ? '-' : margenNeto.toFixed(1) + '%'}
              InputProps={{
                readOnly: true,
                endAdornment: <PercentIcon color={margenNeto >= 0 ? 'success' : 'error'} />,
              }}
              size="small"
              helperText=" "
              sx={{
                flex: 1,
                bgcolor: '#fff',
                borderRadius: 2,
                minHeight: 82,
                color: margenNeto >= 0 ? 'success.main' : 'error.main',
              }}
            />

            <Box gridColumn="1/-1" mt={1}>
              <Typography variant="caption" color="text.secondary">
                Tip: Si no tienes tus costos fijos reales, usa 20% como referencia. Puedes actualizarlo cuando tengas tus números reales.
              </Typography>
            </Box>
          </Box>

          {/* Imágenes */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3 }}>
            Imágenes del producto
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Sube imágenes para mostrar tu platillo en el menú (formato JPG, PNG, etc.)
          </Typography>
          <FileUploadCarouselPreview
            value={localItem.referencias}
            multiple
            accept="image/*"
            width={320}
            height={220}
            onChange={files => {
              const arr = Array.isArray(files) ? files : [files]
              const nuevos = arr.map(file => ({
                id: crypto.randomUUID(), nombre: file.name, file, bucket: undefined, path: undefined, url: undefined
              }))
              setLocalItem(prev => ({
                ...prev,
                referencias: [...(prev.referencias ?? []), ...nuevos]
              }))
            }}
            onDelete={doc => handleRemoveImage(localItem.referencias.findIndex(r => r.id === doc.id))}
          />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" sx={{ fontWeight: 700 }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MenuModal
