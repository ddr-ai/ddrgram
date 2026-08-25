import { copyFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOTS = [
  join(process.cwd(), "dist/client"),
  join(process.cwd(), "dist"),
  join(process.cwd(), ".output/public"),
  join(process.cwd(), ".vercel/output/static"),
];

function findFile(name) {
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    const direct = join(root, name);
    if (existsSync(direct) && statSync(direct).size > 0) return direct;
  }
  return null;
}

function findHtml() {
  return findFile("index.html") ?? findFile("_shell.html") ?? findFile("404.html");
}

const source = findHtml();
if (!source) {
  console.error(
    "pages-spa-fallback: no index.html or _shell.html found under dist/, .output/public/, or .vercel/output/static/",
  );
  process.exit(1);
}

const dir = dirname(source);
const indexHtml = join(dir, "index.html");
const notFound = join(dir, "404.html");
if (source !== indexHtml) copyFileSync(source, indexHtml);
copyFileSync(indexHtml, notFound);
writeFileSync(join(dir, ".nojekyll"), "");
console.log(`pages-spa-fallback: ${source} -> ${indexHtml} and ${notFound}`);
