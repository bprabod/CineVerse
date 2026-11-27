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

  currentAdminUser = user;
  document.body.classList.remove("admin-locked");
  adminStatus.textContent = "Administrator access verified.";
  adminStats.hidden = false;
  adminTools.hidden = false;
  await Promise.all([loadMembers(), loadReviews()]);
  document.getElementById("streamingKeyPanel").hidden = false;
  await loadStreamingKeyConfig();
  document.getElementById("adminInboxPanel").hidden = false;
  try {
    await loadSupportInbox();
  } catch (inboxError) {
    console.warn("Could not load Contact Admin inbox:", inboxError);
    document.getElementById("adminInboxList").innerHTML = '<p class="admin-empty">Inbox is temporarily unavailable.</p>';
    document.getElementById("adminInboxStatus").textContent = inboxError.message || "Could not load messages.";
  }
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


/* Private Contact Admin inbox — access is enforced by Supabase RLS. */
let currentAdminUser = null;
let adminSupportThreads = [];
let selectedAdminThread = null;

function adminSupportEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

async function loadSupportInbox() {
  const list = document.getElementById("adminInboxList");
  const { data: threads, error: threadError } = await cvSupabase.from("cineverse_support_threads")
    .select("id,user_id,subject,status,created_at")
    .order("created_at", { ascending:false })
    .limit(150);
  if (threadError) throw threadError;
  adminSupportThreads = threads || [];
  document.getElementById("adminInboxCount").textContent = adminSupportThreads.length + " THREADS";
  if (!adminSupportThreads.length) {
    list.innerHTML = '<p class="admin-empty">No member messages yet.</p>';
    document.getElementById("adminInboxConversation").hidden = true;
    return;
  }

  const userIds = [...new Set(adminSupportThreads.map(thread => thread.user_id))];
  const threadIds = adminSupportThreads.map(thread => thread.id);
  const [profileResult, messageResult] = await Promise.all([
    cvSupabase.from("profiles").select("id,username").in("id", userIds),
    cvSupabase.from("cineverse_support_messages").select("thread_id,body,sender_role,created_at")
      .in("thread_id", threadIds).order("created_at", { ascending:false }).limit(500)
  ]);
  if (profileResult.error) throw profileResult.error;
  if (messageResult.error) throw messageResult.error;
  const names = new Map((profileResult.data || []).map(profile => [profile.id, profile.username]));
  const latest = new Map();
  (messageResult.data || []).forEach(message => {
    if (!latest.has(message.thread_id)) latest.set(message.thread_id, message);
  });

  list.innerHTML = adminSupportThreads.map(thread => {
    const date = new Date(thread.created_at);
    const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined,{day:"numeric",month:"short"});
    const last = latest.get(thread.id);
    return '<button type="button" class="admin-inbox-thread' +
      (selectedAdminThread?.id === thread.id ? ' is-active' : '') +
      '" data-admin-thread="' + adminSupportEscape(thread.id) + '"><strong>' +
      adminSupportEscape(thread.subject) + '</strong><small>' +
      adminSupportEscape(names.get(thread.user_id) || "CineVerse member") + ' · ' +
      adminSupportEscape(dateLabel) + ' · ' + adminSupportEscape(thread.status.toUpperCase()) +
      '</small><p>' + adminSupportEscape(last?.body || "No messages") + '</p></button>';
  }).join("");

  if (!selectedAdminThread || !adminSupportThreads.some(thread => thread.id === selectedAdminThread.id)) {
    await openAdminSupportThread(adminSupportThreads[0].id);
  } else {
    selectedAdminThread = adminSupportThreads.find(thread => thread.id === selectedAdminThread.id);
    await renderAdminSupportThread();
  }
}

async function openAdminSupportThread(threadId) {
  selectedAdminThread = adminSupportThreads.find(thread => thread.id === threadId) || null;
  if (!selectedAdminThread) return;
  document.querySelectorAll("[data-admin-thread]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.adminThread === threadId);
  });
  await renderAdminSupportThread();
}

async function renderAdminSupportThread() {
  if (!selectedAdminThread) return;
  const panel = document.getElementById("adminInboxConversation");
  const messagesEl = document.getElementById("adminInboxMessages");
  panel.hidden = false;
  const { data, error } = await cvSupabase.from("cineverse_support_messages")
    .select("id,sender_role,body,created_at")
    .eq("thread_id", selectedAdminThread.id)
    .order("created_at", { ascending:true });
  if (error) throw error;
  messagesEl.innerHTML = '<h3 style="margin:0 0 12px;font-size:14px">' +
    adminSupportEscape(selectedAdminThread.subject) + '</h3>' +
    (data || []).map(message => {
      const date = new Date(message.created_at);
      const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
      const isAdmin = message.sender_role === "admin";
      return '<div class="admin-inbox-message' + (isAdmin ? ' is-admin' : '') + '">' +
        adminSupportEscape(message.body) + '<small>' + (isAdmin ? "You · Admin" : "Member") +
        ' · ' + adminSupportEscape(dateLabel) + '</small></div>';
    }).join("");
  const closed = selectedAdminThread.status === "closed";
  document.getElementById("adminInboxThreadStatus").textContent = closed ? "CLOSED" : "OPEN";
  document.getElementById("adminToggleThreadStatus").textContent = closed ? "Reopen conversation" : "Close conversation";
  document.getElementById("adminInboxReplyForm").hidden = closed;
}

document.getElementById("adminInboxList")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-admin-thread]");
  if (!button) return;
  try { await openAdminSupportThread(button.dataset.adminThread); }
  catch (error) { document.getElementById("adminInboxStatus").textContent = error.message || "Could not open this conversation."; }
});

document.getElementById("adminInboxReplyForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentAdminUser || !selectedAdminThread || selectedAdminThread.status !== "open") return;
  const input = document.getElementById("adminInboxReplyText");
  const button = document.getElementById("adminInboxReplyButton");
  const body = input.value.trim();
  if (!body) return;
  button.disabled = true;
  try {
    const { error } = await cvSupabase.from("cineverse_support_messages").insert({
      thread_id:selectedAdminThread.id,
      sender_id:currentAdminUser.id,
      sender_role:"admin",
      body
    });
    if (error) throw error;
    input.value = "";
    document.getElementById("adminInboxStatus").textContent = "Reply sent.";
    const threadId = selectedAdminThread.id;
    await loadSupportInbox();
    await openAdminSupportThread(threadId);
  } catch (error) {
    document.getElementById("adminInboxStatus").textContent = error.message || "Could not send reply.";
  } finally { button.disabled = false; }
});

document.getElementById("adminToggleThreadStatus")?.addEventListener("click", async () => {
  if (!selectedAdminThread) return;
  const nextStatus = selectedAdminThread.status === "closed" ? "open" : "closed";
  const button = document.getElementById("adminToggleThreadStatus");
  button.disabled = true;
  try {
    const { error } = await cvSupabase.from("cineverse_support_threads")
      .update({ status:nextStatus }).eq("id", selectedAdminThread.id);
    if (error) throw error;
    document.getElementById("adminInboxStatus").textContent = "Conversation " + nextStatus + ".";
    const threadId = selectedAdminThread.id;
    await loadSupportInbox();
    await openAdminSupportThread(threadId);
  } catch (error) {
    document.getElementById("adminInboxStatus").textContent = error.message || "Could not update conversation.";
  } finally { button.disabled = false; }
});


/* Admin-only UI for the current Nexstream key and its 30-day validity window. */
let currentStreamingConfig = null;
let streamingCountdownTimer = null;

function toLocalDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatStreamingDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString(undefined, { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function refreshStreamingKeyCountdown() {
  const countdown = document.getElementById("streamingKeyCountdown");
  const dates = document.getElementById("streamingKeyDates");
  const state = document.getElementById("streamingKeyState");
  if (!countdown || !dates || !state) return;
  const activatedAt = currentStreamingConfig?.activated_at;
  if (!activatedAt) {
    countdown.textContent = "Set activation date";
    countdown.className = "";
    dates.textContent = "Key is saved, but the 30-day countdown has not started.";
    state.textContent = currentStreamingConfig?.api_key ? "KEY CONFIGURED" : "NO KEY";
    return;
  }
  const start = new Date(activatedAt);
  const expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const remaining = expiry.getTime() - Date.now();
  dates.textContent = "Activated: " + formatStreamingDate(start) + " · Expires: " + formatStreamingDate(expiry);
  if (remaining <= 0) {
    countdown.textContent = "EXPIRED";
    countdown.className = "is-expired";
    state.textContent = "RENEWAL REQUIRED";
    return;
  }
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  countdown.textContent = days + "d " + String(hours).padStart(2,"0") + "h " +
    String(minutes).padStart(2,"0") + "m " + String(seconds).padStart(2,"0") + "s";
  countdown.className = remaining <= 3 * 86400000 ? "is-warning" : "";
  state.textContent = remaining <= 3 * 86400000 ? "EXPIRY SOON" : "ACTIVE";
}

async function loadStreamingKeyConfig() {
  const status = document.getElementById("streamingKeyStatus");
  const { data, error } = await cvSupabase.from("cineverse_streaming_config")
    .select("id,api_key,activated_at,updated_at").eq("id", 1).maybeSingle();
  if (error) throw error;
  currentStreamingConfig = data || null;
  document.getElementById("streamingApiKey").value = "";
  document.getElementById("streamingActivatedAt").value = data?.activated_at
    ? toLocalDateTimeValue(new Date(data.activated_at))
    : toLocalDateTimeValue(new Date());
  status.textContent = data?.api_key ? "A streaming key is configured. The key itself stays masked." : "No streaming key has been saved yet.";
  refreshStreamingKeyCountdown();
  if (streamingCountdownTimer) clearInterval(streamingCountdownTimer);
  streamingCountdownTimer = setInterval(refreshStreamingKeyCountdown, 1000);
}

document.getElementById("saveStreamingKey")?.addEventListener("click", async () => {
  const keyInput = document.getElementById("streamingApiKey");
  const dateInput = document.getElementById("streamingActivatedAt");
  const button = document.getElementById("saveStreamingKey");
  const status = document.getElementById("streamingKeyStatus");
  const apiKey = keyInput.value.trim() || currentStreamingConfig?.api_key;
  const activationDate = dateInput.value ? new Date(dateInput.value) : null;
  if (!apiKey) { status.textContent = "Please enter the API key."; keyInput.focus(); return; }
  if (!activationDate || Number.isNaN(activationDate.getTime())) {
    status.textContent = "Please choose the activation date and time."; dateInput.focus(); return;
  }
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const payload = { id:1, api_key:apiKey, activated_at:activationDate.toISOString(), updated_at:new Date().toISOString() };
    const { error } = await cvSupabase.from("cineverse_streaming_config").upsert(payload, { onConflict:"id" });
    if (error) throw error;
    currentStreamingConfig = payload;
    keyInput.value = "";
    status.textContent = "Saved successfully. The 30-day countdown has started.";
    refreshStreamingKeyCountdown();
  } catch (error) {
    status.textContent = error.message || "Could not save the streaming key.";
  } finally {
    button.disabled = false;
    button.textContent = "Save API Key";
  }
});
