#!/usr/bin/env node
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./fetch-extensions.mjs";
import {
  renderExtension,
  renderIndex,
  renderRobots,
  renderRootReadme,
  renderSitemap,
} from "./templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "_site");

async function main() {
  console.log("Fetching Open VSX catalog…");
  const { site, extensions } = await loadCatalog();
  console.log(`Found ${extensions.length} extensions`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, "styles"), { recursive: true });
  await mkdir(path.join(OUT, "extensions"), { recursive: true });

  await cp(path.join(ROOT, "src/styles/tokens.css"), path.join(OUT, "styles/tokens.css"));
  await cp(path.join(ROOT, "src/styles/site.css"), path.join(OUT, "styles/site.css"));

  await writeFile(path.join(OUT, "index.html"), renderIndex(site, extensions), "utf8");
  await writeFile(path.join(OUT, "sitemap.xml"), renderSitemap(site, extensions), "utf8");
  await writeFile(path.join(OUT, "robots.txt"), renderRobots(site), "utf8");

  for (const ext of extensions) {
    const dir = path.join(OUT, "extensions", ext.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), renderExtension(site, ext), "utf8");
    console.log(`  + /extensions/${ext.id}/  (${ext.displayName} v${ext.version})`);
  }

  const readme = renderRootReadme(site, extensions);
  await writeFile(path.join(ROOT, "README.md"), readme, "utf8");
  console.log("Updated README.md");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
