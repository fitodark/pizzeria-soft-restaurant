# Pizzería Barbosa — Blueprint

> Generado por The Architect el 2026-07-04
> Arquetipo: Internal Tool / POS (punto de venta multi-sucursal)
> Idioma del proyecto: Español (UI, código de dominio y documentación)

---

## 1. Visión General del Proyecto

### Visión
Sistema POS web para **Pizzería Barbosa**: gestiona ventas en establecimiento y a domicilio, inventario, promociones, cortes de caja con auditoría y multi-sucursal. El servidor web se instala **localmente en la PC principal de cada sucursal** (Windows) y todas las sucursales comparten una **base de datos en línea (Supabase/PostgreSQL)**, lo que permite que el administrador supervise cualquier sucursal y que otros sistemas se conecten a los datos en el futuro.

El sistema imprime tickets térmicos de 80mm en **3 impresoras** (principal/cuenta, cocina, barra de bebidas) conectadas por ethernet y compartidas en Windows. La impresión ocurre **desde el servidor local** (ESC/POS por TCP), nunca desde el navegador — cero diálogos de impresión.

### Usuarios
Personal interno: 1 administrador, 1 encargado y 3 meseros al arranque (1 sucursal). El rol repartidor existe desde el día uno. El administrador puede dar de alta sucursales nuevas y asignar usuarios; los usuarios solo entran si tienen una sucursal activa asignada y eligen dónde laboran al iniciar sesión. El administrador puede cambiar de sucursal en cualquier momento.

### Objetivos
- Registrar toda venta (establecimiento y domicilio) en un flujo guiado de 4 pasos con confirmación del cliente.
- Control total de caja: un corte activo por sucursal, ingresos/egresos, gastos con auditoría de registros inactivos para el administrador.
- Impresión silenciosa de comandas (cocina/barra) y tickets de cuenta/cobro.
- Multi-sucursal desde el modelo de datos, aunque arranque con una.

### Métricas de Éxito
- Una venta telefónica completa (cliente + bebidas + comida + confirmación + impresión de comandas) se captura en menos de 90 segundos.
- El corte de caja cierra con totales que cuadran automáticamente contra ventas y gastos activos.
- Instalar el sistema en una sucursal nueva toma < 1 hora (script de instalación + .env + registro de impresoras).

### Fuera de alcance (v1)
- Modo offline (se acordó depender de internet por fibra; mitigación operativa, no técnica).
- Facturación fiscal (CFDI), pagos con tarjeta/terminal, app para repartidores con GPS.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | Next.js 15 (App Router) | UI + API en un solo servidor Node que corre local en la PC de la sucursal |
| Lenguaje | TypeScript (strict) | Tipos seguros en un dominio con dinero y auditoría |
| Estilos | Tailwind CSS v4 | Velocidad de construcción, consistencia |
| Componentes | shadcn/ui | Tablas, formularios, modales y dialogs listos para POS |
| Base de datos | Supabase (PostgreSQL en línea) | Requisito del cliente: BD en la nube compartida entre sucursales y sistemas futuros |
| ORM | Prisma | Migraciones versionadas y tipos generados para un esquema de ~20 tablas |
| Auth | Supabase Auth (email/password) + tabla `perfiles` | Integrado a la BD; roles, sueldo, PIN y sucursales en el perfil |
| Impresión | ESC/POS server-side (`node-thermal-printer`) por TCP:9100, fallback a recurso compartido Windows | Impresoras ethernet 80mm; impresión silenciosa sin navegador |
| Hosting | Local: servicio de Windows (NSSM) en la PC principal de cada sucursal | Requisito del cliente: instalación local, acceso vía LAN |
| Package Manager | pnpm | Rápido y determinista |
| Validación | Zod | Validar todo input en server actions y API routes |
| Tablas | TanStack Table | Listados con filtros, paginación y ordenamiento |
| Fechas | date-fns (locale es) | Reportes diarios/semanales/mensuales |

---

## 3. Estructura de Directorios

```
pizzeria-barbosa/
  prisma/
    schema.prisma              # Esquema completo (sección 4)
    seed.ts                    # Admin inicial, sucursal demo, productos ejemplo
  scripts/
    install-service.ps1        # Registra el servidor como servicio Windows (NSSM)
    update.ps1                 # git pull + pnpm ci + build + restart del servicio
  src/
    app/
      login/page.tsx                   # Login email/password
      seleccionar-sucursal/page.tsx    # Selección de sucursal post-login (obligatoria)
      (dashboard)/
        layout.tsx                     # Shell: sidebar + header (sucursal activa + usuario)
        page.tsx                       # Resumen del día: ventas activas, total del corte
        ventas/
          page.tsx                     # Listado de ventas activas (pendientes) + historial
          nueva/page.tsx               # Wizard 4 pasos (cliente → bebidas → comida → confirmación)
          [id]/page.tsx                # Detalle: agregar productos, cobrar, inactivar líneas (PIN)
        clientes/
          page.tsx                     # Listado con búsqueda por teléfono
          [id]/page.tsx                # Detalle + direcciones (N por cliente)
        productos/
          page.tsx                     # Catálogo con filtros (tipo, categoría, extras)
          nuevo/page.tsx               # Alta con variantes (tamaño + precio)
          [id]/page.tsx                # Edición
        inventario/
          page.tsx                     # Existencias por sucursal (solo inventariables) + ajustes
        promociones/
          page.tsx                     # Listado (promoción / paquete / 2x1)
          nueva/page.tsx               # Alta con días/temporada, productos y banderas
          [id]/page.tsx
        cortes/
          page.tsx                     # Corte activo + historial de cortes de la sucursal
          [id]/page.tsx                # Detalle: movimientos, gastos, compras; admin ve inactivos
        compras/
          nueva/page.tsx               # Nota de proveedor (detalle de productos, suma inventario)
        sucursales/
          page.tsx                     # (admin) CRUD sucursales + usuarios asignados
          [id]/page.tsx
        usuarios/
          page.tsx                     # (admin) CRUD usuarios: rol, sueldo, PIN, sucursales
          [id]/page.tsx
        reportes/page.tsx              # Gastos e ingresos diario/semanal/mensual + export CSV
        configuracion/page.tsx         # Impresoras (3) + leyendas de ticket por sucursal
      api/
        impresion/route.ts             # POST: reimprimir ticket (cuenta, comanda) por id
        reportes/export/route.ts       # GET: CSV de reportes
      layout.tsx
      globals.css
    components/
      ui/                              # Primitivas shadcn/ui
      layout/Sidebar.tsx, Header.tsx, SucursalBadge.tsx
      ventas/
        WizardVenta.tsx                # Orquestador de los 4 pasos
        PasoCliente.tsx                # Búsqueda por teléfono + modal alta cliente/dirección
        PasoBebidas.tsx, PasoComida.tsx
        PizzaPersonalizadaDialog.tsx   # Selección de tamaño + 2 mitades (especialidades)
        ExtrasNotasDialog.tsx          # Extras cobrables + notas ("sin lechuga")
        PasoResumen.tsx                # Total, método de pago, "paga con" (domicilio)
        PinDialog.tsx                  # Confirmación por PIN para inactivar líneas
        CobroDialog.tsx                # Monto pagado, cambio, transferencia
      cortes/AperturaCorteDialog.tsx, CierreCorteDialog.tsx, GastoDialog.tsx
      tables/DataTable.tsx             # Genérica: paginación, orden, filtros
      forms/                           # Formularios por recurso (react-hook-form + zod)
    lib/
      db.ts                            # Cliente Prisma singleton
      supabase/client.ts, server.ts    # Clientes Supabase (@supabase/ssr)
      auth.ts                          # getSesion(): usuario + rol + sucursal activa (cookie)
      permisos.ts                      # Matriz rol → acción; usar en TODA mutación
      precios.ts                       # Reglas: mitad más cara, extras, promos, totales
      folios.ts                        # Folio consecutivo por sucursal (tabla contador + lock)
      impresion/
        escpos.ts                      # Conexión TCP:9100 / fallback share Windows (copy /B)
        tickets.ts                     # Plantillas: comanda cocina, comanda barra, cuenta, cobro
      acciones/                        # Server actions por dominio (ventas.ts, cortes.ts, ...)
      utils.ts                         # formatoMoneda, formatoFecha (es-MX)
    types/index.ts
    middleware.ts                      # Protege todo excepto /login; exige sucursal seleccionada
  .env.example
  CLAUDE.md
```

---

## 4. Modelo de Datos

### Entidades y reglas clave

- **Dinero:** `Decimal(10,2)` siempre. Nunca float.
- **Nada se borra:** ventas, líneas de venta y gastos usan bandera `activo` + quién/cuándo inactivó. El administrador ve todo (auditoría); encargado/mesero solo ven activos.
- **Precios snapshot:** `venta_detalles.precio_unitario` copia el precio vigente al momento de la venta. Cambiar el catálogo no altera ventas pasadas.
- **Un corte abierto por sucursal:** índice único parcial en BD, no solo validación en código.

### Esquema Prisma (completo)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooler de Supabase (puerto 6543)
  directUrl = env("DIRECT_URL")        // Conexión directa (5432) para migraciones
}

enum Rol { ADMINISTRADOR ENCARGADO MESERO REPARTIDOR }
enum PeriodoSueldo { DIARIO SEMANAL MENSUAL }
enum TipoProducto { COMIDA BEBIDA }
enum TipoArticulo { VENTA EXTRA }          // EXTRA: no se vende solo (ej. "queso extra")
enum TipoPromocion { PROMOCION PAQUETE DOS_POR_UNO }
enum RolPromoProducto { REQUERIDO REGALO }
enum EstatusCorte { ABIERTO CERRADO }
enum TipoMovimiento { INGRESO EGRESO }
enum OrigenMovimiento { VENTA GASTO COMPRA_PROVEEDOR SUELDO }
enum CanalVenta { ESTABLECIMIENTO DOMICILIO }
enum EstatusVenta { PENDIENTE COBRADA CANCELADA }
enum MetodoPago { EFECTIVO TRANSFERENCIA }
enum TipoLinea { PRODUCTO PIZZA_PERSONALIZADA PROMOCION }
enum TipoMovInventario { ENTRADA SALIDA AJUSTE }

model Sucursal {
  id            String   @id @default(uuid()) @db.Uuid
  nombre        String
  calle         String
  colonia       String
  ciudad        String
  estado        String
  codigoPostal  String   @map("codigo_postal")
  telefono      String                          // Se imprime en el ticket
  activa        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  usuarios      UsuarioSucursal[]
  inventario    Inventario[]
  cortes        CorteCaja[]
  ventas        Venta[]
  configuracion ConfiguracionSucursal?
  folios        FolioContador[]
  @@map("sucursales")
}

model Perfil {
  id            String        @id @db.Uuid      // = auth.users.id de Supabase
  nombre        String
  rol           Rol
  sueldo        Decimal       @db.Decimal(10, 2) @default(0)
  periodoSueldo PeriodoSueldo @map("periodo_sueldo") @default(SEMANAL)
  pinHash       String        @map("pin_hash")  // PIN de seguridad (bcrypt), 4 dígitos
  activo        Boolean       @default(true)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  sucursales    UsuarioSucursal[]
  @@map("perfiles")
}

model UsuarioSucursal {
  usuarioId  String   @map("usuario_id") @db.Uuid
  sucursalId String   @map("sucursal_id") @db.Uuid
  usuario    Perfil   @relation(fields: [usuarioId], references: [id])
  sucursal   Sucursal @relation(fields: [sucursalId], references: [id])
  @@id([usuarioId, sucursalId])
  @@map("usuario_sucursales")
}

model Cliente {
  id          String   @id @default(uuid()) @db.Uuid
  nombre      String
  telefono    String   @unique                  // Llave de búsqueda en el paso 1 de venta
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  direcciones ClienteDireccion[]
  ventas      Venta[]
  @@map("clientes")
}

model ClienteDireccion {
  id         String  @id @default(uuid()) @db.Uuid
  clienteId  String  @map("cliente_id") @db.Uuid
  direccion  String
  referencia String?
  activa     Boolean @default(true)
  cliente    Cliente @relation(fields: [clienteId], references: [id])
  ventas     Venta[]
  @@map("cliente_direcciones")
}

model Producto {
  id                  String       @id @default(uuid()) @db.Uuid
  nombre              String
  descripcion         String?
  tipo                TipoProducto                    // COMIDA | BEBIDA
  tipoArticulo        TipoArticulo @map("tipo_articulo") @default(VENTA) // VENTA | EXTRA
  categoria           String                          // "pizza", "hamburguesa", "refresco"...
  ventaDomicilio      Boolean      @map("venta_domicilio") @default(true)
  ventaEstablecimiento Boolean     @map("venta_establecimiento") @default(true)
  inventariable       Boolean      @default(false)    // true: refrescos; false: pizzas
  esEspecialidad      Boolean      @map("es_especialidad") @default(false) // elegible como mitad
  permiteExtrasNotas  Boolean      @map("permite_extras_notas") @default(true)
  activo              Boolean      @default(true)
  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  variantes           ProductoVariante[]
  inventario          Inventario[]
  @@map("productos")
}

model ProductoVariante {
  id         String  @id @default(uuid()) @db.Uuid
  productoId String  @map("producto_id") @db.Uuid
  tamano     String  @default("unico")               // "unico" | "chica" | "mediana" | "grande"
  precio     Decimal @db.Decimal(10, 2)
  activa     Boolean @default(true)
  producto   Producto @relation(fields: [productoId], references: [id])
  @@unique([productoId, tamano])
  @@map("producto_variantes")
}

model Inventario {
  sucursalId String   @map("sucursal_id") @db.Uuid
  productoId String   @map("producto_id") @db.Uuid
  existencia Decimal  @db.Decimal(10, 2) @default(0)
  updatedAt  DateTime @updatedAt @map("updated_at")
  sucursal   Sucursal @relation(fields: [sucursalId], references: [id])
  producto   Producto @relation(fields: [productoId], references: [id])
  @@id([sucursalId, productoId])
  @@map("inventario")
}

model MovimientoInventario {
  id         String            @id @default(uuid()) @db.Uuid
  sucursalId String            @map("sucursal_id") @db.Uuid
  productoId String            @map("producto_id") @db.Uuid
  tipo       TipoMovInventario
  cantidad   Decimal           @db.Decimal(10, 2)  // positiva; el tipo define el signo
  referencia String?                               // venta_id | compra_id | motivo de ajuste
  usuarioId  String            @map("usuario_id") @db.Uuid
  createdAt  DateTime          @default(now()) @map("created_at")
  @@index([sucursalId, productoId])
  @@map("movimientos_inventario")
}

model Promocion {
  id                   String        @id @default(uuid()) @db.Uuid
  nombre               String
  descripcion          String?
  tipo                 TipoPromocion                  // PROMOCION | PAQUETE | DOS_POR_UNO
  precioEspecial       Decimal?      @map("precio_especial") @db.Decimal(10, 2)
                                     // PROMOCION/PAQUETE: precio del conjunto.
                                     // DOS_POR_UNO: null (se cobra la pizza comprada).
  ventaDomicilio       Boolean       @map("venta_domicilio") @default(false)
  ventaEstablecimiento Boolean       @map("venta_establecimiento") @default(true)
  fechaInicio          DateTime?     @map("fecha_inicio") @db.Date  // null en PAQUETE
  fechaFin             DateTime?     @map("fecha_fin") @db.Date
  diasSemana           Int[]         @map("dias_semana")            // 0=dom..6=sáb; vacío = todos
  activa               Boolean       @default(true)
  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  productos            PromocionProducto[]
  @@map("promociones")
}

model PromocionProducto {
  id           String           @id @default(uuid()) @db.Uuid
  promocionId  String           @map("promocion_id") @db.Uuid
  rol          RolPromoProducto @default(REQUERIDO)  // REGALO solo en DOS_POR_UNO
  productoId   String?          @map("producto_id") @db.Uuid
                                // null + rol REGALO = el usuario elige la pizza regalo al vender
  varianteId   String?          @map("variante_id") @db.Uuid   // tamaño fijado, si aplica
  cantidad     Int              @default(1)
  promocion    Promocion        @relation(fields: [promocionId], references: [id])
  @@map("promocion_productos")
}

model CorteCaja {
  id                String       @id @default(uuid()) @db.Uuid
  sucursalId        String       @map("sucursal_id") @db.Uuid
  estatus           EstatusCorte @default(ABIERTO)
  saldoInicial      Decimal      @map("saldo_inicial") @db.Decimal(10, 2)
  usuarioAperturaId String       @map("usuario_apertura_id") @db.Uuid
  fechaApertura     DateTime     @default(now()) @map("fecha_apertura")
  usuarioCierreId   String?      @map("usuario_cierre_id") @db.Uuid
  fechaCierre       DateTime?    @map("fecha_cierre")
  totalIngresos     Decimal?     @map("total_ingresos") @db.Decimal(10, 2)  // snapshot al cerrar
  totalEgresos      Decimal?     @map("total_egresos") @db.Decimal(10, 2)
  saldoFinal        Decimal?     @map("saldo_final") @db.Decimal(10, 2)
  notasCierre       String?      @map("notas_cierre")

  sucursal          Sucursal     @relation(fields: [sucursalId], references: [id])
  movimientos       MovimientoCorte[]
  ventas            Venta[]
  compras           CompraProveedor[]
  // Migración manual: índice único parcial — un solo corte ABIERTO por sucursal:
  // CREATE UNIQUE INDEX idx_corte_abierto_unico ON cortes_caja (sucursal_id)
  //   WHERE estatus = 'ABIERTO';
  @@map("cortes_caja")
}

model MovimientoCorte {
  id                 String           @id @default(uuid()) @db.Uuid
  corteId            String           @map("corte_id") @db.Uuid
  tipo               TipoMovimiento                     // INGRESO | EGRESO
  origen             OrigenMovimiento                   // VENTA | GASTO | COMPRA_PROVEEDOR | SUELDO
  descripcion        String
  monto              Decimal          @db.Decimal(10, 2)
  activo             Boolean          @default(true)    // inactivar regresa el monto al corte
  usuarioId          String           @map("usuario_id") @db.Uuid
  ventaId            String?          @map("venta_id") @db.Uuid
  compraId           String?          @map("compra_id") @db.Uuid
  empleadoId         String?          @map("empleado_id") @db.Uuid  // en origen SUELDO
  usuarioInactivoId  String?          @map("usuario_inactivo_id") @db.Uuid
  fechaInactivacion  DateTime?        @map("fecha_inactivacion")
  createdAt          DateTime         @default(now()) @map("created_at")
  corte              CorteCaja        @relation(fields: [corteId], references: [id])
  @@index([corteId])
  @@map("movimientos_corte")
}

model CompraProveedor {
  id        String   @id @default(uuid()) @db.Uuid
  corteId   String   @map("corte_id") @db.Uuid
  proveedor String
  folioNota String?  @map("folio_nota")
  total     Decimal  @db.Decimal(10, 2)
  usuarioId String   @map("usuario_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  corte     CorteCaja @relation(fields: [corteId], references: [id])
  detalles  CompraDetalle[]
  @@map("compras_proveedor")
}

model CompraDetalle {
  id             String   @id @default(uuid()) @db.Uuid
  compraId       String   @map("compra_id") @db.Uuid
  productoId     String?  @map("producto_id") @db.Uuid  // null = insumo libre (verduras)
  descripcion    String
  cantidad       Decimal  @db.Decimal(10, 2)
  precioUnitario Decimal  @map("precio_unitario") @db.Decimal(10, 2)
  sumaInventario Boolean  @map("suma_inventario") @default(false)
  compra         CompraProveedor @relation(fields: [compraId], references: [id])
  @@map("compra_detalles")
}

model Venta {
  id            String       @id @default(uuid()) @db.Uuid
  folio         Int                                   // consecutivo por sucursal
  sucursalId    String       @map("sucursal_id") @db.Uuid
  corteId       String       @map("corte_id") @db.Uuid
  canal         CanalVenta
  estatus       EstatusVenta @default(PENDIENTE)
  clienteId     String?      @map("cliente_id") @db.Uuid       // obligatorio en DOMICILIO
  direccionId   String?      @map("direccion_id") @db.Uuid     // obligatorio en DOMICILIO
  mesa          String?                               // referencia libre en ESTABLECIMIENTO
  repartidorId  String?      @map("repartidor_id") @db.Uuid
  metodoPago    MetodoPago   @map("metodo_pago") @default(EFECTIVO)
  transferenciaValidada Boolean @map("transferencia_validada") @default(false)
  total         Decimal      @db.Decimal(10, 2) @default(0)   // suma de líneas ACTIVAS
  pagaCon       Decimal?     @map("paga_con") @db.Decimal(10, 2) // domicilio: pago anticipado
  montoPagado   Decimal?     @map("monto_pagado") @db.Decimal(10, 2)
  cambio        Decimal?     @db.Decimal(10, 2)
  usuarioId     String       @map("usuario_id") @db.Uuid       // quién capturó
  createdAt     DateTime     @default(now()) @map("created_at")
  cobradaAt     DateTime?    @map("cobrada_at")

  sucursal      Sucursal     @relation(fields: [sucursalId], references: [id])
  corte         CorteCaja    @relation(fields: [corteId], references: [id])
  cliente       Cliente?     @relation(fields: [clienteId], references: [id])
  direccion     ClienteDireccion? @relation(fields: [direccionId], references: [id])
  detalles      VentaDetalle[]
  @@unique([sucursalId, folio])
  @@index([corteId, estatus])
  @@map("ventas")
}

model VentaDetalle {
  id                String    @id @default(uuid()) @db.Uuid
  ventaId           String    @map("venta_id") @db.Uuid
  tipoLinea         TipoLinea @map("tipo_linea")
  productoId        String?   @map("producto_id") @db.Uuid   // null en PIZZA_PERSONALIZADA
  varianteId        String?   @map("variante_id") @db.Uuid
  promocionId       String?   @map("promocion_id") @db.Uuid  // en tipo PROMOCION
  parentDetalleId   String?   @map("parent_detalle_id") @db.Uuid // extras cuelgan de su línea
  cantidad          Int       @default(1)
  precioUnitario    Decimal   @map("precio_unitario") @db.Decimal(10, 2) // SNAPSHOT
  notas             String?                                  // "sin lechuga", "sin cebolla"
  activo            Boolean   @default(true)                 // inactivar requiere PIN
  usuarioInactivoId String?   @map("usuario_inactivo_id") @db.Uuid
  fechaInactivacion DateTime? @map("fecha_inactivacion")
  createdAt         DateTime  @default(now()) @map("created_at")

  venta             Venta     @relation(fields: [ventaId], references: [id])
  mitades           VentaDetalleMitad[]
  @@index([ventaId])
  @@map("venta_detalles")
}

model VentaDetalleMitad {
  id         String       @id @default(uuid()) @db.Uuid
  detalleId  String       @map("detalle_id") @db.Uuid
  mitad      Int                                  // 1 | 2
  productoId String       @map("producto_id") @db.Uuid // especialidad (es_especialidad=true)
  detalle    VentaDetalle @relation(fields: [detalleId], references: [id])
  @@unique([detalleId, mitad])
  @@map("venta_detalle_mitades")
}

model ConfiguracionSucursal {
  sucursalId          String  @id @map("sucursal_id") @db.Uuid
  // Impresoras: modo "tcp" usa host:9100; modo "share" usa \\EQUIPO\NombreCompartido
  impresoraPrincipalModo  String @map("impresora_principal_modo") @default("tcp")
  impresoraPrincipalRuta  String @map("impresora_principal_ruta")   // "192.168.1.50" o "\\\\PC1\\Tickets"
  impresoraCocinaModo     String @map("impresora_cocina_modo") @default("tcp")
  impresoraCocinaRuta     String @map("impresora_cocina_ruta")
  impresoraBebidasModo    String @map("impresora_bebidas_modo") @default("tcp")
  impresoraBebidasRuta    String @map("impresora_bebidas_ruta")
  logoUrl             String? @map("logo_url")        // logotipo cabecera del ticket
  leyendaPie          String? @map("leyenda_pie")     // "¡Gracias por su compra!"
  sucursal            Sucursal @relation(fields: [sucursalId], references: [id])
  @@map("configuracion_sucursales")
}

model FolioContador {
  sucursalId String   @id @map("sucursal_id") @db.Uuid
  siguiente  Int      @default(1)
  sucursal   Sucursal @relation(fields: [sucursalId], references: [id])
  @@map("folio_contadores")
}
```

### Relaciones clave
- `Perfil` ↔ `Sucursal`: N-a-N vía `usuario_sucursales`. El ADMINISTRADOR accede a todas sin necesitar filas.
- `Cliente` 1-a-N `ClienteDireccion` (un cliente, N direcciones).
- `Producto` 1-a-N `ProductoVariante` (tamaños con precio; productos sin tamaño usan variante "unico").
- `Venta` 1-a-N `VentaDetalle`; extras referencian su línea padre vía `parent_detalle_id`; pizza personalizada tiene exactamente 2 `VentaDetalleMitad`.
- `CorteCaja` 1-a-N `MovimientoCorte` / `Venta` / `CompraProveedor`. Toda venta cobrada genera un `MovimientoCorte` INGRESO/VENTA.

### Reglas de negocio de precios (implementar en `lib/precios.ts`, con tests)
1. **Producto normal:** precio = `producto_variantes.precio` de la variante elegida.
2. **Pizza personalizada:** precio = MAX(precio de las 2 especialidades en el tamaño elegido). Las mitades deben ser productos con `es_especialidad = true` y tener variante en ese tamaño.
3. **Extras:** cada extra suma su precio (variante "unico"). Quitar ingredientes NO descuenta. Se guarda como nota.
4. **Promoción/Paquete:** precio = `precio_especial` fijo. PAQUETE se vende todos los días; PROMOCION solo si hoy ∈ `dias_semana` y hoy ∈ [fecha_inicio, fecha_fin]. Validar SIEMPRE en servidor, no solo ocultar en UI.
5. **2x1:** se cobra el precio de la pizza comprada (REQUERIDO); la pizza REGALO entra como línea con `precio_unitario = 0` vinculada a la promoción.
6. **Total de venta:** suma de líneas con `activo = true` únicamente.
7. **Canal:** en ventas DOMICILIO solo se ofrecen productos/promos con `venta_domicilio = true`; en establecimiento, con `venta_establecimiento = true`.

---

## 5. Diseño de API

Las mutaciones se implementan como **server actions** (en `lib/acciones/`), no como API pública. Solo hay API routes para impresión y export. Toda acción valida sesión + rol + sucursal activa vía `lib/permisos.ts`.

### Server actions principales
| Acción | Módulo | Roles | Descripción |
|--------|--------|-------|-------------|
| `crearVenta` | ventas | admin, encargado, mesero | Wizard completo en una transacción: valida canal, calcula precios en servidor, asigna folio, crea detalles, imprime comandas |
| `agregarLineas` | ventas | admin, encargado, mesero | Agrega productos a venta PENDIENTE (cuenta que crece); imprime comanda solo de lo nuevo |
| `inactivarLinea` | ventas | admin, encargado, mesero | Requiere PIN del usuario; marca línea inactiva, recalcula total, guarda quién/cuándo |
| `cobrarVenta` | ventas | admin, encargado, mesero | Captura monto pagado, calcula cambio, marca COBRADA, crea MovimientoCorte INGRESO, descuenta inventario de líneas inventariables, imprime ticket de cobro |
| `asignarRepartidor` | ventas | admin, encargado | Ventas a domicilio |
| `validarTransferencia` | ventas | admin, encargado | Marca `transferencia_validada` (operación manual) |
| `abrirCorte` / `cerrarCorte` | cortes | admin, encargado | Abrir pide solo saldo inicial; falla si ya hay ABIERTO (constraint). Cerrar calcula snapshot de totales |
| `registrarGasto` / `inactivarGasto` | cortes | admin, encargado | Gasto del día (EGRESO); inactivar devuelve el monto al corte y queda para auditoría del admin |
| `registrarCompraProveedor` | compras | admin, encargado | Nota con detalles; los marcados `suma_inventario` generan ENTRADA de inventario; crea EGRESO en el corte |
| `registrarSueldo` | cortes | admin, encargado | EGRESO origen SUELDO con `empleado_id` (ej. repartidor $300/día) |
| CRUDs | clientes, productos, promociones, sucursales, usuarios, configuración | según rol (sección 8) | Formularios estándar con Zod |

### API routes
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/impresion` | Reimprime un ticket: `{ ventaId, tipo: "cuenta" \| "cobro" \| "comanda_cocina" \| "comanda_barra" }` | admin, encargado, mesero |
| GET | `/api/reportes/export?periodo=&desde=&hasta=&sucursal=` | CSV de ingresos/egresos | admin, encargado |

### Detalle del endpoint crítico: `crearVenta`
- **Input (Zod):** `{ canal, clienteId?, direccionId?, mesa?, metodoPago, pagaCon?, lineas: [{ tipoLinea, productoId?, varianteId?, promocionId?, cantidad, notas?, mitades?: [prodId, prodId], extras?: [{ productoId, cantidad }] }] }`
- **Validaciones en servidor:** corte ABIERTO en la sucursal (si no, error claro "Abra un corte de caja"); canal DOMICILIO exige cliente + dirección; cada producto/promo permitido en el canal; promos vigentes hoy; mitades con `es_especialidad`; precios recalculados en servidor (ignorar precios del cliente).
- **Transacción:** folio (lock en `folio_contadores`) → venta → detalles/mitades/extras → commit → imprimir comanda cocina (líneas COMIDA) y comanda barra (líneas BEBIDA). Si la impresión falla, la venta YA está guardada; mostrar aviso con botón de reimpresión.
- **Errores:** 400 validación con mensaje en español; 403 rol sin permiso; 409 sin corte abierto.

---

## 6. Arquitectura Frontend

### Páginas / Rutas
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | Login | Email + password (Supabase Auth) |
| `/seleccionar-sucursal` | Selección | Lista de sucursales asignadas; obligatoria antes de operar; admin ve todas y puede cambiar desde el header |
| `/` | Resumen del día | Corte activo (totales), ventas pendientes, accesos rápidos |
| `/ventas` | Ventas | Pendientes arriba (establecimiento/domicilio), historial abajo |
| `/ventas/nueva` | Wizard | 4 pasos: cliente → bebidas → comida → resumen/confirmación |
| `/ventas/[id]` | Detalle | Agregar productos, inactivar líneas (PIN), cobrar, asignar repartidor, reimprimir |
| `/clientes`, `/productos`, `/promociones`, `/inventario` | CRUDs | Tablas con búsqueda + formularios |
| `/cortes`, `/cortes/[id]` | Cortes | Apertura/cierre, gastos, compras; vista admin incluye inactivos resaltados |
| `/compras/nueva` | Compra proveedor | Nota con partidas y bandera suma-inventario |
| `/sucursales`, `/usuarios` | Admin | Solo ADMINISTRADOR |
| `/reportes` | Reportes | Ingresos/egresos por día/semana/mes; desglose por origen (ventas, gastos, compras, sueldos); export CSV |
| `/configuracion` | Configuración | Impresoras (3) con botón "imprimir prueba"; leyendas del ticket |

### Jerarquía de componentes — Wizard de venta (página clave)
```
WizardVenta (client, estado local del pedido)
├── StepIndicator (1 Cliente · 2 Bebidas · 3 Comida · 4 Confirmación)
├── PasoCliente          — solo canal DOMICILIO; búsqueda por teléfono → si no existe,
│   └── ClienteNuevoModal  alta de cliente + dirección en el mismo paso
├── PasoBebidas          — grid de bebidas filtrado por canal; tap para agregar
├── PasoComida           — grid por categoría; pizza → elegir variante (tamaño)
│   ├── PizzaPersonalizadaDialog — tamaño + mitad 1 + mitad 2 (solo especialidades);
│   │                              muestra el precio calculado (mitad más cara)
│   └── ExtrasNotasDialog        — extras cobrables + campo de notas por línea
└── PasoResumen          — lista de líneas + total; método de pago; "paga con" (domicilio)
                           → Confirmar: crearVenta() → imprime comandas → redirige a /ventas
```

### Estado
- **Server Components por defecto** para listados y detalle (datos frescos de Prisma en cada request; el POS necesita datos actuales, no caché).
- **Client Components** solo en: wizard de venta (estado del pedido en `useState`/`useReducer` local), dialogs y formularios.
- La sucursal activa vive en una **cookie httpOnly** (`sucursal_activa`) que setea `/seleccionar-sucursal`; `lib/auth.ts` la lee en cada request.
- Listado de ventas pendientes: `router.refresh()` tras cada acción + polling ligero cada 30s. Sin websockets en v1.

---

## 7. Sistema de Diseño

POS interno: claridad y velocidad sobre estética. Modo claro. Botones y targets táctiles grandes (mínimo 44px de alto) — se usa de pie, con prisa, en mostrador.

### Colores
| Rol | Hex | Uso |
|-----|-----|-----|
| Primary | `#DC2626` | Botones principales, acciones de confirmación, acento pizzería |
| Secondary | `#EA580C` | Badges de promociones, estados "pendiente" |
| Background | `#FAFAF9` | Fondo de página |
| Surface | `#FFFFFF` | Cards, tablas, modales |
| Text | `#1C1917` | Texto principal |
| Muted | `#78716C` | Texto secundario; bordes `#E7E5E4` |
| Destructive | `#B91C1C` | Inactivar líneas, cancelaciones, errores |
| Success | `#16A34A` | Venta cobrada, corte cuadrado, transferencia validada |

### Tipografía
| Rol | Fuente | Tamaño | Peso |
|-----|--------|--------|------|
| Headings | Inter | 24/20/18px | 600 |
| Body | Inter | 16px (14px en tablas densas) | 400 |
| Montos y folios | Inter tabular-nums | 16–20px | 600 |

### Espaciado y layout
- Escala: base 4px — 4, 8, 12, 16, 24, 32, 48.
- Border radius: 8px por defecto, 12px en cards.
- Ancho máximo de contenido: 1280px; sidebar fija 240px (colapsable).
- Breakpoints estándar Tailwind. Diseñar para 1366×768 (PC de mostrador) primero.

### Estilo de componentes
Plano con sombras sutiles, esquinas redondeadas, alto contraste. Sin animaciones decorativas — solo transiciones de 150ms en hover/estado. Los montos siempre alineados a la derecha con `tabular-nums`.

---

## 8. Autenticación y Autorización

### Flujo
1. Usuario entra a `/login` → Supabase Auth (email/password). No hay registro público: el ADMINISTRADOR da de alta usuarios (crea el usuario en Supabase Auth vía admin API con service role + fila en `perfiles`).
2. Post-login: si el usuario no tiene ninguna sucursal activa asignada (y no es admin) → mensaje "Sin sucursal asignada, contacta al administrador" y logout.
3. `/seleccionar-sucursal`: elige dónde labora hoy → cookie `sucursal_activa` → dashboard.
4. El ADMINISTRADOR cambia de sucursal desde el header en cualquier momento (re-setea la cookie).

### Rutas protegidas
`middleware.ts`: todo requiere sesión excepto `/login`. Sin cookie `sucursal_activa` → redirect a `/seleccionar-sucursal`. Rutas `/usuarios`, `/sucursales` → solo ADMINISTRADOR (verificado también en cada server action, nunca solo en middleware).

### Roles y permisos (`lib/permisos.ts`)
| Rol | Puede |
|-----|-------|
| ADMINISTRADOR | Todo, en todas las sucursales. Único que ve registros INACTIVOS (gastos y líneas de venta) para auditoría, con quién/cuándo |
| ENCARGADO | En su sucursal: abrir/cerrar corte, gastos, compras proveedor, sueldos, ventas completas, validar transferencias, clientes, inventario, reimprimir. Solo ve registros activos |
| MESERO | Ventas (crear, agregar, cobrar, inactivar líneas con su PIN), clientes (alta/búsqueda), consultar productos y promos vigentes |
| REPARTIDOR | Solo lectura: ventas a domicilio de su sucursal asignadas a él (dirección, total, paga con, cambio) |

### PIN de seguridad
Cada usuario tiene un PIN de 4 dígitos (hash bcrypt en `perfiles.pin_hash`, asignado por el admin). Inactivar una línea de venta activa exige teclear el PIN; el sistema valida contra el hash del usuario en sesión y registra `usuario_inactivo_id` + `fecha_inactivacion`. El admin lo ve en el detalle de la venta dentro del módulo de cortes.

### Sesiones
Cookies httpOnly gestionadas por `@supabase/ssr` (refresh automático en middleware). RLS habilitado en todas las tablas con política deny-all para el rol `anon`/`authenticated` de Supabase: **todo acceso a datos pasa por el servidor Next.js con Prisma** (conexión con credenciales de servidor). Los sistemas externos futuros se conectarán con sus propias credenciales de Postgres y políticas propias.

---

## 9. Orden de Construcción

**Step 1: Scaffolding**
`pnpm create next-app@latest pizzeria-barbosa --typescript --tailwind --app --src-dir --import-alias "@/*"` → instalar shadcn/ui (`pnpm dlx shadcn@latest init`) y componentes base (button, input, table, dialog, form, select, badge, card, tabs, sonner) → Prisma, Zod, react-hook-form, date-fns, TanStack Table, node-thermal-printer, bcryptjs → configurar tokens de color de la sección 7 en `globals.css`. Entregable: app corre con layout vacío.

**Step 2: Base de datos y esquema completo**
Crear proyecto en Supabase → copiar el esquema Prisma de la sección 4 → `pnpm prisma migrate dev --name init` → agregar migración manual del índice único parcial de corte abierto → `prisma/seed.ts`: sucursal demo, admin (email + password + PIN), 6 especialidades de pizza con 3 tamaños, 4 bebidas inventariables, producto extra "Queso extra", 1 paquete y 1 promo 2x1 de ejemplo. Entregable: `pnpm db:seed` deja una BD operable.

**Step 3: Auth + selección de sucursal**
`lib/supabase/*`, `middleware.ts`, `/login`, `/seleccionar-sucursal`, `lib/auth.ts` (`getSesion()` devuelve `{ usuario, rol, sucursalId }` o redirige), `lib/permisos.ts` con la matriz de la sección 8. Entregable: login completo, cookie de sucursal, rutas protegidas.

**Step 4: Shell del dashboard**
Sidebar con navegación filtrada por rol + header con badge de sucursal activa (admin: selector para cambiar), menú de usuario, logout. Página `/` con placeholders. Entregable: navegación completa.

**Step 5: CRUDs base — usuarios, sucursales, clientes**
`/usuarios` (admin: alta con creación en Supabase Auth admin API, rol, sueldo + periodo, PIN, sucursales asignadas), `/sucursales` (admin: datos + usuarios), `/clientes` (todos: búsqueda por teléfono, alta con N direcciones, `DataTable` genérica reutilizable). Entregable: los 3 CRUDs operando con validación Zod.

**Step 6: Productos y variantes**
`/productos`: alta/edición con tipo (comida/bebida), tipo artículo (venta/extra), categoría, banderas (domicilio, establecimiento, inventariable, es_especialidad, permite extras/notas) y variantes tamaño+precio (mínimo "unico"). Entregable: catálogo completo capturable.

**Step 7: Inventario**
`/inventario`: existencias por sucursal solo de inventariables; ajustes manuales con motivo (crea `MovimientoInventario` AJUSTE). El descuento automático por venta llega en el Step 10. Entregable: existencias visibles y ajustables.

**Step 8: Promociones**
`/promociones`: alta de PROMOCION (fechas + días de semana + productos + precio especial), PAQUETE (productos + precio, todos los días) y DOS_POR_UNO (producto requerido + regla de regalo, con regalo elegible al vender). Banderas de canal. Función `promocionesVigentes(fecha, canal)` en `lib/precios.ts` **con tests unitarios**. Entregable: promos capturables y consultables por vigencia.

**Step 9: Cortes de caja**
`/cortes`: abrir (solo saldo inicial; error si ya hay abierto), gastos del día (alta + inactivación con auditoría), compras de proveedor (partidas + suma inventario + EGRESO al corte), registro de sueldos (EGRESO origen SUELDO con empleado), cierre con snapshot de totales (saldo inicial + ingresos activos − egresos activos). Vista encargado: solo activos. Vista admin: todo, inactivos resaltados con quién/cuándo. Entregable: ciclo completo de corte sin ventas aún.

**Step 10: Módulo de ventas (el paso más grande — dividirlo en 10a/10b/10c)**
- **10a — Wizard:** `/ventas/nueva` con los 4 pasos (sección 6), incluyendo pizza personalizada (2 mitades, precio = mitad más cara), extras, notas, promos vigentes del canal. `lib/precios.ts` calcula todo **en servidor** dentro de `crearVenta` (transacción + folio consecutivo). **Tests unitarios de `lib/precios.ts` obligatorios en este paso.**
- **10b — Ciclo de vida:** `/ventas` (pendientes + historial), `/ventas/[id]`: agregar líneas a venta pendiente, inactivar línea con PinDialog, cobrar (monto pagado → cambio; default efectivo; transferencia queda por validar), asignar repartidor, `MovimientoCorte` INGRESO al cobrar, descuento de inventario de líneas inventariables.
- **10c — Domicilio:** paso 1 obligatorio (teléfono → cliente/dirección o alta en modal), campo "paga con" y cambio anticipado, filtrado por `venta_domicilio`.
Entregable: flujo completo de venta en ambos canales, sin impresión todavía.

**Step 11: Impresión de tickets**
`lib/impresion/escpos.ts`: conexión TCP:9100 (modo "tcp") y fallback recurso compartido Windows — generar buffer ESC/POS y enviarlo con `copy /B archivo \\EQUIPO\Impresora` vía `child_process` (modo "share"). `lib/impresion/tickets.ts`: 4 plantillas — comanda cocina (folio + líneas comida + notas + mitades), comanda barra (folio + bebidas), ticket cuenta (logo, sucursal, teléfono, usuario que capturó, líneas activas, total, leyenda pie), ticket cobro (+ pagó con / cambio; en domicilio incluye dirección y pago anticipado). Integrar en `crearVenta` (comandas), `agregarLineas` (comanda solo de lo nuevo) y `cobrarVenta` (cobro). `/api/impresion` para reimpresiones. Manejo de error: la venta nunca se pierde por fallo de impresora; toast con botón "Reimprimir". Entregable: tickets físicos correctos en las 3 impresoras.

**Step 12: Configuración**
`/configuracion`: por sucursal — 3 impresoras (modo + ruta + botón "Imprimir prueba"), logo, leyenda de pie. Entregable: impresoras configurables sin tocar código.

**Step 13: Reportes**
`/reportes`: rango día/semana/mes con date-fns; tarjetas de totales (ingresos, egresos, neto) + desglose por origen (ventas, gastos, compras, sueldos) + tabla de movimientos; comparativo contra sueldos configurados de la nómina activa; export CSV vía `/api/reportes/export`. Admin: todas las sucursales; encargado: la suya. Entregable: reportes con datos reales del corte.

**Step 14: Dashboard, pulido y estados**
Página `/` real: corte activo, ventas pendientes, total del día. Estados de carga (skeletons), estados vacíos con CTA, manejo de errores con toasts en español, confirmaciones para acciones destructivas. Entregable: recorrido completo sin callejones sin salida.

**Step 15: E2E + empaquetado para producción**
Playwright: (1) login → seleccionar sucursal → abrir corte → venta establecimiento → cobrar → cerrar corte; (2) venta domicilio con pizza personalizada + extra + promo; (3) inactivar línea con PIN y verificar auditoría como admin. `next build` + `scripts/install-service.ps1` (NSSM registra `node .next/standalone/server.js` como servicio "PizzeriaBarbosa" en puerto 3000, inicio automático) + `scripts/update.ps1`. Documentar en README: instalación en sucursal nueva (clonar, `.env`, build, servicio, configurar impresoras). Entregable: sistema instalado como servicio de Windows, accesible en LAN.

---

## 10. Configuración del Entorno

### Prerrequisitos
- Node.js 20 LTS (Windows)
- pnpm 9+
- NSSM (https://nssm.cc) para el servicio de Windows
- Cuenta Supabase (proyecto Postgres)
- Impresoras térmicas 80mm ESC/POS en la red local (o compartidas en Windows)

### Variables de Entorno
| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `DATABASE_URL` | Postgres vía pooler (puerto 6543, pgbouncer) | Supabase → Settings → Database |
| `DIRECT_URL` | Conexión directa (5432) para migraciones | Supabase → Settings → Database |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (solo auth) | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API (alta de usuarios). Solo servidor, nunca en cliente | Supabase → Settings → API |

### Comandos iniciales
```bash
pnpm create next-app@latest pizzeria-barbosa --typescript --tailwind --app --src-dir --import-alias "@/*"
cd pizzeria-barbosa
pnpm dlx shadcn@latest init
pnpm add @prisma/client @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers date-fns @tanstack/react-table node-thermal-printer bcryptjs
pnpm add -D prisma tsx vitest @playwright/test @types/bcryptjs
cp .env.example .env    # llenar con credenciales de Supabase
pnpm prisma migrate dev --name init
pnpm db:seed
pnpm dev
```

---

## 11. Dependencias

### Core
| Paquete | Propósito |
|---------|-----------|
| `next`, `react`, `react-dom` | Framework |
| `@prisma/client` | Acceso a datos tipado |
| `@supabase/ssr`, `@supabase/supabase-js` | Auth con cookies + admin API |
| `zod`, `react-hook-form`, `@hookform/resolvers` | Validación de formularios y server actions |
| `@tanstack/react-table` | Tablas con filtros/paginación |
| `node-thermal-printer` | ESC/POS por TCP a impresoras térmicas |
| `bcryptjs` | Hash de PIN de seguridad |
| `date-fns` | Fechas y rangos de reportes (locale es) |
| `tailwindcss`, shadcn/ui (radix + cva) | UI |

### Dev
| Paquete | Propósito |
|---------|-----------|
| `prisma` | Migraciones y generación de cliente |
| `tsx` | Ejecutar seed |
| `vitest` | Tests unitarios (`lib/precios.ts` es crítico) |
| `@playwright/test` | E2E de flujos de venta y corte |

---

## 12. Estrategia de Despliegue

### Hosting
**Local por sucursal:** servidor Next.js (`output: "standalone"`) como servicio de Windows vía NSSM en la PC principal, puerto 3000, inicio automático con el sistema. Acceso desde esa PC y cualquier equipo de la LAN (`http://IP-DE-LA-PC:3000`). La BD es la misma Supabase para todas las sucursales.

### Alta de una sucursal nueva
1. Admin crea la sucursal y asigna usuarios en el sistema (desde cualquier instalación existente).
2. En la PC nueva: clonar repo → `.env` (mismas credenciales de Supabase) → `pnpm install && pnpm build` → `scripts/install-service.ps1`.
3. En `/configuracion` de esa sucursal: registrar sus 3 impresoras e imprimir prueba.

### CI/CD
Repositorio en GitHub. Sin pipeline de deploy automático (instalaciones locales): actualizaciones con `scripts/update.ps1` (git pull → pnpm ci → build → restart del servicio). Las migraciones (`prisma migrate deploy`) se corren una sola vez por versión — desde cualquier sucursal — porque la BD es compartida. GitHub Actions solo para CI: lint + tests en cada PR.

### Entornos
- **Desarrollo:** proyecto Supabase separado (nunca desarrollar contra la BD de producción) + `pnpm dev`.
- **Producción:** proyecto Supabase productivo + servicio Windows por sucursal.

---

## 13. Estrategia de Testing

### Unit (Vitest)
`lib/precios.test.ts` — el corazón del negocio: precio de pizza personalizada (mitad más cara, ambos órdenes), extras suman / ingredientes quitados no restan, total solo con líneas activas, vigencia de promociones (día de semana, temporada, paquete siempre), 2x1 (cobrada + regalo a $0), filtrado por canal, cálculo de cambio. `lib/folios.test.ts` — consecutivo por sucursal sin colisiones.

### Integration
Server actions contra BD de prueba: `crearVenta` (transacción completa, folio, validaciones de canal y corte abierto), `cobrarVenta` (movimiento de corte + descuento de inventario), `abrirCorte` duplicado (debe fallar por el índice parcial), `inactivarGasto` (regresa monto y conserva auditoría).

### E2E (Playwright)
Los 3 flujos del Step 15. Correr contra Supabase de desarrollo con seed. Impresión mockeada (interfaz de `escpos.ts` con driver "noop" en test).

---

## 14. Skills para la Fase de Build

| Skill | Cuándo usarla | Por qué |
|-------|---------------|---------|
| `/shadcn-ui` | Steps 1, 5, 6, 10 | Instalar y personalizar tablas, formularios, dialogs y wizard |
| `/frontend-design` | Steps 4, 10, 14 | Shell del dashboard y UI del wizard de venta con calidad de producción |
| `/playwright-cli` | Step 15 | Construir y depurar los E2E de venta y corte |

---

## 15. CLAUDE.md para el Proyecto Destino

```markdown
# Pizzería Barbosa — POS

Sistema POS web multi-sucursal para pizzería: ventas en establecimiento y a domicilio, inventario, promociones, cortes de caja con auditoría e impresión de tickets térmicos ESC/POS. Servidor Next.js local por sucursal + Supabase (PostgreSQL en línea) compartida. Todo en español: UI, mensajes, dominio.

## Comandos

- `pnpm dev` — Servidor de desarrollo
- `pnpm build` — Build de producción (standalone)
- `pnpm lint` — Linter
- `pnpm test` — Tests unitarios (Vitest)
- `pnpm test:e2e` — Playwright
- `pnpm prisma migrate dev` — Crear/aplicar migraciones (usa DIRECT_URL)
- `pnpm db:seed` — Seed (admin, sucursal demo, catálogo ejemplo)

## Stack

Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui + Supabase (Postgres + Auth) + Prisma + node-thermal-printer (ESC/POS TCP:9100) + Vitest/Playwright

## Arquitectura

### Estructura
- `src/app/(dashboard)/` — Módulos: ventas, clientes, productos, inventario, promociones, cortes, compras, sucursales, usuarios, reportes, configuracion
- `src/lib/acciones/` — Server actions por dominio; TODA mutación vive aquí
- `src/lib/precios.ts` — Reglas de precios (única fuente de verdad, con tests)
- `src/lib/permisos.ts` — Matriz rol → acción; validar en cada action
- `src/lib/impresion/` — escpos.ts (transporte TCP/share) + tickets.ts (4 plantillas)
- `prisma/schema.prisma` — Esquema completo (ver blueprint sección 4)

### Flujo de datos
Server Components consultan Prisma directo (sin caché — el POS necesita datos frescos). Mutaciones vía server actions: validar Zod → `getSesion()` → `verificarPermiso()` → transacción Prisma → `revalidatePath()`. El cliente NUNCA envía precios; el servidor los calcula desde `producto_variantes`.

### Patrones clave
- Sesión: Supabase Auth (cookies httpOnly vía @supabase/ssr); sucursal activa en cookie `sucursal_activa`; `getSesion()` en `lib/auth.ts` devuelve `{ usuario, rol, sucursalId }`
- Auditoría: nada se borra físicamente — bandera `activo` + `usuario_inactivo_id` + `fecha_inactivacion`. Solo ADMINISTRADOR ve inactivos
- Pizza personalizada: línea `PIZZA_PERSONALIZADA` con 2 mitades (productos `es_especialidad`); precio = mitad más cara en ese tamaño
- Extras: productos `tipo_articulo = EXTRA`, líneas hijas vía `parent_detalle_id`; quitar ingredientes = nota de texto, no descuenta
- Un corte ABIERTO por sucursal (índice único parcial en BD)
- Impresión server-side; si falla, la venta ya está guardada — ofrecer reimpresión

## Reglas de Código

1. Un componente por archivo, máx 300 líneas.
2. Alias `@/` para imports desde `src/`.
3. Server Components por defecto; `"use client"` solo en wizard, dialogs y formularios.
4. Dinero: `Decimal` de Prisma; jamás `number` flotante en cálculos de precios.
5. Todo texto visible al usuario en español (es-MX): botones, errores, toasts, tickets.

## Sistema de Diseño

- Primary `#DC2626` · Secondary `#EA580C` · Background `#FAFAF9` · Surface `#FFFFFF` · Text `#1C1917` · Muted `#78716C` (bordes `#E7E5E4`) · Destructive `#B91C1C` · Success `#16A34A`
- Inter; headings 600; montos con `tabular-nums` alineados a la derecha
- Radius 8px (cards 12px); sombras sutiles; targets táctiles ≥ 44px; modo claro; diseñar para 1366×768

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Postgres Supabase vía pooler (6543) |
| `DIRECT_URL` | Conexión directa (5432) para migraciones |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (solo auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API — solo servidor |

## Reglas No Negociables

1. Precios SIEMPRE calculados en servidor desde `producto_variantes`; snapshot en `venta_detalles.precio_unitario`.
2. Nada se borra físicamente: inactivación con auditoría (quién, cuándo). Inactivar líneas de venta exige PIN.
3. Toda mutación de venta/corte/inventario en una transacción Prisma.
4. Autorización por rol en el servidor (`lib/permisos.ts`) en cada action — la UI solo oculta, nunca protege.
5. Ventas DOMICILIO exigen cliente + dirección; validar banderas de canal de productos y promos en servidor.
6. Nunca `window.print()` — impresión solo server-side vía `lib/impresion/`.
7. No commitear `.env`; `SUPABASE_SERVICE_ROLE_KEY` jamás en código cliente.
```

---

## 16. Reglas No Negociables (para el builder)

1. **TypeScript strict, cero `any`.** El dominio maneja dinero y auditoría.
2. **Dinero con `Decimal`,** nunca float. Formato es-MX (`$1,234.50`) en UI y tickets.
3. **Precios en servidor.** El cliente jamás envía precios; `lib/precios.ts` es la única fuente de verdad y se construye con tests unitarios ANTES de la UI del wizard (Step 10a).
4. **Auditoría total:** ventas, líneas y gastos nunca se borran — se inactivan con `usuario_inactivo_id` + `fecha_inactivacion`. Inactivar líneas de venta exige PIN. Solo el ADMINISTRADOR ve inactivos.
5. **Un corte ABIERTO por sucursal,** garantizado por índice único parcial en la BD, no solo en código.
6. **Transacciones Prisma** en toda operación multi-tabla (crear venta, cobrar, cerrar corte, compra con inventario).
7. **Autorización en servidor** en cada server action vía `lib/permisos.ts`. Middleware y UI son conveniencia, no seguridad.
8. **Impresión server-side** (TCP:9100 o share de Windows). Un fallo de impresora NUNCA pierde una venta: guardar primero, imprimir después, ofrecer reimpresión.
9. **Todo en español** (es-MX): UI, errores, tickets, nombres de dominio en código (`ventas`, `cortes`, `sucursales`).
10. **Seguir el orden de construcción de la sección 9.** No adelantar la impresión (Step 11) antes de que las ventas (Step 10) estén completas y probadas.
