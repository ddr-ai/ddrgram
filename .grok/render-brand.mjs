import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const cardUrl = pathToFileURL("/workspace/.grok/og-card.html").href;
const faviconUrl = pathToFileURL("/workspace/.grok/favicon.svg.tmp").href;

const browser = await chromium.launch({ args: ["--disable-web-security"] });

async function shot(url, { width, height, out }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: "load", timeout: 15000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: out,
    type: "png",
    omitBackground: false,
    clip: { x: 0, y: 0, width, height },
  });
  await page.close();
}

await shot(cardUrl, {
  width: 1200,
  height: 630,
  out: "/workspace/.grok/og-raw.png",
});

writeFileSync(
  "/workspace/.grok/icon-raster.html",
  `<!DOCTYPE html><html><head><style>
html,body{margin:0;width:512px;height:512px;background:#0b0c0e}
img{display:block;width:512px;height:512px}
</style></head><body><img src="${faviconUrl}" alt=""></body></html>`,
);

await shot(pathToFileURL("/workspace/.grok/icon-raster.html").href, {
  width: 512,
  height: 512,
  out: "/workspace/.grok/icon-512.png.tmp",
});

await browser.close();
console.log("rendered og-raw.png and icon-512.png.tmp");
