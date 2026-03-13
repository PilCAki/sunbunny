/* ═══════════════════════════════════════════════════════════════════════════
   Sunbunny Storefront — Client-side JS (multi-plugin)
   ═══════════════════════════════════════════════════════════════════════════ */

let CFG = null;
let LATEST_RELEASE = null;

function platformFromName(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("windows") || n.includes("win")) return "windows";
  if (n.includes("macos") || n.includes("mac")) return "macos";
  if (n.includes("linux")) return "linux";
  return null;
}

function fileNameFromUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return last.includes(".zip") ? decodeURIComponent(last) : "";
  } catch {
    return "";
  }
}

const PLATFORM_LABELS = {
  windows: "⊞ Windows VST3",
  macos: "⌘ macOS VST3",
  linux: "🐧 Linux VST3",
};

function wireLinks() {
  const fy = document.getElementById("footer-year");
  if (fy) fy.textContent = new Date().getFullYear();

  if (!CFG) return;

  const map = {
    "link-discussions": CFG.discussions,
    "link-footer-discussions": CFG.discussions,
    "link-footer-issues": CFG.issuesUrl,
    "cl-releases-link": CFG.releasesPage,
  };

  for (const [id, url] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.href = url;
  }
}

function setHeroButtons(assets) {
  for (const [platform, url] of Object.entries(assets)) {
    const btn = document.getElementById("dl-" + platform);
    if (!btn || !url) continue;

    btn.href = url;
    btn.dataset.trackDownload = "true";
    btn.dataset.downloadPlatform = platform;
    btn.dataset.downloadSource = "hero";
  }
}

function renderDownloadCards(releases) {
  const container = document.getElementById("download-cards");
  if (!container) return;

  container.innerHTML = "";
  const releasesPage = CFG ? CFG.releasesPage : "#";

  if (!releases || releases.length === 0) {
    container.innerHTML = "<p>No releases yet. Check back soon!</p>";
    return;
  }

  const latest = releases[0];
  const releaseUrl = latest.release_page || releasesPage;

  for (const [platform, label] of Object.entries(PLATFORM_LABELS)) {
    const asset = latest.assets && latest.assets[platform + "_vst3"];
    const url = typeof asset === "string" && asset.startsWith("http") ? asset : releaseUrl;

    const card = document.createElement("div");
    card.className = "dl-card";
    card.innerHTML = `
      <h3>${label}</h3>
      <p>Version <strong>${latest.version || "—"}</strong> · ${latest.date || ""}</p>
      <a class="dl-btn" href="${url}" rel="noopener"
         data-track-download="true"
         data-download-platform="${platform}"
         data-download-source="card">Download</a>
    `;
    container.appendChild(card);
  }
}

function renderChangelog(releases) {
  const target = document.getElementById("changelog-entries");
  if (!target) return;

  target.innerHTML = "";

  if (!releases || releases.length === 0) {
    target.innerHTML = "<p>No releases yet.</p>";
    return;
  }

  const releasesPage = CFG ? CFG.releasesPage : "#";
  for (const release of releases) {
    const releaseUrl = release.release_page || `${releasesPage}/tag/v${release.version}`;
    const entry = document.createElement("div");
    entry.className = "changelog-entry";
    entry.innerHTML = `
      <h3><a href="${releaseUrl}">v${release.version || "?"}</a></h3>
      <p class="date">${release.date || ""}</p>
      <p>${release.notes || "No notes."}</p>
    `;
    target.appendChild(entry);
  }
}

async function fetchLocalReleases() {
  const paths = ["downloads/releases.json", "../downloads/releases.json"];
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) return await response.json();
    } catch {}
  }
  return null;
}

async function fetchGitHubReleases() {
  if (!CFG || !CFG.releasesUrl) return null;

  try {
    const response = await fetch(CFG.releasesUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    return data.map((release) => {
      const assetMap = {};
      for (const asset of release.assets || []) {
        const platform = platformFromName(asset.name);
        if (platform) assetMap[platform + "_vst3"] = asset.browser_download_url;
      }
      return {
        version: (release.tag_name || "").replace(/^v/, ""),
        date: release.published_at ? release.published_at.slice(0, 10) : "",
        assets: assetMap,
        notes: release.body ? release.body.split("\n")[0] : "",
      };
    });
  } catch {
    return null;
  }
}

function buildDownloadPayload(link) {
  if (!CFG) return null;

  const href = link.getAttribute("href") || "";
  const fileName = fileNameFromUrl(href);
  const payload = {
    plugin_name: CFG.name || CFG.slug || "",
    plugin_version: (LATEST_RELEASE && LATEST_RELEASE.version) || CFG.latestVersion || "",
    file_name: fileName,
    page_path: window.location.pathname,
    platform: link.dataset.downloadPlatform || platformFromName(fileName) || "",
    source: link.dataset.downloadSource || "",
  };

  Object.keys(payload).forEach((key) => {
    if (!payload[key]) delete payload[key];
  });
  return payload;
}

function wireDownloadTracking() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-track-download='true']");
    if (!link || !CFG || CFG.downloadType === "gumroad") return;

    const payload = buildDownloadPayload(link);
    if (payload) window.SunbunnyMeta?.trackPluginDownload(payload);
  });
}

async function init() {
  CFG = window.PLUGIN_CONFIG || null;
  wireLinks();
  wireDownloadTracking();

  if (!CFG || CFG.downloadType === "gumroad") return;

  const releasesPage = CFG.releasesPage || "#";
  let releases = await fetchLocalReleases();
  if (!releases || releases.length === 0) releases = await fetchGitHubReleases();

  if (releases && releases.length > 0) {
    LATEST_RELEASE = releases[0];

    const badge = document.getElementById("hero-version");
    if (badge) badge.textContent = `Latest: v${LATEST_RELEASE.version} — ${LATEST_RELEASE.date}`;

    const heroAssets = {};
    if (LATEST_RELEASE.assets) {
      for (const key of Object.keys(LATEST_RELEASE.assets)) {
        const platform = key.replace("_vst3", "");
        const value = LATEST_RELEASE.assets[key];
        heroAssets[platform] = typeof value === "string" && value.startsWith("http")
          ? value
          : releasesPage + "/latest";
      }
    }

    if (Object.keys(heroAssets).length) {
      setHeroButtons(heroAssets);
    } else {
      setHeroButtons({ windows: releasesPage, macos: releasesPage, linux: releasesPage });
    }

    renderDownloadCards(releases);
    renderChangelog(releases);
    return;
  }

  setHeroButtons({ windows: releasesPage, macos: releasesPage, linux: releasesPage });
  const loadingMessage = document.getElementById("loading-msg");
  if (loadingMessage) loadingMessage.textContent = "No releases found yet. Check back soon!";
}

document.addEventListener("DOMContentLoaded", init);