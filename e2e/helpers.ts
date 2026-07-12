import { expect, type Page } from "@playwright/test";

// Sobreescribibles por .env (E2E_ADMIN_*) para correr contra una BD cuyo
// admin ya fue rotado; los valores por defecto son los del entorno de dev.
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@pizzeriabarbosa.mx",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Barbosa2026!",
  pin: process.env.E2E_ADMIN_PIN ?? "1234",
};

/** Login y selección de sucursal (por nombre parcial: "Centro", "Norte"). */
export async function iniciarSesion(page: Page, sucursal: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/seleccionar-sucursal");
  await page.getByText(sucursal, { exact: false }).first().click();
  await page.waitForURL(/\/$/);
}

/** Abre un corte con $500 si la sucursal activa no tiene uno abierto. */
export async function asegurarCorteAbierto(page: Page) {
  await page.goto("/cortes");
  await expect(
    page.getByRole("button", { name: /Abrir corte|Cerrar corte/ }).first()
  ).toBeVisible();
  const abrir = page.getByRole("button", { name: "Abrir corte" }).first();
  if (await abrir.isVisible().catch(() => false)) {
    await abrir.click();
    await page.getByPlaceholder("500.00").fill("500");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Abrir corte" })
      .click();
    await expect(page.getByText("Corte abierto.")).toBeVisible();
  }
}

/** Agrega el producto por nombre desde una tarjeta del wizard. */
export async function agregarProductoWizard(
  page: Page,
  nombre: string,
  variante?: RegExp
) {
  const tarjeta = page
    .getByText(nombre, { exact: false })
    .locator("xpath=ancestor::*[contains(@data-slot,'card')]")
    .first();
  if (variante) {
    await tarjeta.getByRole("button", { name: variante }).click();
  } else {
    await tarjeta.getByRole("button", { name: /Agregar/ }).first().click();
  }
}

/** Abre el detalle de la venta pendiente cuya fila contiene `texto`. */
export async function abrirVentaPendiente(page: Page, texto: string) {
  await page.goto("/ventas");
  const fila = page
    .locator("table")
    .first()
    .locator("tbody tr")
    .filter({ hasText: texto })
    .first();
  await fila.getByRole("link").click();
  await page.waitForURL(/\/ventas\/[\w-]+$/);
}
