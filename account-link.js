(() => {
 const link = document.getElementById("accountLink");
 if (!link || typeof cvSupabase === "undefined") return;

 const setDestination = session => {
  const signedIn = Boolean(session?.user);
  link.href = signedIn ? "account.html" : "auth.html";
  link.setAttribute("aria-label", signedIn ? "Open your CineVerse profile" : "Sign in to CineVerse");
  link.title = signedIn ? "My profile" : "Sign in";
 };

 // Wait for the saved session to be restored before choosing the profile link.
 window.cvAuthReady.then(setDestination);

 // Keep the icon in sync with sign-in, sign-out, and token refresh events.
 cvSupabase.auth.onAuthStateChange((_event, session) => setDestination(session));

 // Re-check at click time to avoid navigating using a stale initial state.
 link.addEventListener("click", async event => {
  event.preventDefault();
  link.setAttribute("aria-busy", "true");
  try {
   await window.cvAuthReady;
   const { data, error } = await cvSupabase.auth.getSession();
   if (error) throw error;
   const session = data?.session || null;
   setDestination(session);
   location.href = session?.user ? "account.html" : "auth.html";
  } catch (error) {
   console.warn("CineVerse profile check failed:", error);
   location.href = "auth.html";
  }
 });

 // Re-evaluate when returning to a tab or restoring it from the back-forward cache.
 window.addEventListener("pageshow", async () => {
  try {
   const { data } = await cvSupabase.auth.getSession();
   setDestination(data?.session || null);
  } catch (_) {}
 });
})();
