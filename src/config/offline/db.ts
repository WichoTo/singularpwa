// src/config/offline/db.ts
import { openDB } from 'idb'
import type { IDBPDatabase, IDBPObjectStore } from 'idb'

let _db: IDBPDatabase | null = null
const DB_NAME = 'sigunlar-offline'
const DB_VERSION = 16

export async function getDB() {
  if (_db) return _db

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      // v1: bases
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('users')) {
          const store = db.createObjectStore('users', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      }

      // v2: sucursales
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('sucursales')) {
          const store = db.createObjectStore('sucursales', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
      }

      // v3: files
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'key' })
        }
      }

      // v4: mesas
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('mesas')) {
          const store = db.createObjectStore('mesas', { keyPath: 'id' })
          store.createIndex('by_sucursal', 'sucursalid', { unique: false })
        }
      }

      // v5: menú
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains('menu')) {
          const store = db.createObjectStore('menu', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
      }

      // v6: insumos + preparaciones
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains('insumos')) {
          const store = db.createObjectStore('insumos', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
        if (!db.objectStoreNames.contains('preparaciones')) {
          const store = db.createObjectStore('preparaciones', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
      }

      // v7: proveedores
      if (oldVersion < 7) {
        if (!db.objectStoreNames.contains('proveedores')) {
          const store = db.createObjectStore('proveedores', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
        }
      }

      // v8: producción
      if (oldVersion < 8) {
        if (!db.objectStoreNames.contains('produccion')) {
          const store = db.createObjectStore('produccion', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
          store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          store.createIndex('by_preparacionid', 'preparacionid', { unique: false })
        }
      }

      // v9: workareas
      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains('workareas')) {
          const store = db.createObjectStore('workareas', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
          store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          // @ts-ignore índices compuestos soportados por idb
          store.createIndex('by_sucursal_orden', ['sucursalid', 'orden'], { unique: false })
        }
      }

      // v10: fix índices legacy en 'produccion'
      if (oldVersion >= 8 && oldVersion < 10 && db.objectStoreNames.contains('produccion')) {
        const store = tx.objectStore('produccion')
        if (!store.indexNames.contains('by_id')) store.createIndex('by_id', 'id', { unique: true })
        if (!store.indexNames.contains('by_sucursalid')) store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
        if (!store.indexNames.contains('by_preparacionid')) store.createIndex('by_preparacionid', 'preparacionid', { unique: false })
        if (store.indexNames.contains('by_sucursal')) store.deleteIndex('by_sucursal')
        if (store.indexNames.contains('by_preparacion')) store.deleteIndex('by_preparacion')
        if (store.indexNames.contains('by_tipo')) store.deleteIndex('by_tipo')
      }

      // v11: inventario
      if (oldVersion < 11) {
        if (!db.objectStoreNames.contains('inventario')) {
          const store = db.createObjectStore('inventario', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
          store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          store.createIndex('by_insumoid', 'insumoid', { unique: false })
          store.createIndex('by_tipo', 'tipo', { unique: false })
        }
      }

      // v12: turnos
      if (oldVersion < 12) {
        if (!db.objectStoreNames.contains('turnos')) {
          const store = db.createObjectStore('turnos', { keyPath: 'id' })
          store.createIndex('by_id', 'id', { unique: true })
          store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          // @ts-ignore índice compuesto
          store.createIndex('by_sucursalid_abierto', ['sucursalid', 'abierto_num'], { unique: false })
        } else {
          const store = tx.objectStore('turnos')
          if (!store.indexNames.contains('by_sucursalid')) store.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          // @ts-ignore índice compuesto
          if (!store.indexNames.contains('by_sucursalid_abierto')) {
            store.createIndex('by_sucursalid_abierto', ['sucursalid', 'abierto_num'], { unique: false })
          }
        }
      }

      // v13: creación normal de cuentas y conceptos (instalación fresca)
      if (oldVersion < 13) {
        if (!db.objectStoreNames.contains('cuentasmesero')) {
          const s = db.createObjectStore('cuentasmesero', { keyPath: 'id' })
          s.createIndex('by_id', 'id', { unique: true })
          s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          s.createIndex('by_turnoid', 'turnoid', { unique: false })
          s.createIndex('by_mesaid', 'mesaid', { unique: false })
          s.createIndex('by_estado', 'estado', { unique: false })
        }
        if (!db.objectStoreNames.contains('cuentascomensal')) {
          const s = db.createObjectStore('cuentascomensal', { keyPath: 'id' })
          s.createIndex('by_id', 'id', { unique: true })
          s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          s.createIndex('by_turnoid', 'turnoid', { unique: false })
          s.createIndex('by_mesaid', 'mesaid', { unique: false })
          s.createIndex('by_estado', 'estado', { unique: false })
        }
        if (!db.objectStoreNames.contains('conceptoscuentas')) {
          const s = db.createObjectStore('conceptoscuentas', { keyPath: 'id' })
          s.createIndex('by_id', 'id', { unique: true })
          s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          s.createIndex('by_turnoid', 'turnoid', { unique: false })
          s.createIndex('by_mesaid', 'mesaid', { unique: false })
          s.createIndex('by_cuentacomensalid', 'cuentacomensalid', { unique: false })
          s.createIndex('by_cuentameseroid', 'cuentameseroid', { unique: false })
          s.createIndex('by_estado', 'estado', { unique: false })
          // @ts-ignore índice compuesto permitido por idb
          s.createIndex('by_turno_estado', ['turnoid', 'estado'], { unique: false })
        }
      }

      // v14: limpieza de stores con nombres legacy/inconsistentes
      if (oldVersion < 14) {
        const legacy = ['conceptoscuenta', 'conceptos_cuenta', 'cuentas_mesero', 'cuentas_comensal']
        for (const name of legacy) {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name)
        }
      }

      // v15: asegurar creación/índices en cuentas/ conceptos (por si venías de un estado parcial)
      if (oldVersion < 15) {
        type AnyStore = IDBPObjectStore<any, ArrayLike<string>, string, 'versionchange'>

        const ensure = (
          name: 'cuentasmesero' | 'cuentascomensal' | 'conceptoscuentas',
          build: (s: AnyStore) => void
        ) => {
          if (!db.objectStoreNames.contains(name)) {
            const s = db.createObjectStore(name, { keyPath: 'id' }) as unknown as AnyStore
            build(s)
          } else {
            const s = tx.objectStore(name) as unknown as AnyStore
            build(s)
          }
        }

        ensure('cuentasmesero', (s) => {
          if (!s.indexNames.contains('by_id')) s.createIndex('by_id', 'id', { unique: true })
          if (!s.indexNames.contains('by_sucursalid')) s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          if (!s.indexNames.contains('by_turnoid')) s.createIndex('by_turnoid', 'turnoid', { unique: false })
          if (!s.indexNames.contains('by_mesaid')) s.createIndex('by_mesaid', 'mesaid', { unique: false })
          if (!s.indexNames.contains('by_estado')) s.createIndex('by_estado', 'estado', { unique: false })
        })

        ensure('cuentascomensal', (s) => {
          if (!s.indexNames.contains('by_id')) s.createIndex('by_id', 'id', { unique: true })
          if (!s.indexNames.contains('by_sucursalid')) s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          if (!s.indexNames.contains('by_turnoid')) s.createIndex('by_turnoid', 'turnoid', { unique: false })
          if (!s.indexNames.contains('by_mesaid')) s.createIndex('by_mesaid', 'mesaid', { unique: false })
          if (!s.indexNames.contains('by_estado')) s.createIndex('by_estado', 'estado', { unique: false })
        })

        ensure('conceptoscuentas', (s) => {
          if (!s.indexNames.contains('by_id')) s.createIndex('by_id', 'id', { unique: true })
          if (!s.indexNames.contains('by_sucursalid')) s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          if (!s.indexNames.contains('by_turnoid')) s.createIndex('by_turnoid', 'turnoid', { unique: false })
          if (!s.indexNames.contains('by_mesaid')) s.createIndex('by_mesaid', 'mesaid', { unique: false })
          if (!s.indexNames.contains('by_cuentacomensalid')) s.createIndex('by_cuentacomensalid', 'cuentacomensalid', { unique: false })
          if (!s.indexNames.contains('by_cuentameseroid')) s.createIndex('by_cuentameseroid', 'cuentameseroid', { unique: false })
          if (!s.indexNames.contains('by_estado')) s.createIndex('by_estado', 'estado', { unique: false })
          // @ts-ignore índice compuesto
          if (!s.indexNames.contains('by_turno_estado')) s.createIndex('by_turno_estado', ['turnoid', 'estado'], { unique: false })
        })
      }if (oldVersion < 16) {
        type AnyStore = IDBPObjectStore<any, ArrayLike<string>, string, 'versionchange'>

        const ensure = (name: 'pagos', build: (s: AnyStore) => void) => {
          if (!db.objectStoreNames.contains(name)) {
            const s = db.createObjectStore(name, { keyPath: 'id' }) as unknown as AnyStore
            build(s)
          } else {
            const s = tx.objectStore(name) as unknown as AnyStore
            build(s)
          }
        }

        ensure('pagos', (s) => {
          if (!s.indexNames.contains('by_id')) s.createIndex('by_id', 'id', { unique: true })
          if (!s.indexNames.contains('by_turnoid')) s.createIndex('by_turnoid', 'turnoid', { unique: false })
          if (!s.indexNames.contains('by_cuentaId')) s.createIndex('by_cuentaId', 'cuentaId', { unique: false })
          if (!s.indexNames.contains('by_sucursalid')) s.createIndex('by_sucursalid', 'sucursalid', { unique: false })
          if (!s.indexNames.contains('by_mesaid')) s.createIndex('by_mesaid', 'mesaid', { unique: false })
          if (!s.indexNames.contains('by_estado')) s.createIndex('by_estado', 'estado', { unique: false })
          if (!s.indexNames.contains('by_fecha')) s.createIndex('by_fecha', 'fecha', { unique: false })
        })
      }
    },
  })

  return _db
}
