import { test, expect } from "@playwright/test";

test.describe("Página principal", () => {
  test("carga la tabla de centros", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });
  });

  test("el buscador filtra centros", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[placeholder*="Buscar"]').fill("Alcorcón");
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Ficha de centro", () => {
  test("carga correctamente una ficha", async ({ page }) => {
    await page.goto("/centro/28071802");
    await expect(page.locator("h1")).toContainText(/AGUST/i, { timeout: 10_000 });
  });

  test("muestra la calculadora de ruta", async ({ page }) => {
    await page.goto("/centro/28071802");
    await expect(page.getByText(/Calcular ruta/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Lista de centros (/lista-centros)", () => {
  test("carga la página", async ({ page }) => {
    await page.goto("/lista-centros");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Navegación", () => {
  test("el enlace del menú a Lista de centros funciona", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Lista de centros/i }).click();
    await expect(page).toHaveURL(/\/lista-centros/);
  });

  test("el enlace del menú al Mapa funciona", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Mapa/i }).click();
    await expect(page).toHaveURL(/\/mapa/);
  });
});

test.describe("Páginas legales", () => {
  test("/privacidad carga", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(page.locator("h1")).toContainText(/Privacidad/i);
  });

  test("/legal carga", async ({ page }) => {
    await page.goto("/legal");
    await expect(page.locator("h1")).toContainText(/T.rminos/i);
  });

  test("/cookies carga", async ({ page }) => {
    await page.goto("/cookies");
    await expect(page.locator("h1")).toContainText(/Cookies/i);
  });

  test("/changelog carga", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.locator("h1")).toContainText(/cambios/i);
  });
});
