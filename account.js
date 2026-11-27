const usernameEl = document.getElementById("accountUsername");
const emailEl = document.getElementById("accountEmail");
const statusEl = document.getElementById("accountStatus");
const recentHistoryList = document.getElementById("recentHistoryList");
const signOutButton = document.getElementById("signOut");
const deleteDialog = document.getElementById("deleteAccountDialog");
const openDeleteButton = document.getElementById("openDeleteAccount");
const cancelDeleteButton = document.getElementById("cancelDeleteAccount");
const deleteForm = document.getElementById("deleteAccountForm");
const deletePasswordInput = document.getElementById("deleteAccountPassword");
const deleteConfirmInput = document.getElementById("deleteAccountConfirm");
const deleteStatus = document.getElementById("deleteAccountStatus");
const deleteSubmitButton = document.getElementById("confirmDeleteAccount");
let currentAccountUser = null;


async function loadRecentHistory(userId) {
  if (!recentHistoryList) return;
  try {
    const { data, error } = await cvSupabase.from("watch_history")
      .select("tmdb_id, media_type, title, poster_url, last_watched_at")
      .eq("user_id", userId)
      .order("last_watched_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    if (!data?.length) {
      recentHistoryList.innerHTML = '<p class="recent-history-empty">Your viewing history will appear here when you start watching something.</p>';
      return;
    }
    recentHistoryList.innerHTML = data.map((item, index) => {
      const date = new Date(item.last_watched_at);
      const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
      const kind = item.media_type === "tv" ? "SERIES" : "MOVIE";
      const poster = item.poster_url || "https://placehold.co/100x150/171717/eeeeee?text=CV";
      return `<a class="recent-history-row" href="movie.html?id=${encodeURIComponent(item.tmdb_id)}&type=${encodeURIComponent(item.media_type)}">
        <span class="recent-history-index">${String(index + 1).padStart(2, "0")}</span>
        <img src="${escapeHistoryHtml(poster)}" alt="" loading="lazy" onerror="this.src='https://placehold.co/100x150/171717/eeeeee?text=CV'">
        <span class="recent-history-info"><strong>${escapeHistoryHtml(item.title)}</strong><small>${kind} <span>·</span> ${escapeHistoryHtml(dateLabel)}</small></span>
        <span class="recent-history-open" aria-hidden="true">↗</span>
      </a>`;
    }).join("");
  } catch (error) {
    console.warn("Could not load recent watch history:", error);
    recentHistoryList.innerHTML = '<p class="recent-history-empty">Could not load your viewing history right now.</p>';
  }
}

function escapeHistoryHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

(async () => {
  try {
    await window.cvAuthReady;
    const { data: { session }, error: sessionError } = await cvSupabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      location.replace("auth.html");
      return;
    }
    const { data: { user }, error: userError } = await cvSupabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      location.replace("auth.html");
      return;
    }
    currentAccountUser = user;
    const username = user.user_metadata?.username || user.user_metadata?.display_name;
    usernameEl.textContent = username || "CineVerse member";
    emailEl.textContent = user.email || "Email unavailable";
    statusEl.textContent = "Your account is active.";
    await loadRecentHistory(user.id);
  } catch (error) {
    console.warn("CineVerse account session check failed:", error);
    statusEl.textContent = "We couldn't verify your session. Please refresh the page or sign in again.";
  }
})();

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  const { error } = await cvSupabase.auth.signOut();
  if (error) {
    statusEl.textContent = error.message;
    signOutButton.disabled = false;
    return;
  }
  location.href = "auth.html";
});

openDeleteButton.addEventListener("click", () => {
  deleteStatus.textContent = "";
  deletePasswordInput.value = "";
  deleteConfirmInput.value = "";
  deleteDialog.showModal();
  deletePasswordInput.focus();
});

cancelDeleteButton.addEventListener("click", () => {
  deleteDialog.close();
  deletePasswordInput.value = "";
  deleteConfirmInput.value = "";
});

deleteForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentAccountUser?.email) {
    deleteStatus.textContent = "Please sign in again before deleting your account.";
    return;
  }
  if (deleteConfirmInput.value.trim() !== "DELETE") {
    deleteStatus.textContent = "Type DELETE exactly to confirm.";
    deleteConfirmInput.focus();
    return;
  }

  deleteSubmitButton.disabled = true;
  cancelDeleteButton.disabled = true;
  deleteStatus.textContent = "Verifying your password…";
  try {
    const { error: reauthError } = await cvSupabase.auth.signInWithPassword({
      email: currentAccountUser.email,
      password: deletePasswordInput.value
    });
    if (reauthError) throw new Error("That password wasn't correct. Please try again.");

    deleteStatus.textContent = "Deleting your account…";
    const { error: deleteError } = await cvSupabase.functions.invoke("delete-account", {
      method: "POST"
    });
    if (deleteError) throw deleteError;

    deleteStatus.textContent = "Your account has been deleted.";
    await cvSupabase.auth.signOut({ scope: "local" });
    location.replace("index.html");
  } catch (error) {
    console.warn("CineVerse account deletion failed:", error);
    deleteStatus.textContent = error.message || "We couldn't delete your account. Please try again.";
    deleteSubmitButton.disabled = false;
    cancelDeleteButton.disabled = false;
    deletePasswordInput.value = "";
    deletePasswordInput.focus();
  }
});
