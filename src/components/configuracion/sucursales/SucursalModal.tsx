// src/components/configuracion/sucursales/SucursalModal.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Box, Typography, TextField, Button,
  IconButton, Stack, Paper, Tooltip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import type { Sucursal, DocumentW, TurnoSucursal, WorkArea } from '../../../config/types'
import SignedImage from '../../general/SignedImage'

interface SucursalModalProps {
  open: boolean
  sucursal: Sucursal
  setSucursal: React.Dispatch<React.SetStateAction<Sucursal>>
  onSave: (sucursal: Sucursal) => void
  onClose: () => void
}

const SucursalModal: React.FC<SucursalModalProps> = ({
  open, sucursal, setSucursal, onSave, onClose
}) => {
  const [currentIdx, setCurrentIdx] = useState(0)
  useEffect(() => setCurrentIdx(0), [sucursal])

  // Normalizar workAreas si entran como string[] legacy
  useEffect(() => {
    if (!open) return
    const raw = (sucursal as any).workAreas
    if (!raw?.length) return

    if (typeof raw[0] === 'string') {
      const normalized: WorkArea[] = (raw as string[]).map((nombre, i) => ({
        id: crypto.randomUUID(),
        sucursalid: sucursal.id,
        nombre: nombre ?? '',
        orden: i,
        color: null,
        is_active: true,
        printer_id: null,
      }))
      setSucursal(prev => ({ ...prev, workAreas: normalized }))
    } else {
      const fixed: WorkArea[] = (raw as WorkArea[]).map((w, i) => ({
        id: w.id?.trim() ? w.id : crypto.randomUUID(),
        sucursalid: sucursal.id,
        nombre: w.nombre ?? '',
        orden: typeof w.orden === 'number' ? w.orden : i,
        color: w.color ?? null,
        is_active: typeof w.is_active === 'boolean' ? w.is_active : true,
        printer_id: w.printer_id ?? null,
      }))
      setSucursal(prev => ({ ...prev, workAreas: fixed }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sucursal.id])

  // Handlers generales
  const handleField = (field: keyof Sucursal, value: any) =>
    setSucursal(prev => ({ ...prev, [field]: value }))

  // Turnos
  const handleAddTurno = () =>
    setSucursal(prev => ({
      ...prev,
      turnos: [...(prev.turnos || []), { id: crypto.randomUUID(), nombre: '', inicio: '', fin: '' }],
    }))

  const handleRemoveTurno = (idx: number) =>
    setSucursal(prev => ({ ...prev, turnos: prev.turnos?.filter((_, i) => i !== idx) || [] }))

  const handleTurnoField = (idx: number, field: keyof TurnoSucursal, value: string) =>
    setSucursal(prev => ({
      ...prev,
      turnos: prev.turnos?.map((t, i) => (i === idx ? { ...t, [field]: value } : t)) || [],
    }))

  // Áreas de comensales (string[])
  const handleAddSeatingArea = () =>
    setSucursal(prev => ({ ...prev, areas: [...(prev.areas || []), ''] }))

  const handleRemoveSeatingArea = (idx: number) =>
    setSucursal(prev => ({ ...prev, areas: prev.areas?.filter((_, i) => i !== idx) || [] }))

  const handleSeatingAreaField = (idx: number, value: string) =>
    setSucursal(prev => ({
      ...prev,
      areas: prev.areas?.map((a, i) => (i === idx ? value : a)) || [],
    }))

  // WorkAreas (objetos)
  const addWorkAreaObj = () =>
    setSucursal(prev => {
      const arr = [...(prev.workAreas ?? [])]
      arr.push({
        id: crypto.randomUUID(),
        sucursalid: prev.id,
        nombre: '',
        orden: arr.length,
        is_active: true,
        color: null,
        printer_id: null,
      })
      return { ...prev, workAreas: arr }
    })

  const removeWorkAreaObj = (idx: number) =>
    setSucursal(prev => {
      const arr = [...(prev.workAreas ?? [])]
      arr.splice(idx, 1)
      const re = arr.map((w, i) => ({ ...w, orden: i }))
      return { ...prev, workAreas: re }
    })

  const updateWorkAreaNombre = (idx: number, value: string) =>
    setSucursal(prev => {
      const arr = [...(prev.workAreas ?? [])]
      arr[idx] = { ...arr[idx], nombre: value }
      return { ...prev, workAreas: arr }
    })

  // Imágenes
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const docs: DocumentW[] = Array.from(e.target.files).map(file => ({ id: '', nombre: file.name, file }))
      setSucursal(prev => ({ ...prev, imagenes: [...(prev.imagenes || []), ...docs] }))
    }
  }

  const handleRemoveImage = (idx: number) => {
    setSucursal(prev => ({ ...prev, imagenes: prev.imagenes?.filter((_, i) => i !== idx) || [] }))
    setCurrentIdx(0)
  }

  const handleSubmit = () => onSave(sucursal)

  const images: DocumentW[] = sucursal.imagenes ?? []
  const workAreas: WorkArea[] = useMemo(
    () => (Array.isArray(sucursal.workAreas) ? (sucursal.workAreas as WorkArea[]) : []),
    [sucursal.workAreas]
  )

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => (reason === 'backdropClick' ? null : onClose())}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, px: 1, pb: 1 } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography fontWeight={700}>
            {sucursal.nombre ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'grey.600' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent dividers sx={{ pt: 2 }}>
        {/* Datos básicos */}
        <Stack direction="column" gap={2} sx={{ mb: 3 }}>
          <TextField
            label="Nombre"
            value={sucursal.nombre}
            onChange={e => handleField('nombre', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Ubicación"
            value={sucursal.ubicacion || ''}
            onChange={e => handleField('ubicacion', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Teléfono"
            value={sucursal.telefono}
            onChange={e => handleField('telefono', e.target.value)}
            fullWidth
            size="small"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Turnos */}
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, color: 'primary.main' }}>
          Turnos
        </Typography>
        <Stack gap={1} mb={2}>
          {(sucursal.turnos || []).map((t, idx) => (
            <Paper
              key={t.id}
              elevation={0}
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: 1,
                p: 1,
                mb: 1,
                bgcolor: '#f7f9fc',
              }}
            >
              <TextField
                label="Nombre Turno"
                value={t.nombre}
                onChange={e => handleTurnoField(idx, 'nombre', e.target.value)}
                size="small"
              />
              <TextField
                label="Inicio"
                type="time"
                value={t.inicio}
                onChange={e => handleTurnoField(idx, 'inicio', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="Fin"
                type="time"
                value={t.fin}
                onChange={e => handleTurnoField(idx, 'fin', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <Tooltip title="Eliminar turno">
                <IconButton size="small" onClick={() => handleRemoveTurno(idx)}>
                  <RemoveIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={handleAddTurno}
            sx={{ borderRadius: 2, fontWeight: 600, alignSelf: 'flex-start' }}
          >
            Agregar Turno
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Áreas de comensales */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main">
            Áreas de Comensales
          </Typography>
          <Tooltip title="Agregar área de comensales">
            <IconButton size="small" color="primary" onClick={handleAddSeatingArea}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack gap={1} mb={2}>
          {(sucursal.areas || []).map((area, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{ display: 'flex', gap: 1, p: 1, mb: 1, bgcolor: '#f7f9fc', alignItems: 'center' }}
            >
              <TextField
                label={`Área ${idx + 1}`}
                value={area}
                onChange={e => handleSeatingAreaField(idx, e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Tooltip title="Eliminar área">
                <IconButton size="small" onClick={() => handleRemoveSeatingArea(idx)}>
                  <RemoveIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Áreas de trabajo */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main">
            Áreas de Trabajo
          </Typography>
          <Tooltip title="Agregar área de trabajo">
            <IconButton size="small" color="primary" onClick={addWorkAreaObj}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack gap={1} mb={2}>
          {workAreas.map((w, idx) => (
            <Paper
              key={w.id}
              elevation={0}
              sx={{ display: 'flex', gap: 1, p: 1, mb: 1, bgcolor: '#f7f9fc', alignItems: 'center' }}
            >
              <TextField
                label={`Área Trabajo ${idx + 1}`}
                value={w.nombre}
                onChange={e => updateWorkAreaNombre(idx, e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Tooltip title="Eliminar área de trabajo">
                <IconButton size="small" onClick={() => removeWorkAreaObj(idx)}>
                  <RemoveIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Imágenes */}
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, color: 'primary.main' }}>
          Imágenes de la sucursal
        </Typography>
        <Button variant="outlined" component="label" sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}>
          Subir Imágenes
          <input hidden multiple type="file" accept="image/*" onChange={handleImageChange} />
        </Button>

        {images.length > 0 && (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 1,
                maxWidth: 350,
                mx: 'auto',
                mb: 1,
              }}
            >
              {(() => {
                const doc = images[currentIdx]
                if ((doc as any).file instanceof File) {
                  const url = URL.createObjectURL((doc as any).file)
                  return (
                    <img
                      src={url}
                      onLoad={() => URL.revokeObjectURL(url)}
                      style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }}
                      alt={doc.nombre}
                    />
                  )
                }
                return (
                  <SignedImage
                    path={doc.path!}
                    bucket={doc.bucket!}
                    alt={doc.nombre}
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 2 }}
                  />
                )
              })()}
              <Tooltip title="Eliminar imagen">
                <IconButton
                  size="small"
                  onClick={() => handleRemoveImage(currentIdx)}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.72)' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Stack direction="row" justifyContent="center" gap={1}>
              <IconButton disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2 }}>
                {currentIdx + 1} de {images.length}
              </Typography>
              <IconButton
                disabled={currentIdx === images.length - 1}
                onClick={() => setCurrentIdx(i => i + 1)}
              >
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 700 }}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SucursalModal
