import React from 'react'
import { Box, Stack, Typography, Button } from '@mui/material'

type Props = {
  totalCuenta: number
  pagado: number
  porPagar: number
  onCancelarCuenta: () => void
  onCobroParcial: () => void
  onCobrarCerrar: () => void
  cancelarDisabled?: boolean
  cobroDisabled?: boolean
}

const ResumenCuentaBox: React.FC<Props> = ({
  totalCuenta, pagado, porPagar,
  onCancelarCuenta, onCobroParcial, onCobrarCerrar,
  cancelarDisabled, cobroDisabled
}) => (
  <Box
    sx={{
      bgcolor: '#fff',
      px: 3, py: 2,
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    <Stack direction="row" spacing={3} alignItems="center">
      <Typography variant="subtitle1" fontWeight={600}>Total:</Typography>
      <Typography variant="h5" fontWeight={700} color="primary">
        ${totalCuenta.toFixed(2)}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={3} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        Pagado: <b>${pagado.toFixed(2)}</b>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Por pagar: <b>${porPagar.toFixed(2)}</b>
      </Typography>
    </Stack>
    <Stack direction="row" spacing={2} mt={{ xs: 2, sm: 0 }}>
      <Button variant="outlined" color="secondary" onClick={onCancelarCuenta} disabled={cancelarDisabled}>
        Cancelar Cuenta
      </Button>
      <Button variant="contained" color="primary" onClick={onCobroParcial} disabled={cobroDisabled}>
        Cobro Parcial
      </Button>
      <Button variant="contained" color="success" onClick={onCobrarCerrar} disabled={cobroDisabled}>
        Cobrar y Cerrar
      </Button>
    </Stack>
  </Box>
)

export default ResumenCuentaBox
