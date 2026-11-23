/* CineVerse seasonal atmosphere: Christmas preview and automatic December theme. */
(() => {
  const date = new Date();
  const requested = new URLSearchParams(window.location.search).get("theme");
  const season = requested === "christmas" || date.getMonth() === 11
    ? "christmas"
    : "default";

  document.body.classList.add(`season-${season}`);
  document.documentElement.dataset.season = season;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = season === "christmas" ? "#101b16" : "#090909";
  }
})();
