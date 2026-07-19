import { expect, test } from "@playwright/test";
import { asegurarCorteAbierto, iniciarSesion } from "./helpers";

/**
 * Regresión (reporte QA 2026-07-18): con el listado de un Select abierto
 * dentro de una modal, un clic/tap en otra zona de la MISMA modal (o en el
 * fondo gris) debe cerrar solo el listado, nunca la modal. Todas las modales
 * con listado comparten ui/dialog.tsx + ui/select.tsx, así que se prueba el
 * patrón con las dos modales que QA citó (sueldo y pizza personalizada).
 */

async function abrirModalSueldoConListado(page: import("@playwright/test").Page) {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);
  await page.getByRole("button", { name: "Registrar sueldo" }).click();
  const modal = page.locator('[data-slot="dialog-content"]');
  await expect(modal.getByText("Registrar pago de sueldo")).toBeVisible();
  await modal.getByRole("combobox").click();
  await expect(page.getByRole("listbox")).toBeVisible();
  return modal;
}

test("mouse: clic dentro de la modal con listado abierto cierra solo el listado", async ({
  page,
}) => {
  const modal = await abrirModalSueldoConListado(page);
  const titulo = await modal.locator('[data-slot="dialog-title"]').boundingBox();
  if (!titulo) throw new Error("No se encontró el título de la modal");
  await page.mouse.click(titulo.x + titulo.width / 2, titulo.y + titulo.height / 2);
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(modal.getByText("Registrar pago de sueldo")).toBeVisible();
});

test("mouse: clic en el fondo gris con listado abierto cierra solo el listado", async ({
  page,
}) => {
  const modal = await abrirModalSueldoConListado(page);
  // Esquina superior izquierda del viewport = overlay, lejos de modal y listado
  await page.mouse.click(300, 80);
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(modal.getByText("Registrar pago de sueldo")).toBeVisible();
});

test("pizza personalizada: clic dentro de la modal con listado de sabores abierto cierra solo el listado", async ({
  page,
}) => {
  await iniciarSesion(page, "Centro");
  await asegurarCorteAbierto(page);
  await page.goto("/ventas/nueva");
  await page.locator("#mesa").fill("99");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Pizza personalizada" }).click();

  const modal = page.locator('[data-slot="dialog-content"]');
  await modal.getByRole("button", { name: /grande/i }).click();
  await modal.getByRole("combobox").first().click();
  await expect(page.getByRole("listbox")).toBeVisible();

  const titulo = await modal.locator('[data-slot="dialog-title"]').boundingBox();
  if (!titulo) throw new Error("No se encontró el título de la modal");
  await page.mouse.click(titulo.x + titulo.width / 2, titulo.y + titulo.height / 2);

  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(modal.getByText("Pizza personalizada")).toBeVisible();
});

test.describe("pantalla táctil", () => {
  test.use({ hasTouch: true });

  test("tap dentro de la modal con listado abierto cierra solo el listado", async ({
    page,
  }) => {
    const modal = await abrirModalSueldoConListado(page);
    const titulo = await modal.locator('[data-slot="dialog-title"]').boundingBox();
    if (!titulo) throw new Error("No se encontró el título de la modal");
    await page.touchscreen.tap(
      titulo.x + titulo.width / 2,
      titulo.y + titulo.height / 2
    );
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(modal.getByText("Registrar pago de sueldo")).toBeVisible();
  });

  test("tap en el fondo gris con listado abierto cierra solo el listado", async ({
    page,
  }) => {
    const modal = await abrirModalSueldoConListado(page);
    await page.touchscreen.tap(300, 80);
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(modal.getByText("Registrar pago de sueldo")).toBeVisible();
  });
});
