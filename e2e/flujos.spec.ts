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
 */

test("flujo 1: abrir corte → venta establecimiento → cobrar → cerrar corte", async ({
  page,
}) => {
  await iniciarSesion(page, "Norte");
  await asegurarCorteAbierto(page);

  // Venta de mostrador con una bebida
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("3");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await agregarProductoWizard(page, "Agua embotellada");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Cobrar con $100 → cambio $85
  await abrirVentaPendiente(page, "Mesa 3");
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("100");
  await expect(page.getByText("Cambio: $85.00")).toBeVisible();
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

test("flujo 2: venta domicilio con pizza personalizada + extra + promo", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);

  // Paso 1: cliente por teléfono + paga con
  await page.goto("/ventas/nueva");
  await page.getByText("Domicilio", { exact: true }).click();
  await page.locator("#telefono-cliente").fill("3311122233");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Juan Pérez")).toBeVisible();
  await page.locator("#paga-con").fill("700");

  // Paso 3: promo PAQUETE (vigente a domicilio) + pizza personalizada
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: /Paquete Amigos/ }).click();
  await page.getByRole("button", { name: "Pizza personalizada" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: /grande/i }).click();
  await dialogo.getByRole("combobox").first().click();
  await page.getByRole("option").first().click();
  await dialogo.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /Cuatro Quesos/ }).first().click();
  await dialogo.getByRole("button", { name: "Agregar al pedido" }).click();

  // Paso 4: extra cobrable + nota en la personalizada
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Extras / notas" }).click();
  await page.getByRole("button", { name: "Agregar Queso extra" }).click();
  await page.locator("#notas-linea").fill("sin cebolla");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  // Total 199 (paquete) + 215 (personalizada) + 25 (extra) = 439
  await expect(page.getByText("$439.00").first()).toBeVisible();
  await expect(page.getByText("Cambio a llevar: $261.00")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // Detalle: cliente, pago anticipado, líneas y extra como hija
  await abrirVentaPendiente(page, "Juan Pérez");
  await expect(page.getByText(/Juan Pérez · 3311122233/)).toBeVisible();
  await expect(page.getByText("Paga con $700.00")).toBeVisible();
  await expect(page.getByText("Paquete Amigos")).toBeVisible();
  await expect(page.getByText(/Pizza personalizada \(grande\)/)).toBeVisible();
  await expect(page.getByText(/\+ Queso extra/)).toBeVisible();
  await expect(page.getByText("Nota: sin cebolla")).toBeVisible();

  // Cobrar con el pago anticipado → cambio $261
  await page.getByRole("button", { name: "Cobrar" }).click();
  await page.locator("#monto-pagado").fill("700");
  await expect(page.getByText("Cambio: $261.00")).toBeVisible();
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
  await page.getByRole("option", { name: "Alitas BBQ" }).click();
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
  await agregarProductoWizard(page, "Pizza Cuatro Quesos", /grande/i);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(page.getByText(/Venta #\d+ registrada\./)).toBeVisible();
  await page.waitForURL("**/ventas");

  // PIN incorrecto rechazado; PIN correcto inactiva con auditoría
  await abrirVentaPendiente(page, "Mesa 9");
  await page
    .getByRole("button", { name: /Inactivar Pizza Cuatro Quesos/ })
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
