import React, { useState } from 'react'
import {
  Box, Button, Typography, Stack, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import type { ItemMenu } from '../../config/types'
import { useAuthStore } from '../../config/stores/useAuthStore'
import { useSucursal } from '../../config/context/SucursalContext'
import { deleteMenuItem, upsertMenuItem, useFetchInsumos, useFetchMenu, useFetchPreparaciones } from '../../config/hooks/useFetchFunctions'
import MenuItemCard from '../../components/configuracion/menu/MenuItemCard'
import MenuModal from '../../components/configuracion/menu/MenuModal'
import Spinner from '../../components/general/Spinner'

const ConfiguracionMenuPage: React.FC = () => {
  const { user } = useAuthStore()
  const { selectedSucursal } = useSucursal()
  const { menu, fetchMenu } = useFetchMenu()
  const { insumos } = useFetchInsumos()
  const { preparaciones } = useFetchPreparaciones()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState(0)

  // Para el dialog de confirmación
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteNombre, setDeleteNombre] = useState<string>('')

  const initialItem: ItemMenu = {
    id: crypto.randomUUID(),
    userid: user?.id ?? '',
    sucursalid: selectedSucursal?.id ?? '',
    nombre: '',
    categoria: '',
    subcategoria: '',
    area: selectedSucursal?.areas?.[0] ?? '',
    ingredientes: [],
    referencias: [],
    costoProduccion: 0,
    precioVenta: 0,
  }
  const [item, setItem] = useState<ItemMenu>(initialItem)

  const handleAdd = () => {
    setItem({ ...initialItem, sucursalid: selectedSucursal?.id ?? '' })
    setModalOpen(true)
  }

  const handleEdit = (mi: ItemMenu) => {
    setItem(mi)
    setModalOpen(true)
  }

  const handleSave = async (mi: ItemMenu) => {
    setLoading(true)
    try {
      await upsertMenuItem(mi)
    } catch (err) {
      console.error(err)
    } finally {
      await fetchMenu()
      setModalOpen(false)
      setLoading(false)
    }
  }

  // Dialog de confirmación
  const requestDelete = (id: string, nombre: string) => {
    setDeleteId(id)
    setDeleteNombre(nombre)
    setDeleteOpen(true)
  }
  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      await deleteMenuItem(deleteId)
      await fetchMenu()
    } catch (err) {
      // Aquí puedes poner un snackbar
      console.error(err)
    } finally {
      setDeleteId(null)
      setDeleteOpen(false)
      setLoading(false)
    }
  }

  const handleClose = () => {
    setItem(initialItem)
    setModalOpen(false)
  }

  // Cálculo de resumen general
  const totalVentas = menu.reduce((acc, m) => acc + (m.precioVenta || 0), 0)
  const totalCostos = menu.reduce((acc, m) => acc + (m.costoProduccion || 0), 0)
  const totalItems = menu.length
  const avgMargen = totalItems > 0
    ? menu.reduce((sum, m) => {
      const costoFijo = m.precioVenta && m.porcentajeCostosFijos ? (m.precioVenta * m.porcentajeCostosFijos / 100) : 0
      const utilidadNeta = m.precioVenta && m.costoProduccion ? m.precioVenta - m.costoProduccion - costoFijo : 0
      return sum + (m.precioVenta ? (utilidadNeta / m.precioVenta) * 100 : 0)
    }, 0) / totalItems
    : 0

  return (
    <>
      {loading && <Spinner open />}
      <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 1300, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="secondary.main">
              Configuración de Menú
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Agrega y edita los productos de tu carta. Mantén tu menú siempre actualizado.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddCircleOutlineIcon />}
            size="large"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 17,
              px: 3,
              borderRadius: 3,
              boxShadow: 1,
              minWidth: 180,
            }}
            onClick={handleAdd}
          >
            Agregar Producto
          </Button>
        </Stack>
        <Paper elevation={0} sx={{ bgcolor: '#fafbfc', borderRadius: 4, p: { xs: 1, sm: 2, md: 3 }, minHeight: 300 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            indicatorColor="secondary"
            textColor="secondary"
            sx={{ mb: 2 }}
          >
            <Tab label="Tarjetas" />
            <Tab label="Tabla de rendimiento" />
          </Tabs>

          {/* TAB 1: CARDS */}
          {tab === 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  md: 'repeat(auto-fit, minmax(320px, 1fr))'
                },
                gap: 3,
                justifyItems: 'center',
                alignItems: 'stretch',
                width: '100%',
                pb: 2,
              }}
            >
              {menu.length === 0 && (
                <Box sx={{ color: 'text.disabled', textAlign: 'center', fontStyle: 'italic', py: 8, fontSize: 18, width: '100%' }}>
                  No hay productos registrados en el menú.
                </Box>
              )}
              {menu.map(mi => (
                <MenuItemCard
                  key={mi.id}
                  item={mi}
                  onEdit={handleEdit}
                  onDelete={() => requestDelete(mi.id, mi.nombre)}
                />
              ))}
            </Box>
          )}

          {/* TAB 2: TABLA DE RENDIMIENTO */}
          {tab === 1 && (
            <Box>
              <Stack direction="row" spacing={4} mb={2} mt={1}>
                <Paper variant="outlined" sx={{ p: 2, minWidth: 160, textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Productos</Typography>
                  <Typography variant="h5" fontWeight={700}>{totalItems}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, minWidth: 160, textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Costo Total</Typography>
                  <Typography variant="h5" fontWeight={700}>${totalCostos.toFixed(2)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, minWidth: 160, textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Venta Total</Typography>
                  <Typography variant="h5" fontWeight={700}>${totalVentas.toFixed(2)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, minWidth: 160, textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Margen Neto Promedio</Typography>
                  <Typography variant="h5" fontWeight={700}>{avgMargen.toFixed(1)}%</Typography>
                </Paper>
              </Stack>
              <TableContainer component={Paper} sx={{ maxHeight: 450 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Costo</TableCell>
                      <TableCell align="right">Costo Fijo</TableCell>
                      <TableCell align="right">Precio Venta</TableCell>
                      <TableCell align="right">Utilidad neta</TableCell>
                      <TableCell align="right">Margen neto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {menu.map((m) => {
                      const costoFijo = m.precioVenta && m.porcentajeCostosFijos
                        ? (m.precioVenta * m.porcentajeCostosFijos / 100)
                        : 0
                      const utilidadNeta = m.precioVenta && m.costoProduccion
                        ? m.precioVenta - m.costoProduccion - costoFijo
                        : 0
                      const margenNeto = m.precioVenta
                        ? (utilidadNeta / m.precioVenta) * 100
                        : 0
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <Typography fontWeight={600}>{m.nombre}</Typography>
                          </TableCell>
                          <TableCell>{m.subcategoria}</TableCell>
                          <TableCell align="right">${m.costoProduccion?.toFixed(2)}</TableCell>
                          <TableCell align="right">${costoFijo.toFixed(2)}</TableCell>
                          <TableCell align="right">${m.precioVenta?.toFixed(2)}</TableCell>
                          <TableCell align="right">${utilidadNeta.toFixed(2)}</TableCell>
                          <TableCell align="right">{margenNeto.toFixed(1)}%</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                La tabla te ayuda a visualizar el rendimiento, costos y margen de cada producto de tu menú.
              </Typography>
            </Box>
          )}
        </Paper>

        <MenuModal
          open={modalOpen}
          item={item}
          setItem={setItem}
          onSave={handleSave}
          onClose={handleClose}
          selectedSucursal={selectedSucursal!}
          insumos={insumos!}
          preparaciones={preparaciones!}
        />

        {/* Dialogo de confirmación */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>¿Eliminar producto?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ¿Seguro que deseas eliminar <b>{deleteNombre}</b> del menú? Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  )
}

export default ConfiguracionMenuPage
