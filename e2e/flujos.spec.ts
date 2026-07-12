import { expect, test } from "@playwright/test";
import {
  ADMIN,
  abrirVentaPendiente,
  agregarProductoWizard,
  asegurarCorteAbierto,
  iniciarSesion,
} from "./helpers";

/**
 * Flujos E2E: los 3 del blueprint (§13) + alitas combinadas. Corren en serie
 * contra la BD de desarrollo: el flujo 1 usa Sucursal Norte (abre Y cierra su
 * corte); los demás usan Centro y dejan sus ventas cobradas en el corte abierto.
 *
 * OJO: usan el menú real (scripts/cargar-menu.ts). Los paquetes son L-V y no
 * aplican en días festivos: el flujo 1 falla si se corre en fin de semana o
 * con la fecha actual registrada como festivo.
 */

test("flujo 1: abrir corte → venta establecimiento → cobrar → cerrar corte", async ({
  page,
}) => {
  await iniciarSesion(page, "Norte");
  await asegurarCorteAbierto(page);

  // Venta de mostrador: bebida + paquete L-V ($15 + $65)
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("3");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // "Arma tu paquete": elegir hot dog y refresco chico + nota para cocina
  await page.getByRole("button", { name: /Paquete 2/ }).click();
  const armaPaquete = page.getByRole("dialog");
  await armaPaquete.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Hot Dog Clásico" }).click();
  await armaPaquete.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /Sprite/ }).click();
  await armaPaquete.locator("#notas-paquete").fill("uno sin catsup");
  await armaPaquete.getByRole("button", { name: "Agregar al pedido" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Cobrar $80 con $100 → cambio $20
  await abrirVentaPendiente(page, "Mesa 3");
  await expect(page.getByText("Paquete 2")).toBeVisible();
  // La composición elegida viaja como líneas hijas a $0 (para cocina)
  await expect(page.getByText("Hot Dog Clásico").first()).toBeVisible();
  await expect(page.getByText(/Sprite/).first()).toBeVisible();
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("100");
  await expect(page.getByText("Cambio: $20.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByText("Venta cobrada.")).toBeVisible();
  await expect(page.getByText("Cobrada").first()).toBeVisible();

  // Cerrar el corte (sin pendientes) y verificar el ciclo completo
  await page.goto("/cortes");
  await page.getByRole("button", { name: "Cerrar corte" }).click();
  await expect(page.getByText("Saldo esperado en caja")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar corte" })
    .click();
  await expect(page.getByText("Corte cerrado.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir corte" }).first()
  ).toBeVisible();
});

test("flujo 2: venta domicilio con pizza personalizada + extra", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Paso 1: cliente por teléfono
  await page.goto("/ventas/nueva");
  await page.getByText("Domicilio", { exact: true }).click();
  await page.locator("#telefono-cliente").fill("3311122233");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Juan Pérez")).toBeVisible();

  // Paso 3: pizza personalizada mezclando categorías (ambas $210 en grande);
  // los paquetes reales son solo sucursal, así que a domicilio no aparecen
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("button", { name: /Paquete 2/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Pizza personalizada" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: /grande/i }).click();
  await dialogo.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Pizza Hawaiana/ }).click();
  await dialogo.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /Pizza Carnes Frías/ }).first().click();
  await dialogo.getByRole("button", { name: "Agregar al pedido" }).click();

  // Paso 4: extra cobrable + nota en la personalizada
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Extras / notas" }).click();
  await page.getByRole("button", { name: "Agregar Queso extra" }).click();
  await page.locator("#notas-linea").fill("sin cebolla");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  // Total 210 (personalizada grande) + 25 (extra) = 235
  await expect(page.getByText("$235.00").first()).toBeVisible();

  // "Paga con" se pregunta aquí, al leer la confirmación al cliente
  await page.locator("#paga-con").fill("700");
  await expect(page.getByText("Cambio a llevar: $465.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Detalle: cliente, pago anticipado, líneas y extra como hija
  await abrirVentaPendiente(page, "Juan Pérez");
  await expect(page.getByText(/Juan Pérez · 3311122233/)).toBeVisible();
  await expect(page.getByText("Paga con $700.00")).toBeVisible();
  await expect(page.getByText(/Pizza personalizada \(grande\)/)).toBeVisible();
  await expect(
    page.getByText("Mitades: Pizza Hawaiana / Pizza Carnes Frías")
  ).toBeVisible();
  await expect(page.getByText(/\+ Queso extra/)).toBeVisible();
  await expect(page.getByText("Nota: sin cebolla")).toBeVisible();

  // Cobrar con el pago anticipado → cambio $465
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("700");
  await expect(page.getByText("Cambio: $465.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByText("Venta cobrada.")).toBeVisible();
});

test("flujo 4: alitas combinadas de 3 sabores + aderezo extra", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Venta de mesa con alitas de 20 pzas y 3 sabores
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("5");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Alitas combinadas" }).click();
  const dialogo = page.getByRole("dialog");
  // La orden de 7 pzas es de un solo sabor: no se ofrece para combinar
  await expect(dialogo.getByRole("button", { name: /7 pzas/ })).toHaveCount(0);
  await dialogo.getByRole("button", { name: /20 pzas/ }).click();
  await dialogo.getByRole("combobox").first().click();
  // exact: el menú real también tiene "Alitas BBQ Habanero"
  await page.getByRole("option", { name: "Alitas BBQ", exact: true }).click();
  await dialogo.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "Alitas Búfalo" }).click();
  await dialogo.getByRole("button", { name: "Agregar tercer sabor" }).click();
  await dialogo.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: "Alitas Habanero" }).click();
  // Precio fijo de la orden sin importar los sabores
  await expect(dialogo.getByText("$290.00")).toBeVisible();
  await dialogo.getByRole("button", { name: "Agregar al pedido" }).click();

  // Paso 4: aderezo como extra cobrable
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Extras / notas" }).click();
  await page.getByRole("button", { name: "Agregar Aderezo Ranch" }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  // Total 290 (orden) + 15 (aderezo) = 305
  await expect(page.getByText("$305.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Detalle: línea combinada con sus sabores y el aderezo como hija
  await abrirVentaPendiente(page, "Mesa 5");
  await expect(page.getByText(/Alitas combinadas \(20 pzas\)/)).toBeVisible();
  await expect(
    page.getByText("Sabores: Alitas BBQ / Alitas Búfalo / Alitas Habanero")
  ).toBeVisible();
  await expect(page.getByText(/\+ Aderezo Ranch/)).toBeVisible();

  // Cobrar exacto para no dejar pendientes
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("305");
  await expect(page.getByText("Cambio: $0.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByText("Venta cobrada.")).toBeVisible();
});

test("flujo 5: segunda ronda en mesa con rondas distinguidas", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Ronda 1: solo una bebida ($15)
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("7");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // El cliente pide más: el botón lleva al wizard en modo agregar
  await abrirVentaPendiente(page, "Mesa 7");
  await page.getByRole("link", { name: "Agregar productos" }).click();
  await page.waitForURL(/\/ventas\/[\w-]+\/agregar$/);
  await expect(page.getByText(/Ronda 2 de la mesa/)).toBeVisible();
  // Sin paso Cliente: el wizard arranca directo en Bebidas
  await expect(page.getByRole("button", { name: /Cliente/ })).toHaveCount(0);
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Confirmación: la ronda atendida atenuada y la nueva resaltada
  await expect(page.getByText("Ronda 1 · atendida")).toBeVisible();
  await expect(page.getByText("Ronda 2 · nueva")).toBeVisible();
  await expect(
    page.getByText("Nuevo total de la venta: $30.00")
  ).toBeVisible();
  await page.getByRole("button", { name: "Agregar a la venta" }).click();
  await expect(
    page.getByText(/Ronda 2 agregada a la venta #\d+\./)
  ).toBeVisible();
  await page.waitForURL(/\/ventas\/[\w-]+$/);

  // Detalle agrupado por ronda y total recalculado
  await expect(page.getByText("Ronda 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Ronda 2", { exact: true })).toBeVisible();
  await expect(page.getByText("$30.00").first()).toBeVisible();

  // Cobrar exacto con Enter (el input tiene el foco al abrir la modal)
  // y verificar que la operación regresa a la lista de ventas
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("30");
  await expect(page.getByText("Cambio: $0.00")).toBeVisible();
  await page.locator("#monto-pagado").press("Enter");
  await expect(page.getByText("Venta cobrada.")).toBeVisible();
  await page.waitForURL("**/ventas");
});

test("flujo 6: cancelar venta pendiente con motivo, PIN y egreso en el corte", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Venta que el cliente no aceptará ($15)
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("8");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Cancelar: motivo obligatorio y PIN incorrecto rechazado
  await abrirVentaPendiente(page, "Mesa 8");
  await page.getByRole("button", { name: "Cancelar venta" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo
    .locator("#motivo-cancelacion")
    .fill("Cliente no aceptó el pedido por demora");
  await dialogo.locator("#pin-cancelacion").fill("0000");
  await dialogo.getByRole("button", { name: "Cancelar venta" }).click();
  await expect(page.getByText("PIN incorrecto.")).toBeVisible();
  await dialogo.locator("#pin-cancelacion").fill(ADMIN.pin);
  await dialogo.getByRole("button", { name: "Cancelar venta" }).click();
  await expect(page.getByText(/Venta #\d+ cancelada\./)).toBeVisible();
  await page.waitForURL("**/ventas");
  await expect(page.getByText("Cancelada").first()).toBeVisible();

  // El detalle conserva la auditoría y ya no ofrece acciones de cobro
  // (la venta cancelada ya vive en la tabla de historial, no en pendientes)
  const filaCancelada = page
    .locator("table")
    .nth(1)
    .locator("tbody tr")
    .filter({ hasText: "Mesa 8" })
    .filter({ hasText: "Cancelada" })
    .first();
  await filaCancelada.getByRole("link").click();
  await page.waitForURL(/\/ventas\/[\w-]+$/);
  await expect(
    page.getByText("Motivo: Cliente no aceptó el pedido por demora")
  ).toBeVisible();
  await expect(page.getByText(/Canceló Administrador/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cobrar" })).toHaveCount(0);

  // El corte registra el par neto cero con la pérdida visible como egreso
  await page.goto("/cortes");
  await page.getByRole("link", { name: "Ver movimientos" }).click();
  await expect(
    page.getByText(/Venta #\d+ \(cancelada\)/).first()
  ).toBeVisible();
  await expect(
    page.getByText(/Cancelación venta #\d+ — Cliente no aceptó/).first()
  ).toBeVisible();
});

test("flujo 3: inactivar línea con PIN y verificar auditoría como admin", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Venta con bebida + pizza
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("9");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Pizza Boloñesa", /grande/i);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // PIN incorrecto rechazado; PIN correcto inactiva con auditoría
  await abrirVentaPendiente(page, "Mesa 9");
  await page
    .getByRole("button", { name: /Inactivar Pizza Boloñesa/ })
    .click();
  await page.locator("#pin-linea").fill("0000");
  await page.getByRole("button", { name: "Inactivar línea" }).click();
  await expect(page.getByText("PIN incorrecto.")).toBeVisible();
  await page.locator("#pin-linea").fill(ADMIN.pin);
  await page.getByRole("button", { name: "Inactivar línea" }).click();
  await expect(page.getByText("Línea inactivada.")).toBeVisible();

  // El admin ve la línea inactiva resaltada con quién la inactivó,
  // y el total quedó recalculado solo con la bebida ($15)
  await expect(page.getByText(/Inactivada por Administrador/)).toBeVisible();
  await expect(page.getByText("$15.00").first()).toBeVisible();

  // Cobrar exacto para no dejar pendientes
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("15");
  await expect(page.getByText("Cambio: $0.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cobro" }).click();
  await expect(page.getByText("Venta cobrada.")).toBeVisible();
});
