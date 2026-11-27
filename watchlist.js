const statusEl=document.getElementById("listStatus"), grid=document.getElementById("savedTitles");
(async()=>{
 const {data:{user},error}=await cvSupabase.auth.getUser();
 if(error||!user){location.href="auth.html";return;}
 const {data,error:loadError}=await cvSupabase.from("watchlist").select("*").order("created_at",{ascending:false});
 if(loadError){statusEl.textContent="Could not load your list: "+loadError.message;return;}
 if(!data.length){statusEl.textContent="Your list is empty. Open a movie or series and choose Add to my list.";return;}
 statusEl.textContent="";
 grid.innerHTML=data.map(item=>'<article class="movie-card"><a href="movie.html?id='+encodeURIComponent(item.tmdb_id)+'&type='+encodeURIComponent(item.media_type)+'"><img class="poster" loading="lazy" src="'+(item.poster_url||"https://placehold.co/500x750/171717/eeeeee?text=CineVerse")+'" alt=""><div class="card-gradient"></div><div class="card-info"><h3>'+escapeText(item.title)+'</h3><p>'+(item.media_type==="tv"?"TV Series":"Movie")+'</p></div></a><button class="button button-secondary remove-title" data-id="'+item.id+'" style="width:100%;border-radius:0">Remove</button></article>').join("");
 grid.querySelectorAll(".remove-title").forEach(btn=>btn.addEventListener("click",async()=>{const {error}=await cvSupabase.from("watchlist").delete().eq("id",btn.dataset.id);if(error){statusEl.textContent=error.message;return;}btn.closest(".movie-card").remove();if(!grid.children.length)statusEl.textContent="Your list is empty."; }));
})();
function escapeText(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.getElementById("signOut").addEventListener("click",async()=>{await cvSupabase.auth.signOut();location.href="index.html";});
