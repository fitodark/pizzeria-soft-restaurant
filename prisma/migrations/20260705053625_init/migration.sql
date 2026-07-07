-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'ENCARGADO', 'MESERO', 'REPARTIDOR');

-- CreateEnum
CREATE TYPE "PeriodoSueldo" AS ENUM ('DIARIO', 'SEMANAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('COMIDA', 'BEBIDA');

-- CreateEnum
CREATE TYPE "TipoArticulo" AS ENUM ('VENTA', 'EXTRA');

-- CreateEnum
CREATE TYPE "TipoPromocion" AS ENUM ('PROMOCION', 'PAQUETE', 'DOS_POR_UNO');

-- CreateEnum
CREATE TYPE "RolPromoProducto" AS ENUM ('REQUERIDO', 'REGALO');

-- CreateEnum
CREATE TYPE "EstatusCorte" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "OrigenMovimiento" AS ENUM ('VENTA', 'GASTO', 'COMPRA_PROVEEDOR', 'SUELDO');

-- CreateEnum
CREATE TYPE "CanalVenta" AS ENUM ('ESTABLECIMIENTO', 'DOMICILIO');

-- CreateEnum
CREATE TYPE "EstatusVenta" AS ENUM ('PENDIENTE', 'COBRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoLinea" AS ENUM ('PRODUCTO', 'PIZZA_PERSONALIZADA', 'PROMOCION');

-- CreateEnum
CREATE TYPE "TipoMovInventario" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "sucursales" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "codigo_postal" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "sueldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "periodo_sueldo" "PeriodoSueldo" NOT NULL DEFAULT 'SEMANAL',
    "pin_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_sucursales" (
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,

    CONSTRAINT "usuario_sucursales_pkey" PRIMARY KEY ("usuario_id","sucursal_id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_direcciones" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "direccion" TEXT NOT NULL,
    "referencia" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cliente_direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoProducto" NOT NULL,
    "tipo_articulo" "TipoArticulo" NOT NULL DEFAULT 'VENTA',
    "categoria" TEXT NOT NULL,
    "venta_domicilio" BOOLEAN NOT NULL DEFAULT true,
    "venta_establecimiento" BOOLEAN NOT NULL DEFAULT true,
    "inventariable" BOOLEAN NOT NULL DEFAULT false,
    "es_especialidad" BOOLEAN NOT NULL DEFAULT false,
    "permite_extras_notas" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_variantes" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "tamano" TEXT NOT NULL DEFAULT 'unico',
    "precio" DECIMAL(10,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "producto_variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario" (
    "sucursal_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "existencia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("sucursal_id","producto_id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "tipo" "TipoMovInventario" NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "referencia" TEXT,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPromocion" NOT NULL,
    "precio_especial" DECIMAL(10,2),
    "venta_domicilio" BOOLEAN NOT NULL DEFAULT false,
    "venta_establecimiento" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "dias_semana" INTEGER[],
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocion_productos" (
    "id" UUID NOT NULL,
    "promocion_id" UUID NOT NULL,
    "rol" "RolPromoProducto" NOT NULL DEFAULT 'REQUERIDO',
    "producto_id" UUID,
    "variante_id" UUID,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promocion_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes_caja" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "estatus" "EstatusCorte" NOT NULL DEFAULT 'ABIERTO',
    "saldo_inicial" DECIMAL(10,2) NOT NULL,
    "usuario_apertura_id" UUID NOT NULL,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_cierre_id" UUID,
    "fecha_cierre" TIMESTAMP(3),
    "total_ingresos" DECIMAL(10,2),
    "total_egresos" DECIMAL(10,2),
    "saldo_final" DECIMAL(10,2),
    "notas_cierre" TEXT,

    CONSTRAINT "cortes_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_corte" (
    "id" UUID NOT NULL,
    "corte_id" UUID NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "origen" "OrigenMovimiento" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" UUID NOT NULL,
    "venta_id" UUID,
    "compra_id" UUID,
    "empleado_id" UUID,
    "usuario_inactivo_id" UUID,
    "fecha_inactivacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_proveedor" (
    "id" UUID NOT NULL,
    "corte_id" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "folio_nota" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_detalles" (
    "id" UUID NOT NULL,
    "compra_id" UUID NOT NULL,
    "producto_id" UUID,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "suma_inventario" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "compra_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" UUID NOT NULL,
    "folio" INTEGER NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "corte_id" UUID NOT NULL,
    "canal" "CanalVenta" NOT NULL,
    "estatus" "EstatusVenta" NOT NULL DEFAULT 'PENDIENTE',
    "cliente_id" UUID,
    "direccion_id" UUID,
    "mesa" TEXT,
    "repartidor_id" UUID,
    "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "transferencia_validada" BOOLEAN NOT NULL DEFAULT false,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paga_con" DECIMAL(10,2),
    "monto_pagado" DECIMAL(10,2),
    "cambio" DECIMAL(10,2),
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cobrada_at" TIMESTAMP(3),

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_detalles" (
    "id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "tipo_linea" "TipoLinea" NOT NULL,
    "producto_id" UUID,
    "variante_id" UUID,
    "promocion_id" UUID,
    "parent_detalle_id" UUID,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_inactivo_id" UUID,
    "fecha_inactivacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venta_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_detalle_mitades" (
    "id" UUID NOT NULL,
    "detalle_id" UUID NOT NULL,
    "mitad" INTEGER NOT NULL,
    "producto_id" UUID NOT NULL,

    CONSTRAINT "venta_detalle_mitades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sucursales" (
    "sucursal_id" UUID NOT NULL,
    "impresora_principal_modo" TEXT NOT NULL DEFAULT 'tcp',
    "impresora_principal_ruta" TEXT NOT NULL,
    "impresora_cocina_modo" TEXT NOT NULL DEFAULT 'tcp',
    "impresora_cocina_ruta" TEXT NOT NULL,
    "impresora_bebidas_modo" TEXT NOT NULL DEFAULT 'tcp',
    "impresora_bebidas_ruta" TEXT NOT NULL,
    "logo_url" TEXT,
    "leyenda_pie" TEXT,

    CONSTRAINT "configuracion_sucursales_pkey" PRIMARY KEY ("sucursal_id")
);

-- CreateTable
CREATE TABLE "folio_contadores" (
    "sucursal_id" UUID NOT NULL,
    "siguiente" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "folio_contadores_pkey" PRIMARY KEY ("sucursal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_key" ON "clientes"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "producto_variantes_producto_id_tamano_key" ON "producto_variantes"("producto_id", "tamano");

-- CreateIndex
CREATE INDEX "movimientos_inventario_sucursal_id_producto_id_idx" ON "movimientos_inventario"("sucursal_id", "producto_id");

-- CreateIndex
CREATE INDEX "movimientos_corte_corte_id_idx" ON "movimientos_corte"("corte_id");

-- CreateIndex
CREATE INDEX "ventas_corte_id_estatus_idx" ON "ventas"("corte_id", "estatus");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_sucursal_id_folio_key" ON "ventas"("sucursal_id", "folio");

-- CreateIndex
CREATE INDEX "venta_detalles_venta_id_idx" ON "venta_detalles"("venta_id");

-- CreateIndex
CREATE UNIQUE INDEX "venta_detalle_mitades_detalle_id_mitad_key" ON "venta_detalle_mitades"("detalle_id", "mitad");

-- AddForeignKey
ALTER TABLE "usuario_sucursales" ADD CONSTRAINT "usuario_sucursales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "perfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursales" ADD CONSTRAINT "usuario_sucursales_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_direcciones" ADD CONSTRAINT "cliente_direcciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_variantes" ADD CONSTRAINT "producto_variantes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promocion_productos" ADD CONSTRAINT "promocion_productos_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_corte" ADD CONSTRAINT "movimientos_corte_corte_id_fkey" FOREIGN KEY ("corte_id") REFERENCES "cortes_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_proveedor" ADD CONSTRAINT "compras_proveedor_corte_id_fkey" FOREIGN KEY ("corte_id") REFERENCES "cortes_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_detalles" ADD CONSTRAINT "compra_detalles_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras_proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_corte_id_fkey" FOREIGN KEY ("corte_id") REFERENCES "cortes_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "cliente_direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle_mitades" ADD CONSTRAINT "venta_detalle_mitades_detalle_id_fkey" FOREIGN KEY ("detalle_id") REFERENCES "venta_detalles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_sucursales" ADD CONSTRAINT "configuracion_sucursales_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_contadores" ADD CONSTRAINT "folio_contadores_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
