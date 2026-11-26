import { writeFile } from "node:fs/promises";

const SITE = "https://bprabod.github.io/CineVerse/";
const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const PROXY = `${SUPABASE_URL}/functions/v1/tmdb-proxy`;

async function tmdb(path, page = 1) {
  const url = new URL(PROXY);
  url.searchParams.set("path", path);
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`TMDB proxy request failed: ${path} page ${page} (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.results)) throw new Error(`Unexpected TMDB response for ${path}`);
  return data.results;
}

const urls = new Set([SITE]);

async function addTitles(path, type, pageCount) {
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, index) => tmdb(path, index + 1))
  );
  for (const page of pages) {
    for (const item of page) {
      const id = Number(item.id);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      const url = new URL("movie.html", SITE);
      url.searchParams.set("id", String(id));
      url.searchParams.set("type", type);
      urls.add(url.toString());
    }
  }
}

await Promise.all([
  addTitles("/movie/popular", "movie", 5),
  addTitles("/trending/movie/week", "movie", 1),
  addTitles("/tv/on_the_air", "tv", 3)
]);

if (urls.size < 20) {
  throw new Error(`Only ${urls.size - 1} title URLs collected. Keeping the existing sitemap unchanged.`);
}

const today = new Date().toISOString().slice(0, 10);
const escapeXml = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...[...urls].map(url => [
    "  <url>",
    `    <loc>${escapeXml(url)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "  </url>"
  ].join("\n")),
  "</urlset>",
  ""
].join("\n");

await writeFile("sitemap.xml", xml, "utf8");
console.log(`Generated sitemap with ${urls.size} URLs.`);
