const adminStatus = document.getElementById("adminStatus");
const adminStats = document.getElementById("adminStats");
const adminSignOut = document.getElementById("adminSignOut");

function adminEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

async function loadAdminDashboard(user) {
  const { data: grant, error: grantError } = await cvSupabase
    .from("cineverse_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (grantError) throw grantError;
  if (!grant) {
    adminStatus.textContent = "Access denied. This page is only available to CineVerse administrators.";
    setTimeout(() => location.replace("account.html"), 1400);
    return;
  }

  adminStatus.textContent = "Administrator access verified.";
  adminStats.hidden = false;

  const [membersResult, reviewsResult, recentResult] = await Promise.all([
    cvSupabase.from("profiles").select("id", { count:"exact", head:true }),
    cvSupabase.from("title_reviews").select("id", { count:"exact", head:true }),
    cvSupabase.from("title_reviews")
      .select("title,reviewer_name,rating,review_text,created_at,media_type")
      .order("created_at", { ascending:false }).limit(8)
  ]);
  if (membersResult.error) throw membersResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (recentResult.error) throw recentResult.error;

  document.getElementById("memberCount").textContent = String(membersResult.count ?? 0);
  document.getElementById("reviewCount").textContent = String(reviewsResult.count ?? 0);

  const list = document.getElementById("adminReviewList");
  const section = document.getElementById("recentReviewsSection");
  section.hidden = false;
  if (!recentResult.data?.length) {
    list.innerHTML = '<p class="admin-status">No community reviews yet.</p>';
    return;
  }
  list.innerHTML = recentResult.data.map(review => {
    const date = new Date(review.created_at);
    const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
    const stars = "★".repeat(Number(review.rating) || 0) + "☆".repeat(5-(Number(review.rating) || 0));
    return '<article class="admin-review"><div class="admin-review-main"><strong class="admin-review-title">' +
      adminEscape(review.title || "Untitled") + '</strong><span class="admin-review-meta">' +
      adminEscape(review.reviewer_name || "CineVerse member") + ' · ' + adminEscape(review.media_type === "tv" ? "SERIES" : "MOVIE") + ' · ' + adminEscape(dateLabel) +
      '</span><p class="admin-review-text">' + adminEscape(review.review_text || "") +
      '</p></div><span class="admin-review-rating" aria-label="' + (Number(review.rating)||0) + ' out of 5 stars">' + stars + '</span></article>';
  }).join("");
}

(async () => {
  try {
    await window.cvAuthReady;
    const { data:{ user }, error } = await cvSupabase.auth.getUser();
    if (error) throw error;
    if (!user) { location.replace("auth.html"); return; }
    await loadAdminDashboard(user);
  } catch (error) {
    console.warn("Admin dashboard access check failed:", error);
    adminStatus.textContent = "We couldn't load the admin dashboard. Please refresh or sign in again.";
  }
})();

adminSignOut.addEventListener("click", async () => {
  adminSignOut.disabled = true;
  const { error } = await cvSupabase.auth.signOut();
  if (error) {
    adminStatus.textContent = error.message;
    adminSignOut.disabled = false;
    return;
  }
  location.replace("auth.html");
});