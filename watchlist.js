const statusEl = document.getElementById("listStatus");
const grid = document.getElementById("savedTitles");

(async () => {
  const { data: { user }, error } = await cvSupabase.auth.getUser();
  if (error || !user) { location.href = "auth.html"; return; }

  const { data, error: loadError } = await cvSupabase.from("watchlist")
    .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (loadError) { statusEl.textContent = "Could not load your Watchlist: " + loadError.message; return; }

  const items = data || [];
  if (!items.length) {
    statusEl.textContent = "Your Watchlist is empty. Open a movie or series and choose Add to Watchlist.";
    return;
  }

  statusEl.textContent = "";
  grid.innerHTML = items.map(item => `
    <article class="movie-card watchlist-card">
      <a href="movie.html?id=${encodeURIComponent(item.tmdb_id)}&type=${encodeURIComponent(item.media_type)}">
        <img class="poster" loading="lazy" src="${escapeText(item.poster_url || "https://placehold.co/500x750/171717/eeeeee?text=CineVerse")}" alt="Poster for ${escapeText(item.title)}">
        <div class="card-gradient"></div><div class="card-info">
          <h3>${escapeText(item.title)}</h3><p>${item.media_type === "tv" ? "TV Series" : "Movie"}</p>
        </div>
      </a>
      <button class="button button-secondary remove-title" data-id="${escapeText(item.id)}" type="button"
        aria-label="Delete ${escapeText(item.title)} from Watchlist" style="width:100%;border-radius:0">Delete</button>
    </article>`).join("");

  grid.querySelectorAll(".remove-title").forEach(button => button.addEventListener("click", async () => {
    if (button.disabled || !window.confirm("Delete this title from your Watchlist?")) return;
    button.disabled = true; button.textContent = "Deleting…";
    const { error: deleteError } = await cvSupabase.from("watchlist").delete()
      .eq("id", button.dataset.id).eq("user_id", user.id);
    if (deleteError) {
      statusEl.textContent = "Could not delete title: " + deleteError.message;
      button.disabled = false; button.textContent = "Delete"; return;
    }
    button.closest(".watchlist-card").remove();
    if (!grid.children.length) statusEl.textContent = "Your Watchlist is empty.";
  }));
})();

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
document.getElementById("signOut").addEventListener("click", async () => {
  await cvSupabase.auth.signOut(); location.href = "index.html";
});
