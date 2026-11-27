import { writeFile } from "node:fs/promises";

const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const response = await fetch(
  `${SUPABASE_URL}/rest/v1/homepage_background?select=title,backdrop_path,overview,release_date,vote_average,updated_at&id=eq.1`,
  { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" } }
);
if (!response.ok) throw new Error(`Supabase featured movie request failed: ${response.status}`);
const rows = await response.json();
const featured = rows[0];
if (!featured?.backdrop_path || !featured?.title) throw new Error("No complete featured movie is saved in homepage_background (id=1).");

const source = [
  "// Generated from the saved CineVerse homepage featured movie. Do not edit manually.",
  `window.CV_HERO_CACHE = ${JSON.stringify(featured)};`,
  "(() => {",
  "  const movie = window.CV_HERO_CACHE;",
  "  if (!movie?.backdrop_path) return;",
  "  const preload = document.createElement(\"link\");",
  "  preload.rel = \"preload\";",
  "  preload.as = \"image\";",
  `  preload.href = ${JSON.stringify(IMAGE_BASE)} + movie.backdrop_path + (movie.updated_at ? \"?v=\" + encodeURIComponent(new Date(movie.updated_at).getTime()) : \"\");`,
  "  preload.fetchPriority = \"high\";",
  "  document.head.appendChild(preload);",
  "})();"
].join("\n");
await writeFile("hero-cache.js", source, "utf8");
console.log(`Prepared homepage hero cache for: ${featured.title}`);
