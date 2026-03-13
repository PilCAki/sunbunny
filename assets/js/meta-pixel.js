(function initSunbunnyMeta(global) {
  let isBlocked = false;
  let isInitialized = false;
  let pageViewTracked = false;
  let activePixelId = "";

  function hasFbq() {
    return typeof global.fbq === "function";
  }

  function ensureSnippet() {
    if (hasFbq()) return;

    (function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(global, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  }

  function cleanPayload(payload) {
    const cleaned = {};
    for (const [key, value] of Object.entries(payload || {})) {
      if (value === undefined || value === null || value === "") continue;
      cleaned[key] = value;
    }
    return cleaned;
  }

  function loadMetaPixel(pixelId) {
    if (isBlocked || !pixelId) return false;

    ensureSnippet();

    if (activePixelId !== pixelId) {
      global.fbq("init", pixelId);
      activePixelId = pixelId;
    }

    isInitialized = true;
    return true;
  }

  function trackPageView() {
    if (isBlocked || !isInitialized || !hasFbq() || pageViewTracked) return false;
    global.fbq("track", "PageView");
    pageViewTracked = true;
    return true;
  }

  function trackPluginDownload(meta) {
    if (isBlocked || !isInitialized || !hasFbq()) return false;
    global.fbq("trackCustom", "PluginDownload", cleanPayload(meta));
    return true;
  }

  function disableTracking() {
    isBlocked = true;
  }

  function enableTracking() {
    isBlocked = false;
  }

  global.SunbunnyMeta = {
    loadMetaPixel,
    trackPageView,
    trackPluginDownload,
    disableTracking,
    enableTracking,
    hasLoaded() {
      return isInitialized && hasFbq();
    },
  };
})(window);