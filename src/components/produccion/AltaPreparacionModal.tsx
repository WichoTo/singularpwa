import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Autocomplete,
  InputAdornment,
  Box,
  Typography,
} from '@mui/material'
import type { Preparacion, PreparacionProduccion } from '../../config/types'

interface AltaPreparacionModalProps {
  open: boolean
  onClose: () => void
  preparaciones: Preparacion[]
  userid: string
  sucursalid: string
  onSave: (prepProd: PreparacionProduccion) => void | Promise<void>
}

const AltaPreparacionModal: React.FC<AltaPreparacionModalProps> = ({
  open,
  onClose,
  preparaciones,
  userid,
  sucursalid,
  onSave,
}) => {
  const [selectedPrep, setSelectedPrep] = useState<Preparacion | null>(null)
  const [cantidad, setCantidad] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  // limpia al cerrar
  useEffect(() => {
    if (!open) {
      setSelectedPrep(null)
      setCantidad(0)
      setSaving(false)
    }
  }, [open])

  const unidad = selectedPrep?.insumos?.[0]?.unidad ?? ''

  const canSave =
    !!selectedPrep &&
    Number.isFinite(cantidad) &&
    cantidad > 0 &&
    !!userid &&
    !!sucursalid

  const handleSave = async () => {
    if (!selectedPrep) return
    const row: PreparacionProduccion = {
      id: crypto.randomUUID(),
      preparacionid: selectedPrep.id,
      userid,
      sucursalid,
      cantidad: Number(cantidad),
      fecha: new Date().toISOString(),
      tipo: 'entrada', // alta de producción
    }
    try {
      setSaving(true)
      await onSave(row)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        Registrar nueva producción
      </DialogTitle>

      <DialogContent sx={{ pb: 0, pt: 1 }}>
        <Stack gap={2}>
          <Autocomplete
            options={preparaciones}
            getOptionLabel={(o) => o.nombre}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={selectedPrep}
            onChange={(_, v) => setSelectedPrep(v)}
            renderInput={(params) => (
              <TextField {...params} label="Selecciona una preparación" />
            )}
            sx={{ bgcolor: '#f9f9f9', borderRadius: 2 }}
          />

          <Box>
            <TextField
              label="Cantidad preparada"
              type="number"
              fullWidth
              value={Number.isFinite(cantidad) && cantidad !== 0 ? cantidad : ''}
              onChange={(e) => setCantidad(Number(e.target.value))}
              inputProps={{ min: 1 }}
              InputProps={{
                endAdornment: unidad ? (
                  <InputAdornment position="end">{unidad}</InputAdornment>
                ) : undefined,
              }}
              disabled={!selectedPrep}
              sx={{
                bgcolor: !selectedPrep ? '#f5f5f5' : undefined,
                borderRadius: 2,
              }}
              helperText={!selectedPrep && 'Selecciona una preparación primero'}
            />
            {selectedPrep && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, ml: 1, display: 'block' }}
              >
                Unidad base: <b>{unidad || '—'}</b>
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ fontWeight: 700, borderRadius: 2, px: 4 }}
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AltaPreparacionModal
