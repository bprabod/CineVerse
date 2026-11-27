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


async function loadProfileReviews(userId) {
  const list = document.getElementById("profileReviewsList");
  const count = document.getElementById("profileReviewsCount");
  if (!list || !count) return;
  try {
    const { data, error } = await cvSupabase.from("title_reviews")
      .select("id,tmdb_id,media_type,title,rating,review_text,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    count.textContent = String(data?.length || 0);
    if (!data?.length) {
      list.innerHTML = '<p class="profile-reviews-empty">Your reviews will appear here after you review a movie or series.</p>';
      return;
    }
    list.innerHTML = data.map(review => {
      const date = new Date(review.updated_at || review.created_at);
      const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, {day:"numeric",month:"short",year:"numeric"});
      const kind = review.media_type === "tv" ? "SERIES" : "MOVIE";
      const href = "movie.html?id=" + encodeURIComponent(review.tmdb_id) + "&type=" + encodeURIComponent(review.media_type);
      const title = escapeHistoryHtml(review.title || "Untitled");
      const body = escapeHistoryHtml(review.review_text || "");
      const stars = "★".repeat(Number(review.rating)) + "☆".repeat(5 - Number(review.rating));
      return `<article class="profile-review-row">
        <div class="profile-review-main">
          <a class="profile-review-title" href="${href}">${title}</a>
          <span class="profile-review-meta">${kind} · ${escapeHistoryHtml(dateLabel)}</span>
          <p class="profile-review-text">${body}</p>
        </div>
        <div class="profile-review-side">
          <span class="profile-review-stars" aria-label="${Number(review.rating)} out of 5 stars">${stars}</span>
          <a class="profile-review-open" href="${href}" aria-label="Open ${title}">↗</a>
        </div>
      </article>`;
    }).join("");
  } catch (error) {
    console.warn("Could not load profile reviews:", error);
    count.textContent = "—";
    list.innerHTML = '<p class="profile-reviews-empty">Could not load your reviews right now.</p>';
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
    let isAdmin = false;
    let adminCheckSucceeded = false;
    try {
      const { data: adminGrant, error: adminGrantError } = await cvSupabase
        .from("cineverse_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (adminGrantError) throw adminGrantError;
      adminCheckSucceeded = true;
      isAdmin = !!adminGrant;
      if (isAdmin) {
        const headerActions = document.querySelector(".account-page .header-actions");
        if (headerActions && !document.getElementById("adminPanelLink")) {
          const adminLink = document.createElement("a");
          adminLink.id = "adminPanelLink";
          adminLink.className = "button button-secondary";
          adminLink.href = "admin.html";
          adminLink.textContent = "Admin Panel";
          headerActions.insertBefore(adminLink, signOutButton);
        }
      }
    } catch (adminCheckError) {
      console.warn("Could not check CineVerse admin access:", adminCheckError);
    }
    await loadRecentHistory(user.id);
    await loadProfileReviews(user.id);
    if (adminCheckSucceeded && !isAdmin) {
      const supportSection = document.querySelector(".account-page .support-section");
      const supportQuickLink = document.querySelector(".account-page .support-quick-link");
      if (supportSection) supportSection.hidden = false;
      if (supportQuickLink) supportQuickLink.hidden = false;
      await loadSupportThreads(user.id);
    }
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


/* Contact Admin inbox — each member can only access their own threads via RLS. */
let supportThreads = [];
let selectedSupportThread = null;

function supportEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

async function loadSupportThreads(userId) {
  const list = document.getElementById("supportThreadList");
  if (!list) return;
  try {
    const { data, error } = await cvSupabase.from("cineverse_support_threads")
      .select("id,subject,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });
    if (error) throw error;
    supportThreads = data || [];
    if (!supportThreads.length) {
      list.innerHTML = '<p class="profile-reviews-empty">Your conversations with Admin will appear here.</p>';
      document.getElementById("supportConversation").hidden = true;
      return;
    }
    list.innerHTML = supportThreads.map(thread => {
      const date = new Date(thread.created_at);
      const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
      return '<button class="support-thread-button' + (selectedSupportThread?.id === thread.id ? ' is-active' : '') +
        '" type="button" data-support-thread="' + supportEscape(thread.id) + '"><span>' +
        supportEscape(thread.subject) + '<small>' + supportEscape(dateLabel) + '</small></span><small>' +
        (thread.status === "closed" ? "CLOSED" : "OPEN") + '</small></button>';
    }).join("");
    if (!selectedSupportThread || !supportThreads.some(t => t.id === selectedSupportThread.id)) {
      await openSupportConversation(supportThreads[0].id);
    } else {
      selectedSupportThread = supportThreads.find(t => t.id === selectedSupportThread.id);
      await renderSupportConversation();
    }
  } catch (error) {
    console.warn("Could not load Contact Admin conversations:", error);
    list.innerHTML = '<p class="profile-reviews-empty">Messages are temporarily unavailable. Please refresh and try again.</p>';
  }
}

async function openSupportConversation(threadId) {
  selectedSupportThread = supportThreads.find(thread => thread.id === threadId) || null;
  if (!selectedSupportThread) return;
  document.querySelectorAll("[data-support-thread]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.supportThread === threadId);
  });
  await renderSupportConversation();
}

async function renderSupportConversation() {
  const panel = document.getElementById("supportConversation");
  const messagesEl = document.getElementById("supportMessages");
  const replyForm = document.getElementById("supportReplyForm");
  if (!selectedSupportThread || !panel) return;
  panel.hidden = false;
  const { data, error } = await cvSupabase.from("cineverse_support_messages")
    .select("id,sender_role,body,created_at")
    .eq("thread_id", selectedSupportThread.id)
    .order("created_at", { ascending:true });
  if (error) throw error;
  messagesEl.innerHTML = '<h3 style="margin:0 0 12px;font-size:14px">' + supportEscape(selectedSupportThread.subject) + '</h3>' +
    (data || []).map(message => {
      const date = new Date(message.created_at);
      const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
      const mine = message.sender_role === "user";
      return '<div class="support-message' + (mine ? ' is-mine' : '') + '">' +
        supportEscape(message.body) + '<small>' + (mine ? "You" : "CineVerse Admin") + ' · ' + supportEscape(dateLabel) + '</small></div>';
    }).join("");
  replyForm.hidden = selectedSupportThread.status !== "open";
  if (selectedSupportThread.status === "closed") {
    messagesEl.innerHTML += '<p class="support-status">This conversation is closed. Start a new message if you need more help.</p>';
  }
}

document.getElementById("supportThreadList")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-support-thread]");
  if (!button) return;
  try { await openSupportConversation(button.dataset.supportThread); }
  catch (error) { document.getElementById("supportStatus").textContent = error.message || "Could not open this conversation."; }
});

document.getElementById("supportNewForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentAccountUser) return;
  const subject = document.getElementById("supportSubject").value.trim();
  const body = document.getElementById("supportFirstMessage").value.trim();
  const button = document.getElementById("supportSendButton");
  const status = document.getElementById("supportStatus");
  if (subject.length < 3 || !body) { status.textContent = "Please enter a subject and message."; return; }
  button.disabled = true;
  status.textContent = "Sending your message…";
  try {
    const { data: thread, error: threadError } = await cvSupabase.from("cineverse_support_threads")
      .insert({ user_id: currentAccountUser.id, subject })
      .select("id,subject,status,created_at").single();
    if (threadError) throw threadError;
    const { error: messageError } = await cvSupabase.from("cineverse_support_messages")
      .insert({ thread_id: thread.id, sender_id: currentAccountUser.id, sender_role:"user", body });
    if (messageError) throw messageError;
    document.getElementById("supportNewForm").reset();
    status.textContent = "Message sent to CineVerse Admin.";
    selectedSupportThread = thread;
    await loadSupportThreads(currentAccountUser.id);
    await openSupportConversation(thread.id);
  } catch (error) {
    console.warn("Could not send Contact Admin message:", error);
    status.textContent = error.message || "Could not send your message. Please try again.";
  } finally { button.disabled = false; }
});

document.getElementById("supportReplyForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentAccountUser || !selectedSupportThread || selectedSupportThread.status !== "open") return;
  const input = document.getElementById("supportReplyText");
  const button = document.getElementById("supportReplyButton");
  const body = input.value.trim();
  if (!body) return;
  button.disabled = true;
  try {
    const { error } = await cvSupabase.from("cineverse_support_messages")
      .insert({ thread_id:selectedSupportThread.id, sender_id:currentAccountUser.id, sender_role:"user", body });
    if (error) throw error;
    input.value = "";
    await renderSupportConversation();
  } catch (error) {
    document.getElementById("supportStatus").textContent = error.message || "Could not send your reply.";
  } finally { button.disabled = false; }
});
