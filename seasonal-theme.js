/* CineVerse seasonal atmosphere: date-based, subtle, and never replaces the site's core identity. */
(() => {
  const date = new Date();
  const month = date.getMonth(); // Local device calendar.
  const day = date.getDate();

  let season = "default";
  if (month === 11) season = "christmas";
  else if (month === 9 && day >= 20) season = "halloween";

  document.body.classList.add(`season-${season}`);
  document.documentElement.dataset.season = season;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = season === "christmas"
      ? "#101b16"
      : season === "halloween"
        ? "#1b111b"
        : "#090909";
  }
})();
