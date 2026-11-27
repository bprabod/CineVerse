const $ = id => document.getElementById(id);
let authMode = "signin";
const setMode = mode => {
 authMode = mode;
 const signup = mode === "signup";
 $("authTitle").textContent = signup ? "Create account" : "Sign in";
 $("authDescription").textContent = signup ? "Create your CineVerse account to save your favourite movies and series." : "Sign in to access your saved movies and series.";
 $("authSubmit").textContent = signup ? "Create account" : "Sign in";
 $("modePrompt").innerHTML = signup
  ? 'Already have an account? <a href="#signin" id="modeToggle">Sign in</a>'
  : 'New to CineVerse? <a href="#create" id="modeToggle">Create account</a>';
 $("password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
 $("authStatus").textContent = "";
};
$("modePrompt").addEventListener("click", e => {
 if(e.target.id !== "modeToggle") return;
 e.preventDefault();
 setMode(authMode === "signin" ? "signup" : "signin");
});
$("authForm").addEventListener("submit", async e => {
 e.preventDefault();
 const email = $("email").value.trim();
 const password = $("password").value;
 $("authSubmit").disabled = true;
 $("authStatus").textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
 try {
  if(authMode === "signin"){
   const {error} = await cvSupabase.auth.signInWithPassword({email,password});
   if(error) throw error;
   location.href = "account.html";
   return;
  }
  const {data,error} = await cvSupabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname.replace("auth.html","account.html")}});
  const alreadyRegistered = error && /already registered|already exists/i.test(error.message);
  const duplicateIdentity = !error && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  if(alreadyRegistered || duplicateIdentity){
   $("authStatus").textContent = "This email is already registered. Please sign in or try another email.";
   return;
  }
  if(error) throw error;
  if(data.session){$("authStatus").textContent="Account created. Opening your account…";location.href="account.html";}
  else $("authStatus").textContent="Account request received. If this email is eligible, check your inbox for a confirmation email.";
 } catch(error) {
  $("authStatus").textContent = error.message || "Something went wrong. Please try again.";
 } finally {
  $("authSubmit").disabled = false;
 }
});