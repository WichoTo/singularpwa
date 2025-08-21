// src/contexts/StatusChipContext.tsx
import React, { createContext, useContext, useState,type ReactNode } from 'react'
import type { ChipStatus } from '../../components/general/StatusChip'
import StatusChip from '../../components/general/StatusChip'

interface StatusChipContextValue {
  showStatus: (message: string, status: ChipStatus, direction?: 'down' | 'left' | 'up' | 'right') => void
}

const StatusChipContext = createContext<StatusChipContextValue | undefined>(undefined)

export const useStatusChip = (): StatusChipContextValue => {
  const ctx = useContext(StatusChipContext)
  if (!ctx) {
    throw new Error('useStatusChip debe usarse dentro de StatusChipProvider')
  }
  return ctx
}

export const StatusChipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<ChipStatus>('success')
  const [direction, setDirection] = useState<'down' | 'left' | 'up' | 'right'>('down')

  const showStatus = (
    msg: string,
    stat: ChipStatus,
    dir: 'down' | 'left' | 'up' | 'right' = 'down'
  ) => {
    setMessage(msg)
    setStatus(stat)
    setDirection(dir)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <StatusChipContext.Provider value={{ showStatus }}>
      {children}
      <StatusChip
        open={open}
        message={message}
        status={status}
        direction={direction}
        onAccept={handleClose}
        onCancel={handleClose}
      />
    </StatusChipContext.Provider>
  )
}
