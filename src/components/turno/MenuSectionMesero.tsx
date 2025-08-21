// src/components/turno/MenuSectionMesero.tsx
import * as React from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
  Stack,
  Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SignedImage from '../general/SignedImage'
import type { ItemMenu } from '../../config/types'

type Grouped = Record<string, Record<string, ItemMenu[]>>

type Props = {
  grouped: Grouped
  onAgregar: (item: ItemMenu) => void
  /** Mostrar buscador (default: true) */
  showSearch?: boolean
  /** Placeholder del buscador */
  searchPlaceholder?: string
}

const EmptyThumb: React.FC = () => (
  <Box
    sx={{
      width: 36,
      height: 36,
      borderRadius: 2,
      background: 'rgba(0,0,0,0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      color: 'grey.500',
    }}
  >
    —
  </Box>
)

const MenuSectionMesero: React.FC<Props> = ({
  grouped,
  onAgregar,
  showSearch = true,
  searchPlaceholder = 'Buscar en el menú…',
}) => {
  const [query, setQuery] = React.useState('')

  const matchesSearch = React.useCallback(
    (item: ItemMenu) => {
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        item.nombre?.toLowerCase().includes(q) ||
        item.categoria?.toLowerCase().includes(q) ||
        item.subcategoria?.toLowerCase().includes(q)
      )
    },
    [query]
  )

  const categories = React.useMemo(
    () => Object.keys(grouped ?? {}).sort((a, b) => a.localeCompare(b)),
    [grouped]
  )

  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        minHeight: 210,
      }}
    >
      {/* Header: búsqueda */}
      {showSearch && (
        <Box sx={{ p: 1.25, pb: 0.5, borderBottom: '1px solid #eee', bgcolor: '#fff' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SearchIcon fontSize="small" />
            <TextField
              size="small"
              fullWidth
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Stack>
        </Box>
      )}

      {/* Body */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: { xs: 1, md: 1.5 },
          pr: { md: 0.5 },
          bgcolor: '#f8fafc',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          Menú
        </Typography>

        {categories.length === 0 && (
          <Typography color="text.secondary">No hay productos.</Typography>
        )}

        {categories.map((cat) => {
          const subs = grouped[cat] ?? {}
          const subKeys = Object.keys(subs).sort((a, b) => a.localeCompare(b))

          // Si ninguna subcat tiene matches, ocultamos la categoría
          const anyMatch = subKeys.some((s) => (subs[s] ?? []).some(matchesSearch))
          if (!anyMatch) return null

          return (
            <Box key={cat} sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ color: 'primary.main', mb: 0.5 }}
              >
                {cat}
              </Typography>

              {subKeys.map((sub) => {
                const items = (subs[sub] ?? []).filter(matchesSearch)
                if (!items.length) return null

                return (
                  <Box key={`${cat}-${sub}`} sx={{ ml: 2, mb: 2 }}>
                    {sub !== '—' && (
                      <Typography
                        fontSize={15}
                        fontWeight={600}
                        sx={{ color: 'secondary.main', mb: 0.5 }}
                      >
                        {sub}
                      </Typography>
                    )}
                    <List disablePadding>
                      {items.map((item) => (
                        <ListItem
                          key={item.id}
                          sx={{
                            alignItems: 'center',
                            borderRadius: 1,
                            mb: 0.5,
                            bgcolor: 'white',
                            '&:hover': { background: '#e3f2fd' },
                            transition: '.2s',
                          }}
                          secondaryAction={
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                onAgregar(item)
                              }}
                            >
                              <AddIcon />
                            </IconButton>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 50 }}>
                            {item.referencias?.[0]?.path && item.referencias?.[0]?.bucket ? (
                              <SignedImage
                                path={item.referencias[0].path!}
                                bucket={item.referencias[0].bucket!}
                                alt={item.referencias?.[0]?.nombre ?? item.nombre}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 2,
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <EmptyThumb />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography fontWeight={500}>{item.nombre}</Typography>}
                            secondary={`$${Number(item.precioVenta ?? 0).toFixed(2)}`}
                            sx={{ ml: 1 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )
              })}
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

export default MenuSectionMesero
