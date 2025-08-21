export interface Route {
  path: string;
  name: string;
  rol?: string | string[];
  nivel?:string;
  area?:string;
  element?: React.LazyExoticComponent<React.FC>;
  icon?: React.ElementType;
  children?: Route[];
}

export interface DocumentW {
  id: string;
  nombre: string;
  path?: string; 
  url?: string;
  file?: File; 
  bucket?: string; 
}

export const ROLES = {
  Usuario:   { tipo: 'Usuario', jerarquia: 3 },
  Gerente:      { tipo: 'Gerente', jerarquia: 2 },
  Administracion:   { tipo: 'Administracion', jerarquia: 1 },
  Plataforma:    { tipo: 'Plataforma', jerarquia: 0 }, 
} as const;

export type RoleTipo = keyof typeof ROLES; 
export type Role = typeof ROLES[RoleTipo];
    
export interface User {
id: string;
nombre: string;
correo: string;
telefono: string;
rol: Role;
areas: string[];
sucursales?: string[];
}

export interface Session {
  id: string;                  // ID del usuario
  accessToken?: string;        // Token si usas Supabase
  refreshToken?: string;       // Opcional
  expiresAt?: number;          // Unix timestamp, por si quieres validar tiempo
}

export interface Sucursal {
id: string;
userid: string;
nombre: string;
telefono: string;
ubicacion?: string;
imagenes?: DocumentW[];
turnos?: TurnoSucursal[];
areas?: string[];
workAreas?: WorkArea[];
}
export interface WorkArea {
  id: string
  sucursalid: string
  nombre: string
  orden?: number
  color?: string | null
  is_active?: boolean
  printer_id?: string | null  // para Web Bluetooth o mapeo local
  created_at?: string
  updated_at?: string
}

export interface TurnoSucursal {
id: string;
nombre: string;
inicio: string;
fin: string;
}


export interface Mesa {
id: string
userid: string
sucursalid: string
nomesa: string
comensales: number
area: string
}

export interface Proveedor {
  id:string 
  userid: string
  nombre:string 
  telefono?:string
  direccion?:string 
  diaPedido?:string 
  diaEntrega?:string
}

export interface ItemMenu {
  id: string;
  userid: string;
  sucursalid: string;
  nombre: string;
  categoria: string;
  subcategoria: string;
  area: string;
  referencias:DocumentW[];
  ingredientes: IngredienteMenu[];
  costoProduccion: number;
  porcentajeCostosFijos?:number
  precioVenta: number;
  created_at?: string;
  updated_at?: string;
}

export interface IngredienteMenu {
  id: string;
  nombre: string;
  idinsumo:string
  tipo: 'insumo' | 'preparacion'
  cantidad: number;
  unidad: string;
  costoUnitario: number;
}

export interface Insumo {
  id: string;
  userid:string
  nombre: string;
  workareaid:string | null;
  idproveedor?: string|null;
  categoria: string
  unidad: string;
  merma:number;
  costoUnitario: number;
  costoMerma:number
}

export interface Preparacion {
  id: string
  userid:string
  workareaid:string | null;
  nombre: string
  cantidadpreparada: number;
  insumos:InsumoPreparacion[]
}
export interface InsumoPreparacion {
  id: string;
  userid:string
  idinsumo: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
}
export interface PreparacionProduccion {
  id: string;
  userid:string
  preparacionid: string | null;
  sucursalid: string;
  cantidad: number;
  fecha: string;  // o dateCreated
  tipo: 'inicial' | 'entrada' | 'salida' | 'ajuste';
}
export interface InsumoInventario {
  id: string;
  userid:string
  insumoid: string | null;
  sucursalid: string;
  cantidad: number;
  fecha: string;  // o dateCreated
  tipo: 'inicial' | 'entrada' | 'salida' | 'ajuste';
}


export interface TurnoActivo  {
  id: string
  sucursalid: string
  userid?: string
  abierto: boolean
  fechainicio: string     
  fechafin?: string       
  efectivoInicial?: number
  efectivoFinal?: number
}


export type EstadoCuenta = 'abierta' | 'pagada' | 'cancelada'
export type EstadoConcepto =
  | 'pendiente' | 'aceptado' | 'en_preparacion'
  | 'listo' | 'por_entregar' | 'entregado'
  | 'cobrado' | 'cancelado'

export type CuentaTipo = 'piso' | 'para_llevar'

export interface CuentaMesero {
  id: string
  sucursalid: string
  turnoid: string
  mesaid: string | null
  userid: string
  cuentacomensalid?: string | null
  fechainicio: string
  fechafin?: string
  nomesa?: string
  tipo: CuentaTipo
  estado: EstadoCuenta
  totalbruto?: number
  totalpagado?: number
  created_at?: string
  updated_at?: string
  version?: number
}

export interface CuentaComensal {
  id: string
  sucursalid: string
  turnoid: string
  mesaid: string | null
  cuentameseroid?: string | null
  nomesa?: string
  estado: EstadoCuenta
  fechainicio: string
  fechafin?: string
  created_at?: string
  updated_at?: string
  version?: number
}

export interface ConceptoCuenta {
  id: string
  sucursalid: string
  turnoid: string
  mesaid: string | null
  cuentacomensalid?: string | null
  cuentameseroid?: string | null
  itemmenuid: string
  preciounitario: number
  descuento?: number
  importe?: number
  nombrecliente?: string
  notas?: string | null
  accepted_by?: string | null
  canceled_by?: string | null
  estado: EstadoConcepto
  origen: 'comensal' | 'mesero'
  created_at?: string
  updated_at?: string
  version?: number
}

export type MetodoPago = 'efectivo' | 'tarjeta'

export type EstadoPago = 'pendiente' | 'confirmado' | 'cancelado' 
// "cancelado" lo usará el gerente después; por ahora no se borra nada.

export interface PagoProducto {
  conceptoId: string
  cantidad: number            // cuántas unidades cubre este pago (en tu modelo actual: 0/1 por fila)
  unit?: number               // snapshot opcional del precio unitario
  total?: number              // unit * cantidad (opcional)
  nombreCliente?: string | null
}

export interface Pago {
  id: string
  turnoid: string             // CONSISTENTE con tus otras tablas
  cuentaid: string            // <- lo mantengo camelCase porque ya lo usas en UI
  mesaid?: string | null
  sucursalid: string
  userid?: string
  fecha: string               // ISO
  metodo: MetodoPago          // solo efectivo/tarjeta
  total: number               // importe pagado (sin necesidad de desglosar)
  tip?: number                // propina de esta línea (opcional)
  estado: EstadoPago          // 'pendiente' cuando se encola offline, 'confirmado' al sincronizar, 'cancelado' por gerente
  detalles?: {
    productos?: PagoProducto[]
  }
}

export type SeleccionPorConcepto = Record<string, number>


export interface GastoFijo {
  id: string;
  tipo: string;         // Ej. Luz, Gas, Renta
  descripcion: string;  // Detalle opcional
  montoMensual: number;
  diadelmes: number;  // YYYY-MM-DD
  referencias?:Document[]
}