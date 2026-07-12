import "dotenv/config";
import { defineConfig } from "@playwright/test";

/**
 * E2E contra el servidor de desarrollo y la base de datos configurada en
 * .env. Los flujos comparten estado (cortes, folios): se corren en serie.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1366, height: 768 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
