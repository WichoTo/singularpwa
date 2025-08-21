// src/config/offline/outbox/types.ts
export type MutationType =
  | 'UPSERT_USER'
  | 'UPSERT_SUCURSAL'
  | 'DELETE_SUCURSAL'
  | 'UPSERT_MESA'
  | 'DELETE_MESA'
  | 'UPSERT_MENU'
  | 'DELETE_MENU'
  | 'UPSERT_PROVEEDOR'
  | 'DELETE_PROVEEDOR'
  | 'UPSERT_INSUMO'
  | 'DELETE_INSUMO'
  | 'UPSERT_PREPARACION'
  | 'DELETE_PREPARACION'
  | 'UPSERT_WORKAREAS'
  | 'DELETE_WORKAREAS'
  | 'UPSERT_PRODUCCION'
  | 'DELETE_PRODUCCION'
  | 'UPSERT_INVENTARIO'
  | 'DELETE_INVENTARIO'
  | 'UPSERT_CUENTA_MESERO'
  | 'UPSERT_CUENTA_COMENSAL'
  | 'UPSERT_CONCEPTO'
  | 'DELETE_CONCEPTO'
  | 'UPSERT_TURNO'
  | 'CLOSE_TURNO'  
  | 'UPSERT_PAGO'              // 👈 NUEVO

export type OfflineMutation<T = any> = {
  id: string
  type: MutationType
  payload: T
  createdAt: number
  attempts?: number
  nextAttempt?: number
  lastError?: string
}
