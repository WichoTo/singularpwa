import React from 'react'
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon, IconButton
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { ItemMenu } from '../../config/types'
import SignedImage from '../general/SignedImage'

type Props = {
  grouped: Record<string, Record<string, ItemMenu[]>>
  handleAgregarConceptoComensal: (item: ItemMenu) => void
}

const MenuTabPanelComensal: React.FC<Props> = ({ grouped, handleAgregarConceptoComensal }) => (
  <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 0.5, sm: 1 }, bgcolor: 'background.paper' }}>
    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>
      Menú
    </Typography>

    {Object.entries(grouped).map(([cat, subs]) => (
      <Box key={cat} sx={{ mb: 1.5 }}>
        <Typography variant="body1" fontWeight={700} sx={{ color: 'secondary.main' }}>{cat}</Typography>

        {Object.entries(subs).map(([sub, items]) => (
          <Box key={sub} sx={{ ml: 1, mb: 0.5 }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.3 }}>
              {sub}
            </Typography>

            <List disablePadding>
              {items.map(item => (
                <ListItem
                  key={item.id}
                  sx={{
                    mb: 0.5, borderRadius: 2, boxShadow: 1, bgcolor: '#fff', minHeight: 50,
                    '&:hover': { background: 'rgba(44,165,141,0.07)' }
                  }}
                  secondaryAction={
                    <IconButton
                      aria-label={`Agregar ${item.nombre}`}
                      size="small"
                      color="primary"
                      onClick={() => handleAgregarConceptoComensal(item)}
                      sx={{ ml: 1 }}
                    >
                      <AddIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 42 }}>
                    {item.referencias?.[0]?.path && item.referencias?.[0]?.bucket ? (
                      <SignedImage
                        path={item.referencias[0].path!}
                        bucket={item.referencias[0].bucket!}
                        alt={item.referencias[0].nombre}
                        sx={{ width: 36, height: 36, borderRadius: 2, objectFit: 'cover', bgcolor: '#f5f5f5' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 36, height: 36, borderRadius: 2, bgcolor: '#eee',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: 'grey.400'
                        }}
                      >
                        Sin foto
                      </Box>
                    )}
                  </ListItemIcon>

                  <ListItemText
                    primary={<Typography fontWeight={700}>{item.nombre}</Typography>}
                    secondary={`$${item.precioVenta.toFixed(2)}`}
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    ))}
  </Box>
)

export default MenuTabPanelComensal
