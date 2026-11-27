const $ = id => document.getElementById(id);
let authMode = "signin";
let showForgotPassword = false;
const isPasswordReset = new URLSearchParams(location.search).get("mode") === "reset";

const passwordFields = ["password","confirmPassword","newPassword","confirmNewPassword"];
passwordFields.forEach(id => {
 const input = $(id);
 const wrapper = document.createElement("div");
 wrapper.className = "password-field";
 input.parentNode.insertBefore(wrapper,input);
 wrapper.appendChild(input);
 const toggle = document.createElement("button");
 toggle.type = "button";
 toggle.className = "password-visibility-toggle";
 toggle.textContent = "Show";
 toggle.setAttribute("aria-label","Show password");
 toggle.setAttribute("aria-pressed","false");
 toggle.addEventListener("click",() => {
  const reveal = input.type === "password";
  input.type = reveal ? "text" : "password";
  toggle.textContent = reveal ? "Hide" : "Show";
  toggle.setAttribute("aria-label",reveal ? "Hide password" : "Show password");
  toggle.setAttribute("aria-pressed",String(reveal));
 });
 wrapper.appendChild(toggle);
});
const setMode = mode => {
 authMode = mode;
 const signup = mode === "signup";
 const forgot = mode === "forgot";
 const reset = mode === "reset";
 $("authTitle").textContent = signup ? "Create account" : reset ? "Choose a new password" : forgot ? "Reset password" : "Sign in";
 $("authDescription").textContent = signup ? "Choose a username and create your CineVerse account." : reset ? "Enter a new password for your CineVerse account." : forgot ? "Enter your email and we will send you a reset link." : "Sign in to access your saved movies and series.";
 $("authSubmit").textContent = signup ? "Create account" : reset ? "Update password" : forgot ? "Send reset link" : "Sign in";
 $("username").hidden = !signup;
 $("username").required = signup;
 $("confirmPassword").hidden = !signup;
 $("confirmPassword").required = signup;
 $("password").hidden = forgot || reset;
 $("password").required = !forgot && !reset;
 $("newPassword").hidden = !reset;
 $("newPassword").required = reset;
 $("confirmNewPassword").hidden = !reset;
 $("confirmNewPassword").required = reset;
 $("password").setAttribute("autocomplete", signup || reset ? "new-password" : "current-password");
 $("modePrompt").innerHTML = reset || forgot
  ? 'Remembered your password? <a href="#signin" id="modeToggle">Sign in</a>'
  : signup
   ? 'Already have an account? <a href="#signin" id="modeToggle">Sign in</a>'
   : `${showForgotPassword ? '<a class="forgot-password-action" href="#forgot" id="forgotToggle">Forgot password?</a>' : ''}<span class="auth-create-prompt">New to CineVerse? <a href="#create" id="modeToggle">Create account</a></span>`;
 $("authStatus").textContent = "";
};
$("modePrompt").addEventListener("click", e => {
 if(e.target.id === "forgotToggle"){ e.preventDefault(); setMode("forgot"); return; }
 if(e.target.id !== "modeToggle") return;
 e.preventDefault();
 setMode(e.target.getAttribute("href") === "#create" ? "signup" : "signin");
});
$("authForm").addEventListener("submit", async e => {
 e.preventDefault();
 const email = $("email").value.trim();
 const password = $("password").value;
 const username = $("username").value.trim();
 const resetPassword = $("newPassword").value;
 if(authMode === "reset" && (resetPassword.length < 6 || resetPassword !== $("confirmNewPassword").value)){
  $("authStatus").textContent = resetPassword.length < 6 ? "Password must be at least 6 characters." : "New passwords do not match.";
  return;
 }
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
 $("authStatus").textContent = authMode === "signup" ? "Creating account…" : authMode === "forgot" ? "Sending reset link…" : authMode === "reset" ? "Updating password…" : "Signing in…";
 try {
  if(authMode === "forgot"){
   const {error} = await cvSupabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+"?mode=reset"});
   if(error) throw error;
   $("authStatus").textContent = "If an account exists for this email, a password reset link has been sent. Check your inbox.";
   return;
  }
  if(authMode === "reset"){
   const {error} = await cvSupabase.auth.updateUser({password:resetPassword});
   if(error) throw error;
   setMode("signin");
   $("authStatus").textContent = "Password updated successfully. You can now sign in.";
   return;
  }
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
  if(authMode === "signin"){
   showForgotPassword = true;
   $("modePrompt").innerHTML = '<a class="forgot-password-action" href="#forgot" id="forgotToggle">Forgot password?</a><span class="auth-create-prompt">New to CineVerse? <a href="#create" id="modeToggle">Create account</a></span>';
  }
 } finally {
  $("authSubmit").disabled = false;
 }
});
if (isPasswordReset) setMode("reset");
cvSupabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setMode("reset"); });
