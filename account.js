const emailEl = document.getElementById("accountEmail");
const statusEl = document.getElementById("accountStatus");

(async () => {
  const { data: { user }, error } = await cvSupabase.auth.getUser();
  if (error || !user) {
    location.replace("auth.html");
    return;
  }
  emailEl.textContent = user.email || "CineVerse member";
  statusEl.textContent = "Your account is active.";
})();

document.getElementById("signOut").addEventListener("click", async () => {
  const { error } = await cvSupabase.auth.signOut();
  if (error) {
    statusEl.textContent = error.message;
    return;
  }
  location.href = "auth.html";
});
