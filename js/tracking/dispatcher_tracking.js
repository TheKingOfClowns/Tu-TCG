// ─── Tracking Dispatcher ─────────────────────────────────────────────────
// Routes tracking functions to the correct TCG implementation.
// Saves OP originals and dispatches to _OP / _RB / _PK prefixed functions.

(function() {
  // ── Save OP originals ──────────────────────────────────────────────────
  var _pedirCrearTracking_OP = pedirCrearTracking;
  var _renderTrackingExtra_OP = renderTrackingExtra;
  var _getAvailableSets_OP = getAvailableSets;
  var _buildTrackingCardList_OP = buildTrackingCardList;
  var _trackingCardPasses_OP = trackingCardPasses;
  var _confirmCreateTracking_OP = confirmCreateTracking;

  // ── DOM refs shared between TCG dispatchers ────────────────────────────
  var _donOption = (function() {
    var ts = document.getElementById("trackingTypeSelect");
    return ts ? ts.querySelector('option[value="don"]') : null;
  })();
  var _langSelect = document.getElementById("trackingLangSelect");

  // ── Suffix resolver ────────────────────────────────────────────────────
  var _suffixMap = { "one-piece":"OP", "riftbound":"RB", "pokemon":"PK" };
  function _suffix() {
    return (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) ? (_suffixMap[currentTcg] || "OP") : "OP";
  }

  // ── pedirCrearTracking ─────────────────────────────────────────────────
  window.pedirCrearTracking = function pedirCrearTracking(preFillName) {
    var typeSelect = document.getElementById("trackingTypeSelect");
    var charOption = typeSelect ? typeSelect.querySelector('option[value="character"]') : null;
    var langLabel = _langSelect ? _langSelect.previousElementSibling : null;
    var ts = document.getElementById("trackingTypeSelect");

    if (typeSelect && _donOption && !typeSelect.querySelector('option[value="don"]')) {
      typeSelect.appendChild(_donOption);
    }
    _donOption.style.display = "";
    if (charOption) charOption.textContent = "Personaje/s";
    if (_langSelect) _langSelect.style.display = "";
    if (langLabel && langLabel.tagName === "LABEL" && langLabel.textContent.toLowerCase().includes("idioma")) {
      langLabel.style.display = "";
    }

    var su = _suffix();
    var fn = window["pedirCrearTracking_" + su];
    if (typeof fn === "function") return fn(preFillName);
    return _pedirCrearTracking_OP(preFillName);
  };

  // ── renderTrackingExtra ────────────────────────────────────────────────
  window.renderTrackingExtra = function renderTrackingExtra(type, panel) {
    var su = _suffix();
    var fn = window["renderTrackingExtra_" + su];
    if (typeof fn === "function") return fn(type, panel);
    return _renderTrackingExtra_OP(type, panel);
  };

  // ── getAvailableSets ───────────────────────────────────────────────────
  window.getAvailableSets = function getAvailableSets() {
    var su = _suffix();
    var fn = window["getAvailableSets_" + su];
    if (typeof fn === "function") return fn();
    return _getAvailableSets_OP();
  };

  // ── buildTrackingCardList ──────────────────────────────────────────────
  window.buildTrackingCardList = function buildTrackingCardList(type, config) {
    var su = _suffix();
    var fn = window["buildTrackingCardList_" + su];
    if (typeof fn === "function") return fn(type, config);
    return _buildTrackingCardList_OP(type, config);
  };

  // ── trackingCardPasses ─────────────────────────────────────────────────
  window.trackingCardPasses = function trackingCardPasses(c, config) {
    var su = _suffix();
    var fn = window["trackingCardPasses_" + su];
    if (typeof fn === "function") return fn(c, config);
    return _trackingCardPasses_OP(c, config);
  };

  // ── confirmCreateTracking ──────────────────────────────────────────────
  window.confirmCreateTracking = function confirmCreateTracking() {
    var su = _suffix();
    var fn = window["confirmCreateTracking_" + su];
    if (typeof fn === "function") return fn();
    return _confirmCreateTracking_OP();
  };

  // ── Re-bind event listeners that captured OP function references ───────
  var createBtn = document.getElementById("createTrackingBtn");
  var confirmBtn = document.getElementById("trackingModalConfirm");
  if (createBtn) {
    createBtn.removeEventListener("click", _pedirCrearTracking_OP);
    createBtn.addEventListener("click", pedirCrearTracking);
  }
  if (confirmBtn) {
    confirmBtn.removeEventListener("click", _confirmCreateTracking_OP);
    confirmBtn.addEventListener("click", confirmCreateTracking);
  }
})();
