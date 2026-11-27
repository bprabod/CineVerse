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
function releaseCountdownHTML(dateValue) {
  return formatReleaseCountdown(dateValue) ? '<span class="release-countdown-inline" data-release-countdown="' + escapeHtml(dateValue) + '"></span>' : '';
}
function formatReleaseCountdown(dateValue) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const target = new Date(Number(match[1]), Number(match[2])-1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((target.getTime()-today.getTime())/86400000);
  if (days < 0) return '';
  if (days === 0) return 'RELEASES TODAY';
  const remaining = Math.max(0, target.getTime()-now.getTime());
  const d = Math.floor(remaining/86400000);
  const h = Math.floor((remaining%86400000)/3600000);
  const m = Math.floor((remaining%3600000)/60000);
  const s = Math.floor((remaining%60000)/1000);
  return d + 'd : ' + String(h).padStart(2,'0') + 'h : ' + String(m).padStart(2,'0') + 'm : ' + String(s).padStart(2,'0') + 's';
}
function refreshReleaseCountdowns() {
  document.querySelectorAll('[data-release-countdown]').forEach(node => {
    const value = formatReleaseCountdown(node.dataset.releaseCountdown);
    if (!value) { node.hidden = true; return; }
    node.hidden = false; node.textContent = value;
  });
}
setInterval(refreshReleaseCountdowns, 1000);
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
    tag: item.tagline || "",
    releaseDate: item.release_date || item.first_air_date || ""
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
    ${formatReleaseCountdown(movie.releaseDate) ? '<span class="release-countdown-badge" data-release-countdown="' + escapeHtml(movie.releaseDate) + '>' + escapeHtml(formatReleaseCountdown(movie.releaseDate)) + '</span>' : ''}
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
    // Load the saved homepage hero first so catalogue results never replace it.
    await loadDatabaseHero();
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
    // Keep the Supabase-managed hero stable; trending titles belong in the catalogue row.
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

let heroSlides = [];
let heroSlideIndex = 0;
let heroTimer = null;
let heroContent = null;
let heroTransitionToken = 0;

async function showHeroSlide(index) {
  if (!heroSlides.length) return;
  const nextIndex = (index + heroSlides.length) % heroSlides.length;
  const movie = heroSlides[nextIndex];
  const transitionToken = ++heroTransitionToken;
  const version = movie.updated_at ? new Date(movie.updated_at).getTime() : 0;
  const backdrop = `${IMAGE_BASE}original${movie.backdrop_path}${version ? `?v=${version}` : ''}`;
  const preload = new Image();
  preload.src = backdrop;
  try {
    if (typeof preload.decode === 'function') await preload.decode();
    else await new Promise((resolve, reject) => { preload.onload = resolve; preload.onerror = reject; });
  } catch (error) { console.warn('Featured slide image failed:', error); return; }
  if (transitionToken !== heroTransitionToken) return;
  const words = (movie.title || 'Featured movie').trim().split(/\s+/);
  const titleLength = words.join(' ').length;
  const isLongTitle = titleLength > 20;
  const titleFontSize = Math.max(30, Math.min(78, Math.round(2300 / titleLength)));
  let splitAt = words.length;
  if (isLongTitle && words.length > 2) {
    const midpoint = words.join(' ').length / 2;
    let running = 0;
    let bestDistance = Infinity;
    for (let i = 1; i < words.length; i++) {
      running += words[i - 1].length + (i > 1 ? 1 : 0);
      const distance = Math.abs(running - midpoint);
      if (distance < bestDistance) { bestDistance = distance; splitAt = i; }
    }
  }
  const first = words.slice(0, splitAt).join(' ');
  const last = words.slice(splitAt).join(' ');
  const heroImage = document.querySelector('.hero-image');
  const heroContentElement = document.querySelector('.hero-content');
  heroImage?.classList.add('is-changing');
  heroContentElement?.classList.add('is-changing');
  // Keep the outgoing slide faded long enough for the transition to be visible.
  await new Promise(resolve => setTimeout(resolve, 520));
  if (transitionToken !== heroTransitionToken) return;
  requestAnimationFrame(() => {
    if (transitionToken !== heroTransitionToken) return;
    const image = document.querySelector('.hero-image');
    const title = document.querySelector('.hero-content h1');
    const cta = document.querySelector('.hero-buttons .button-primary');
    if (image) image.style.backgroundImage = `url("${backdrop}")`;
    const eyebrow = document.querySelector('.hero-content .eyebrow');
    const kicker = document.querySelector('.hero-kicker');
    const description = document.querySelector('.hero-description');
    const meta = document.querySelector('.hero-meta');
    if (eyebrow) eyebrow.innerHTML = '<span class="live-dot"></span> FEATURED MOVIE';
    if (kicker) kicker.innerHTML = releaseCountdownHTML(movie.release_date) || 'NOW SHOWING ON CINEVERSE';
    if (title) {
      title.classList.toggle('is-long-title', isLongTitle);
      if (isLongTitle) title.style.setProperty('--hero-title-size', `${titleFontSize}px`);
      else title.style.removeProperty('--hero-title-size');
      title.innerHTML = `${escapeHtml(first)}${last ? `<br><span>${escapeHtml(last)}</span>` : ''}`;
    }
    if (description) description.textContent = movie.overview || 'Discover this featured movie on CineVerse.';
    if (meta) {
      const year = (movie.release_date || '').slice(0, 4);
      const rating = Number(movie.vote_average || 0);
      meta.innerHTML = `${rating ? `<span class="match">★ ${rating.toFixed(1)}/10</span>` : ''}${year ? `<span>${escapeHtml(year)}</span>` : ''}<span class="rating">MOVIE</span>`;
    }
    if (cta) {
      cta.innerHTML = `<span class="play-symbol">▶</span> ${escapeHtml(heroContent?.cta_label || 'Explore title')}`;
      cta.href = `movie.html?id=${encodeURIComponent(movie.tmdb_id || movie.id)}&type=movie`;
    }
    refreshReleaseCountdowns();
    const count = $('heroSlideCount');
    if (count) count.textContent = `${String(nextIndex + 1).padStart(2, '0')} / ${String(heroSlides.length).padStart(2, '0')}`;
    requestAnimationFrame(() => {
      image?.classList.remove('is-changing');
      heroContentElement?.classList.remove('is-changing');
    });
  });
  heroSlideIndex = nextIndex;
}

function startHeroAutoplay() {
  clearInterval(heroTimer);
  if (heroSlides.length > 1) heroTimer = setInterval(() => showHeroSlide(heroSlideIndex + 1), 8000);
}

async function loadDatabaseHero() {
  try {
    const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, Accept: 'application/json' };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/homepage_content?select=cta_label&id=eq.1`, { headers });
    if (response.ok) heroContent = (await response.json())[0] || null;
    if (Array.isArray(window.CV_HERO_SLIDES) && window.CV_HERO_SLIDES.length) {
      heroSlides = window.CV_HERO_SLIDES.slice(0, 5);
    } else {
      const fallback = await fetch(`${SUPABASE_URL}/rest/v1/homepage_background?select=tmdb_id,title,backdrop_path,overview,release_date,vote_average,updated_at&id=eq.1`, { headers });
      if (!fallback.ok) throw new Error('Could not load featured movie data.');
      heroSlides = (await fallback.json()).filter(movie => movie.backdrop_path);
    }
    if (!heroSlides.length) return;
    await showHeroSlide(0);
    startHeroAutoplay();
  } catch (error) { console.warn('Could not load homepage featured movies:', error); }
}

const heroControls = document.querySelector('.hero-carousel-controls');
heroControls?.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !heroSlides.length) return;
  event.preventDefault();
  event.stopPropagation();
  clearInterval(heroTimer);
  if (button.id === 'heroPrev') showHeroSlide(heroSlideIndex - 1);
  if (button.id === 'heroNext') showHeroSlide(heroSlideIndex + 1);
  startHeroAutoplay();
});
heroControls?.addEventListener('mouseenter', () => clearInterval(heroTimer));
heroControls?.addEventListener('mouseleave', startHeroAutoplay);


const dialog = $("movieDialog");

let dialogWatchlistEntryId = null;
async function syncDialogWatchButton() {
  const button = $("dialogWatch");
  button.disabled = true; button.textContent = "Checking…";
  try {
    const { data: { user }, error: authError } = await cvSupabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      dialogWatchlistEntryId = null;
      button.disabled = false; button.textContent = "＋ Add to Watchlist"; return;
    }
    const { data, error } = await cvSupabase.from("watchlist").select("id")
      .eq("user_id", user.id).eq("tmdb_id", Number(activeMovie.id)).eq("media_type", activeMovie.type).maybeSingle();
    if (error) throw error;
    dialogWatchlistEntryId = data?.id || null;
    button.disabled = false;
    button.textContent = data ? "✓ In Watchlist · Remove" : "＋ Add to Watchlist";
  } catch (error) {
    console.warn("Could not check Watchlist status:", error);
    button.disabled = false; button.textContent = "＋ Add to Watchlist";
  }
}

async function openMovie(id, type) {
  let movie = [...catalogue.trending, ...catalogue.movies, ...catalogue.series, ...searchResults]
    .find(item => String(item.id) === String(id) && item.type === type);
  if (!movie) return;
  activeMovie = movie;
  $("dialogTitle").textContent = movie.title;
  $("dialogGenre").textContent = movie.type === "tv" ? "TV SERIES" : "MOVIE";
  $("dialogDescription").textContent = movie.description;
  $("dialogArt").style.backgroundImage = `linear-gradient(0deg,#14141400,#0005),url("${movie.backdrop}")`;
  $("dialogMeta").innerHTML = `<span class="match">★ ${escapeHtml(movie.rating)}</span><span>${escapeHtml(movie.year)}</span><span class="rating">TMDB</span>${releaseCountdownHTML(movie.releaseDate)}`;
  dialogWatchlistEntryId = null;
  $("dialogWatch").textContent = "＋ Add to Watchlist";
  try {
    const detail = await tmdb(`/${type}/${id}`);
    movie = { ...movie, description: detail.overview || movie.description,
      genre: (detail.genres || []).map(g => g.name).join(" · ") || movie.genre,
      backdrop: imageUrl(detail.backdrop_path, "w1280"),
      tag: detail.tagline || "", releaseDate: detail.release_date || detail.first_air_date || movie.releaseDate };
    activeMovie = movie;
    $("dialogDescription").textContent = movie.description;
    $("dialogGenre").textContent = movie.genre;
    $("dialogArt").style.backgroundImage = `linear-gradient(0deg,#14141400,#0005),url("${movie.backdrop}")`;
    $("dialogMeta").innerHTML = `<span class="match">★ ${escapeHtml(movie.rating)}</span><span>${escapeHtml(movie.year)}</span><span class="rating">TMDB</span>${releaseCountdownHTML(movie.releaseDate)}`;
    refreshReleaseCountdowns();
  } catch (error) {
    console.warn("Could not load extended title details:", error);
  }
  await syncDialogWatchButton();
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

$("dialogWatch").addEventListener("click", async () => {
  const button = $("dialogWatch");
  if (!activeMovie || button.disabled) return;
  button.disabled = true;
  const { data: { user }, error: authError } = await cvSupabase.auth.getUser();
  if (authError || !user) { location.href = "auth.html"; return; }

  if (dialogWatchlistEntryId) {
    button.textContent = "Removing…";
    const { data, error } = await cvSupabase.from("watchlist").delete()
      .eq("id", dialogWatchlistEntryId).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) {
      showToast("Could not remove this title from your Watchlist.");
      button.disabled = false; button.textContent = "✓ In Watchlist · Remove"; return;
    }
    dialogWatchlistEntryId = null;
    button.disabled = false; button.textContent = "＋ Add to Watchlist";
    showToast(`${activeMovie.title} removed from your Watchlist.`);
    return;
  }

  button.textContent = "Saving…";
  const { error } = await cvSupabase.from("watchlist").insert({
    user_id: user.id, tmdb_id: activeMovie.id, media_type: activeMovie.type,
    title: activeMovie.title, poster_url: activeMovie.image
  });
  if (error && error.code !== "23505") {
    showToast("Could not save title: " + error.message);
    button.disabled = false; button.textContent = "＋ Add to Watchlist"; return;
  }
  await syncDialogWatchButton();
  showToast(error ? "This title is already in your Watchlist." : `${activeMovie.title} added to your Watchlist.`);
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
