const statusEl = document.getElementById("listStatus");
const grid = document.getElementById("savedTitles");
const posterFallback = "https://placehold.co/500x750/171717/eeeeee?text=CineVerse";

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function getCurrentUser() {
  const { data: { user }, error } = await cvSupabase.auth.getUser();
  if (error) throw error;
  if (!user) { location.href = "auth.html"; return null; }
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
    <article class="watchlist-card">
      <a class="watchlist-poster-link" href="movie.html?id=${encodeURIComponent(item.tmdb_id)}&type=${encodeURIComponent(item.media_type)}">
        <img class="poster" loading="lazy" src="${escapeText(item.poster_url || posterFallback)}" alt="Poster for ${escapeText(item.title)}" onerror="this.src='${posterFallback}'">
        <div class="card-gradient"></div><div class="card-info">
          <h3>${escapeText(item.title)}</h3><p>${item.media_type === "tv" ? "TV Series" : "Movie"}</p>
        </div>
      </a>
      <button class="button button-secondary remove-title" data-id="${escapeText(item.id)}" type="button"
        aria-label="Remove ${escapeText(item.title)} from Watchlist">Remove</button>
    </article>`).join("");
}

async function loadWatchlist() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const { data, error } = await cvSupabase.from("watchlist")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    renderWatchlist(data || []);
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

loadWatchlist();
