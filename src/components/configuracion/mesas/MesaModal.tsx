import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import QrCodeIcon from '@mui/icons-material/QrCode'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import type { Mesa, Sucursal } from '../../../config/types'
import PDFMesaQR from './PDFMesaQR'
import { PDFDownloadLink } from '@react-pdf/renderer'
import QRCode from 'qrcode'

interface MesaModalProps {
  open: boolean
  mesa: Mesa
  setMesa: (m: Mesa) => void
  onSave: (m: Mesa) => void
  onClose: () => void
  selectedSucursal: Sucursal | null
}

const MesaModal: React.FC<MesaModalProps> = ({
  open,
  mesa,
  setMesa,
  onSave,
  onClose,
  selectedSucursal,
}) => {
  // HOOKS SIEMPRE ARRIBA
  const [qrImg, setQrImg] = useState<string>('')

  useEffect(() => {
    if (!open || !mesa?.id) {
      setQrImg('')
      return
    }
    QRCode.toDataURL(`${window.location.origin}/pedido/${mesa.id}`)
      .then(setQrImg)
      .catch(() => setQrImg(''))
  }, [open, mesa?.id])

  // Handlers
  const handleChange = <K extends keyof Mesa>(field: K, value: Mesa[K]) => {
    setMesa({ ...mesa, [field]: value })
  }

  const handleSubmit = () => onSave(mesa)

  // Derivados (pueden usar selectedSucursal sin problema)
  const areas = selectedSucursal?.areas ?? []

  // AHORA sí, returns condicionales (después de los hooks)
  if (!selectedSucursal) return null

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return
        onClose()
      }}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 5 } }}
      scroll="body"
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            {mesa.id ? 'Editar Mesa' : 'Nueva Mesa'}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ mb: 1 }} />

      <DialogContent dividers sx={{ bgcolor: '#f8fafb', pb: 2 }}>
        <Stack spacing={2} mt={0.5}>
          <TextField
            fullWidth
            label="Nombre de Mesa"
            name="nomesa"
            value={mesa.nomesa}
            onChange={e => handleChange('nomesa', e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            type="number"
            label="Comensales"
            name="comensales"
            value={mesa.comensales ?? 0}
            onChange={e => {
              const v = Number.parseInt(e.target.value, 10)
              handleChange('comensales', Number.isNaN(v) ? 0 : v)
            }}
            inputProps={{ min: 1, max: 99 }}
            InputProps={{ sx: { borderRadius: 2 } }}
          />
          <FormControl fullWidth>
            <InputLabel id="area-label">Área</InputLabel>
            <Select
              labelId="area-label"
              label="Área"
              value={mesa.area ?? ''}
              onChange={e => handleChange('area', e.target.value as Mesa['area'])}
              sx={{ borderRadius: 2 }}
            >
              {areas.map(area => (
                <MenuItem key={area} value={area}>{area}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, letterSpacing: 1.1 }}>
          Código QR para comanda digital:
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 1,
            bgcolor: '#fff',
            minHeight: 120,
            display: 'flex',
            alignItems: 'center'
          }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" style={{ width: 96, height: 96 }} />
            ) : (
              <QrCodeIcon color="disabled" sx={{ fontSize: 54 }} />
            )}
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <PDFDownloadLink
          document={
            <PDFMesaQR
              mesas={[mesa]}
              sucursal={selectedSucursal}
              qrImgs={{ [mesa.id]: qrImg }}
              barcodeImgs={{}}
            />
          }
          fileName={`QR_Mesa_${mesa.nomesa || mesa.id}.pdf`}
          style={{ textDecoration: 'none', pointerEvents: qrImg ? 'auto' : 'none' }}
        >
          {({ loading }) =>
            <Button
              startIcon={<PictureAsPdfIcon />}
              variant="outlined"
              color="info"
              sx={{ borderRadius: 2, fontWeight: 600 }}
              disabled={!qrImg}
            >
              {loading ? 'Generando PDF…' : 'Descargar QR'}
            </Button>
          }
        </PDFDownloadLink>
        <Box>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, mr: 1, borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Guardar
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

export default MesaModal
