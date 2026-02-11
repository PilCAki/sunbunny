/* ═══════════════════════════════════════════════════════════════════════════
   Sunbunny Storefront — Client-side JS (multi-plugin)

   Reads plugin configuration from window.PLUGIN_CONFIG (injected by the
   generator via an inline <script> on each plugin page).  On the brand
   homepage (no PLUGIN_CONFIG), plugin-specific wiring is skipped.

   Fetches releases from local downloads/releases.json first, then falls
   back to the GitHub Releases API.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Configuration (set per-page by inline <script>) ────────────────────────
// window.PLUGIN_CONFIG = { name, slug, owner, repo, releasesUrl, releasesPage, discussions, issuesUrl }

const CFG = window.PLUGIN_CONFIG || null;

// ── Helpers ────────────────────────────────────────────────────────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

/**
 * Guess the platform key from an asset file name.
 *   "MyPlugin_Windows_VST3_v1.0.0.zip" → "windows"
 */
function platformFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("windows") || n.includes("win"))  return "windows";
  if (n.includes("macos")   || n.includes("mac"))  return "macos";
  if (n.includes("linux"))                          return "linux";
  return null;
}

const PLATFORM_LABELS = {
  windows: "⊞ Windows VST3",
  macos:   "⌘ macOS VST3",
  linux:   "🐧 Linux VST3",
};

// ── Wire up external links ─────────────────────────────────────────────────
function wireLinks() {
  if (!CFG) return;

  const map = {
    "link-discussions":         CFG.discussions,
    "link-releases":            CFG.releasesPage,
    "link-footer-discussions":  CFG.discussions,
    "link-footer-issues":       CFG.issuesUrl,
  };
  for (const [id, url] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.href = url;
  }

  // footer year
  const fy = document.getElementById("footer-year");
  if (fy) fy.textContent = new Date().getFullYear();
}

// ── Populate hero download buttons ─────────────────────────────────────────
function setHeroButtons(assets) {
  for (const [platform, url] of Object.entries(assets)) {
    const btn = document.getElementById("dl-" + platform);
    if (btn && url) btn.href = url;
  }
}

// ── Render download cards in #downloads section ────────────────────────────
function renderDownloadCards(releases) {
  const container = document.getElementById("download-cards");
  if (!container) return;
  container.innerHTML = "";

  const releasesPage = CFG ? CFG.releasesPage : "#";

  if (!releases || releases.length === 0) {
    container.innerHTML = `<p>No releases yet. Check back soon or visit <a href="${releasesPage}">GitHub Releases</a>.</p>`;
    return;
  }

  const latest = releases[0];

  for (const [platform, label] of Object.entries(PLATFORM_LABELS)) {
    const asset = latest.assets && latest.assets[platform + "_vst3"];
    const url   = asset
      ? (typeof asset === "string" && asset.startsWith("http") ? asset : `${releasesPage}/latest`)
      : releasesPage;

    const card = document.createElement("div");
    card.className = "dl-card";
    card.innerHTML = `
      <h3>${label}</h3>
      <p>Version <strong>${latest.version || "—"}</strong> · ${latest.date || ""}</p>
      <a class="dl-btn" href="${url}" rel="noopener">Download</a>
    `;
    container.appendChild(card);
  }
}

// ── Changelog page rendering ───────────────────────────────────────────────
function renderChangelog(releases) {
  const target = document.getElementById("changelog-entries");
  if (!target) return;
  target.innerHTML = "";

  if (!releases || releases.length === 0) {
    target.innerHTML = "<p>No releases yet.</p>";
    return;
  }

  for (const r of releases) {
    const entry = document.createElement("div");
    entry.className = "changelog-entry";
    entry.innerHTML = `
      <h3>v${r.version || "?"}</h3>
      <p class="date">${r.date || ""}</p>
      <p>${r.notes || "No notes."}</p>
    `;
    target.appendChild(entry);
  }
}

// ── Fetch from local releases.json (works offline / pre-generated) ─────────
async function fetchLocalReleases() {
  try {
    const resp = await fetch("downloads/releases.json");
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

// ── Fetch from GitHub API (public, no auth, rate-limited ~60 req/hr) ───────
async function fetchGitHubReleases() {
  if (!CFG || !CFG.releasesUrl) return null;
  try {
    const resp = await fetch(CFG.releasesUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.map(rel => {
      const assetMap = {};
      const shaMap = {};
      for (const a of (rel.assets || [])) {
        const p = platformFromName(a.name);
        if (p) assetMap[p + "_vst3"] = a.browser_download_url;
      }
      return {
        version: (rel.tag_name || "").replace(/^v/, ""),
        date: rel.published_at ? rel.published_at.slice(0, 10) : "",
        assets: assetMap,
        sha256: shaMap,
        notes: rel.body ? rel.body.split("\n")[0] : "",
      };
    });
  } catch { return null; }
}

// ── Main init ──────────────────────────────────────────────────────────────
async function init() {
  wireLinks();

  // On the brand homepage (no PLUGIN_CONFIG), skip release fetching
  if (!CFG) return;

  const releasesPage = CFG.releasesPage || "#";

  // Try local releases.json first, then GitHub API
  let releases = await fetchLocalReleases();
  if (!releases || releases.length === 0) {
    releases = await fetchGitHubReleases();
  }

  if (releases && releases.length > 0) {
    const latest = releases[0];

    // Hero version badge
    const badge = document.getElementById("hero-version");
    if (badge) badge.textContent = `Latest: v${latest.version} — ${latest.date}`;

    // Hero download buttons → link to release assets (or releases page)
    const heroAssets = {};
    if (latest.assets) {
      for (const key of Object.keys(latest.assets)) {
        const plat = key.replace("_vst3", "");
        const val  = latest.assets[key];
        heroAssets[plat] = (typeof val === "string" && val.startsWith("http"))
          ? val
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
  } else {
    setHeroButtons({ windows: releasesPage, macos: releasesPage, linux: releasesPage });
    const lm = document.getElementById("loading-msg");
    if (lm) lm.textContent = "No releases found yet. Check GitHub Releases.";
  }
}

document.addEventListener("DOMContentLoaded", init);
