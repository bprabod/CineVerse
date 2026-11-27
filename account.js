const emailEl = document.getElementById("accountEmail");
const statusEl = document.getElementById("accountStatus");
const signOutButton = document.getElementById("signOut");

(async () => {
  try {
    // Wait until Supabase has restored the saved browser session.
    await window.cvAuthReady;

    const { data: { session }, error: sessionError } =
      await cvSupabase.auth.getSession();

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

    emailEl.textContent = user.email || "CineVerse member";
    statusEl.textContent = "Your account is active.";
  } catch (error) {
    console.warn("CineVerse account session check failed:", error);
    statusEl.textContent =
      "We couldn't verify your session. Please refresh the page or sign in again.";
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
