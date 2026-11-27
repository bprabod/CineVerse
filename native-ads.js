(() => {
  "use strict";

  const SCRIPT_ID = "cineverse-300x250-banner-script";
  const CONTAINER_ID = "container-6e2d91a6ad04321640ed7203cf20f430";
  const SCRIPT_URL = "https://bancadeltempoidea.org/22/8c48a877aab4e99e8ae550bad5ef3328";

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
    main.insertAdjacentElement("afterend", slot);

    window.atOptions = {
      key: "8c48a877aab4e99e8ae550bad5ef3328",
      format: "iframe",
      height: 250,
      width: 300,
      params: {}
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = false;
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