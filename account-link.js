(() => {
 const link = document.getElementById("accountLink");
 if (!link || !window.cvSupabase) return;

 const setDestination = session => {
  const signedIn = Boolean(session?.user);
  link.href = signedIn ? "account.html" : "auth.html";
  link.setAttribute("aria-label", signedIn ? "Open your CineVerse profile" : "Sign in to CineVerse");
  link.title = signedIn ? "My profile" : "Sign in";
 };

 // Keep the icon updated when the session is restored or changes.
 cvSupabase.auth.getSession().then(({data}) => setDestination(data?.session || null));
 cvSupabase.auth.onAuthStateChange((_event, session) => setDestination(session));

 // Re-check at click time so a slow session restore cannot send a signed-in
 // user to the sign-in page.
 link.addEventListener("click", async event => {
  event.preventDefault();
  link.setAttribute("aria-busy", "true");
  try {
   const {data, error} = await cvSupabase.auth.getSession();
   if (error) throw error;
   const destination = data?.session?.user ? "account.html" : "auth.html";
   setDestination(data?.session || null);
   location.href = destination;
  } catch (error) {
   location.href = "auth.html";
  }
 });
})();