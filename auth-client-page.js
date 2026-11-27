const $ = id => document.getElementById(id);
$("authForm").addEventListener("submit", async e => {
 e.preventDefault(); $("authStatus").textContent = "Signing in…";
 const {error} = await cvSupabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){$("authStatus").textContent=error.message;return;}
 location.href="watchlist.html";
});
$("signUp").addEventListener("click", async () => {
 $("authStatus").textContent="Creating account…";
 const {data,error}=await cvSupabase.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{emailRedirectTo:location.origin+location.pathname.replace("auth.html","watchlist.html")}});
 if(error){$("authStatus").textContent=error.message;return;}
 $("authStatus").textContent=data.session?"Account created. Opening your list…":"Check your email to confirm your account, then sign in.";
 if(data.session) location.href="watchlist.html";
});
