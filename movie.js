const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const TMDB_PROXY = `${SUPABASE_URL}/functions/v1/tmdb-proxy`;
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const NEXSTREAM_API_KEY = "nx_73737077fdaf1355551e14c7f105f427";
const NEXSTREAM_EMBED = "https://api.codespecters.com/embed/movie/";
const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";
let currentTitle = null;
const $ = id => document.getElementById(id);
const posterFallback = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";

function goBack() {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
  else location.href = "index.html";
}
$("backButton").addEventListener("click", goBack);

async function tmdb(path) {
  const query = new URLSearchParams({ path });
  const response = await fetch(`${TMDB_PROXY}?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function loadTitle() {
  if (!id || !/^\d+$/.test(id)) {
    $("detailTitle").textContent = "Title not found";
    $("detailOverview").textContent = "This title link is invalid.";
    $("playButton").disabled = true;
    return;
  }
  try {
    const item = await tmdb(`/${type}/${id}`);
    currentTitle = item;
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    $("detailType").textContent = type === "tv" ? "TV SERIES" : "MOVIE";
    $("detailTitle").textContent = title;
    $("detailOverview").textContent = item.overview || "No synopsis is available yet.";
    $("detailPoster").src = item.poster_path ? `${IMAGE_BASE}w780${item.poster_path}` : posterFallback;
    $("detailPoster").alt = `Poster for ${title}`;
    $("detailPoster").onerror = () => { $("detailPoster").src = posterFallback; };
    $("detailMeta").innerHTML = `<span class="match">★ ${Number(item.vote_average || 0).toFixed(1)}</span><span>${year || "—"}</span><span class="rating">${type === "tv" ? "TV" : "TMDB"}</span>`;
    document.title = `${title} — CineVerse`;
    if (type === "tv") $("playButton").textContent = "TV playback unavailable";
  } catch (error) {
    $("detailTitle").textContent = "Could not load title";
    $("detailOverview").textContent = error.message || "Please try again.";
    $("playButton").disabled = true;
  }
}

$("playButton").addEventListener("click", () => {
  if (!currentTitle) return;
  if (type !== "movie") {
    $("detailStatus").textContent = "TV episode playback needs a season and episode selection.";
    return;
  }
  const playerUrl = new URL(`${NEXSTREAM_EMBED}${encodeURIComponent(id)}`);
  playerUrl.searchParams.set("apikey", NEXSTREAM_API_KEY);
  $("playerFrame").src = playerUrl.toString();
  $("playerSection").hidden = false;
  $("playerSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("stopButton").addEventListener("click", () => {
  $("playerFrame").src = "about:blank";
  $("playerSection").hidden = true;
});

$("listButton").addEventListener("click", () => {
  if (!currentTitle) return;
  const key = "cineverse-watchlist";
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  const title = currentTitle.title || currentTitle.name || "Untitled";
  if (!saved.some(item => String(item.id) === String(id) && item.type === type)) {
    saved.push({ id: Number(id), type, title, image: currentTitle.poster_path ? `${IMAGE_BASE}w500${currentTitle.poster_path}` : posterFallback });
    localStorage.setItem(key, JSON.stringify(saved));
    $("detailStatus").textContent = `${title} added to your list.`;
  } else {
    $("detailStatus").textContent = "This title is already in your list.";
  }
});

window.addEventListener("pagehide", () => { $("playerFrame").src = "about:blank"; });
loadTitle();
