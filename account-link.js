(() => {
 const link = document.getElementById("accountLink");
 if (!link || !window.cvSupabase) return;
 const setDestination = session => {
  const signedIn = Boolean(session?.user);
  link.href = signedIn ? "account.html" : "auth.html";
  link.setAttribute("aria-label", signedIn ? "Open your CineVerse profile" : "Sign in to CineVerse");
  link.title = signedIn ? "My profile" : "Sign in";
 };
 cvSupabase.auth.getSession().then(({data}) => setDestination(data.session));
 cvSupabase.auth.onAuthStateChange((_event, session) => setDestination(session));
})();