const $ = id => document.getElementById(id);
let authMode = "signin";
const setMode = mode => {
 authMode = mode;
 const signup = mode === "signup";
 $("authTitle").textContent = signup ? "Create account" : "Sign in";
 $("authDescription").textContent = signup ? "Choose a username and create your CineVerse account." : "Sign in to access your saved movies and series.";
 $("authSubmit").textContent = signup ? "Create account" : "Sign in";
 $("username").hidden = !signup;
 $("username").required = signup;
 $("confirmPassword").hidden = !signup;
 $("confirmPassword").required = signup;
 $("password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
 $("modePrompt").innerHTML = signup
  ? 'Already have an account? <a href="#signin" id="modeToggle">Sign in</a>'
  : 'New to CineVerse? <a href="#create" id="modeToggle">Create account</a>';
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
 const username = $("username").value.trim();
 if(authMode === "signup"){
  if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){
   $("authStatus").textContent = "Username must be 3–20 characters and use only letters, numbers, or underscores.";
   return;
  }
  if(password !== $("confirmPassword").value){
   $("authStatus").textContent = "Passwords do not match. Please check them and try again.";
   return;
  }
 }
 $("authSubmit").disabled = true;
 $("authStatus").textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
 try {
  if(authMode === "signin"){
   const {error} = await cvSupabase.auth.signInWithPassword({email,password});
   if(error) throw error;
   location.href = "account.html";
   return;
  }
  const {data,error} = await cvSupabase.auth.signUp({
   email,password,
   options:{
    data:{username,display_name:username},
    emailRedirectTo:location.origin+location.pathname.replace("auth.html","account.html")
   }
  });
  const alreadyRegistered = error && /already registered|already exists/i.test(error.message);
  const duplicateIdentity = !error && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  if(alreadyRegistered || duplicateIdentity){
   $("authStatus").textContent = "This email is already registered. Please sign in or try another email.";
   return;
  }
  if(error) throw error;
  if(data.session){$("authStatus").textContent="Account created. Opening your account…";location.href="account.html";}
  else $("authStatus").textContent="Account request received. Check your inbox for a confirmation email before signing in.";
 } catch(error) {
  $("authStatus").textContent = error.message || "Something went wrong. Please try again.";
 } finally {
  $("authSubmit").disabled = false;
 }
});