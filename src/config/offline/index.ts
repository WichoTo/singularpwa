// src/offline/index.ts

// utils & sync
export { isOnline, uuid } from './utils'
export { processOutbox, initOfflineSyncListeners } from './sync'

// services (online-aware + cola)
export { fetchUsuariosAware, upsertUsuarioAware } from './services/usuarios'
export { fetchSucursalesAware, upsertSucursalAware, deleteSucursalAware } from './services/sucursales'
export { fetchMesasAware, upsertMesaAware, deleteMesaAware } from './services/mesas'
export { fetchMenuAware, upsertMenuItemAware, deleteMenuItemAware } from './services/menu'
export { fetchInsumosAware, upsertInsumoAware, deleteInsumoAware } from './services/insumos'
export { fetchPreparacionesAware, upsertPreparacionAware, deletePreparacionAware } from './services/preparaciones'
export { fetchProveedoresAware, upsertProveedorAware, deleteProveedorAware } from './services/proveedores'
export { fetchWorkAreasAware, upsertWorkAreasAware, deleteWorkAreasAware } from './services/workareas'
export { fetchProduccionAware, upsertProduccionAware, deleteProduccionAware,} from './services/produccion'
export {  fetchTurnosAware,  upsertTurnoAware,} from './services/turnos'


// cache helpers (IDB)
export { cacheMenu, readMenuCache } from './cache/menu'
export { cacheMesas, readMesasCache } from './cache/mesa'
export { cacheSucursales, readSucursalesCache } from './cache/sucursales'
export { cacheUsers, readUsersCache } from './cache/users'
export { cacheInsumos, readInsumosCache } from './cache/insumos'
export { cachePreparaciones, readPreparacionesCache } from './cache/preparacion'
export { cacheProveedores, readProveedoresCache } from './cache/proveedores'
export { cacheTurnos, readTurnoActivo,readTurnosBySucursal} from './cache/turnos'

export { cacheWorkAreas, readWorkAreasCache, cacheAllWorkAreas, readAllWorkAreasCache,} from './cache/workareas'
export { cacheProduccion, readProduccionCache } from './cache/produccion'


export { fetchPagosAware, upsertPagoAware, buildPagoLine, markConceptosCobradosAware } from './services/pagos'
export { cachePagos, readPagosByTurno, readPagosByCuenta } from './cache/pagos'


// outbox helpers
export { enqueueMutation, dequeueMutation, getOutbox } from './outbox/queue'
export type { MutationType, OfflineMutation } from './outbox/types'
// src/config/offline/index.ts

// Core
export * from './db'
export * from './sync'
export * from './utils'
export * from './storage'
export * from './blobs'

// Outbox
export * from './outbox/types'
export * from './outbox/queue'

// Services
export * from './services/usuarios'
export * from './services/sucursales'
export * from './services/mesas'
export * from './services/menu'
export * from './services/insumos'
export * from './services/preparaciones'
export * from './services/proveedores'
export * from './services/workareas'
export * from './services/produccion'
export * from './services/turnos'
export * from './services/cuentas'

// Cache
export * from './cache/users'
export * from './cache/sucursales'
export * from './cache/mesa'
export * from './cache/menu'
export * from './cache/insumos'
export * from './cache/preparacion'
export * from './cache/proveedores'
export * from './cache/workareas'
export * from './cache/produccion'
export * from './cache/turnos'
export * from './cache/cuentas'
export * from './services/pagos'
export * from './cache/pagos'
