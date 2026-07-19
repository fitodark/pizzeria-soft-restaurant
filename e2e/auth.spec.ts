import { expect, test } from "@playwright/test";
import { ADMIN, iniciarSesion } from "./helpers";

/**
 * Auth propia (Fase 1 local-first): login contra la BD local con bcrypt,
 * sesión revocable en la tabla `sesiones` y cierre de sesión.
 */

test("contraseña incorrecta muestra error genérico y no inicia sesión", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill("contraseña-equivocada");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  // Sigue en /login: la cookie de sesión no se emitió
  await page.goto("/ventas");
  await page.waitForURL("**/login");
});

test("correo inexistente recibe el mismo error que contraseña errónea", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("nadie@pizzeriabarbosa.mx");
  await page.locator('input[type="password"]').fill("loquesea123");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("cerrar sesión revoca la sesión y regresa a /login", async ({ page }) => {
  await iniciarSesion(page, "Centro");

  await page.getByRole("button", { name: /Administrador/ }).click();
  await page.getByRole("menuitem", { name: /Cerrar sesión/ }).click();
  await page.waitForURL("**/login");

  // La sesión quedó revocada en BD: navegar a una ruta protegida no entra
  await page.goto("/ventas");
  await page.waitForURL("**/login");
});
