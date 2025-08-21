import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, IconButton, Button, Stack, Tooltip, InputAdornment,
  Autocomplete, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import KitchenIcon from '@mui/icons-material/Kitchen';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useAuthStore } from '../../config/stores/useAuthStore';
import {
  deleteInsumo, deletePreparacion, upsertInsumo, upsertPreparaciones,
  useFetchInsumos, useFetchPreparaciones, useFetchProveedores,
  // ⬇️ IMPORTA EL HOOK DE ÁREAS
  useFetchWorkAreas,
} from '../../config/hooks/useFetchFunctions';
import Spinner from '../../components/general/Spinner';
import { formatoMoneda } from '../../config/hooks/useUtilsFunctions';
import type { Insumo, Preparacion } from '../../config/types';
import InsumoModal from '../../components/configuracion/insumos/InsumoModal';
import PreparacionModal from '../../components/configuracion/insumos/PreparacionModal';

// Simple confirm dialog
const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography>{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} color="inherit">Cancelar</Button>
      <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
        Eliminar
      </Button>
    </DialogActions>
  </Dialog>
);

const ConfiguracionInsumosPage: React.FC = () => {
  const { user } = useAuthStore();
  const { insumos } = useFetchInsumos();
  const { preparaciones } = useFetchPreparaciones();
  const { proveedores } = useFetchProveedores();
  // ⬇️ TRAE TODAS LAS ÁREAS (de todas las sucursales)
  const { workAreas } = useFetchWorkAreas(); // sin sucursalid => todas
  console.log(workAreas)

  const userid = user?.id ?? '';
  const [loading, setLoading] = useState(false);
  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [modalPrepOpen, setModalPrepOpen] = useState(false);

  const [filtroInsumo, setFiltroInsumo] = useState('');
  const [filtroPrep, setFiltroPrep] = useState('');

  // Confirm dialog state
  const [deleteType, setDeleteType] = useState<null | 'insumo' | 'preparacion'>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyInsumo: Insumo = {
    id: '', nombre: '', unidad: '', categoria: '', workareaid: null,
    merma: 0, costoMerma: 0, costoUnitario: 0, userid: userid!, idproveedor: ''
  };

  // ⬇️ Permite opcionalmente workareaid para el modal
  const emptyPrep: Preparacion & { workareaid?: string | null } = {
    id: '', nombre: '', insumos: [],  userid: userid!, cantidadpreparada: 0, workareaid: null
  };

  const [insumo, setInsumo] = useState<Insumo>(emptyInsumo);
  // ⬇️ Estado tipado con workareaid opcional
  const [prep, setPrep] = useState<Preparacion & { workareaid?: string | null }>(emptyPrep);

  const handleSaveInsumo = async (i: Insumo) => {
    setLoading(true);
    try {
      await upsertInsumo({
        ...i,
        idproveedor: i.idproveedor === "" ? null : i.idproveedor
      });
    } catch (err) {
      console.error(err);
    } finally {
      setInsumo(emptyInsumo);
      setModalInsumoOpen(false);
      setLoading(false);
    }
  };

  const handleSavePrep = async (p: Preparacion & { workareaid?: string | null }) => {
    setLoading(true);
    try {
      // ⬇️ Enviamos tal cual; si tu tabla ya tiene columna workareaid se guardará
      await upsertPreparaciones(p as Preparacion);
    } catch (err) {
      console.error(err);
    } finally {
      setModalPrepOpen(false);
      setLoading(false);
    }
  };

  // Manejo de borrado
  const askDelete = (type: 'insumo' | 'preparacion', id: string) => {
    setDeleteType(type);
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteType || !deleteId) return;
    setLoading(true);
    try {
      if (deleteType === 'insumo') {
        await deleteInsumo(deleteId);
      } else {
        await deletePreparacion(deleteId);
      }
    } catch (err) {
      alert("Error al eliminar.");
    } finally {
      setDeleteType(null);
      setDeleteId(null);
      setLoading(false);
    }
  };

  // Autocomplete opciones
  const nombresInsumos = useMemo(
    () => [...new Set((insumos ?? []).map(i => i.nombre))],
    [insumos]
  );
  const nombresPreparaciones = useMemo(
    () => [...new Set((preparaciones ?? []).map(p => p.nombre))],
    [preparaciones]
  );

  // Filtros
  const insumosFiltrados = useMemo(
    () => (insumos ?? []).filter(i =>
      filtroInsumo ? i.nombre.toLowerCase().includes(filtroInsumo.toLowerCase()) : true
    ),
    [insumos, filtroInsumo]
  );
  const preparacionesFiltradas = useMemo(
    () => (preparaciones ?? []).filter(p =>
      filtroPrep ? p.nombre.toLowerCase().includes(filtroPrep.toLowerCase()) : true
    ),
    [preparaciones, filtroPrep]
  );

  return (
    <>
      {loading && <Spinner open />}
      <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Control de Insumos y Preparaciones
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Gestiona los insumos y las preparaciones de tu restaurante. Da clic en el ícono <VisibilityIcon sx={{ fontSize: 18, verticalAlign: 'middle', color: 'gray' }} /> para ver detalles.
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'start', mb: 4 }}>
          {/* Insumos */}
          <Box sx={{ flex: 1, minWidth: 330 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <KitchenIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
              <Typography variant="h6" fontWeight={600} flex={1}>Insumos</Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => {
                  setInsumo({ ...emptyInsumo, id: crypto.randomUUID() });
                  setModalInsumoOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: 16, borderRadius: 3, boxShadow: 1 }}
              >
                Agregar Insumo
              </Button>
            </Stack>

            <Autocomplete
              freeSolo disableClearable
              options={nombresInsumos}
              value={filtroInsumo}
              onInputChange={(_, v) => setFiltroInsumo(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar insumo por nombre..."
                  size="small"
                  fullWidth
                  sx={{ mb: 1, bgcolor: '#f8fafd', borderRadius: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    )
                  }}
                />
              )}
              sx={{ mb: 1 }}
            />

            <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f2f5fa' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unidad</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Costo c/merma</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80, textAlign: 'center' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insumosFiltrados.map((i, idx) => (
                    <TableRow key={i.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#f8fafd', '&:hover': { bgcolor: '#e3f2fd' } }}>
                      <TableCell>{i.nombre}</TableCell>
                      <TableCell>{i.unidad}</TableCell>
                      <TableCell>
                        <span style={{ color: '#1976d2', fontWeight: 600 }}>{formatoMoneda(i.costoMerma)}</span>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalles">
                          <IconButton color="default" size="small" onClick={() => { setInsumo(i); setModalInsumoOpen(true); }} sx={{ color: 'gray' }}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar insumo">
                          <IconButton color="default" size="small" sx={{ color: 'gray', ml: 1 }} onClick={() => askDelete('insumo', i.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(insumosFiltrados.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 3 }}>
                        No hay insumos registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {/* Preparaciones */}
          <Box sx={{ flex: 1, minWidth: 330 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <RestaurantMenuIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
              <Typography variant="h6" fontWeight={600} flex={1}>Preparaciones</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => {
                  setPrep({ ...emptyPrep, id: crypto.randomUUID(), workareaid: null });
                  setModalPrepOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: 16, borderRadius: 3, boxShadow: 1 }}
              >
                Agregar Preparación
              </Button>
            </Stack>

            <Autocomplete
              freeSolo disableClearable
              options={nombresPreparaciones}
              value={filtroPrep}
              onInputChange={(_, v) => setFiltroPrep(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar preparación por nombre..."
                  size="small"
                  fullWidth
                  sx={{ mb: 1, bgcolor: '#f8fafd', borderRadius: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    )
                  }}
                />
              )}
              sx={{ mb: 1 }}
            />

            <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f2f5fa' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ingredientes</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Preparado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Costo total</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80, textAlign: 'center' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preparacionesFiltradas.map((p, idx) => {
                    const costoTotal = p.insumos.reduce((sum, ing) => {
                      const insumoObj = insumos?.find(i => i.id === ing.idinsumo);
                      const costoUnitario = insumoObj?.costoUnitario ?? ing.costoUnitario ?? 0;
                      return sum + ing.cantidad * costoUnitario;
                    }, 0).toFixed(2);

                    return (
                      <TableRow key={p.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#f8fafd', '&:hover': { bgcolor: '#e3f2fd' } }}>
                        <TableCell>{p.nombre}</TableCell>
                        <TableCell>
                          <ul style={{ paddingLeft: 16, margin: 0 }}>
                            {p.insumos.map(ing => {
                              const insumoObj = insumos?.find(i => i.id === ing.idinsumo);
                              const nombre = insumoObj?.nombre ?? ing.idinsumo;
                              const unidad = insumoObj?.unidad ?? '';
                              const cantidad = ing.cantidad;
                              const costoUnitario = insumoObj?.costoUnitario ?? ing.costoUnitario ?? 0;
                              const costo = (cantidad * costoUnitario).toFixed(2);

                              return (
                                <li key={ing.id} style={{ marginBottom: 4 }}>
                                  <strong>{nombre}</strong>
                                  {' — '}
                                  <span style={{ color: '#388e3c', fontWeight: 500 }}>{cantidad} {unidad}</span>
                                  <span style={{ color: "#1976d2" }}>
                                    {' ($' + costo + ')'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 600, color: '#5d4037' }}>{p.cantidadpreparada}</span>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 700, color: '#1976d2' }}>${costoTotal}</span>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver detalles">
                            <IconButton
                              color="default"
                              size="small"
                              onClick={() => { setPrep(p as (Preparacion & { workareaid?: string | null })); setModalPrepOpen(true); }}
                              sx={{ color: 'gray' }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar preparación">
                            <IconButton
                              color="default"
                              size="small"
                              sx={{ color: 'gray', ml: 1 }}
                              onClick={() => askDelete('preparacion', p.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(preparacionesFiltradas.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 3 }}>
                        No hay preparaciones registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </Box>
      </Box>

      <InsumoModal
        open={modalInsumoOpen}
        insumo={insumo}
        onSave={handleSaveInsumo}
        onClose={() => setModalInsumoOpen(false)}
        proveedores={proveedores!}
        insumos={insumos!}
        workAreas={workAreas ?? []}   // ← AÑADIR ESTO
      />


      {/* ⬇️ PASA workAreas AL MODAL */}
      <PreparacionModal
        open={modalPrepOpen}
        preparacion={prep}
        preparaciones={preparaciones!}
        onSave={handleSavePrep}
        onClose={() => setModalPrepOpen(false)}
        insumos={insumos!}
        workAreas={workAreas ?? []}   // ⬅️ AQUI
        userid={userid!}
      />

      <ConfirmDialog
        open={!!deleteType}
        title="¿Eliminar?"
        message={deleteType === 'insumo'
          ? '¿Seguro que quieres eliminar este insumo? Esta acción es irreversible.'
          : '¿Seguro que quieres eliminar esta preparación? Esta acción es irreversible.'}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteType(null); setDeleteId(null); }}
      />
    </>
  );
};

export default ConfiguracionInsumosPage;
