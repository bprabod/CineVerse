const usernameEl = document.getElementById("accountUsername");
const emailEl = document.getElementById("accountEmail");
const statusEl = document.getElementById("accountStatus");
const signOutButton = document.getElementById("signOut");

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
    const username = user.user_metadata?.username || user.user_metadata?.display_name;
    usernameEl.textContent = username || "CineVerse member";
    emailEl.textContent = user.email || "Email unavailable";
    statusEl.textContent = "Your account is active.";
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