const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const TMDB_PROXY = `${SUPABASE_URL}/functions/v1/tmdb-proxy`;
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const NEXSTREAM_API_KEY = "nx_73737077fdaf1355551e14c7f105f427";
const NEXSTREAM_MOVIE_EMBED = "https://api.codespecters.com/embed/movie/";
const NEXSTREAM_TV_EMBED = "https://api.codespecters.com/embed/tv/";
const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";
let currentTitle = null;
let currentEpisodes = [];
let selectedSeason = null;
const $ = id => document.getElementById(id);
const posterFallback = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";
const profileFallback = "https://placehold.co/300x450/202020/eeeeee?text=No+Photo";

function goBack() {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
  else location.href = "index.html";
}
const backButton = $("backButton");
if (backButton) backButton.addEventListener("click", goBack);

async function tmdb(path, extra = {}) {
  const query = new URLSearchParams({ path, ...extra });
  const response = await fetch(`${TMDB_PROXY}?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function addFact(label, value) {
  if (!value) return "";
  return `<div class="detail-fact"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderCredits(item) {
  const cast = (item.credits?.cast || []).slice(0, 16);
  $("castGrid").innerHTML = cast.length ? cast.map(person => {
    const photo = person.profile_path ? `${IMAGE_BASE}w185${person.profile_path}` : profileFallback;
    const name = escapeHtml(person.name || "Unknown");
    const role = escapeHtml(person.character || person.roles?.[0]?.character || "");
    return `<article class="cast-card"><img src="${photo}" alt="" loading="lazy" onerror="this.src='${profileFallback}'"><div><h3>${name}</h3><p>${role}</p></div></article>`;
  }).join("") : '<p class="detail-muted">Cast information is not available for this title.</p>';

  const crew = item.credits?.crew || [];
  const selected = [];
  const addCrew = (job, label) => {
    const matches = crew.filter(person => person.job === job).slice(0, 3);
    matches.forEach(person => selected.push({ label, name: person.name }));
  };
  addCrew("Director", "Director");
  addCrew("Writer", "Writer");
  addCrew("Screenplay", "Screenplay");
  addCrew("Creator", "Creator");
  const unique = selected.filter((person, index, all) =>
    all.findIndex(other => other.name === person.name && other.label === person.label) === index
  );
  $("crewList").innerHTML = unique.length
    ? unique.map(person => `<div class="crew-person"><span>${escapeHtml(person.label)}</span><strong>${escapeHtml(person.name)}</strong></div>`).join("")
    : '<p class="detail-muted">Crew information is not available.</p>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function renderExtraDetails(item) {
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const runtime = item.runtime || (item.episode_run_time || []).find(Boolean);
  const runtimeText = runtime ? `${runtime} min` : "";
  const genres = (item.genres || []).map(genre => genre.name).join(" · ");
  const status = item.status || "";
  const language = item.original_language ? item.original_language.toUpperCase() : "";
  const countries = (item.production_countries || []).map(country => country.name).join(", ");
  const seasons = type === "tv" && item.number_of_seasons ? `${item.number_of_seasons} seasons · ${item.number_of_episodes || "—"} episodes` : "";
  $("detailFacts").innerHTML = [
    addFact("GENRE", genres),
    addFact(type === "tv" ? "FIRST AIRED" : "RELEASED", year),
    addFact("RUNTIME", runtimeText),
    addFact("STATUS", status),
    addFact("LANGUAGE", language),
    addFact("COUNTRY", countries),
    addFact("SEASONS", seasons)
  ].join("");
  const trailer = (item.videos?.results || []).find(video =>
    video.site === "YouTube" && video.type === "Trailer" && video.key
  ) || (item.videos?.results || []).find(video => video.site === "YouTube" && video.key);
  if (trailer) {
    $("trailerLink").href = `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`;
    $("trailerSection").hidden = false;
  }
}

async function loadTitle() {
  if (!id || !/^\d+$/.test(id)) {
    $("detailTitle").textContent = "Title not found";
    $("detailOverview").textContent = "This title link is invalid.";
    $("playButton").disabled = true;
    return;
  }
  try {
    const item = await tmdb(`/${type}/${id}`, { append_to_response: "credits,videos" });
    currentTitle = item;
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    $("detailType").textContent = type === "tv" ? "TV SERIES" : "MOVIE";
    $("detailTitle").textContent = title;
    $("detailOverview").textContent = item.overview || "No synopsis is available yet.";
    $("detailPoster").src = item.poster_path ? `${IMAGE_BASE}w780${item.poster_path}` : posterFallback;
    $("detailPoster").alt = `Poster for ${title}`;
    $("detailPoster").onerror = () => { $("detailPoster").src = posterFallback; };
    $("detailMeta").innerHTML = `<span class="match">★ ${Number(item.vote_average || 0).toFixed(1)}</span><span>${year || "—"}</span><span class="rating">${type === "tv" ? "TV" : "TMDB"}</span><span>${Number(item.vote_count || 0).toLocaleString()} votes</span>`;
    document.title = `${title} — CineVerse`;
    renderExtraDetails(item);
    renderCredits(item);
    if (type === "tv") {
      $("playButton").textContent = "Choose an episode";
      $("tvEpisodePicker").hidden = false;
      const seasons = (item.seasons || []).filter(season => Number(season.season_number) >= 1);
      $("seasonSelect").innerHTML = seasons.length
        ? seasons.map(season => `<option value="${Number(season.season_number)}">Season ${Number(season.season_number)} · ${Number(season.episode_count || 0)} episodes</option>`).join("")
        : '<option value="">No seasons available</option>';
      if (seasons.length) {
        await loadSeasonEpisodes(Number(seasons[0].season_number));
      } else {
        $("episodeStatus").textContent = "No regular seasons are listed for this series.";
      }
    }
  } catch (error) {
    $("detailTitle").textContent = "Could not load title";
    $("detailOverview").textContent = error.message || "Please try again.";
    $("castGrid").textContent = "Cast details could not be loaded.";
    $("playButton").disabled = true;
  }
}

async function loadSeasonEpisodes(seasonNumber) {
  selectedSeason = Number(seasonNumber);
  currentEpisodes = [];
  $("episodeSelect").disabled = true;
  $("playEpisodeButton").disabled = true;
  $("episodeSelect").innerHTML = '<option value="">Loading episodes…</option>';
  $("episodeStatus").textContent = "Loading episode list…";
  try {
    const season = await tmdb(`/tv/${encodeURIComponent(id)}/season/${selectedSeason}`);
    currentEpisodes = season.episodes || [];
    $("episodeSelect").innerHTML = currentEpisodes.length
      ? currentEpisodes.map(episode => {
          const number = Number(episode.episode_number);
          const name = escapeHtml(episode.name || `Episode ${number}`);
          return `<option value="${number}">E${String(number).padStart(2, "0")} · ${name}</option>`;
        }).join("")
      : '<option value="">No episodes available</option>';
    $("episodeSelect").disabled = !currentEpisodes.length;
    $("playEpisodeButton").disabled = !currentEpisodes.length;
    $("episodeStatus").textContent = currentEpisodes.length
      ? `${currentEpisodes.length} episodes available in Season ${selectedSeason}.`
      : "No episodes were returned for this season.";
  } catch (error) {
    $("episodeSelect").innerHTML = '<option value="">Could not load episodes</option>';
    $("episodeStatus").textContent = error.message || "Could not load this season.";
  }
}

$("seasonSelect").addEventListener("change", event => {
  if (event.target.value) loadSeasonEpisodes(Number(event.target.value));
});

$("playButton").addEventListener("click", () => {
  if (!currentTitle) return;
  if (type === "tv") {
    $("tvEpisodePicker").scrollIntoView({ behavior: "smooth", block: "center" });
    $("seasonSelect").focus();
    return;
  }
  const playerUrl = new URL(`${NEXSTREAM_MOVIE_EMBED}${encodeURIComponent(id)}`);
  playerUrl.searchParams.set("apikey", NEXSTREAM_API_KEY);
  $("playerFrame").src = playerUrl.toString();
  $("playerHeading").textContent = `Now playing · ${currentTitle.title || currentTitle.name || "Movie"}`;
  $("playerSection").hidden = false;
  $("playerSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("playEpisodeButton").addEventListener("click", () => {
  if (type !== "tv" || !currentEpisodes.length || !selectedSeason) return;
  const episodeNumber = Number($("episodeSelect").value);
  if (!episodeNumber) return;
  const episode = currentEpisodes.find(item => Number(item.episode_number) === episodeNumber);
  if (!episode) return;
  const playerUrl = new URL(`${NEXSTREAM_TV_EMBED}${encodeURIComponent(id)}/${selectedSeason}/${episodeNumber}`);
  playerUrl.searchParams.set("apikey", NEXSTREAM_API_KEY);
  $("playerFrame").src = playerUrl.toString();
  $("playerHeading").textContent = `Now playing · S${String(selectedSeason).padStart(2, "0")} E${String(episodeNumber).padStart(2, "0")} — ${episode.name || "Episode"}`;
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
