(function initSunbunnyConsent(global) {
  const STORAGE_KEY = "sunbunny-meta-consent-v1";
  const STATE_ACCEPTED = "accepted";
  const STATE_REJECTED = "rejected";

  let bannerEl = null;
  let modalEl = null;
  let statusEl = null;
  let actionAreaEl = null;
  let detailEl = null;

  function siteConfig() {
    return global.SITE_CONFIG || {};
  }

  function pixelId() {
    return siteConfig().metaPixelId || "";
  }

  function hasGpcSignal() {
    return Boolean(global.navigator && global.navigator.globalPrivacyControl);
  }

  function readConsent() {
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      global.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  }

  function clearConsent() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function shouldShowBanner() {
    return Boolean(pixelId()) && !hasGpcSignal() && !readConsent();
  }

  function currentStatus() {
    if (!pixelId()) return "disabled";
    if (hasGpcSignal()) return "gpc";

    const saved = readConsent();
    if (saved === STATE_ACCEPTED) return STATE_ACCEPTED;
    if (saved === STATE_REJECTED) return STATE_REJECTED;
    return "unset";
  }

  function privacyUrl() {
    return siteConfig().privacyUrl || "privacy.html";
  }

  function applyAcceptedConsent() {
    if (!pixelId() || hasGpcSignal()) return;
    global.SunbunnyMeta?.enableTracking();
    if (global.SunbunnyMeta?.loadMetaPixel(pixelId())) {
      global.SunbunnyMeta.trackPageView();
    }
  }

  function applyRejectedConsent() {
    global.SunbunnyMeta?.disableTracking();
  }

  function openSettings() {
    if (!modalEl) return;
    updateUiState();
    modalEl.hidden = false;
    document.body.classList.add("privacy-modal-open");
  }

  function closeSettings() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.classList.remove("privacy-modal-open");
  }

  function setAccepted() {
    writeConsent(STATE_ACCEPTED);
    bannerEl.hidden = true;
    applyAcceptedConsent();
    updateUiState();
    closeSettings();
  }

  function setRejected() {
    writeConsent(STATE_REJECTED);
    bannerEl.hidden = true;
    applyRejectedConsent();
    updateUiState();
    closeSettings();
  }

  function withdrawConsent() {
    clearConsent();
    applyRejectedConsent();
    bannerEl.hidden = false;
    updateUiState();
    closeSettings();
  }

  function buildBanner() {
    const banner = document.createElement("section");
    banner.className = "consent-banner";
    banner.hidden = true;
    banner.innerHTML = `
      <div class="consent-banner__inner">
        <div class="consent-banner__copy">
          <h2>Privacy Choice</h2>
          <p>
            Sunbunny is a very small independent company just getting started.
            If you allow Meta Pixel, it helps us measure whether our ads are
            bringing people to the right pages and download links. This is
            optional, the site still works if you reject, and you can change
            your choice later in Privacy Settings.
          </p>
        </div>
        <div class="consent-banner__actions">
          <button type="button" class="consent-btn consent-btn--primary" data-consent-accept>Accept</button>
          <button type="button" class="consent-btn consent-btn--secondary" data-consent-reject>Reject</button>
          <a class="consent-link" href="${privacyUrl()}">Learn more</a>
        </div>
      </div>
    `;
    return banner;
  }

  function buildModal() {
    const modal = document.createElement("div");
    modal.className = "privacy-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="privacy-modal__backdrop" data-close-privacy></div>
      <div class="privacy-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-settings-title">
        <button type="button" class="privacy-modal__close" aria-label="Close privacy settings" data-close-privacy>&times;</button>
        <h2 id="privacy-settings-title">Privacy Settings</h2>
        <p class="privacy-modal__status" data-privacy-status></p>
        <p class="privacy-modal__detail" data-privacy-detail></p>
        <div class="privacy-modal__actions" data-privacy-actions></div>
        <p class="privacy-modal__link-row"><a href="${privacyUrl()}">Read the privacy policy</a></p>
      </div>
    `;
    return modal;
  }

  function updateUiState() {
    const status = currentStatus();
    const triggerButtons = document.querySelectorAll("[data-open-privacy-settings]");

    triggerButtons.forEach((btn) => {
      btn.hidden = !pixelId();
    });

    if (!bannerEl || !modalEl || !statusEl || !actionAreaEl || !detailEl) return;

    bannerEl.hidden = !shouldShowBanner();

    if (status === "disabled") {
      statusEl.textContent = "Meta Pixel is not configured on this site.";
      detailEl.textContent = "No advertising measurement scripts will load.";
      actionAreaEl.innerHTML = "";
      return;
    }

    if (status === "gpc") {
      statusEl.textContent = "Meta Pixel is off because your browser sent a Global Privacy Control signal.";
      detailEl.textContent = "Sunbunny follows that signal conservatively, so Meta Pixel stays blocked on this site.";
      actionAreaEl.innerHTML = "";
      return;
    }

    if (status === STATE_ACCEPTED) {
      statusEl.textContent = "Meta Pixel is currently allowed on this browser.";
      detailEl.textContent = "Sunbunny uses it for ad measurement and download-button analytics only. You can turn it off for future page loads at any time.";
      actionAreaEl.innerHTML = '<button type="button" class="consent-btn consent-btn--secondary" data-withdraw-consent>Turn Off Meta Pixel</button>';
      actionAreaEl.querySelector("[data-withdraw-consent]")?.addEventListener("click", withdrawConsent);
      return;
    }

    if (status === STATE_REJECTED) {
      statusEl.textContent = "Meta Pixel is currently off on this browser.";
      detailEl.textContent = "Rejecting is completely fine. If you change your mind later, you can allow it here.";
      actionAreaEl.innerHTML = '<button type="button" class="consent-btn consent-btn--primary" data-allow-consent>Allow Meta Pixel</button>';
      actionAreaEl.querySelector("[data-allow-consent]")?.addEventListener("click", setAccepted);
      return;
    }

    statusEl.textContent = "Meta Pixel is waiting for your choice.";
    detailEl.textContent = "If you opt in, Sunbunny will use it to measure ad performance and download-button clicks. The site still works if you reject.";
    actionAreaEl.innerHTML = `
      <button type="button" class="consent-btn consent-btn--primary" data-allow-consent>Accept</button>
      <button type="button" class="consent-btn consent-btn--secondary" data-reject-consent>Reject</button>
    `;
    actionAreaEl.querySelector("[data-allow-consent]")?.addEventListener("click", setAccepted);
    actionAreaEl.querySelector("[data-reject-consent]")?.addEventListener("click", setRejected);
  }

  function ensureUi() {
    if (bannerEl && modalEl) return;

    bannerEl = buildBanner();
    modalEl = buildModal();
    document.body.appendChild(bannerEl);
    document.body.appendChild(modalEl);

    statusEl = modalEl.querySelector("[data-privacy-status]");
    actionAreaEl = modalEl.querySelector("[data-privacy-actions]");
    detailEl = modalEl.querySelector("[data-privacy-detail]");

    bannerEl.querySelector("[data-consent-accept]")?.addEventListener("click", setAccepted);
    bannerEl.querySelector("[data-consent-reject]")?.addEventListener("click", setRejected);

    modalEl.querySelectorAll("[data-close-privacy]").forEach((el) => {
      el.addEventListener("click", closeSettings);
    });

    document.querySelectorAll("[data-open-privacy-settings]").forEach((btn) => {
      btn.addEventListener("click", openSettings);
    });
  }

  function init() {
    if (!pixelId()) return;

    ensureUi();
    updateUiState();

    if (currentStatus() === STATE_ACCEPTED) {
      applyAcceptedConsent();
    } else {
      applyRejectedConsent();
    }
  }

  global.SunbunnyConsent = {
    openSettings,
    getStatus: currentStatus,
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);