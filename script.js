// CineVerse frontend: TMDB data is requested only through the Supabase Edge Function.
const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const TMDB_PROXY = `${SUPABASE_URL}/functions/v1/tmdb-proxy`;
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
// NexStream embed key supplied by the site owner. Note: iframe URLs are visible to visitors.
const NEXSTREAM_API_KEY = "nx_73737077fdaf1355551e14c7f105f427";
const NEXSTREAM_EMBED = "https://api.codespecters.com/embed/movie/";
const FALLBACK_POSTER = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";

const catalogue = { trending: [], movies: [], series: [] };
let searchResults = [];
let searchTimer;
let toastTimer;
let activeMovie = null;

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

function imageUrl(path, size = "w500") {
  return path ? `${IMAGE_BASE}${size}${path}` : FALLBACK_POSTER;
}

async function tmdb(path, params = {}) {
  const query = new URLSearchParams({ path, ...params });
  const response = await fetch(`${TMDB_PROXY}?${query}`, {
    method: "GET",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function normalize(item, type = "movie") {
  const isTv = type === "tv" || (!item.title && !!item.name);
  return {
    id: item.id,
    type: isTv ? "tv" : "movie",
    title: item.title || item.name || "Untitled",
    year: (item.release_date || item.first_air_date || "").slice(0, 4) || "—",
    rating: Number(item.vote_average || 0).toFixed(1),
    genre: isTv ? "TV Series" : "Movie",
    image: imageUrl(item.poster_path),
    backdrop: imageUrl(item.backdrop_path, "w1280"),
    description: item.overview || "No synopsis is available yet.",
    tag: item.tagline || ""
  };
}

function movieCard(movie) {
  const detailsUrl = `movie.html?id=${encodeURIComponent(movie.id)}&type=${encodeURIComponent(movie.type)}`;
  return `<a class="movie-card" href="${detailsUrl}"
    aria-label="View details for ${escapeHtml(movie.title)}">
    <img class="poster" src="${escapeHtml(movie.image)}" alt="Poster for ${escapeHtml(movie.title)}"
      loading="lazy" onerror="this.src='${FALLBACK_POSTER}'">
    <div class="card-gradient"></div>
    <span class="card-top">${movie.type === "tv" ? "SERIES" : "TMDB"}</span>
    <div class="card-info"><h3>${escapeHtml(movie.title)}</h3>
      <p>${escapeHtml(movie.year)} &nbsp;·&nbsp; ★ ${escapeHtml(movie.rating)}</p></div>
  </a>`;
}

function renderRow(id, list) {
  const element = $(id);
  if (element) element.innerHTML = list.length
    ? list.map(movieCard).join("")
    : '<p class="empty-state">No titles found. Try another search.</p>';
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

async function loadHome() {
  const sectionTitle = $("trending").querySelector("h2");
  try {
    const [trending, popularPages, series] = await Promise.all([
      tmdb("/trending/movie/week"),
      Promise.all([1, 2, 3, 4, 5].map(page => tmdb("/movie/popular", { page: String(page) }))),
      tmdb("/tv/on_the_air")
    ]);
    catalogue.trending = (trending.results || []).map(item => normalize(item, "movie"));
    // Five TMDB pages provide up to 100 popular movies in the collection.
    catalogue.movies = popularPages
      .flatMap(result => result.results || [])
      .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
      .map(item => normalize(item, "movie"));
    catalogue.series = (series.results || []).map(item => normalize(item, "tv"));
    renderRow("trendingRow", catalogue.trending);
    renderRow("moviesRow", catalogue.movies);
    renderRow("seriesRow", catalogue.series);
    if (catalogue.trending[0]) updateHero(catalogue.trending[0]);
    await loadDatabaseHero();
  } catch (error) {
    console.error("CineVerse catalogue error:", error);
    renderRow("trendingRow", []);
    renderRow("moviesRow", []);
    renderRow("seriesRow", []);
    sectionTitle.textContent = "Catalogue unavailable";
    showToast(error.message || "Could not load titles. Check your Supabase TMDB secret.");
  }
}

function updateHero(movie) {
  const title = document.querySelector(".hero-content h1");
  const description = document.querySelector(".hero-description");
  const image = document.querySelector(".hero-image");
  const kicker = document.querySelector(".hero-kicker");
  if (title) title.innerHTML = escapeHtml(movie.title);
  if (description) description.textContent = movie.description;
  if (image) image.style.backgroundImage = `url("${movie.backdrop}")`;
  if (kicker) kicker.textContent = "TRENDING ON CINEVERSE";
  const meta = document.querySelector(".hero-meta");
  if (meta) meta.innerHTML = `<span class="match">★ ${escapeHtml(movie.rating)}</span><span>${escapeHtml(movie.year)}</span><span class="rating">TMDB</span><span>${movie.type === "tv" ? "Series" : "Movie"}</span>`;
}

async function loadDatabaseHero() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/homepage_background?select=title,backdrop_path,overview,release_date,vote_average,updated_at&id=eq.1`,
      { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, Accept: "application/json" } }
    );
    if (!response.ok) throw new Error("Could not read featured background from Supabase.");
    const rows = await response.json();
    const featured = rows[0];
    if (!featured?.backdrop_path) return;

    const backdrop = `${IMAGE_BASE}original${featured.backdrop_path}`;
    const preload = new Image();
    preload.onload = () => {
      const title = document.querySelector(".hero-content h1");
      const description = document.querySelector(".hero-description");
      const image = document.querySelector(".hero-image");
      const kicker = document.querySelector(".hero-kicker");
      const meta = document.querySelector(".hero-meta");
      if (image) image.style.backgroundImage = `url("${backdrop}")`;
      if (title) title.textContent = featured.title || "Trending now";
      if (description) description.textContent = featured.overview || "Discover today's trending movie on CineVerse.";
      if (kicker) kicker.textContent = "UPDATED DAILY FROM TMDB";
      if (meta) {
        const year = (featured.release_date || "").slice(0, 4) || "NOW TRENDING";
        const rating = Number(featured.vote_average || 0).toFixed(1);
        meta.innerHTML = `<span class="match">★ ${escapeHtml(rating)}</span><span>${escapeHtml(year)}</span><span class="rating">TMDB</span><span>Featured movie</span>`;
      }
    };
    preload.onerror = () => console.warn("Could not load the Supabase featured backdrop image.");
    preload.src = backdrop;
  } catch (error) {
    console.warn("Using live trending hero because the saved homepage background is unavailable:", error);
  }
}


const dialog = $("movieDialog");

async function openMovie(id, type) {
  let movie = [...catalogue.trending, ...catalogue.movies, ...catalogue.series, ...searchResults]
    .find(item => String(item.id) === String(id) && item.type === type);
  if (!movie) return;
  activeMovie = movie;
  $("dialogTitle").textContent = movie.title;
  $("dialogGenre").textContent = movie.type === "tv" ? "TV SERIES" : "MOVIE";
  $("dialogDescription").textContent = movie.description;
  $("dialogArt").style.backgroundImage = `linear-gradient(0deg,#14141400,#0005),url("${movie.backdrop}")`;
  $("dialogMeta").innerHTML = `<span class="match">★ ${escapeHtml(movie.rating)}</span><span>${escapeHtml(movie.year)}</span><span class="rating">TMDB</span>`;
  $("dialogWatch").textContent = "＋ Add to my list";
  try {
    const detail = await tmdb(`/${type}/${id}`);
    movie = { ...movie, description: detail.overview || movie.description,
      genre: (detail.genres || []).map(g => g.name).join(" · ") || movie.genre,
      backdrop: imageUrl(detail.backdrop_path, "w1280"),
      tag: detail.tagline || "" };
    activeMovie = movie;
    $("dialogDescription").textContent = movie.description;
    $("dialogGenre").textContent = movie.genre;
    $("dialogArt").style.backgroundImage = `linear-gradient(0deg,#14141400,#0005),url("${movie.backdrop}")`;
  } catch (error) {
    console.warn("Could not load extended title details:", error);
  }
  if (!dialog.open) dialog.showModal();
}

// Movie cards are real links, so mouse, touch, keyboard, and open-in-new-tab work natively.

$("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

const streamPlayer = $("streamPlayer");
const streamFrame = $("streamFrame");

$("dialogPlay").addEventListener("click", () => {
  if (!activeMovie) return;
  if (activeMovie.type !== "movie") {
    showToast("NexStream movie playback is currently set up for movies.");
    return;
  }
  const playerUrl = new URL(`${NEXSTREAM_EMBED}${encodeURIComponent(activeMovie.id)}`);
  playerUrl.searchParams.set("apikey", NEXSTREAM_API_KEY);
  streamFrame.src = playerUrl.toString();
  streamPlayer.hidden = false;
  streamPlayer.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("closePlayer").addEventListener("click", () => {
  streamFrame.src = "about:blank";
  streamPlayer.hidden = true;
});

dialog.addEventListener("close", () => {
  streamFrame.src = "about:blank";
  streamPlayer.hidden = true;
});

$("dialogWatch").addEventListener("click", () => {
  if (!activeMovie) return;
  const key = "cineverse-watchlist";
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  const exists = saved.some(item => item.id === activeMovie.id && item.type === activeMovie.type);
  if (!exists) {
    saved.push({ id: activeMovie.id, type: activeMovie.type, title: activeMovie.title, image: activeMovie.image });
    localStorage.setItem(key, JSON.stringify(saved));
    showToast(`${activeMovie.title} added to your list`);
  } else {
    showToast("This title is already in your list");
  }
  dialog.close();
});

document.querySelectorAll("[data-scroll]").forEach(button => {
  button.addEventListener("click", () => {
    const row = $(button.dataset.scroll);
    row?.scrollBy({ left: Number(button.dataset.dir) * row.clientWidth * .8, behavior: "smooth" });
  });
});

const searchSection = $("searchSection");
const searchInput = $("movieSearch");
$("searchToggle").addEventListener("click", () => {
  searchSection.hidden = !searchSection.hidden;
  if (!searchSection.hidden) {
    searchInput.focus();
    searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

async function searchTitles() {
  const query = searchInput.value.trim();
  const section = $("trending");
  if (!query) {
    section.querySelector(".section-kicker").textContent = "WHAT'S HOT RIGHT NOW";
    section.querySelector("h2").innerHTML = 'Trending now <span class="heading-arrow">↗</span>';
    renderRow("trendingRow", catalogue.trending);
    return;
  }
  section.querySelector(".section-kicker").textContent = "SEARCH RESULTS";
  section.querySelector("h2").textContent = `Searching for “${query}”...`;
  try {
    const data = await tmdb("/search/multi", { query, include_adult: "false" });
    searchResults = (data.results || [])
      .filter(item => item.media_type === "movie" || item.media_type === "tv")
      .map(item => normalize(item, item.media_type));
    section.querySelector("h2").textContent = `${searchResults.length} title${searchResults.length === 1 ? "" : "s"} found`;
    renderRow("trendingRow", searchResults);
  } catch (error) {
    searchResults = [];
    section.querySelector("h2").textContent = "Search unavailable";
    renderRow("trendingRow", []);
    showToast(error.message);
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchTitles, 350);
});
$("clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  searchTitles();
  searchInput.focus();
});

$("year").textContent = new Date().getFullYear();
loadHome();
