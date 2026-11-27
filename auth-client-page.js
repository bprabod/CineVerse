const $ = id => document.getElementById(id);
let authMode = "signin";
let showForgotPassword = false;
const isPasswordReset = new URLSearchParams(location.search).get("mode") === "reset";

const passwordFields = ["password", "confirmPassword", "newPassword", "confirmNewPassword"];
const passwordControls = {};
const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14 14 0 0 1-3 3.7"></path><path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4-.8"></path></svg>';
passwordFields.forEach(id => {
 const input = $(id);
 if (!input) return;
 const wrapper = document.createElement("div");
 wrapper.className = "password-field";
 input.parentNode.insertBefore(wrapper, input);
 wrapper.appendChild(input);
 const toggle = document.createElement("button");
 toggle.type = "button";
 toggle.className = "password-visibility-toggle";
 toggle.innerHTML = eyeIcon;
 toggle.setAttribute("aria-label", "Show password");
 toggle.setAttribute("aria-pressed", "false");
 toggle.addEventListener("click", () => {
  const reveal = input.type === "password";
  input.type = reveal ? "text" : "password";
  toggle.innerHTML = reveal ? eyeOffIcon : eyeIcon;
  toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  toggle.setAttribute("aria-pressed", String(reveal));
 });
 wrapper.appendChild(toggle);
 passwordControls[id] = { input, wrapper };
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
 passwordFields.forEach(id => { const control = passwordControls[id]; if (control) control.wrapper.hidden = control.input.hidden; });
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
