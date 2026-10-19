/** Minimal HTML allowlist sanitizer for README content. */

const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (!html) return "";
  let out = html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, "");

  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    const closing = match.startsWith("</");
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;
    if (tag === "a") {
      const href = pickAttr(attrs, "href");
      if (!href || !isSafeUrl(href)) return "<a>";
      return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">`;
    }
    if (tag === "img") {
      const src = pickAttr(attrs, "src");
      const alt = pickAttr(attrs, "alt") || "";
      if (!src || !isSafeUrl(src)) return "";
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy">`;
    }
    if (VOID_TAGS.has(tag)) return `<${tag}>`;
    return `<${tag}>`;
  });

  return out;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeAttr(text) {
  return escapeHtml(text);
}

/**
 * @param {string} attrs
 * @param {string} name
 */
function pickAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : "";
}

/**
 * @param {string} url
 */
function isSafeUrl(url) {
  const trimmed = url.trim();
  if (trimmed.startsWith("#")) return true;
  try {
    const u = new URL(trimmed, "https://example.com");
    return ["http:", "https:", "mailto:"].includes(u.protocol);
  } catch {
    return false;
  }
}
