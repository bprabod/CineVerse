const statusEl = document.getElementById("listStatus");
const grid = document.getElementById("savedTitles");
const posterFallback = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";
const TMDB_PROXY = "https://suckecjeyzlpbpkspmau.supabase.co/functions/v1/tmdb-proxy";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";
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

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function getCurrentUser() {
  const { data: { user }, error } = await cvSupabase.auth.getUser();
  if (error) throw error;
  if (!user) {
    document.getElementById("signOut").hidden = true;
    document.getElementById("signIn").hidden = false;
    statusEl.innerHTML = '<span class="watchlist-signin-title">Sign in required</span><span class="watchlist-signin-copy">Please sign in to view and manage your Watchlist.</span><a class="watchlist-signin-link" href="auth.html">Sign in to CineVerse</a>';
    grid.innerHTML = "";
    return null;
  }
  document.getElementById("signIn").hidden = true;
  document.getElementById("signOut").hidden = false;
  return user;
}

function renderWatchlist(items) {
  if (!items.length) {
    grid.innerHTML = "";
    statusEl.textContent = "Your Watchlist is empty. Open a movie or series and choose Add to Watchlist.";
    return;
  }
  statusEl.textContent = "";
  grid.innerHTML = items.map(item => `
    <article class="movie-card watchlist-card">
      <a class="watchlist-poster-link" href="movie.html?id=${encodeURIComponent(item.tmdb_id)}&type=${encodeURIComponent(item.media_type)}"
        aria-label="View details for ${escapeText(item.title)}">
        <img class="poster" loading="lazy" src="${escapeText(item.poster_url || posterFallback)}" alt="Poster for ${escapeText(item.title)}" onerror="this.src='${posterFallback}'">
        <div class="card-gradient"></div>
        <span class="card-top">${item.media_type === "tv" ? "SERIES" : "TMDB"}</span>
        ${formatReleaseCountdown(item.release_date) ? '<span class="release-countdown-badge" data-release-countdown="' + escapeText(item.release_date) + '"></span>' : ''}
        <div class="card-info"><h3>${escapeText(item.title)}</h3>
          <p>${item.media_type === "tv" ? "TV Series" : "Movie"}</p></div>
      </a>
      <button class="watchlist-remove remove-title" data-id="${escapeText(item.id)}" type="button"
        aria-label="Remove ${escapeText(item.title)} from Watchlist" title="Remove from Watchlist">×</button>
    </article>`).join("");
}

async function loadWatchlist() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const { data, error } = await cvSupabase.from("watchlist")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    const withReleaseDates = await Promise.all((data || []).map(async item => {
      try {
        const query = new URLSearchParams({ path: `/${item.media_type === "tv" ? "tv" : "movie"}/${item.tmdb_id}` });
        const response = await fetch(`${TMDB_PROXY}?${query}`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" } });
        if (!response.ok) return item;
        const detail = await response.json();
        return { ...item, release_date: detail.release_date || detail.first_air_date || "" };
      } catch (_) { return item; }
    }));
    renderWatchlist(withReleaseDates);
    refreshReleaseCountdowns();
  } catch (error) {
    statusEl.textContent = "Could not load your Watchlist: " + (error.message || "Please refresh and try again.");
  }
}

grid.addEventListener("click", async event => {
  const button = event.target.closest("button.remove-title");
  if (!button || button.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  button.disabled = true;
  button.textContent = "Removing…";
  statusEl.textContent = "";

  try {
    const user = await getCurrentUser();
    if (!user) return;
    const entryId = button.dataset.id;
    const { error } = await cvSupabase.from("watchlist").delete()
      .eq("id", entryId).eq("user_id", user.id);
    if (error) throw error;

    // Confirm the row is gone before removing its card from the page.
    const { data: remaining, error: checkError } = await cvSupabase.from("watchlist")
      .select("id").eq("id", entryId).eq("user_id", user.id).limit(1).maybeSingle();
    if (checkError) throw checkError;
    if (remaining) throw new Error("The title is still saved. Please try again.");

    button.closest(".watchlist-card")?.remove();
    if (!grid.querySelector(".watchlist-card")) {
      statusEl.textContent = "Your Watchlist is empty.";
    }
  } catch (error) {
    statusEl.textContent = "Could not remove this title: " + (error.message || "Please refresh and try again.");
    button.disabled = false;
    button.textContent = "Remove";
  }
}, true);

document.getElementById("signOut").addEventListener("click", async () => {
  await cvSupabase.auth.signOut();
  location.href = "index.html";
});

document.getElementById("signIn").hidden = true;
document.getElementById("signOut").hidden = true;
loadWatchlist();
