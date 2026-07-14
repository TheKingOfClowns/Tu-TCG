// ─── Tracking Riftbound ──────────────────────────────────────────────────
// RB-specific tracking functions. Called via dispatcher_tracking.js.
// Dependencias: script.js (cartas, getCardKey, generarId, collections, currentCollectionId)

function _esCartaAA(carta) {
  return /^\w+-\d+[asv]$/i.test(carta.card_set_id || "");
}

function getUniqueCharacterNames_RB() {
  var names = new Set();
  cartas.forEach(function(c) {
    var f = (c.feature || "").trim();
    if (!f) return;
    names.add(f);
    var slash = f.indexOf("/");
    if (slash !== -1) names.add(f.substring(0, slash));
  });
  return Array.from(names).sort();
}

function getAvailableSets_RB() {
  const groups = { booster: [], starter: [], promo: [] };
  const seen = new Set();
  cartas.forEach(c => {
    const sid = c.set_id;
    if (!sid || seen.has(sid)) return;
    const cat = c.category || "";
    if (cat === "BOOSTER" && !groups.booster.some(s => s.id === sid)) {
      groups.booster.push({ id: sid, label: c.set_name || sid });
      seen.add(sid);
    } else if (cat === "STARTER" && !groups.starter.some(s => s.id === sid)) {
      groups.starter.push({ id: sid, label: c.set_name || sid });
      seen.add(sid);
    } else if ((cat === "PROMO" || cat === "OTHER") && !groups.promo.length) {
      groups.promo.push({ id: "PROMO", label: "Promo Cards" });
      seen.add(sid);
    }
  });
  groups.booster.sort();
  groups.starter.sort();
  return groups;
}

function trackingCardPasses_RB(c, config) {
  if (config.include_aa === false) {
    if (c.is_parallel) return false;
    const pt = (c.print_type || "").toLowerCase();
    if (pt.includes("alt") || pt.includes("aa") || pt.includes("parallel")) return false;
    if ((c.rarity || c.rareza) === "AA") return false;
  }
  if (config.include_promo === false) {
    if (c.category === "PROMO" || c.category === "OTHER") return false;
  }
  return true;
}

function buildTrackingCardList_RB(type, config) {
  const cards = [];
  if (type === "expansion") {
    const sets = config.sets || [];
    const mode = config.mode || "master";
    cartas.forEach(c => {
      if (!sets.includes(c.set_id)) return;
      if (mode === "base") {
        if (c.is_parallel || _esCartaAA(c)) return;
        const pt = (c.print_type || "").toLowerCase();
        if (pt.includes("alt") || pt.includes("aa") || pt.includes("parallel")) return;
        if ((c.rarity || c.rareza) === "AA") return;
      }
      if (!trackingCardPasses_RB(c, config)) return;
      cards.push({ _key: getCardKey(c), owned: false });
    });
  } else if (type === "character") {
    const charName = (config.character || "").trim().toLowerCase();
    cartas.forEach(c => {
      var f = (c.feature || "").trim().toLowerCase();
      if (f && f.split("/").indexOf(charName) !== -1) {
        if (!trackingCardPasses_RB(c, config)) return;
        cards.push({ _key: getCardKey(c), owned: false });
      }
    });
  } else if (type === "rarity") {
    var rarities = config.rarities || [];
    var wantsAA = rarities.indexOf("AA") !== -1;
    cartas.forEach(c => {
      var rarezaRaw = c.rarity || c.rareza || "";
      var matches = rarities.includes(rarezaRaw);
      if (!matches && wantsAA && _esCartaAA(c)) matches = true;
      if (!matches) return;
      if (!trackingCardPasses_RB(c, config)) return;
      cards.push({ _key: getCardKey(c), owned: false });
    });
  }
  return cards;
}

function pedirCrearTracking_RB(preFillName) {
  if (!isAuthenticated()) { showAuthModal(); return; }
  const overlay = document.getElementById("trackingModalOverlay");
  const nameInput = document.getElementById("trackingNameInput");
  const typeSelect = document.getElementById("trackingTypeSelect");
  const extraPanel = document.getElementById("trackingExtraPanel");
  const title = document.getElementById("trackingModalTitle");
  const confirmBtn = document.getElementById("trackingModalConfirm");

  _donOption.style.display = "none";
  var charOption = typeSelect.querySelector('option[value="character"]');
  if (charOption) charOption.textContent = "Champions";
  if (_langSelect) _langSelect.style.display = "none";
  var langLabel = _langSelect ? _langSelect.previousElementSibling : null;
  if (langLabel && langLabel.tagName === "LABEL" && langLabel.textContent.toLowerCase().includes("idioma")) {
    langLabel.style.display = "none";
  }

  if (_appendTo) {
    title.textContent = "Agrega a tu coleccion";
    confirmBtn.textContent = "Agregar";
    nameInput.value = preFillName || "";
    nameInput.style.display = "none";
    nameInput.insertAdjacentHTML("afterend", `<span style="display:block;font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">${preFillName || ""}</span>`);
  } else {
    title.textContent = "Crear binder de coleccion";
    confirmBtn.textContent = "Crear";
    nameInput.value = "";
    nameInput.style.display = "";
    const appendSpan = nameInput.nextElementSibling;
    if (appendSpan && appendSpan.tagName === "SPAN") appendSpan.remove();
  }
  typeSelect.value = "expansion";
  extraPanel.innerHTML = "";
  if (_appendTo) {
    var existingCol = collections[_appendTo];
    if (existingCol && existingCol.tracking_type) {
      typeSelect.value = existingCol.tracking_type || "expansion";
    }
  }
  renderTrackingExtra_RB(typeSelect.value, extraPanel);
  if (_appendTo) {
    var existingCol2 = collections[_appendTo];
    if (existingCol2 && existingCol2.tracking_config && existingCol2.tracking_config.mode) {
      var modeSelect = document.getElementById("trackingSetMode");
      if (modeSelect) modeSelect.value = existingCol2.tracking_config.mode;
    }
  }
  overlay.style.display = "flex";
  setTimeout(function() { nameInput.focus(); }, 100);
}

function renderTrackingExtra_RB(type, panel) {
  if (type === "expansion") {
    var sets = getAvailableSets_RB();
    var allSets = sets.booster.concat(sets.starter, sets.promo);
    var groupLabels = { booster: "Booster", starter: "Starter", promo: "Promo" };
    var checkboxesHTML = Object.keys(sets).map(function(groupKey) {
      var items = sets[groupKey];
      if (!items.length) return "";
      return '<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px">' + groupLabels[groupKey] + '</span>' +
        items.map(function(s) {
          return '<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);cursor:pointer;margin:2px 6px 2px 0"><input type="checkbox" value="' + s.id + '" checked> ' + s.label + '</label>';
        }).join("") +
        '</div>';
    }).join("");
    panel.innerHTML =
      '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Expansiones (' + allSets.length + ')</label>' +
      '<div id="trackingSetCheckboxes" style="max-height:280px;overflow-y:auto;margin-bottom:var(--space-3)">' +
        checkboxesHTML +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2)">' +
        '<button class="btn-ghost btn-xs" id="trackingSelectAllSets" style="font-size:10px">Seleccionar todas</button>' +
        '<button class="btn-ghost btn-xs" id="trackingDeselectAllSets" style="font-size:10px">Ninguna</button>' +
      '</div>' +
      '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo de set</label>' +
      '<select id="trackingSetMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
        '<option value="master">Master Set — Todas las cartas</option>' +
        '<option value="base">Base Set — Sin AA / Alt Art</option>' +
      '</select>';
    document.getElementById("trackingSelectAllSets").addEventListener("click", function() {
      panel.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]").forEach(function(cb) { cb.checked = true; });
    });
    document.getElementById("trackingDeselectAllSets").addEventListener("click", function() {
      panel.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]").forEach(function(cb) { cb.checked = false; });
    });
  } else if (type === "character") {
    panel.innerHTML =
      '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Champion</label>' +
      '<input type="text" id="trackingCharacterInput" placeholder="Escribí el nombre del champion..." autocomplete="off" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
      '<div id="trackingCharSuggestions" style="max-height:150px;overflow-y:auto;margin-top:4px"></div>' +
      buildTrackingToggle("trackingIncludeAA", "Arte Alternativo", true) +
      buildTrackingToggle("trackingIncludePromo", "Promos", true);
    var charInput = document.getElementById("trackingCharacterInput");
    charInput.addEventListener("input", function() {
      var query = charInput.value.trim().toLowerCase();
      var suggestions = document.getElementById("trackingCharSuggestions");
      if (query.length < 2) { suggestions.innerHTML = ""; return; }
      var names = getUniqueCharacterNames_RB().filter(function(n) { return n.toLowerCase().includes(query); }).slice(0, 20);
      suggestions.innerHTML = names.map(function(n) {
        return '<div class="tracking-suggestion" style="padding:6px 10px;cursor:pointer;font-size:var(--text-xs);color:var(--text-secondary);border-radius:var(--radius-sm)" onmouseover="this.style.background=\'var(--bg-input)\'" onmouseout="this.style.background=\'transparent\'">' + n + '</div>';
      }).join("");
      suggestions.querySelectorAll(".tracking-suggestion").forEach(function(el) {
        el.addEventListener("click", function() { charInput.value = el.textContent; suggestions.innerHTML = ""; });
      });
    });
  } else if (type === "rarity") {
    var rarities = ["Common","Uncommon","Rare","Epic","Promo","Showcase","AA"];
    panel.innerHTML =
      '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Rarezas</label>' +
      '<div id="trackingRarityCheckboxes" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-3)">' +
        rarities.map(function(r) {
          return '<label style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-secondary);cursor:pointer"><input type="checkbox" value="' + r + '" checked> ' + r + '</label>';
        }).join("") +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2)">' +
        '<button class="btn-ghost btn-xs" id="trackingSelectAllRarities" style="font-size:10px">Todas</button>' +
        '<button class="btn-ghost btn-xs" id="trackingDeselectAllRarities" style="font-size:10px">Ninguna</button>' +
      '</div>' +
      buildTrackingToggle("trackingIncludeAA", "Arte Alternativo AA", true) +
      buildTrackingToggle("trackingIncludePromo", "Promos", true);
    document.getElementById("trackingSelectAllRarities").addEventListener("click", function() {
      panel.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]").forEach(function(cb) { cb.checked = true; });
    });
    document.getElementById("trackingDeselectAllRarities").addEventListener("click", function() {
      panel.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]").forEach(function(cb) { cb.checked = false; });
    });
  }
}

function confirmCreateTracking_RB() {
  var name = document.getElementById("trackingNameInput").value.trim();
  var type = document.getElementById("trackingTypeSelect").value;
  var config = {};
  var includeAA = document.getElementById("trackingIncludeAA") ? document.getElementById("trackingIncludeAA").classList.contains("on") : true;
  var includePromo = document.getElementById("trackingIncludePromo") ? document.getElementById("trackingIncludePromo").classList.contains("on") : true;
  if (!includeAA) config.include_aa = false;
  if (!includePromo) config.include_promo = false;
  config.language = "en";
  if (type === "expansion") {
    var sets = [];
    document.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]:checked").forEach(function(cb) { sets.push(cb.value); });
    if (!sets.length) { showToast("Selecciona al menos una expansión", "error"); return; }
    config.sets = sets;
    config.mode = document.getElementById("trackingSetMode").value;
  } else if (type === "character") {
    var charName = document.getElementById("trackingCharacterInput").value.trim();
    if (!charName) { showToast("Escribí el nombre del personaje", "error"); return; }
    config.character = charName;
  } else if (type === "rarity") {
    var rarities = [];
    document.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]:checked").forEach(function(cb) { rarities.push(cb.value); });
    if (!rarities.length) { showToast("Selecciona al menos una rareza", "error"); return; }
    config.rarities = rarities;
  }
  var newCards = buildTrackingCardList_RB(type, config);
  if (_appendTo) {
    var col = collections[_appendTo];
    if (!col || col.subtype !== "tracking") return;
    var added = 0;
    newCards.forEach(function(c) {
      if (!col.cards.some(function(existing) { return existing._key === c._key; })) {
        col.cards.push(c);
        added++;
      }
    });
    col.target = col.cards.length;
    document.getElementById("trackingModalOverlay").style.display = "none";
    _appendTo = null;
    guardarCollections();
    showToast(added + " carta(s) agregada(s)", "success");
    if (currentCollectionId === col.id) {
      var grid = document.getElementById("binderGrid");
      var t = document.getElementById("binderTitle");
      if (grid) renderTrackingBinder(col, grid, t);
    }
    return;
  }
  if (!name) return;
  if (!newCards.length) { showToast("No se encontraron cartas con esos filtros", "error"); return; }
  var id = generarId();
  collections[id] = {
    id: id, name: name, subtype: "tracking", cards: newCards, is_public: false,
    tracking_type: type, tracking_config: config, tcg: currentTcg || "riftbound"
  };
  collections[id].target = newCards.length;
  document.getElementById("trackingModalOverlay").style.display = "none";
  guardarCollections();
  showToast("Colección creada con " + newCards.length + " cartas", "success");
  renderCollectionList();
}

