(() => {
  "use strict";

  const SCRIPT_ID = "cineverse-native-banner-script";
  const CONTAINER_ID = "container-6e2d91a6ad04321640ed7203cf20f430";
  const SCRIPT_URL = "https://bancadeltempoidea.org/21/6e2d91a6ad04321640ed7203cf20f430";

  function mountBanner() {
    if (document.getElementById(SCRIPT_ID) || document.getElementById(CONTAINER_ID)) return;

    const main = document.querySelector("main");
    if (!main) return;

    const slot = document.createElement("aside");
    slot.className = "cv-native-ad";
    slot.setAttribute("aria-label", "Advertisement");

    const label = document.createElement("span");
    label.className = "cv-native-ad-label";
    label.textContent = "ADVERTISEMENT";

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    slot.append(label, container);

    if (document.body.classList.contains("detail-page")) {
      main.insertAdjacentElement("beforebegin", slot);
    } else {
      const hero = main.querySelector(".hero");
      if (hero && window.matchMedia("(max-width: 600px)").matches) {
        // On phones, place the banner before the tall hero so it is not pushed far down.
        slot.style.marginTop = "72px";
        hero.insertAdjacentElement("beforebegin", slot);
      } else if (hero) {
        hero.insertAdjacentElement("afterend", slot);
      }
      else main.insertAdjacentElement("afterbegin", slot);
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.setAttribute("fetchpriority", "high");
    script.setAttribute("data-cfasync", "false");
    script.src = SCRIPT_URL;
    container.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBanner, { once: true });
  } else {
    mountBanner();
  }
})();
