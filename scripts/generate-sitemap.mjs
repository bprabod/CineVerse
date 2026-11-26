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
  return response.json();
}

const entries = new Map();
entries.set(SITE, SITE);

async function addTitles(path, type, pageCount) {
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, index) => tmdb(path, index + 1))
  );
  for (const page of pages) {
    for (const item of page.results || []) {
      if (!item.id) continue;
      const url = new URL("movie.html", SITE);
      url.searchParams.set("id", String(item.id));
      url.searchParams.set("type", type);
      entries.set(url.toString(), url.toString());
    }
  }
}

await Promise.all([
  addTitles("/movie/popular", "movie", 5),
  addTitles("/trending/movie/week", "movie", 1),
  addTitles("/tv/on_the_air", "tv", 3)
]);

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [...entries.keys()].map(url => `  <url><loc>${url}</loc></url>`).join("\n") +
  "\n</urlset>\n";

await writeFile("sitemap.xml", xml, "utf8");
console.log(`Generated sitemap with ${entries.size} URLs.`);