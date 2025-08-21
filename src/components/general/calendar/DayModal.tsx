import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { Temporal } from "@js-temporal/polyfill";

interface DayModalProps {
  open: boolean;
  date: Temporal.PlainDate;
  onClose: () => void;
}

const DayModal: React.FC<DayModalProps> = ({ open, date, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Día seleccionado: {date.day}/{date.month}/{date.year}
      </DialogTitle>
      <DialogContent>
        <Typography>
          Aquí puedes poner cualquier componente, tabla de eventos, forms, etc.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DayModal;
