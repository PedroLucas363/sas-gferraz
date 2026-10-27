import { cleanupTenant } from "../helpers/cleanup";
import sharp from "../../apps/api/node_modules/sharp";
import { test, expect } from "@playwright/test";
test("cadastro, atendimento, pagamento parcial, indicador e visualização salva", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Primeiro acesso? Criar uma conta" })
    .click();
  await page.getByLabel("Seu nome", { exact: true }).fill("Profissional Teste");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`browser-${Date.now()}@example.test`);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Senha-segura-teste-123");
  await page.getByRole("button", { name: "Criar meu espaço" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clientes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Cliente Navegador");
  await page.getByLabel("Telefone / WhatsApp").fill("11999999999");
  await page.getByLabel("Endereço", { exact: true }).fill("Avenida Teste, 10");
  await page
    .getByLabel("Consentimento para armazenar fotografias privadas")
    .check();
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByRole("cell", { name: "Cliente Navegador", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("cell", { name: "Cliente Navegador", exact: true })
    .click();
  await page.getByRole("button", { name: "Fotografias", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#F9EAD2" },
    })
      .png()
      .toBuffer(),
  });
  await expect(page.getByRole("img", { name: "foto.png" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Catálogo de serviços", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Catálogo de serviços", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Nome do serviço").fill("Maquiagem e penteado");
  await page.getByLabel("Preço de referência").fill("350");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByRole("cell", { name: "Maquiagem e penteado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Atendimentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Atendimentos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: "Cliente Navegador" });
  await page.getByLabel("Nome do atendimento").fill("Atendimento integração");
  await page
    .getByLabel("Serviço", { exact: true })
    .selectOption({ label: "Maquiagem e penteado" });
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByRole("cell", { name: "Atendimento integração", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recebimentos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recebimentos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: "Cliente Navegador" });
  await page
    .getByLabel("Atendimento", { exact: true })
    .selectOption({ index: 1 });
  await page.getByLabel("Valor recebido (R$)").fill("50");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await page.locator(".metric").filter({ hasText: "A receber" }).click();
  await expect(page.locator(".drill")).toContainText("300,00");
  await expect(
    page
      .locator(".drill")
      .getByRole("cell", { name: "Atendimento integração", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Atendimentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Atendimentos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Configurar", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar condição" }).click();
  await page.getByLabel("Campo do filtro").selectOption("pending");
  await page.getByLabel("Operador do filtro").selectOption("gt");
  await page.getByLabel("Valor do filtro").fill("0");
  await page.getByLabel("Nome da visualização").fill("Pendentes teste");
  await page.getByRole("button", { name: "Salvar nova" }).click();
  await page.reload();
  await page
    .getByLabel("Visualização", { exact: true })
    .selectOption({ label: "Pendentes teste" });
  await expect(
    page.getByRole("cell", { name: "Atendimento integração", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar")).not.toBeInViewport();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test.afterEach(async ({ page }) => {
  const response = await page.request.get("/api/auth/me");
  if (response.ok()) {
    const me = await response.json();
    if (me.email.startsWith("browser-") && me.email.endsWith("@example.test"))
      await cleanupTenant(me.organization.id);
  }
});

test("prévia permite corrigir dados antes de confirmar uma importação", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Profissional de importação",
      company: "Importação de teste",
      email: `browser-import-${Date.now()}@example.test`,
      password: "Senha-segura-teste-123",
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/?module=imports");
  await expect(
    page.getByRole("heading", { name: "Importação", exact: true }),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "historico.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "DATA DO ATENDIMENTO;HORÁRIO DO ATENDIMENTO;NOME;SERVIÇO;VALOR TOTAL\n2026-10-24;10:00;Nome a corrigir;Maquiagem;350\n",
    ),
  });
  const row = page.locator(".import-row").first();
  await row.getByLabel("Cliente", { exact: true }).fill("Cliente Importada");
  await row.getByLabel("Duração prevista (min)", { exact: true }).fill("90");
  await expect(row.getByLabel("Cliente", { exact: true })).toHaveValue(
    "Cliente Importada",
  );
  await row.getByLabel("Revisei esta linha").check();
  await page.getByRole("button", { name: /Gravar 1/ }).click();
  await expect(row.getByText("Importado", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Atendimentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Atendimentos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Cliente Importada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "90", exact: true }),
  ).toBeVisible();
});
