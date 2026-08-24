(function () {
  var script = document.currentScript;
  var baseUrl = script && script.src ? new URL(script.src).origin : window.location.origin;
  var endpoint = baseUrl + "/api/track";
  var pingTimer = null;
  var pingIntervalMs = 15000;

  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function cleanOffer(value) {
    return String(value || "default")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "default";
  }

  function currentOffer() {
    var queryOffer = "";
    try {
      queryOffer = script && script.src ? new URL(script.src).searchParams.get("offer") : "";
    } catch (error) {}

    return cleanOffer(
      (script && script.dataset && script.dataset.offer) ||
      queryOffer ||
      "default"
    );
  }

  var offerSlug = currentOffer();

  function getStoredId(storage, key) {
    try {
      var id = storage.getItem(key);
      if (!id) {
        id = randomId();
        storage.setItem(key, id);
      }
      return id;
    } catch (error) {
      return randomId();
    }
  }

  function pageName() {
    var path = window.location.pathname || "/";
    if (path === "/") return "home";
    return decodeURIComponent(path.split("/").filter(Boolean).pop() || path);
  }

  function payload(type) {
    return {
      type: type,
      offerSlug: offerSlug,
      visitorId: getStoredId(window.localStorage, "tracker_visitor_id"),
      sessionId: getStoredId(window.sessionStorage, "tracker_session_id_" + offerSlug),
      path: window.location.pathname || "/",
      title: document.title || pageName(),
      url: window.location.href,
      referrer: document.referrer || ""
    };
  }

  function send(type, useBeacon) {
    var body = JSON.stringify(payload(type));

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: body
    }).catch(function () {});
  }

  send("view", false);

  pingTimer = window.setInterval(function () {
    if (document.visibilityState !== "hidden") send("ping", false);
  }, pingIntervalMs);

  window.addEventListener("pagehide", function () {
    if (pingTimer) window.clearInterval(pingTimer);
    send("leave", true);
  });
})();