import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Fade,
  Stack,
  Autocomplete,
} from '@mui/material'
import type { Insumo, InsumoInventario } from '../../config/types'

interface NuevaEntradaInventarioModalProps {
  open: boolean
  insumos: Insumo[]
  onClose: () => void
  onSave: (insumoinventario: InsumoInventario) => void | Promise<void>
  insumoinventario: InsumoInventario | null
  setInsumoInventario: React.Dispatch<React.SetStateAction<InsumoInventario | null>>
}

const NuevaEntradaInventarioModal: React.FC<NuevaEntradaInventarioModalProps> = ({
  open,
  insumos,
  onClose,
  onSave,
  insumoinventario,
  setInsumoInventario,
}) => {
  const insumoSelected =
    insumos.find((i) => i.id === insumoinventario?.insumoid) ?? null

  const canSave =
    !!insumoinventario &&
    !!insumoinventario.insumoid &&
    Number(insumoinventario.cantidad) > 0

  const handleGuardar = async () => {
    if (!canSave || !insumoinventario) return
    await onSave(insumoinventario)
    setInsumoInventario(null)
    onClose()
  }

  const handleClose = () => {
    setInsumoInventario(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 2,
          bgcolor: '#f9fafc',
          minWidth: 380,
          boxShadow: 8,
        },
      }}
      TransitionComponent={Fade}
      transitionDuration={250}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 22,
          color: 'primary.main',
          letterSpacing: 0.5,
          pb: 1,
        }}
      >
        Nueva entrada de insumo
      </DialogTitle>

      <DialogContent>
        <Stack gap={2} pt={1}>
          <Autocomplete
            options={insumos}
            getOptionLabel={(o) => o.nombre}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={insumoSelected}
            onChange={(_, v) =>
              setInsumoInventario((prev) =>
                prev ? { ...prev, insumoid: v ? v.id : null } : prev
              )
            }
            renderInput={(params) => (
              <TextField {...params} label="Selecciona un insumo" />
            )}
            filterSelectedOptions
            noOptionsText="No hay insumos"
            clearOnEscape
          />

          <TextField
            type="number"
            label="Cantidad de entrada"
            fullWidth
            value={
              insumoinventario?.cantidad && insumoinventario?.cantidad !== 0
                ? insumoinventario.cantidad
                : ''
            }
            onChange={(e) =>
              setInsumoInventario((prev) =>
                prev ? { ...prev, cantidad: Number(e.target.value) } : prev
              )
            }
            inputProps={{ min: 1 }}
          />

          {insumoSelected && (
            <Box
              mt={1}
              p={1.2}
              borderRadius={2}
              bgcolor="primary.light"
              color="primary.contrastText"
            >
              <Typography fontWeight={700}>{insumoSelected.nombre}</Typography>
              <Typography fontSize={13}>
                Unidad: <b>{insumoSelected.unidad || '—'}</b>
              </Typography>
              <Typography fontSize={12} color="grey.100">
                Categoría: {insumoSelected.categoria}
              </Typography>
              <Typography fontSize={12} color="grey.100">
                Merma: {insumoSelected.merma}%
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button onClick={handleClose} sx={{ fontWeight: 700, borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          variant="contained"
          color="primary"
          sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          disabled={!canSave}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default NuevaEntradaInventarioModal
