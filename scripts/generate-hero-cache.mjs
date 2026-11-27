import { writeFile } from 'node:fs/promises';
const SUPABASE_URL = 'https://suckecjeyzlpbpkspmau.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' };
const [savedResponse, trendingResponse] = await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/homepage_background?select=tmdb_id,title,backdrop_path,overview,release_date,vote_average,updated_at&id=eq.1`, { headers }),
  fetch(`${SUPABASE_URL}/functions/v1/tmdb-proxy?path=%2Ftrending%2Fmovie%2Fweek`, { headers })
]);
if (!savedResponse.ok) throw new Error(`Supabase hero request failed: ${savedResponse.status}`);
if (!trendingResponse.ok) throw new Error(`TMDB trending request failed: ${trendingResponse.status}`);
const saved = (await savedResponse.json())[0];
const trending = await trendingResponse.json();
if (!saved?.backdrop_path || !saved?.title) throw new Error('No featured movie saved in homepage_background (id=1).');
const slides = [saved];
for (const item of trending.results || []) {
  if (slides.length >= 5) break;
  if (!item.backdrop_path || slides.some(movie => String(movie.tmdb_id || movie.id) === String(item.id))) continue;
  slides.push({ tmdb_id: item.id, title: item.title || item.name, backdrop_path: item.backdrop_path, overview: item.overview || '', release_date: item.release_date || '', vote_average: item.vote_average || 0 });
}
if (slides.length !== 5) throw new Error(`Expected 5 usable slides, got ${slides.length}.`);
const source = [
  '// Generated from the saved Supabase hero and TMDB trending movies. Do not edit manually.',
  `window.CV_HERO_SLIDES = ${JSON.stringify(slides)};`,
  '(() => {',
  '  const movie = window.CV_HERO_SLIDES[0];',
  '  if (!movie?.backdrop_path) return;',
  '  const preload = document.createElement("link");',
  '  preload.rel = "preload";',
  '  preload.as = "image";',
  `  preload.href = ${JSON.stringify(IMAGE_BASE)} + movie.backdrop_path;`,
  '  preload.fetchPriority = "high";',
  '  document.head.appendChild(preload);',
  '})();'
].join('\n');
await writeFile('hero-cache.js', source, 'utf8');
console.log(`Prepared ${slides.length} homepage hero slides: ${slides.map(movie => movie.title).join(', ')}`);
