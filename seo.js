(() => {
  const SITE = "https://bprabod.github.io/CineVerse/";
  const $ = id => document.getElementById(id);

  function setMeta(name, value, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let tag = document.head.querySelector(selector);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(property ? "property" : "name", name);
      document.head.appendChild(tag);
    }
    tag.content = value;
  }

  function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function setStructuredData(data) {
    let script = document.getElementById("cineverse-structured-data");
    if (!script) {
      script = document.createElement("script");
      script.id = "cineverse-structured-data";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  function setSocial(title, description, url, image) {
    setMeta("description", description);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", "CineVerse", true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", url, true);
    if (image) setMeta("og:image", image, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const type = params.get("type") === "tv" ? "tv" : "movie";
  const isDetail = location.pathname.endsWith("/movie.html");

  if (!isDetail) {
    const title = "CineVerse | Discover Movies & TV Series";
    const description = "Discover movies and TV series on CineVerse. Explore trending titles, popular films, series, cast details, genres and cinematic stories.";
    setCanonical(SITE);
    document.title = title;
    setSocial(title, description, SITE);
    setStructuredData({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "CineVerse",
      "url": SITE,
      "description": description
    });
    return;
  }

  if (!id || !/^\d+$/.test(id)) return;
  const detailUrl = `${SITE}movie.html?id=${encodeURIComponent(id)}&type=${type}`;
  setCanonical(detailUrl);

  function updateMovieMetadata() {
    const heading = $("detailTitle");
    const overview = $("detailOverview");
    if (!heading || !overview) return;
    const title = heading.textContent.trim();
    const descriptionText = overview.textContent.trim();
    if (!title || title === "Loading title…" || title === "Could not load title" || title === "Title not found") return;
    const yearMatch = ($("detailMeta")?.textContent || "").match(/\b(?:19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : "";
    const pageTitle = `${title}${year ? ` (${year})` : ""} ${type === "tv" ? "TV Series" : "Movie"} Details | CineVerse`;
    const description = `${title}${year ? ` (${year})` : ""}: ${descriptionText}`.slice(0, 300);
    const image = $("detailPoster")?.src || "";
    document.title = pageTitle;
    setSocial(pageTitle, description, detailUrl, image);

    const facts = [...document.querySelectorAll("#detailFacts .detail-fact strong")].map(node => node.textContent.trim()).filter(Boolean);
    const actors = [...document.querySelectorAll("#castGrid .cast-card h3")].slice(0, 10).map(node => ({
      "@type": "Person",
      "name": node.textContent.trim()
    }));
    const schema = {
      "@context": "https://schema.org",
      "@type": type === "tv" ? "TVSeries" : "Movie",
      "name": title,
      "description": descriptionText,
      "url": detailUrl,
      ...(image ? { "image": image } : {}),
      ...(year ? { "datePublished": year } : {}),
      ...(facts[0] ? { "genre": facts[0].split(" · ").map(value => value.trim()) } : {}),
      ...(actors.length ? { "actor": actors } : {})
    };
    setStructuredData(schema);
  }

  const observer = new MutationObserver(updateMovieMetadata);
  for (const id of ["detailTitle", "detailOverview", "detailMeta", "detailPoster", "detailFacts", "castGrid"]) {
    const node = $(id);
    if (node) observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: id === "detailPoster" });
  }
  updateMovieMetadata();
  window.addEventListener("load", updateMovieMetadata, { once: true });
})();