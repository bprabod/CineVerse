const $ = id => document.getElementById(id);
const duplicatePrompt = $("duplicatePrompt");

$("authForm").addEventListener("submit", async e => {
 e.preventDefault();
 duplicatePrompt.hidden = true;
 $("authStatus").textContent = "Signing in…";
 const {error} = await cvSupabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){$("authStatus").textContent=error.message;return;}
 location.href="account.html";
});

$("signUp").addEventListener("click", async () => {
 duplicatePrompt.hidden = true;
 $("authStatus").textContent="Creating account…";
 const {data,error}=await cvSupabase.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{emailRedirectTo:location.origin+location.pathname.replace("auth.html","account.html")}});
 const alreadyRegistered = error && /already registered|already exists/i.test(error.message);
 const duplicateIdentity = !error && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
 if(alreadyRegistered || duplicateIdentity){
  $("authStatus").textContent="This email is already registered. Please try another email or sign in.";
  duplicatePrompt.hidden = false;
  return;
 }
 if(error){$("authStatus").textContent=error.message;return;}
 $("authStatus").textContent=data.session?"Account created. Opening your account…":"Check your email to confirm your account, then sign in.";
 if(data.session) location.href="account.html";
});

$("duplicateSignIn").addEventListener("click", e => {
 e.preventDefault();
 $("password").focus();
 $("authStatus").textContent="Enter your password and click Sign in.";
 duplicatePrompt.hidden = true;
});