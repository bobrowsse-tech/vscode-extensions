import { escapeHtml, escapeAttr } from "./sanitize.mjs";

/**
 * @param {object} site
 * @param {string} pathOnly e.g. / or /extensions/foo/
 */
export function assetPath(site, pathOnly) {
  const base = site.basePath?.replace(/\/$/, "") || "";
  if (!pathOnly.startsWith("/")) return `${base}/${pathOnly}`;
  return `${base}${pathOnly}`;
}

/**
 * @param {object} opts
 */
export function layout({
  site,
  title,
  description,
  canonical,
  ogType = "website",
  jsonLd,
  body,
  path,
}) {
  const cssTokens = assetPath(site, "/styles/tokens.css");
  const cssSite = assetPath(site, "/styles/site.css");
  const home = assetPath(site, "/");
  const json = JSON.stringify(jsonLd, null, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:type" content="${escapeAttr(ogType)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:site_name" content="${escapeAttr(site.siteName)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeAttr(title)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/style.css">
  <link rel="stylesheet" href="${escapeAttr(cssTokens)}">
  <link rel="stylesheet" href="${escapeAttr(cssSite)}">
  <script type="application/ld+json">${json}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="site-header__brand" href="${escapeAttr(home)}">${escapeHtml(site.siteName)}</a>
    <nav class="site-header__nav" aria-label="Primary">
      <a href="${escapeAttr(home)}"${path === "/" ? ' aria-current="page"' : ""}>Extensions</a>
      <a href="${escapeAttr(site.owner.url)}">bobrowsse.com</a>
      <a href="${escapeAttr(site.links.marketplace)}">Marketplace</a>
      <a href="${escapeAttr(site.links.openVsx)}">Open VSX</a>
    </nav>
  </header>
  <main id="main">
${body}
  </main>
  <footer class="site-footer">
    <p class="site-footer__name">${escapeHtml(site.owner.name)}</p>
    <p class="site-footer__line">${escapeHtml(site.owner.positioning)}</p>
    <p class="site-footer__line">Publisher <code>${escapeHtml(site.publisher)}</code></p>
    <div class="site-footer__links">
      <a href="${escapeAttr(site.owner.url)}">${escapeHtml(site.owner.url.replace(/^https?:\/\//, ""))}</a>
      <a href="mailto:${escapeAttr(site.owner.email)}">${escapeHtml(site.owner.email)}</a>
      <a href="${escapeAttr(site.owner.github)}">GitHub</a>
    </div>
  </footer>
</body>
</html>
`;
}

/**
 * @param {object} site
 * @param {object[]} extensions
 */
export function personOrgJsonLd(site) {
  return {
    "@type": "Person",
    name: site.owner.name,
    url: site.owner.url,
    email: site.owner.email,
    sameAs: [site.owner.github, site.links.marketplace, site.links.openVsx],
  };
}

/**
 * @param {object} site
 * @param {object[]} extensions
 */
export function renderIndex(site, extensions) {
  const rows = extensions
    .map((ext) => {
      const href = assetPath(site, ext.pagePath);
      const meta = ext.downloadCount
        ? `${formatCount(ext.downloadCount)} · v${ext.version}`
        : `v${ext.version}`;
      return `      <li class="tool-row">
        <div class="tool-row__inner">
          <div>
            <a class="tool-row__title" href="${escapeAttr(href)}">${escapeHtml(ext.displayName)}</a>
            <p class="tool-row__desc">${escapeHtml(ext.description)}</p>
          </div>
          <a class="tool-row__meta" href="${escapeAttr(href)}">${escapeHtml(meta)}</a>
        </div>
      </li>`;
    })
    .join("\n");

  const body = `    <section class="section">
      <div class="container">
        <p class="eyebrow">VS Code &amp; Open VSX · ${escapeHtml(site.publisher)}</p>
        <h1 class="page-title">Extensions</h1>
        <p class="lead">Editor tools by ${escapeHtml(site.owner.name)}. Each page tracks the live Marketplace and Open VSX listing, including the current README.</p>
        <ul class="tool-list">
${rows}
        </ul>
      </div>
    </section>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: site.siteName,
        url: `${site.baseUrl}/`,
        description: `VS Code and Open VSX extensions published by ${site.publisher}.`,
        isPartOf: { "@type": "WebSite", name: site.siteName, url: `${site.baseUrl}/` },
        author: personOrgJsonLd(site),
      },
      {
        "@type": "ItemList",
        itemListElement: extensions.map((ext, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: ext.pageUrl,
          name: ext.displayName,
        })),
      },
    ],
  };

  return layout({
    site,
    title: `${site.siteName} — VS Code & Open VSX`,
    description: `Directory of VS Code / Open VSX extensions by ${site.owner.name} (${site.publisher}).`,
    canonical: `${site.baseUrl}/`,
    jsonLd,
    body,
    path: "/",
  });
}

/**
 * @param {object} site
 * @param {object} ext
 */
export function renderExtension(site, ext) {
  const home = assetPath(site, "/");
  const body = `    <article class="section">
      <div class="container">
        <p class="eyebrow"><a href="${escapeAttr(home)}">Extensions</a> / ${escapeHtml(ext.id)}</p>
        <h1 class="page-title">${escapeHtml(ext.displayName)}</h1>
        <p class="lead">${escapeHtml(ext.description)}</p>
        <p class="meta-line">v${escapeHtml(ext.version)}${ext.downloadCount ? ` · ${escapeHtml(formatCount(ext.downloadCount))} downloads` : ""} · ${escapeHtml(ext.license)}</p>
        <div class="cta-row">
          <a class="btn btn--primary" href="${escapeAttr(ext.marketplaceUrl)}">Install on Marketplace</a>
          <a class="btn btn--ghost" href="${escapeAttr(ext.openVsxUrl)}">Open VSX</a>
          <a class="btn btn--ghost" href="${escapeAttr(ext.githubUrl)}">GitHub</a>
          <a class="btn btn--ghost" href="${escapeAttr(site.owner.url)}">bobrowsse.com</a>
        </div>
        ${ext.readmeHtml ? `<div class="readme">${ext.readmeHtml}</div>` : `<p class="meta-line">README unavailable for this version.</p>`}
      </div>
    </article>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ext.displayName,
    description: ext.seoDescription || ext.description,
    url: ext.pageUrl,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "VS Code, Cursor, VSCodium",
    softwareVersion: ext.version,
    license: ext.license,
    downloadUrl: ext.marketplaceUrl,
    image: ext.iconUrl || undefined,
    author: personOrgJsonLd(site),
    publisher: {
      "@type": "Organization",
      name: site.publisher,
      url: site.links.marketplace,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    sameAs: [ext.marketplaceUrl, ext.openVsxUrl, ext.githubUrl],
  };

  return layout({
    site,
    title: `${ext.displayName} — ${site.publisher}`,
    description: ext.seoDescription || ext.description,
    canonical: ext.pageUrl,
    ogType: "website",
    jsonLd,
    body,
    path: ext.pagePath,
  });
}

/**
 * @param {object} site
 * @param {object[]} extensions
 */
export function renderRootReadme(site, extensions) {
  const lines = [
    `# ${site.siteName}`,
    "",
    `SEO directory of VS Code / Open VSX extensions by **${site.owner.name}** (\`${site.publisher}\`).`,
    "",
    site.owner.positioning,
    "",
    `- Site: ${site.baseUrl}/`,
    `- Author: [${site.owner.name}](${site.owner.url}) · ${site.owner.email}`,
    `- Marketplace: ${site.links.marketplace}`,
    `- Open VSX: ${site.links.openVsx}`,
    "",
    "Pages are generated from live Open VSX metadata (including each extension README) on every deploy, daily cron, and `repository_dispatch` after a release.",
    "",
    "## Extensions",
    "",
    "| Extension | Version | Directory | Marketplace | Open VSX | GitHub |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const ext of extensions) {
    lines.push(
      `| ${ext.displayName} | \`${ext.version}\` | [page](${ext.pageUrl}) | [Marketplace](${ext.marketplaceUrl}) | [Open VSX](${ext.openVsxUrl}) | [repo](${ext.githubUrl}) |`,
    );
  }

  lines.push(
    "",
    "## Generate locally",
    "",
    "```bash",
    "npm ci",
    "npm run generate",
    "```",
    "",
    "Output lands in `_site/`. Open `_site/index.html` after adjusting asset paths, or serve with any static file server under the `/vscode-extensions/` base path.",
    "",
  );

  return lines.join("\n");
}

/**
 * @param {object} site
 * @param {object[]} extensions
 */
export function renderSitemap(site, extensions) {
  const urls = [`${site.baseUrl}/`, ...extensions.map((e) => e.pageUrl)];
  const body = urls
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>daily</changefreq>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/**
 * @param {object} site
 */
export function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${site.baseUrl}/sitemap.xml
`;
}

/** @param {number} n */
function formatCount(n) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** @param {string} s */
function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
