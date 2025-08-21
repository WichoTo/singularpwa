import React from "react";
import { Temporal } from "@js-temporal/polyfill";
import DayModal from "./DayModal"; // tu modal específico
import type { GastoFijo } from "../../../config/types";

export interface DayModalContainerProps {
  date: Temporal.PlainDate;
  onClose: () => void;
  gastosDia: GastoFijo[];
  // puedes pasarle más props si necesitas (eventos, tareas, etc)
}

const DayModalContainer: React.FC<DayModalContainerProps> = ({ date, onClose }) => {
  // Aquí puedes renderizar cualquier modal que tú definas,
  // por ejemplo, podrías condicionar según el tipo de día o proyecto.
  return (
    <DayModal open={true} date={date} onClose={onClose} />
  );
};

export default DayModalContainer;
