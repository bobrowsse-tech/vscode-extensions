import { marked } from "marked";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHtml } from "./sanitize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OVSX = "https://open-vsx.org";

/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchJson(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "bobrowsse-tech-vscode-extensions-directory/1.0",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status}`);
  }
  return res.json();
}

/**
 * Open VSX listings are cached for 10 minutes. A fresh query skips that.
 * @param {string} url
 * @param {string} nonce
 */
function liveUrl(url, nonce) {
  const u = new URL(url);
  u.searchParams.set("nocache", nonce);
  return u.toString();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "text/plain, text/markdown, text/html, */*",
      "User-Agent": "bobrowsse-tech-vscode-extensions-directory/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status}`);
  }
  return res.text();
}

/**
 * @param {string} repoField
 * @param {string} extensionId
 * @param {Record<string, string>} repoMap
 */
function resolveGithubRepo(repoField, extensionId, repoMap) {
  if (repoMap[extensionId]) {
    return {
      repo: repoMap[extensionId],
      url: `https://github.com/bobrowsse-tech/${repoMap[extensionId]}`,
    };
  }
  if (repoField) {
    const cleaned = repoField.replace(/\.git$/, "");
    try {
      const u = new URL(cleaned);
      if (u.hostname === "github.com") {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          return { repo: parts[1], url: `https://github.com/${parts[0]}/${parts[1]}` };
        }
      }
    } catch {
      /* fall through */
    }
  }
  return {
    repo: extensionId,
    url: `https://github.com/bobrowsse-tech/${extensionId}`,
  };
}

/**
 * @param {string} md
 */
function renderReadme(md) {
  if (!md?.trim()) return "";
  const html = marked.parse(md, { async: false, gfm: true, breaks: false });
  return sanitizeHtml(String(html));
}

/**
 * Load site config + overrides and fetch the live Open VSX catalog.
 */
export async function loadCatalog() {
  const site = JSON.parse(await readFile(path.join(ROOT, "data/site.json"), "utf8"));
  const overrides = JSON.parse(
    await readFile(path.join(ROOT, "data/extensions.overrides.json"), "utf8"),
  );

  const nonce = String(Date.now());
  const namespace = await fetchJson(liveUrl(`${OVSX}/api/${site.publisher}`, nonce));
  const names = Object.keys(namespace.extensions || {});
  if (names.length === 0) {
    throw new Error(`Open VSX returned zero extensions for publisher ${site.publisher}`);
  }

  /** @type {object[]} */
  const extensions = [];

  for (const name of names) {
    const detail = await fetchJson(liveUrl(`${OVSX}/api/${site.publisher}/${name}`, nonce));
    let readmeHtml = "";
    const readmeUrl = detail.files?.readme;
    if (readmeUrl) {
      try {
        const md = await fetchText(liveUrl(readmeUrl, nonce));
        readmeHtml = renderReadme(md);
      } catch (err) {
        console.warn(`README fetch failed for ${name}:`, err.message || err);
      }
    }

    const github = resolveGithubRepo(detail.repository || detail.homepage || "", name, overrides.repos || {});
    const blurb = overrides.seoBlurbs?.[name] || detail.description || "";

    extensions.push({
      id: name,
      displayName: detail.displayName || name,
      description: detail.description || "",
      seoDescription: blurb,
      version: detail.version || "",
      categories: detail.categories || [],
      tags: detail.tags || [],
      license: detail.license || "MIT",
      downloadCount: typeof detail.downloadCount === "number" ? detail.downloadCount : 0,
      iconUrl: detail.files?.icon || "",
      marketplaceUrl: `https://marketplace.visualstudio.com/items?itemName=${site.publisher}.${name}`,
      openVsxUrl: `${OVSX}/extension/${site.publisher}/${name}`,
      githubUrl: github.url,
      githubRepo: github.repo,
      pagePath: `/extensions/${name}/`,
      pageUrl: `${site.baseUrl}/extensions/${name}/`,
      readmeHtml,
      timestamp: detail.timestamp || "",
      namespace: site.publisher,
    });
  }

  const order = overrides.order || [];
  extensions.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.displayName.localeCompare(b.displayName);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return { site, extensions };
}

/**
 * Load curated npm packages for the Tools section (not Open VSX).
 * @returns {Promise<object[]>}
 */
export async function loadPackages() {
  const raw = JSON.parse(await readFile(path.join(ROOT, "data/packages.json"), "utf8"));
  const order = raw.order || [];
  const map = raw.packages || {};
  const ids = order.length > 0 ? order : Object.keys(map);
  return ids
    .filter((id) => map[id])
    .map((id) => ({
      id,
      name: map[id].name,
      displayName: map[id].displayName || map[id].name,
      description: map[id].description || "",
      npmUrl: map[id].npmUrl,
      githubUrl: map[id].githubUrl,
      version: map[id].version || "",
    }));
}

