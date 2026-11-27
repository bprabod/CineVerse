const adminStatus = document.getElementById("adminStatus");
const adminStats = document.getElementById("adminStats");
const adminTools = document.getElementById("adminTools");
const adminSignOut = document.getElementById("adminSignOut");
const memberList = document.getElementById("adminMemberList");
const reviewList = document.getElementById("adminReviewList");
const memberSearch = document.getElementById("memberSearch");
let memberRows = [];

function adminEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

function renderMembers(filter = "") {
  const term = filter.trim().toLowerCase();
  const rows = memberRows.filter(member => String(member.username || "").toLowerCase().includes(term));
  document.getElementById("memberDirectoryCount").textContent = rows.length + " SHOWN";
  if (!rows.length) {
    memberList.innerHTML = '<p class="admin-empty">No matching members found.</p>';
    return;
  }
  memberList.innerHTML = rows.map(member =>
    '<article class="admin-member"><span class="admin-member-name">' + adminEscape(member.username || "Unnamed member") +
    '</span><span class="admin-member-tag">MEMBER</span></article>'
  ).join("");
}

async function loadMembers() {
  const { data, error, count } = await cvSupabase.from("profiles")
    .select("id,username", { count:"exact" })
    .order("username", { ascending:true })
    .limit(1000);
  if (error) throw error;
  memberRows = data || [];
  document.getElementById("memberCount").textContent = String(count ?? memberRows.length);
  renderMembers(memberSearch.value);
}

async function loadReviews() {
  const { data, error, count } = await cvSupabase.from("title_reviews")
    .select("id,title,reviewer_name,rating,review_text,created_at,media_type", { count:"exact" })
    .order("created_at", { ascending:false })
    .limit(30);
  if (error) throw error;
  document.getElementById("reviewCount").textContent = String(count ?? 0);
  if (!data?.length) {
    reviewList.innerHTML = '<p class="admin-empty">No community reviews yet.</p>';
    return;
  }
  reviewList.innerHTML = data.map(review => {
    const date = new Date(review.created_at);
    const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
    const stars = "★".repeat(Number(review.rating) || 0) + "☆".repeat(5-(Number(review.rating) || 0));
    return '<article class="admin-review"><div class="admin-review-main"><strong class="admin-review-title">' +
      adminEscape(review.title || "Untitled") + '</strong><span class="admin-review-meta">' +
      adminEscape(review.reviewer_name || "CineVerse member") + ' · ' + adminEscape(review.media_type === "tv" ? "SERIES" : "MOVIE") + ' · ' + adminEscape(dateLabel) +
      '</span><p class="admin-review-text">' + adminEscape(review.review_text || "") +
      '</p><span class="admin-review-rating" aria-label="' + (Number(review.rating)||0) + ' out of 5 stars">' + stars +
      '</span></div><div class="admin-review-actions"><button class="admin-delete-review" type="button" data-review-id="' +
      Number(review.id) + '">Delete</button></div></article>';
  }).join("");
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
  adminTools.hidden = false;
  await Promise.all([loadMembers(), loadReviews()]);
}

memberSearch.addEventListener("input", () => renderMembers(memberSearch.value));

reviewList.addEventListener("click", async event => {
  const button = event.target.closest("[data-review-id]");
  if (!button) return;
  const reviewId = Number(button.dataset.reviewId);
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0) return;
  if (!confirm("Permanently delete this community review? This cannot be undone.")) return;
  button.disabled = true;
  button.textContent = "Deleting…";
  const { error } = await cvSupabase.from("title_reviews").delete().eq("id", reviewId);
  if (error) {
    adminStatus.textContent = "Could not delete this review: " + error.message;
    button.disabled = false;
    button.textContent = "Delete";
    return;
  }
  adminStatus.textContent = "Review deleted.";
  await loadReviews();
});

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
