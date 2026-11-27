// Generated from the saved CineVerse homepage featured movie. Do not edit manually.
window.CV_HERO_CACHE = {"title":"The Odyssey","backdrop_path":"/c7btGYblBnfAaw713WvFM0Kimc7.jpg","overview":"Odysseus, the legendary King of Ithaca, embarks on a long and perilous journey home following the Trojan War. Throughout his voyage, he is forced to confront the whims of gods, mythological monsters, and trials that stretch both his cunning and his humanity to the breaking point.","release_date":"2026-07-15","vote_average":8.024,"updated_at":"2026-11-27T00:00:00.156078+00:00"};
(() => {
  const movie = window.CV_HERO_CACHE;
  if (!movie?.backdrop_path) return;
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.href = "https://image.tmdb.org/t/p/original" + movie.backdrop_path + (movie.updated_at ? "?v=" + encodeURIComponent(new Date(movie.updated_at).getTime()) : "");
  preload.fetchPriority = "high";
  document.head.appendChild(preload);
})();