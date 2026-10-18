const { chromium } = require("playwright");
const { existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");

async function main() {
  const root = join(__dirname, "..");
  const systemChrome =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const executablePath =
    process.env.CHROME_PATH ||
    (process.platform === "win32" && existsSync(systemChrome)
      ? systemChrome
      : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto(pathToFileURL(join(root, "index.html")).href);

  assert.equal(await page.locator("#menu-title").innerText(), "REMOTE\nPANIC!");
  if (process.argv.includes("--capture")) {
    mkdirSync(join(root, "docs"), { recursive: true });
    await page.screenshot({
      path: join(root, "docs", "menu.png"),
      fullPage: true,
    });
  }

  await page.keyboard.press("Enter");
  assert.match(
    await page.locator("#round-title").innerText(),
    /CUT THE RED WIRE/,
  );
  assert.equal(await page.locator(".wire").count(), 4);
  if (process.argv.includes("--capture"))
    await page.screenshot({
      path: join(root, "docs", "wire-round.png"),
      fullPage: true,
    });

  await page.locator(".wire.red").click();
  assert.equal(await page.locator("#feedback-title").innerText(), "NICE SAVE!");
  assert.notEqual(await page.locator("#hud-score").innerText(), "0000");
  await page.waitForTimeout(1300);
  assert.equal(await page.locator("#round-title").innerText(), "LAND THE UFO");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#pause-title").isVisible(), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#pause-title").isVisible(), false);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "Smoke test passed: menu, wire win, score, next round, pause/resume, no page errors.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
