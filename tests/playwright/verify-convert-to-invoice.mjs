import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const API = "http://localhost:5094";
const email = `pw-convert-${Date.now()}@example.com`;
const password = "Password1";

const browser = await chromium.launch();
let ok = true;
function assert(cond, msg) {
  if (!cond) { ok = false; console.error("FAIL:", msg); } else { console.log("OK:", msg); }
}

async function createAndSendEstimate(page) {
  await page.goto(`${BASE}/estimate/create`);
  await page.waitForSelector("h1", { timeout: 10000 });
  await page.getByLabel("Bill To").fill(`Customer\n1 Test St`);
  await page.getByLabel("Description", { exact: false }).first().fill("Consulting services");
  await page.getByLabel("Unit Price", { exact: false }).first().fill("1000");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForSelector("text=Saved.", { timeout: 15000 });

  const viewLink = page.getByRole("button", { name: "View saved estimate" });
  await viewLink.waitFor({ timeout: 5000 });
  await viewLink.click();
  await page.waitForURL(/\/documents\/estimates\/[a-f0-9-]+/, { timeout: 10000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading estimate"), { timeout: 20000 });

  const estimateUrl = page.url();
  const estimateId = estimateUrl.split("/").pop();

  // Send the estimate
  await page.getByRole("button", { name: "Send by Email" }).click();
  await page.getByLabel("Recipient").fill("customer@example.com");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForSelector("text=Estimate sent.", { timeout: 15000 });

  return estimateId;
}

async function getPublicToken(estimateId) {
  const { execSync } = await import("node:child_process");
  const out = execSync(
    `docker exec invoiceapp-postgres psql -U invoiceapp -d invoiceapp -t -c "select public_token from estimate.estimates where id = '${estimateId}'"`,
  ).toString().trim();
  return out;
}

const page = await browser.newPage();
try {
  console.log("=== Sign up ===");
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.waitForURL(/\/(onboarding|dashboard|invoice\/create)/, { timeout: 15000 });

  console.log("=== Create and send estimate ===");
  const estimateId = await createAndSendEstimate(page);
  const token = await getPublicToken(estimateId);
  assert(token.length > 0, `Got public token for estimate: ${token}`);

  console.log("=== Accept estimate from hosted page ===");
  const anonPage = await browser.newPage();
  await anonPage.goto(`${BASE}/e/${token}`);
  await anonPage.waitForFunction(() => !document.body.innerText.includes("Loading estimate"), { timeout: 15000 });
  assert(await anonPage.getByRole("button", { name: "Accept", exact: true }).isVisible(), "Accept button visible");
  await anonPage.getByRole("button", { name: "Accept", exact: true }).click();
  await anonPage.waitForSelector("text=You accepted this estimate.", { timeout: 10000 });
  assert(true, "Estimate accepted from hosted page");

  console.log("=== Go to estimate detail and verify Accepted status ===");
  await page.goto(`${BASE}/documents/estimates/${estimateId}`);
  await page.waitForFunction(() => !document.body.innerText.includes("Loading estimate"), { timeout: 20000 });
  assert(await page.getByText("Accepted", { exact: true }).first().isVisible(), "Detail page shows Accepted status");

  console.log("=== Click Convert to Invoice button ===");
  const convertButton = page.getByRole("button", { name: "Convert to Invoice" });
  assert(await convertButton.isVisible(), "Convert to Invoice button visible for Accepted estimate");
  await convertButton.click();

  console.log("=== Confirm conversion in dialog ===");
  await page.waitForSelector("text=Convert Estimate to Invoice?", { timeout: 5000 });
  const dialogText = await page.locator("text=/will create a new invoice/").textContent();
  assert(dialogText, "Conversion dialog shows");
  // Click the Convert button in the dialog (not the main Convert to Invoice button)
  await page.locator("div.fixed").getByRole("button", { name: "Convert" }).click();

  console.log("=== Verify redirected to new invoice ===");
  await page.waitForURL(/\/documents\/invoices\/[a-f0-9-]+/, { timeout: 15000 });
  const invoiceUrl = page.url();
  const invoiceId = invoiceUrl.split("/").pop();
  assert(invoiceId.length > 0, `Redirected to new invoice: ${invoiceId}`);

  await page.waitForFunction(() => !document.body.innerText.includes("Loading invoice"), { timeout: 20000 });
  const status = await page.locator("text=/Draft|Sent|Accepted/").first().textContent();
  assert(status === "Draft", `New invoice starts as Draft (got: ${status})`);

  console.log("=== Verify original estimate now shows Converted ===");
  await page.goto(`${BASE}/documents/estimates/${estimateId}`);
  await page.waitForFunction(() => !document.body.innerText.includes("Loading estimate"), { timeout: 20000 });
  const estimateStatus = await page.locator("text=/Converted/").first().textContent();
  assert(estimateStatus === "Converted", `Estimate now shows Converted status (got: ${estimateStatus})`);

  await page.screenshot({ path: "9-convert-to-invoice-success.png", fullPage: true });

} catch (err) {
  ok = false;
  console.error("EXCEPTION during verification:", err);
  await page.screenshot({ path: "error-convert-to-invoice.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  console.log(ok ? "\n=== ALL CONVERT-TO-INVOICE CHECKS PASSED ===" : "\n=== SOME CHECKS FAILED ===");
  process.exit(ok ? 0 : 1);
}
