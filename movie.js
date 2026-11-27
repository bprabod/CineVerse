const SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
const TMDB_PROXY = `${SUPABASE_URL}/functions/v1/tmdb-proxy`;
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const NEXSTREAM_MOVIE_EMBED = "https://api.codespecters.com/embed/movie/";
const NEXSTREAM_TV_EMBED = "https://api.codespecters.com/embed/tv/";
const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";
let currentTitle = null;
let currentEpisodes = [];
let selectedSeason = null;
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
const posterFallback = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";
const profileFallback = "https://placehold.co/300x450/202020/eeeeee?text=No+Photo";

function goBack() {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back();
  else location.href = "index.html";
}
const backButton = $("backButton");
if (backButton) backButton.addEventListener("click", goBack);


let cachedNexstreamApiKey = null;
let nexstreamApiKeyRequest = null;

async function getNexstreamApiKey() {
  if (cachedNexstreamApiKey) return cachedNexstreamApiKey;
  if (!nexstreamApiKeyRequest) {
    nexstreamApiKeyRequest = (async () => {
      const endpoint = new URL(`${SUPABASE_URL}/rest/v1/cineverse_streaming_config`);
      endpoint.searchParams.set("id", "eq.1");
      endpoint.searchParams.set("select", "api_key");
      const response = await fetch(endpoint.toString(), {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" }
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok || !Array.isArray(rows) || !rows[0]?.api_key) {
        throw new Error("Streaming is temporarily unavailable. Please contact the CineVerse administrator.");
      }
      cachedNexstreamApiKey = rows[0].api_key;
      return cachedNexstreamApiKey;
    })().catch(error => {
      nexstreamApiKeyRequest = null;
      throw error;
    });
  }
  return nexstreamApiKeyRequest;
}

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


async function recordRecentWatch(item, mediaType, titleText) {
  try {
    if (window.cvAuthReady) await window.cvAuthReady;
    const { data: { user }, error: authError } = await cvSupabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Please sign in before saving viewing history.");
    const tmdbId = Number(item?.id || id);
    if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) throw new Error("Invalid TMDB title ID.");
    const poster = item.poster_path ? `${IMAGE_BASE}w342${item.poster_path}` : posterFallback;
    const { error } = await cvSupabase.from("watch_history").upsert({
      user_id: user.id,
      tmdb_id: tmdbId,
      media_type: mediaType || type,
      title: titleText || item.title || item.name || "Untitled",
      poster_url: poster,
      last_watched_at: new Date().toISOString()
    }, { onConflict: "user_id,tmdb_id,media_type" });
    if (error) throw error;
    $("detailStatus").textContent = "Saved to Recently Watched.";
    return true;
  } catch (error) {
    console.error("Could not save recent watch:", error);
    $("detailStatus").textContent = "Recently Watched save failed: " + (error.message || "Please sign in and try again.");
    return false;
  }
}

let detailWatchlistEntryId = null;
async function syncDetailWatchlistButton() {
  const button = $("listButton");
  button.disabled = true; button.textContent = "Checking…";
  try {
    const { data: { user }, error: authError } = await cvSupabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      detailWatchlistEntryId = null;
      button.disabled = false; button.textContent = "＋ Add to Watchlist";
      return;
    }
    const { data, error } = await cvSupabase.from("watchlist").select("id")
      .eq("user_id", user.id).eq("tmdb_id", Number(id)).eq("media_type", type).limit(1).maybeSingle();
    if (error) throw error;
    detailWatchlistEntryId = data?.id || null;
    button.disabled = false;
    button.textContent = data ? "✓ In Watchlist · Remove" : "＋ Add to Watchlist";
    button.classList.toggle("watchlist-saved", Boolean(data));
  } catch (error) {
    console.warn("Could not check Watchlist status:", error);
    button.disabled = false; button.textContent = "＋ Add to Watchlist";
  }
}


let reviewUser = null;
let reviewRows = [];
let selectedReviewRating = 5;
let editingReviewId = null;

function setReviewRating(value) {
  selectedReviewRating = Math.max(1, Math.min(5, Number(value) || 5));
  document.querySelectorAll("#reviewRatingPicker [data-rating]").forEach(button => {
    const active = Number(button.dataset.rating) <= selectedReviewRating;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(Number(button.dataset.rating) === selectedReviewRating));
  });
}

function renderReviewRows() {
  const list = $("reviewsList");
  if (!list) return;
  if (!reviewRows.length) {
    list.innerHTML = '<p class="reviews-empty">No reviews yet. Be the first CineVerse member to share your thoughts.</p>';
    return;
  }
  list.innerHTML = reviewRows.map(review => {
    const date = new Date(review.updated_at || review.created_at);
    const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, {day:"numeric",month:"short",year:"numeric"});
    const isMine = reviewUser && review.user_id === reviewUser.id;
    const stars = "★".repeat(Number(review.rating)) + "☆".repeat(5 - Number(review.rating));
    return `<article class="review-item">
      <div class="review-item-top">
        <div><strong class="review-author">${escapeHtml(review.reviewer_name || "CineVerse member")}</strong>${isMine ? '<span class="review-you">YOU</span>' : ''}<span class="review-date">${escapeHtml(dateLabel)}</span></div>
        <span class="review-stars" aria-label="${Number(review.rating)} out of 5 stars">${stars}</span>
      </div>
      <p class="review-body">${escapeHtml(review.review_text)}</p>
      ${isMine ? `<div class="review-actions"><button type="button" data-review-action="edit" data-review-id="${review.id}">Edit</button><button type="button" data-review-action="delete" data-review-id="${review.id}">Delete</button></div>` : ''}
    </article>`;
  }).join("");
}

function resetReviewForm() {
  editingReviewId = null;
  $("reviewForm").reset();
  $("reviewFormHeading").textContent = "Write your review";
  $("submitReview").textContent = "Post review";
  $("cancelReviewEdit").hidden = true;
  $("reviewStatus").textContent = "";
  $("reviewCharCount").textContent = "0 / 1000";
  setReviewRating(5);
}


const blockedReviewLanguage = /\\b(?:sex|sexual|porn|porno|pornography|xxx|nude|nudes|nudity|erotic|masturbat\\w*|orgasm\\w*|penis|vagina|vulva|clitoris|testicles?|boobs?|tits?|cock|dick|pussy|cum|semen|blowjob|handjob|anal|hentai|onlyfans)\\b/i;

async function loadReviews() {
  try {
    if (window.cvAuthReady) await window.cvAuthReady;
    const [{ data: { user }, error: authError }, { data, error }] = await Promise.all([
      cvSupabase.auth.getUser(),
      cvSupabase.from("title_reviews").select("id,user_id,reviewer_name,rating,review_text,created_at,updated_at")
        .eq("tmdb_id", Number(id)).eq("media_type", type)
        .order("created_at", {ascending:false}).limit(50)
    ]);
    if (authError) throw authError;
    if (error) throw error;
    reviewUser = user || null;
    reviewRows = data || [];
    const count = reviewRows.length;
    const average = count ? reviewRows.reduce((sum, item) => sum + Number(item.rating), 0) / count : 0;
    $("reviewsAverage").innerHTML = count ? `${average.toFixed(1)} <span>/ 5</span>` : '— <span>/ 5</span>';
    $("reviewsSummary").textContent = count ? `${count} member review${count === 1 ? "" : "s"}` : "No member reviews yet";
    $("reviewGuestPrompt").hidden = Boolean(user);
    $("reviewForm").hidden = !user;
    const ownReview = user && reviewRows.find(item => item.user_id === user.id);
    if (ownReview) {
      editingReviewId = ownReview.id;
      $("reviewFormHeading").textContent = "Your review";
      $("submitReview").textContent = "Edit your review";
      $("reviewText").value = ownReview.review_text;
      $("reviewCharCount").textContent = `${ownReview.review_text.length} / 1000`;
      setReviewRating(ownReview.rating);
    } else {
      resetReviewForm();
    }
    renderReviewRows();
  } catch (error) {
    console.error("Could not load member reviews:", error);
    $("reviewsSummary").textContent = "Member reviews are temporarily unavailable.";
    $("reviewsList").innerHTML = '<p class="reviews-empty">Could not load reviews. Please refresh and try again.</p>';
  }
}

$("toggleReviews").addEventListener("click", () => {
  const panel = $("reviewsPanel");
  const opening = panel.hidden;
  panel.hidden = !opening;
  $("toggleReviews").setAttribute("aria-expanded", String(opening));
  $("toggleReviews").classList.toggle("is-open", opening);
  if (opening) panel.scrollIntoView({behavior:"smooth",block:"nearest"});
});

$("writeReviewButton").addEventListener("click", () => {
  const compose = $("reviewCompose");
  compose.hidden = false;
  if (!reviewUser) {
    $("reviewGuestPrompt").hidden = false;
    $("reviewGuestPrompt").scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  const form = $("reviewForm");
  form.hidden = false;
  form.scrollIntoView({behavior:"smooth",block:"center"});
  $("reviewText").focus();
});

$("reviewRatingPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-rating]");
  if (button) setReviewRating(button.dataset.rating);
});

$("reviewText").addEventListener("input", () => {
  $("reviewCharCount").textContent = `${$("reviewText").value.length} / 1000`;
});

$("cancelReviewEdit").addEventListener("click", () => {
  resetReviewForm();
  $("reviewCompose").hidden = true;
});

$("reviewForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!reviewUser) { $("reviewStatus").textContent = "Please sign in to post a review."; return; }
  const reviewText = $("reviewText").value.trim();
  if (reviewText.length < 5 || reviewText.length > 1000) {
    $("reviewStatus").textContent = "Your review must be between 5 and 1000 characters.";
    return;
  }
  if (blockedReviewLanguage.test(reviewText)) {
    $("reviewStatus").textContent = "Please keep reviews family-friendly. Explicit or sexual language is not allowed.";
    return;
  }
  const title = currentTitle?.title || currentTitle?.name || "Untitled";
  const metadataName = reviewUser.user_metadata?.username || reviewUser.user_metadata?.display_name;
  const reviewerName = String(metadataName || "CineVerse member").trim().slice(0,40);
  const payload = {
    user_id: reviewUser.id, tmdb_id: Number(id), media_type: type,
    title, reviewer_name: reviewerName, rating: selectedReviewRating,
    review_text: reviewText, updated_at: new Date().toISOString()
  };
  const button = $("submitReview");
  button.disabled = true;
  $("reviewStatus").textContent = editingReviewId ? "Updating your review…" : "Posting your review…";
  try {
    let result;
    if (editingReviewId) {
      result = await cvSupabase.from("title_reviews").update({
        rating: payload.rating, review_text: payload.review_text,
        title: payload.title, reviewer_name: payload.reviewer_name,
        updated_at: payload.updated_at
      }).eq("id", editingReviewId).eq("user_id", reviewUser.id);
    } else {
      result = await cvSupabase.from("title_reviews").insert(payload);
    }
    if (result.error) throw result.error;
    $("reviewStatus").textContent = "Your review has been saved.";
    await loadReviews();
  } catch (error) {
    console.error("Could not save member review:", error);
    $("reviewStatus").textContent = error.code === "23505"
      ? "You already reviewed this title. Edit your existing review instead."
      : (error.message || "Could not save your review. Please try again.");
  } finally {
    button.disabled = false;
  }
});

$("reviewsList").addEventListener("click", async event => {
  const button = event.target.closest("[data-review-action]");
  if (!button || !reviewUser) return;
  const review = reviewRows.find(item => String(item.id) === button.dataset.reviewId && item.user_id === reviewUser.id);
  if (!review) return;
  if (button.dataset.reviewAction === "edit") {
    if ($("reviewsPanel").hidden) $("toggleReviews").click();
    $("reviewCompose").hidden = false;
    editingReviewId = review.id;
    $("reviewFormHeading").textContent = "Edit your review";
    $("submitReview").textContent = "Save changes";
    $("cancelReviewEdit").hidden = false;
    $("reviewText").value = review.review_text;
    $("reviewCharCount").textContent = `${review.review_text.length} / 1000`;
    $("reviewStatus").textContent = "";
    setReviewRating(review.rating);
    $("reviewForm").scrollIntoView({behavior:"smooth",block:"center"});
    $("reviewText").focus();
    return;
  }
  if (button.dataset.reviewAction === "delete") {
    if (!confirm("Delete your review for this title?")) return;
    button.disabled = true;
    const { error } = await cvSupabase.from("title_reviews").delete()
      .eq("id", review.id).eq("user_id", reviewUser.id);
    if (error) {
      $("reviewStatus").textContent = error.message || "Could not delete your review.";
      button.disabled = false;
      return;
    }
    resetReviewForm();
    await loadReviews();
  }
});

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
    await syncDetailWatchlistButton();
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    $("detailType").textContent = type === "tv" ? "TV SERIES" : "MOVIE";
    $("detailTitle").textContent = title;
    $("detailOverview").textContent = item.overview || "No synopsis is available yet.";
    $("detailPoster").src = item.poster_path ? `${IMAGE_BASE}w780${item.poster_path}` : posterFallback;
    $("detailPoster").alt = `Poster for ${title}`;
    $("detailPoster").onerror = () => { $("detailPoster").src = posterFallback; };
    $("detailMeta").innerHTML = `<span class="match">★ ${Number(item.vote_average || 0).toFixed(1)}</span><span>${year || "—"}</span><span class="rating">${type === "tv" ? "TV" : "TMDB"}</span><span>${Number(item.vote_count || 0).toLocaleString()} votes</span>`;
    const releaseDate = item.release_date || item.first_air_date || "";
    const countdown = $("releaseCountdown");
    if (countdown && formatReleaseCountdown(releaseDate)) { countdown.dataset.releaseCountdown = releaseDate; countdown.hidden = false; refreshReleaseCountdowns(); }
    document.title = `${title} — CineVerse`;
    renderExtraDetails(item);
    renderCredits(item);
    await loadReviews();
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

$("playButton").addEventListener("click", async () => {
  if (!currentTitle) return;
  if (type === "tv") {
    $("tvEpisodePicker").scrollIntoView({ behavior: "smooth", block: "center" });
    $("seasonSelect").focus();
    return;
  }
  let apiKey;
  try { apiKey = await getNexstreamApiKey(); }
  catch (error) { $("detailStatus").textContent = error.message; return; }
  const playerUrl = new URL(`${NEXSTREAM_MOVIE_EMBED}${encodeURIComponent(id)}`);
  playerUrl.searchParams.set("apikey", apiKey);
  $("playerFrame").src = playerUrl.toString();
  await recordRecentWatch(currentTitle, type);
  $("playerHeading").textContent = `Now playing · ${currentTitle.title || currentTitle.name || "Movie"}`;
  $("playerSection").hidden = false;
  $("playerSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("playEpisodeButton").addEventListener("click", async () => {
  if (type !== "tv" || !currentEpisodes.length || !selectedSeason) return;
  const episodeNumber = Number($("episodeSelect").value);
  if (!episodeNumber) return;
  const episode = currentEpisodes.find(item => Number(item.episode_number) === episodeNumber);
  if (!episode) return;
  let apiKey;
  try { apiKey = await getNexstreamApiKey(); }
  catch (error) { $("detailStatus").textContent = error.message; return; }
  const playerUrl = new URL(`${NEXSTREAM_TV_EMBED}${encodeURIComponent(id)}/${selectedSeason}/${episodeNumber}`);
  playerUrl.searchParams.set("apikey", apiKey);
  $("playerFrame").src = playerUrl.toString();
  await recordRecentWatch(currentTitle, type, `${currentTitle.name || currentTitle.title || "Series"} · S${selectedSeason} E${episodeNumber}`);
  $("playerHeading").textContent = `Now playing · S${String(selectedSeason).padStart(2, "0")} E${String(episodeNumber).padStart(2, "0")} — ${episode.name || "Episode"}`;
  $("playerSection").hidden = false;
  $("playerSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("fullscreenButton").addEventListener("click", async () => {
  const player = $("playerFrameWrap");
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (player.requestFullscreen) {
      await player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    } else {
      $("detailStatus").textContent = "Fullscreen is not supported by this browser.";
    }
  } catch (error) {
    $("detailStatus").textContent = "Could not enter fullscreen. Try the player's own fullscreen control.";
  }
});

$("stopButton").addEventListener("click", () => {
  $("playerFrame").src = "about:blank";
  $("playerSection").hidden = true;
});

$("listButton").addEventListener("click", async () => {
  const button = $("listButton");
  if (!currentTitle || button.disabled) return;
  button.disabled = true;
  const { data: { user }, error: authError } = await cvSupabase.auth.getUser();
  if (authError || !user) { location.href = "auth.html"; return; }

  if (detailWatchlistEntryId) {
    button.textContent = "Removing…";
    const entryId = detailWatchlistEntryId;
    const { error } = await cvSupabase.from("watchlist").delete()
      .eq("id", entryId).eq("user_id", user.id);
    const { data: remaining, error: checkError } = await cvSupabase.from("watchlist")
      .select("id").eq("id", entryId).eq("user_id", user.id).limit(1).maybeSingle();
    if (error || checkError || remaining) {
      const reason = error || checkError;
      $("detailStatus").textContent = "Could not remove this title from your Watchlist." + (reason ? " " + reason.message : " Please refresh and try again.");
      button.disabled = false; button.textContent = "✓ In Watchlist · Remove";
      return;
    }
    detailWatchlistEntryId = null;
    $("detailStatus").textContent = (currentTitle.title || currentTitle.name || "Title") + " removed from your Watchlist.";
    button.disabled = false; button.textContent = "＋ Add to Watchlist";
    button.classList.remove("watchlist-saved");
    return;
  }

  button.textContent = "Saving…";
  const title = currentTitle.title || currentTitle.name || "Untitled";
  const poster = currentTitle.poster_path ? `${IMAGE_BASE}w500${currentTitle.poster_path}` : posterFallback;
  const { error } = await cvSupabase.from("watchlist").insert({
    user_id: user.id, tmdb_id: Number(id), media_type: type, title, poster_url: poster
  });
  if (error && error.code !== "23505") {
    $("detailStatus").textContent = "Could not save title: " + error.message;
    button.disabled = false; button.textContent = "＋ Add to Watchlist"; return;
  }
  await syncDetailWatchlistButton();
  $("detailStatus").textContent = error ? "This title is already in your Watchlist." : title + " added to your Watchlist.";
});

window.addEventListener("pagehide", () => { $("playerFrame").src = "about:blank"; });
loadTitle();
