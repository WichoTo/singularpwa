// src/components/Spinner.tsx
import React from 'react';
import { Backdrop, CircularProgress } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
}

const Spinner: React.FC<LoadingOverlayProps> = ({ open }) => (
  <Backdrop
    open={open}
    sx={{
      color: '#fff',
      zIndex: 13000,                               // por encima de casi todo
      backgroundColor: 'rgba(0, 0, 0, 0.5)',      // semitransparente
    }}
  >
    <CircularProgress color="inherit" />
  </Backdrop>
);

export default Spinner;
