-- Regla de negocio garantizada en BD: un solo corte ABIERTO por sucursal.
CREATE UNIQUE INDEX "idx_corte_abierto_unico" ON "cortes_caja" ("sucursal_id")
  WHERE "estatus" = 'ABIERTO';

-- Defensa en profundidad: RLS habilitado en todas las tablas sin políticas
-- (deny-all para anon/authenticated). Todo acceso pasa por el servidor
-- Next.js con Prisma, que conecta como dueño de las tablas y no es afectado.
ALTER TABLE "sucursales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "perfiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario_sucursales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cliente_direcciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "producto_variantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movimientos_inventario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promociones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promocion_productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cortes_caja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movimientos_corte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compras_proveedor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compra_detalles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ventas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venta_detalles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venta_detalle_mitades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configuracion_sucursales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "folio_contadores" ENABLE ROW LEVEL SECURITY;
