const movies = {
  trending: [
    {title:"Dune: Part Two",year:"2024",genre:"Sci-Fi · Adventure",rating:"8.5",tag:"TRENDING",image:"https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",description:"Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family."},
    {title:"The Batman",year:"2022",genre:"Action · Crime",rating:"7.8",tag:"TOP 10",image:"https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",description:"Batman ventures into Gotham City's underworld when a sadistic killer leaves behind a trail of cryptic clues."},
    {title:"Interstellar",year:"2014",genre:"Sci-Fi · Drama",rating:"8.7",tag:"FAN FAVORITE",image:"https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",description:"A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars."},
    {title:"Oppenheimer",year:"2023",genre:"Drama · History",rating:"8.3",tag:"AWARD WINNER",image:"https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg",description:"The story of J. Robert Oppenheimer and his role in the development of the atomic bomb."},
    {title:"Spider-Man: Across the Spider-Verse",year:"2023",genre:"Animation · Action",rating:"8.6",tag:"MUST WATCH",image:"https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",description:"Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People."}
  ],
  movies: [
    {title:"Everything Everywhere All at Once",year:"2022",genre:"Sci-Fi · Comedy",rating:"7.8",image:"https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",description:"An exhausted laundromat owner is swept into an extraordinary adventure across the multiverse."},
    {title:"The Grand Budapest Hotel",year:"2014",genre:"Comedy · Adventure",rating:"8.1",image:"https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",description:"A legendary concierge and his trusted protégé become caught up in a story of theft and family secrets."},
    {title:"Inception",year:"2010",genre:"Sci-Fi · Thriller",rating:"8.8",image:"https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",description:"A skilled thief who steals corporate secrets through dream-sharing technology is given a chance at redemption."},
    {title:"Knives Out",year:"2019",genre:"Mystery · Comedy",rating:"7.9",image:"https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg",description:"A detective investigates the death of a famous crime novelist surrounded by a complicated family."},
    {title:"La La Land",year:"2016",genre:"Romance · Music",rating:"8.0",image:"https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",description:"A jazz musician and an aspiring actor fall in love while pursuing their dreams in Los Angeles."}
  ],
  series: [
    {title:"Stranger Things",year:"2016–",genre:"Sci-Fi · Mystery",rating:"8.7",image:"https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",description:"A group of young friends uncover a series of extraordinary mysteries in their small hometown."},
    {title:"The Queen's Gambit",year:"2020",genre:"Drama",rating:"8.5",image:"https://image.tmdb.org/t/p/w500/zU0htwkhld7vwiYLB3mb8FI7M6.jpg",description:"An orphaned chess prodigy struggles with addiction while becoming one of the world's greatest players."},
    {title:"The Last of Us",year:"2023–",genre:"Drama · Adventure",rating:"8.7",image:"https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",description:"A hardened survivor takes a teenager across a dangerous world on a life-changing journey."},
    {title:"Wednesday",year:"2022–",genre:"Comedy · Mystery",rating:"8.0",image:"https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",description:"Wednesday Addams investigates a mystery at her peculiar new school."},
    {title:"Arcane",year:"2021–2024",genre:"Animation · Fantasy",rating:"9.0",image:"https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",description:"Two sisters find themselves on opposing sides of a conflict between a wealthy city and its underground."}
  ]
};

const allMovies = Object.values(movies).flat();
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function movieCard(movie,index){
  return `<article class="movie-card" tabindex="0" role="button" aria-label="View details for ${escapeHtml(movie.title)}" data-title="${escapeHtml(movie.title)}">
    <img class="poster" src="${movie.image}" alt="Poster for ${escapeHtml(movie.title)}" loading="lazy" onerror="this.style.opacity='.15'">
    <div class="card-gradient"></div>
    ${movie.tag ? `<span class="card-top">${escapeHtml(movie.tag)}</span>` : ""}
    <div class="card-info"><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.year)} &nbsp;·&nbsp; ★ ${escapeHtml(movie.rating)}</p></div>
  </article>`;
}

function renderRow(id,list){
  const element=document.getElementById(id);
  if(element) element.innerHTML=list.map(movieCard).join("");
}
renderRow("trendingRow",movies.trending);
renderRow("moviesRow",movies.movies);
renderRow("seriesRow",movies.series);

const dialog=document.getElementById("movieDialog");
const toast=document.getElementById("toast");
let toastTimer;
function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove("show"),2400);
}
function openMovie(title){
  const movie=allMovies.find(item=>item.title===title);
  if(!movie)return;
  document.getElementById("dialogTitle").textContent=movie.title;
  document.getElementById("dialogGenre").textContent=movie.genre;
  document.getElementById("dialogDescription").textContent=movie.description;
  document.getElementById("dialogArt").style.backgroundImage=`linear-gradient(0deg,#14141400, #0002),url("${movie.image}")`;
  document.getElementById("dialogMeta").innerHTML=`<span class="match">★ ${escapeHtml(movie.rating)}</span><span>${escapeHtml(movie.year)}</span><span class="rating">HD</span>`;
  document.getElementById("dialogWatch").onclick=()=>{dialog.close();showToast(`${movie.title} added to your list (demo)`);};
  dialog.showModal();
}
document.addEventListener("click",event=>{
  const card=event.target.closest(".movie-card");
  if(card)openMovie(card.dataset.title);
});
document.addEventListener("keydown",event=>{
  if((event.key==="Enter"||event.key===" ")&&event.target.matches(".movie-card")){
    event.preventDefault();openMovie(event.target.dataset.title);
  }
});
document.getElementById("dialogClose").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});

document.querySelectorAll("[data-scroll]").forEach(button=>{
  button.addEventListener("click",()=>{
    const row=document.getElementById(button.dataset.scroll);
    row?.scrollBy({left:Number(button.dataset.dir)*row.clientWidth*.8,behavior:"smooth"});
  });
});

const searchSection=document.getElementById("searchSection");
const searchInput=document.getElementById("movieSearch");
document.getElementById("searchToggle").addEventListener("click",()=>{
  searchSection.hidden=!searchSection.hidden;
  if(!searchSection.hidden){searchInput.focus();searchSection.scrollIntoView({behavior:"smooth",block:"start"});}
});
function filterMovies(){
  const query=searchInput.value.trim().toLowerCase();
  const results=allMovies.filter(movie=>`${movie.title} ${movie.genre} ${movie.year}`.toLowerCase().includes(query));
  const section=document.getElementById("trending");
  if(query){
    section.querySelector(".section-kicker").textContent="SEARCH RESULTS";
    section.querySelector("h2").textContent=`${results.length} title${results.length===1?"":"s"} found`;
    renderRow("trendingRow",results);
  }else{
    section.querySelector(".section-kicker").textContent="WHAT'S HOT RIGHT NOW";
    section.querySelector("h2").innerHTML='Trending now <span class="heading-arrow">↗</span>';
    renderRow("trendingRow",movies.trending);
  }
}
searchInput.addEventListener("input",filterMovies);
document.getElementById("clearSearch").addEventListener("click",()=>{searchInput.value="";filterMovies();searchInput.focus();});

document.getElementById("newsletterForm").addEventListener("submit",event=>{
  event.preventDefault();
  const email=document.getElementById("emailInput").value;
  if(email){document.getElementById("formMessage").textContent="Thanks for joining the CineVerse demo!";event.target.reset();}
});
document.getElementById("year").textContent=new Date().getFullYear();