/* CineVerse seasonal atmosphere: automatic by date, with URL-only preview overrides. */
(() => {
  const date = new Date();
  const month = date.getMonth();
  const day = date.getDate();
  const requested = new URLSearchParams(window.location.search).get("theme");

  let season = "default";
  if (requested === "christmas" || requested === "halloween") {
    season = requested; // Preview only; does not save or change the calendar.
  } else if (month === 11) {
    season = "christmas";
  } else if (month === 9 && day >= 20) {
    season = "halloween";
  }

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
