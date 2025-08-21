import React, { useState } from 'react'
import {
  Card,
  CardContent,
  IconButton,
  Typography,
  Box,
  Tooltip,
} from '@mui/material'
import PhoneIcon from '@mui/icons-material/Phone'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import SignedImage from '../../general/SignedImage'
import type { Sucursal } from '../../../config/types'
import VisibilityIcon from '@mui/icons-material/Visibility'

interface SucursalCardProps {
  sucursal: Sucursal
  onEdit: (s: Sucursal) => void
}

const SucursalCard: React.FC<SucursalCardProps> = ({ sucursal, onEdit }) => {
  const [idx, setIdx] = useState(0)
  const imgs = sucursal.imagenes || []

  const prev = () => setIdx(i => Math.max(i - 1, 0))
  const next = () => setIdx(i => Math.min(i + 1, imgs.length - 1))

  return (
    <Card
      elevation={4}
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: '#fff',
        position: 'relative',
        boxShadow: '0 2px 12px 0 rgba(33, 150, 243, 0.09)',
        transition: 'box-shadow 0.18s',
        '&:hover': { boxShadow: '0 6px 20px 0 rgba(33,150,243,0.16)' },
        minHeight: 340,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ position: 'relative', height: 170, bgcolor: '#f2f7fa' }}>
        {imgs.length > 0 ? (
          <>
            <SignedImage
              path={imgs[idx].path!}
              bucket={imgs[idx].bucket!}
              alt={imgs[idx].nombre}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            {/* Overlay degradado */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'linear-gradient(180deg,rgba(0,0,0,0.4) 30%,transparent 80%)',
                pointerEvents: 'none'
              }}
            />
            {/* Flechas navegación */}
            {imgs.length > 1 && (
              <>
                <IconButton
                  onClick={prev}
                  disabled={idx === 0}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 8,
                    bgcolor: 'rgba(255,255,255,0.74)',
                    borderRadius: 2,
                    transform: 'translateY(-50%)',
                    '&:hover': { bgcolor: 'primary.light' },
                    zIndex: 2,
                  }}
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={next}
                  disabled={idx === imgs.length - 1}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    right: 8,
                    bgcolor: 'rgba(255,255,255,0.74)',
                    borderRadius: 2,
                    transform: 'translateY(-50%)',
                    '&:hover': { bgcolor: 'primary.light' },
                    zIndex: 2,
                  }}
                >
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              fontStyle: 'italic',
              fontSize: 18,
              letterSpacing: 1,
              bgcolor: '#f2f7fa'
            }}
          >
            Sin imagen
          </Box>
        )}

        {/* Botón Editar flotante */}
        <Tooltip title="Editar sucursal">
          <IconButton
            onClick={() => onEdit(sucursal)}
            sx={{
              position: 'absolute',
              top: 14,
              right: 16,
              bgcolor: 'rgba(255,255,255,0.86)',
              '&:hover': { bgcolor: 'primary.light' },
              zIndex: 3
            }}
          >
            <VisibilityIcon  />
          </IconButton>
        </Tooltip>

        {/* Nombre de la sucursal sobre la imagen */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            px: 2,
            pb: 1.5,
            width: '100%',
            bgcolor: 'rgba(0,0,0,0.45)',
          }}
        >
          <Typography variant="h6" fontWeight={700} color="#fff" noWrap>
            {sucursal.nombre}
          </Typography>
          <Typography variant="body2" color="grey.200" sx={{ fontWeight: 400 }}>
            {sucursal.ubicacion}
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PhoneIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {sucursal.telefono || <span style={{ color: '#bbb', fontStyle: 'italic' }}>Sin teléfono</span>}
          </Typography>
        </Box>
        {/* Aquí puedes agregar más info si ocupas */}
      </CardContent>
    </Card>
  )
}

export default SucursalCard
