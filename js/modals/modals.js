// ─── Modal Navigation State (global) ─────────────────────────────────────
window.currentNavList = [];
window.currentNavIndex = -1;

// ─── Playests / Pending helpers ───────────────────────────────────────────
function _getPlaysetMax(tcgId) {
  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[tcgId || currentTcg]);
  return (cfg && cfg.playsetMax) ? cfg.playsetMax : 4;
}
function makePendingCard(carta, count) {
  return {
    card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image,
    card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza,
    set_id: carta.set_id, producto: carta.producto, category: carta.category,
    market_price: carta.market_price, inventory_price: carta.inventory_price,
    print_type: carta.print_type, cardset: carta.cardset,
    language: carta.language, attribute: carta.attribute, feature: carta.feature, variant: carta.variant,
    count: count
  };
}
function limpiarPendientes() { pendingCards = {}; if (typeof actualizarBadgesEnPagina === "function") actualizarBadgesEnPagina(); }
// ─── Create / Rename Modal ──────────────────────────────────────────────
// Create / Rename Modal
function showCreateModal(opts) {
  const overlay = document.getElementById("createModalOverlay");
  const input = document.getElementById("createModalInput");
  const title = document.getElementById("createModalTitle");
  const confirmBtn = document.getElementById("createModalConfirm");
  const extra = document.getElementById("createModalExtra");
  title.textContent = opts.title || t("modal.create");
  confirmBtn.textContent = opts.confirmText || t("modal.create");
  input.placeholder = opts.placeholder || t("modal.name_placeholder");
  input.value = opts.initialValue || "";
  extra.innerHTML = opts.extraHTML || "";
  _createCallback = opts.onConfirm || null;
  overlay.style.display = "flex";
  setTimeout(() => input.focus(), 100);
  input.select();
}
function confirmCreateModal() {
  const input = document.getElementById("createModalInput");
  const nombre = input.value.trim();
  if (!nombre) { input.focus(); input.style.borderColor = "var(--danger)"; setTimeout(() => input.style.borderColor = "", 1500); return; }
  if (_createCallback) _createCallback(nombre);
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}
function hideCreateModal() {
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}
// ─── Deck card-adding helpers (per-TCG) ──────────────────────────────────

function _confirmAddDeck_RB(col, pc, key) {
  var cardType = pc.card_type || "";
  if (cardType === "Legend") {
    if (col.legend && !confirm(t("modal.replace_legend"))) return;
    col.legend = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, feature: pc.feature, customPrice: 0 };
  } else if (cardType === "Rune") {
    var runesTotal = (col.runes || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    if (runesTotal + pc.count > 12) { alert(t("modal.runes_max", {n: 12 - runesTotal})); return; }
    if (!col.runes) col.runes = [];
    var existing = (col.runes || []).find(function(c) { return c._key === key; });
    if (existing) { existing.quantity = (existing.quantity || 1) + pc.count; }
    else { col.runes.push({ _key: key, quantity: pc.count, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, customPrice: 0 }); }
  } else if (cardType === "Battlefield") {
    var bfTotal = (col.battlefields || []).length;
    if (bfTotal >= 3) { alert(t("modal.battlefields_max")); return; }
    if (!col.battlefields) col.battlefields = [];
    var bfExist = (col.battlefields || []).find(function(b) { return b.card_name === pc.card_name; });
    if (bfExist) { alert(t("modal.battlefield_dup")); return; }
    col.battlefields.push({ _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, customPrice: 0 });
  } else if (cardType === "Unit" && pc.attribute === "Champion") {
    if (!col.champions) col.champions = [];
    var champTotal = col.champions.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    var mainTotalCh = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    if (champTotal + mainTotalCh + pc.count > 40) { alert(t("modal.main40_left", {n: 40 - champTotal - mainTotalCh})); return; }
    if (col.champions.length >= 3 && !col.champions.find(function(ch) { return ch._key === key; })) { alert(t("modal.champions_max")); return; }
    var nameCountCh = col.champions.filter(function(ch) { return ch.card_name === pc.card_name; }).reduce(function(s, ch) { return s + (ch.quantity || 1); }, 0);
    if (nameCountCh + pc.count > 3) { alert(t("modal.max_copies", {n: 3, name: pc.card_name || ""})); return; }
    var exCh = col.champions.find(function(ch) { return ch._key === key; });
    if (exCh) { exCh.quantity = Math.min((exCh.quantity || 1) + pc.count, 3); }
    else { col.champions.push({ _key: key, quantity: Math.min(pc.count, 3), card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, attribute: "Champion", customPrice: 0 }); }
  } else {
    if (col.legend && pc.card_color && col.legend.card_color) {
      var lc = col.legend.card_color.split("/").map(function(s) { return s.trim(); });
      if (!lc.some(function(c) { return pc.card_color.indexOf(c) >= 0; })) {
        if (!confirm(t("modal.color_mismatch_legend"))) return;
      }
    }
    var champTotalElse = (col.champions || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    var mainTotal = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    var newTotal = champTotalElse + mainTotal + pc.count;
    if (newTotal > 40) { alert(t("modal.main40_left", {n: 40 - champTotalElse - mainTotal})); return; }
    var nameCount = (col.cards || []).filter(function(c) { return c.card_name === pc.card_name; }).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    if (nameCount + pc.count > 3) { alert(t("modal.max_copies", {n: 3, name: pc.card_name || ""})); return; }
    var ex = (col.cards || []).find(function(c) { return c._key === key; });
    if (ex) { ex.quantity = Math.min((ex.quantity || 1) + pc.count, 3); }
    else {
      col.cards = col.cards || [];
      col.cards.push({ _key: key, quantity: Math.min(pc.count, 3), card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset, customPrice: 0 });
    }
  }
}

function _confirmAddDeck_OP(col, pc, key) {
  var cardType = pc.card_type || "";
  if (pc.language !== "en") { alert(t("modal.only_english")); return; }
  if (cardType === "LEADER") {
    if (col.leader && !confirm(t("modal.replace_leader"))) return;
    col.leader = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, customPrice: 0 };
  } else if (cardType === "DON!!" || cardType === "DON") {
    var donCount = col.dons ? col.dons.length : 0;
    if (donCount + pc.count > 10) { alert(t("modal.don_max")); return; }
    if (!col.dons) col.dons = [];
    for (var i = 0; i < pc.count; i++) {
      col.dons.push({ _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, customPrice: 0 });
    }
  } else {
    if (col.leader && pc.card_color && col.leader.card_color) {
      var lc = col.leader.card_color ? col.leader.card_color.split("/").map(function(s) { return s.trim(); }) : [];
      if (!lc.some(function(c) { return (pc.card_color || "").indexOf(c) >= 0; })) {
        if (!confirm(t("modal.color_mismatch_leader"))) return;
      }
    }
    var mainTotal = col.cards.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
    var newTotal = mainTotal + pc.count;
    if (newTotal > 50) { alert(t("modal.deck50_left", {n: 50 - mainTotal})); return; }
    var existing = col.cards.find(function(c) { return c._key === key; });
    if (existing) {
      if (isUnlimited(pc)) { existing.quantity = (existing.quantity || 1) + pc.count; }
      else { existing.quantity = Math.min((existing.quantity || 1) + pc.count, 4); }
    } else {
      var defQty = isUnlimited(pc) ? pc.count : Math.min(pc.count, 4);
      col.cards.push({ _key: key, quantity: defQty, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset, customPrice: 0 });
    }
  }
}

function _confirmAddDeck_PK(col, pc, key) {
  // PK deck: 60 max, 4 copies per card_name, simple flat deck
  var mainTotal = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  var newTotal = mainTotal + (pc.count || 1);
  if (newTotal > 60) { alert(t("modal.deck60_left", {n: 60 - mainTotal})); return; }
  var nameCount = (col.cards || []).filter(function(c) { return c.card_name === pc.card_name; }).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  if (nameCount + (pc.count || 1) > 4) { alert(t("modal.max_copies", {n: 4, name: pc.card_name || ""})); return; }
  var existing = (col.cards || []).find(function(c) { return c._key === key; });
  if (existing) {
    existing.quantity = Math.min((existing.quantity || 1) + (pc.count || 1), 4);
  } else {
    col.cards = col.cards || [];
    col.cards.push({ _key: key, quantity: Math.min(pc.count || 1, 4), card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset, customPrice: 0 });
  }
}

async function addPendingCardsToCol(col, isVenta) {
  var pendingTotal = Object.values(pendingCards).reduce(function(s, pc) { return s + (pc.count || 1); }, 0);
  if (typeof overCardCap === "function" && await overCardCap(col, pendingTotal)) {
    const plan = (typeof getMyPlan === "function") ? await getMyPlan() : null;
    if (typeof showToast === "function") showToast(upsellMsg("cards", plan), "error");
    return 0;
  }
  var addedTotal = 0;
  if (col.subtype === "deck") {
    var _deckTcg = col.tcg || "one-piece";
    var dispatchFn = window["_confirmAddDeck_" + (typeof tcgShort === "function" ? tcgShort(_deckTcg) : "OP")];
    Object.values(pendingCards).forEach(function(pc) {
      var key = getCardKey(pc);
      if (typeof dispatchFn === "function") dispatchFn(col, pc, key, _deckTcg);
      addedTotal += pc.count || 1;
    });
    if (isVenta) guardarVenta(); else guardarCollections();
    return addedTotal;
  }
  if (col.subtype === "tracking") {
    Object.values(pendingCards).forEach(pc => {
      const key = getCardKey(pc);
      if (!col.cards.some(c => c._key === key)) {
        col.cards.push({ _key: key, owned: false });
        addedTotal++;
      }
    });
    col.target = col.cards.length;
    guardarCollections();
    return addedTotal;
  }
  const isGrouped = isVenta && (col.display_mode === "playset" || col.display_mode === "editable");
  const colTcg = col.tcg || "one-piece";
  const playsetMax = _getPlaysetMax(colTcg);
  Object.values(pendingCards).forEach(pc => {
    const key = getCardKey(pc);
    if (isGrouped) {
      const maxPerStack = col.display_mode === "playset" ? playsetMax : 999;
      var remaining = pc.count;
      var cards = col.cards || [];
      for (var ci = 0; ci < cards.length && remaining > 0; ci++) {
        var existing = cards[ci];
        if (existing._key !== key) continue;
        var space = maxPerStack - (existing.quantity || 1);
        if (space <= 0) continue;
        var add = Math.min(remaining, space);
        existing.quantity = (existing.quantity || 1) + add;
        remaining -= add;
        addedTotal += add;
      }
      while (remaining > 0) {
        var qty = Math.min(remaining, maxPerStack);
        cards.push({ _key: key, quantity: qty, customPrice: 0, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset });
        remaining -= qty;
        addedTotal += qty;
      }
      col.cards = cards;
    } else {
      const maxCount = (isVenta && col.display_mode === "playset") ? Math.min(pc.count, playsetMax) : pc.count;
      for (let i = 0; i < maxCount; i++) {
        const entry = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset };
        if (isVenta) entry.customPrice = 0;
        col.cards.push(entry);
        addedTotal++;
      }
    }
  });
  if (isVenta) guardarVenta(); else guardarCollections();
  return addedTotal;
}
// ─── Pegar lista al deck ────────────────────────────────────────────────
// ponytail: parser tolerante + pre-pass de líder; la inserción real la hace addPendingCardsToCol
var _pasteCol = null, _pasteIsSale = false, _pasteReRender = null;
function parseDeckListLine(line) {
  var raw = line;
  line = (line || "").trim();
  if (!line) return null;
  var qty = null, m;
  m = line.match(/^[x×]\s*(\d+)\s+(.+)$/);
  if (m) { qty = parseInt(m[1], 10); line = m[2].trim(); }
  m = line.match(/\s*[x×]\s*(\d+)\s*$/);
  if (m) { if (qty == null) qty = parseInt(m[1], 10); line = line.slice(0, m.index).trim(); }
  m = line.match(/^(\d+)\s*[x×]\s+(.+)$/);
  if (m && qty == null) { qty = parseInt(m[1], 10); line = m[2].trim(); }
  m = line.match(/^(\d+)\s+([A-Za-z].*)$/);
  if (m && qty == null) { qty = parseInt(m[1], 10); line = m[2].trim(); }
  // ponytail: formato página "CANT SET-NUM Nombre"; el nombre se ignora
  var id = null;
  if (line.indexOf("-") >= 0 || line.indexOf("–") >= 0) {
    m = line.match(/^([A-Za-z]+)\s*(\d*)\s*[-–]\s*(\d+)\s*([A-Za-z]?)(?:\s+.*)?$/);
    if (!m) return { raw: raw, error: "formato" };
    id = m[1].toUpperCase() + m[2] + "-" + _padDeckNum(m[3]) + (m[4] ? m[4].toLowerCase() : "");
  } else {
    m = line.match(/^([A-Za-z]+)\s+(\d+)\s+(\d+)([A-Za-z])?(?:\s*[x×]\s*(\d+))?(?:\s+.*)?$/);
    if (m) {
      if (qty == null && m[5]) qty = parseInt(m[5], 10);
      id = m[1].toUpperCase() + m[2] + "-" + _padDeckNum(m[3]) + (m[4] ? m[4].toLowerCase() : "");
    } else {
      m = line.match(/^([A-Za-z]+)\s+(\d+)([A-Za-z])?(?:\s*[x×]\s*(\d+))?(?:\s+.*)?$/);
      if (!m) return { raw: raw, error: "formato" };
      if (qty == null && m[4]) qty = parseInt(m[4], 10);
      id = m[1].toUpperCase() + "-" + _padDeckNum(m[2]) + (m[3] ? m[3].toLowerCase() : "");
    }
  }
  return { raw: raw, id: id, qty: qty || 1 };
}
function _padDeckNum(n) { return n.length < 3 ? ("00" + n).slice(-3) : n; }
function resolveDeckListCard(entry, tcgId) {
  var pool = (typeof cartas !== "undefined" ? cartas : []).filter(function(c) {
    return c && c.card_set_id === entry.id && (tcgId !== "one-piece" || c.language === "en");
  });
  if (!pool.length) return null;
  return pool.find(function(c) { return !c.is_parallel; }) || pool[0];
}
function _pasteDeckTotals(col) {
  var t = { main: 0, champs: 0, runes: 0 };
  (col.cards || []).forEach(function(c) { t.main += (c.quantity || 1); });
  (col.champions || []).forEach(function(c) { t.champs += (c.quantity || 1); });
  (col.runes || []).forEach(function(c) { t.runes += (c.quantity || 1); });
  return t;
}
async function pasteDeckList(col, isSale, text, reRender) {
  if (!col) return;
  var tcgId = col.tcg || (typeof currentTcg !== "undefined" ? currentTcg : "one-piece");
  var short = (typeof tcgShort === "function") ? tcgShort(tcgId) : "OP";
  var parsed = [], skipped = [];
  String(text || "").split(/\r?\n/).forEach(function(ln) {
    if (!ln.trim()) return;
    var p = parseDeckListLine(ln);
    if (!p) return;
    if (p.error) skipped.push({ raw: p.raw.trim(), reason: t("modal.reason_format") });
    else parsed.push(p);
  });
  if (!parsed.length) { if (typeof showToast === "function") showToast(t("modal.no_valid_lines"), "error"); return; }
  var items = [];
  parsed.forEach(function(p) {
    var carta = resolveDeckListCard(p, tcgId);
    if (!carta) { skipped.push({ raw: p.raw.trim(), reason: t("modal.reason_not_found") }); return; }
    if (carta.card_type === "DON!!" || carta.card_type === "DON" || carta.category === "DON") { skipped.push({ raw: p.raw.trim(), reason: t("modal.reason_don") }); return; }
    items.push({ carta: carta, qty: p.qty, raw: p.raw.trim() });
  });
  var isLeaderCard = function(c) { return c.card_type === "LEADER" || c.card_type === "Legend"; };
  var leaders = items.filter(function(it) { return isLeaderCard(it.carta); });
  var rest = items.filter(function(it) { return !isLeaderCard(it.carta); });
  var pastedLeader = leaders.length ? leaders[0].carta : null;
  for (var li = 1; li < leaders.length; li++) skipped.push({ raw: leaders[li].raw, reason: t("modal.reason_leader_ignored") });
  var curLeader = short === "RB" ? (col.legend || null) : (short === "PK" ? null : (col.leader || null));
  if (pastedLeader && short !== "PK") {
    if (curLeader && curLeader._key === getCardKey(pastedLeader)) {
      skipped.push({ raw: leaders[0].raw, reason: t("modal.reason_leader_in_deck") });
      pastedLeader = null;
    } else if (curLeader && !confirm(t("modal.replace_leader"))) {
      return;
    }
  }
  var finalLeader = pastedLeader || curLeader;
  var addedCount = 0;
  if (pastedLeader) {
    var lk = getCardKey(pastedLeader);
    if (short === "RB") col.legend = { _key: lk, card_set_id: pastedLeader.card_set_id, card_name: pastedLeader.card_name, card_image: pastedLeader.card_image, card_color: pastedLeader.card_color, card_type: pastedLeader.card_type, set_id: pastedLeader.set_id, feature: pastedLeader.feature, customPrice: 0 };
    else col.leader = { _key: lk, card_set_id: pastedLeader.card_set_id, card_name: pastedLeader.card_name, card_image: pastedLeader.card_image, card_color: pastedLeader.card_color, card_type: pastedLeader.card_type, set_id: pastedLeader.set_id, customPrice: 0 };
    addedCount++;
  }
  var eligible = [];
  rest.forEach(function(it) {
    var pc = it.carta, ok = true;
    if (finalLeader && finalLeader.card_color && pc.card_color) {
      var lc = String(finalLeader.card_color).split("/").map(function(s) { return s.trim(); });
      ok = lc.some(function(c) { return String(pc.card_color).indexOf(c) >= 0; });
    }
    if (!ok) skipped.push({ raw: it.raw, reason: t("modal.reason_off_color") });
    else eligible.push(it);
  });
  if (typeof limpiarPendientes === "function") limpiarPendientes();
  var totals = _pasteDeckTotals(col);
  var zoneMain = short === "OP" ? 50 - totals.main : (short === "RB" ? 40 - totals.champs - totals.main : 60 - totals.main);
  var zoneRune = 12 - totals.runes;
  var byId = {}, byName = {};
  (col.cards || []).forEach(function(c) {
    if (c.card_set_id) byId[c.card_set_id] = (byId[c.card_set_id] || 0) + (c.quantity || 1);
    if (c.card_name) byName[c.card_name] = (byName[c.card_name] || 0) + (c.quantity || 1);
  });
  if (short === "RB") (col.champions || []).forEach(function(c) {
    if (c.card_name) byName[c.card_name] = (byName[c.card_name] || 0) + (c.quantity || 1);
  });
  eligible.forEach(function(it) {
    var c = it.carta, applied = 0;
    if (short === "RB" && c.card_type === "Rune") {
      applied = Math.min(it.qty, zoneRune);
      zoneRune -= Math.max(applied, 0);
    } else if (short === "RB" && c.card_type === "Battlefield") {
      applied = Math.min(it.qty, 1);
    } else {
      var copyMax = short === "OP" ? ((typeof isUnlimited === "function" && isUnlimited(c)) ? Infinity : 4) : (short === "RB" ? 3 : 4);
      var have = short === "OP" ? (byId[c.card_set_id] || 0) : (byName[c.card_name] || 0);
      applied = Math.min(it.qty, copyMax - have, zoneMain);
      if (applied > 0) {
        zoneMain -= applied;
        if (short === "OP") byId[c.card_set_id] = have + applied;
        else byName[c.card_name] = have + applied;
      }
    }
    if (applied <= 0) { skipped.push({ raw: it.raw, reason: t("modal.reason_capped") }); return; }
    if (applied < it.qty) skipped.push({ raw: it.raw, reason: t("modal.reason_trimmed", {n: applied}) });
    var key = getCardKey(c);
    if (pendingCards[key]) pendingCards[key].count += applied;
    else pendingCards[key] = makePendingCard(c, applied);
    addedCount += applied;
  });
  if (!Object.keys(pendingCards).length) {
    if (typeof showToast === "function") showToast(t("modal.nothing_to_add") + _pasteSkippedSuffix(skipped), "info");
    return;
  }
  var done = await addPendingCardsToCol(col, !!isSale);
  if (typeof limpiarPendientes === "function") limpiarPendientes();
  if (!done) return; // overCardCap ya avisó con upsell
  if (typeof reRender === "function") reRender();
  if (typeof showToast === "function") showToast(t("modal.added_to_deck", {n: addedCount}) + _pasteSkippedSuffix(skipped), addedCount ? "success" : "info");
}
function _pasteSkippedSuffix(skipped) {
  if (!skipped.length) return "";
  var det = skipped.slice(0, 6).map(function(s) { return s.raw + " (" + s.reason + ")"; }).join("; ");
  return t("modal.paste_skipped", {n: skipped.length, det: det, extra: skipped.length > 6 ? "…" : ""});
}
// ─── Exportar deck (espejo del import: líder + main, orden del deck) ────
function _deckExportLines(col) {
  var lines = [];
  if (!col) return lines;
  var tcgId = col.tcg || (typeof currentTcg !== "undefined" ? currentTcg : "one-piece");
  var short = (typeof tcgShort === "function") ? tcgShort(tcgId) : "OP";
  var leader = short === "RB" ? col.legend : (short === "PK" ? null : col.leader);
  if (leader && leader.card_set_id) lines.push("1 " + leader.card_set_id + " " + (leader.card_name || ""));
  (col.cards || []).forEach(function(c) {
    if (!c.card_set_id) return;
    var full = (typeof cartasMap !== "undefined" && c._key) ? cartasMap[c._key] : null;
    lines.push((c.quantity || 1) + " " + c.card_set_id + " " + (c.card_name || (full && full.card_name) || "").trim());
  });
  return lines;
}
function exportDeckToClipboard(col) {
  var lines = _deckExportLines(col);
  if (!lines.length) { if (typeof showToast === "function") showToast(t("modal.deck_empty"), "info"); return; }
  var text = lines.join("\n");
  function done() { if (typeof showToast === "function") showToast(t("modal.list_copied", {n: lines.length}), "success"); }
  function fail() { if (typeof showToast === "function") showToast(t("modal.copy_failed"), "error"); }
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function() { _pasteFallbackCopy(text) ? done() : fail(); });
  } else if (_pasteFallbackCopy(text)) done();
  else fail();
}
function _pasteFallbackCopy(text) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
function openPasteListModal(col, isSale, reRender) {
  _pasteCol = col || null; _pasteIsSale = !!isSale; _pasteReRender = reRender || null;
  var ta = document.getElementById("pasteListInput");
  if (ta) ta.value = "";
  document.getElementById("pasteListModal").style.display = "flex";
  setTimeout(function() { var t = document.getElementById("pasteListInput"); if (t) t.focus(); }, 50);
}
async function submitPasteListModal() {
  var ta = document.getElementById("pasteListInput");
  var text = ta ? ta.value : "";
  document.getElementById("pasteListModal").style.display = "none";
  if (text.trim()) await pasteDeckList(_pasteCol, _pasteIsSale, text, _pasteReRender);
  _pasteCol = null; _pasteReRender = null;
}
function hidePasteListModal() {
  document.getElementById("pasteListModal").style.display = "none";
  _pasteCol = null; _pasteReRender = null;
}
function renderModalInfo(carta) {
  const efecto = (carta.effect || "").replace(/\n/g, "<br>");
  const rareza = obtenerRareza(carta);
  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) || {};
  var colorNames = cfg.colorNames || {};
  var color = carta.card_color ? (colorNames[carta.card_color] || carta.card_color) : "";
  var setDisplay;
  if ((carta.category === "PROMO" || carta.category === "OTHER") && carta.set_name) {
    setDisplay = carta.set_name;
  } else if (cfg.expansionNames && cfg.expansionNames[carta.set_id]) {
    setDisplay = cfg.expansionNames[carta.set_id];
  } else if (carta.set_name) {
    setDisplay = carta.set_name;
  } else {
    setDisplay = carta.set_id || "";
  }
  document.getElementById("modalMainImg").src = carta.card_image || 'TUTCG.webp';
  document.getElementById("modalInfoCol").innerHTML = `
    <h2 class="modal-name">${formatearNombre(carta)}</h2>
    <span class="modal-set-id">${(carta.category || carta.producto) === "DON" ? (carta.variant || carta.set_id || "") : (carta.card_set_id || "")}</span>
    <div class="modal-info-grid">
      ${rareza ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.rarity")}</span><span>${rareza}</span></div>` : ""}
      ${carta.print_type ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.type")}</span><span>${carta.print_type}</span></div>` : ""}
      ${color ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.color")}</span><span>${color}</span></div>` : ""}
      ${carta.cost ? `<div class="modal-info-item"><span class="modal-info-label">${t(carta.card_type === "LEADER" ? "modal.life" : "modal.cost")}</span><span>${carta.cost}</span></div>` : ""}
      ${carta.power ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.power")}</span><span>${carta.power}</span></div>` : ""}
      ${carta.counter && carta.counter !== "-" ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.counter")}</span><span>${carta.counter}</span></div>` : ""}
      ${carta.attribute ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.attribute")}</span><span>${carta.attribute}</span></div>` : ""}
      ${carta.set_id ? `<div class="modal-info-item"><span class="modal-info-label">${t("modal.set")}</span><span>${setDisplay}${rareza === "Reprint" ? t("modal.reprint_suffix") : ""}</span></div>` : ""}
    </div>
    ${efecto ? `<div class="modal-effect"><span class="modal-info-label">${t("modal.effect")}</span><p>${efecto}</p></div>` : ""}
  `;
}
function openCardInModal(carta, navList, startIdx) {
  if (!carta) return;
  if (carta._key && !carta.card_image) {
    carta = cartasMap[carta._key] || carta;
  }
  const isLeader = carta.card_type === "LEADER";
  const leaderVariants = isLeader
    ? cartas.filter(c => c.card_set_id === carta.card_set_id && c.card_type === "LEADER")
    : [];
  const useVariantNav = isLeader && leaderVariants.length > 1;
  const list = navList || (window.currentPageCards || cartasFiltradas);
  if (!list || !list.length) return;
  if (navList && startIdx != null) {
    window.currentNavIndex = startIdx;
  } else {
    window.currentNavIndex = list.findIndex(c => getCardKey(c) === getCardKey(carta));
  }
  if (window.currentNavIndex === -1) window.currentNavIndex = 0;
  window.currentNavList = list;
  const variants = cartas.filter(c =>
    c.card_set_id === carta.card_set_id &&
    c.language === carta.language &&
    getCardKey(c) !== getCardKey(carta)
  );
  let infoHTML = `
    <div class="modal-nav-wrap">
      <button class="modal-nav-btn prev-btn" data-dir="prev">&#8249;</button>
      <div class="modal-nav-content">
        <div class="modal-layout">
          <div class="modal-image-col">
            <img src="${carta.card_image || 'TUTCG.webp'}" class="modal-main-img" id="modalMainImg">
          </div>
          <div class="modal-info-col" id="modalInfoCol">
          </div>
        </div>`;
  if (variants.length) {
    infoHTML += `<div class="modal-variants"><span class="modal-variants-label">${t("modal.variants")}</span><div class="modal-variants-list">`;
    infoHTML += `<div class="modal-variant-item selected" data-cardkey="${getCardKey(carta)}">
      <img src="${carta.card_image || 'TUTCG.webp'}" title="${t("modal.current")}">
    </div>`;
    variants.forEach(v => {
      infoHTML += `<div class="modal-variant-item" data-cardkey="${getCardKey(v)}">
        <img src="${v.card_image || 'TUTCG.webp'}" title="${formatearNombre(v)}">
      </div>`;
    });
    infoHTML += `</div></div>`;
  }
  infoHTML += `</div>
    <button class="modal-nav-btn next-btn" data-dir="next">&#8250;</button>
  </div>`;
  const body = document.getElementById("modalBody");
  body.innerHTML = infoHTML;
  modal.style.display = "flex";
  renderModalInfo(carta);
  body.querySelectorAll(".modal-variant-item").forEach(item => {
    item.addEventListener("click", () => {
      const key = item.getAttribute("data-cardkey");
      const v = key ? cartasMap[key] : null;
      if (v) {
        renderModalInfo(v);
        body.querySelectorAll(".modal-variant-item").forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
      }
    });
  });
  body.querySelectorAll(".modal-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      const len = window.currentNavList.length;
      const newIdx = ((dir === 'prev' ? window.currentNavIndex - 1 : window.currentNavIndex + 1) + len) % len;
      const nextCarta = window.currentNavList[newIdx];
      if (!nextCarta) return;
      const fullCarta = nextCarta._key ? (cartasMap[nextCarta._key] || nextCarta) : nextCarta;
      window.currentNavIndex = newIdx;
      openCardInModal(fullCarta, window.currentNavList, newIdx);
    });
  });
}
function abrirModal(imgEl) {
  if (typeof addingToBinderId !== "undefined" && addingToBinderId) {
    let cardEl = imgEl && imgEl.closest ? imgEl.closest(".card") : null;
    let cardKey = cardEl && cardEl.getAttribute("data-cardkey");
    if (cardKey) {
      var carta = cartasMap[cardKey];
      if (carta) addCardToPending(carta, cardKey);
    }
    return;
  }
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  const cardKey = cardEl?.getAttribute("data-cardkey");
  if (cardKey) {
    const carta = cartasMap[cardKey];
    if (carta) openCardInModal(carta);
  }
}

function addCardToPending(carta, key) {
  if (pendingCards[key]) { if (pendingCards[key].count < 10) pendingCards[key].count++; }
  else {
    pendingCards[key] = makePendingCard(carta, 1);
  }
  if (typeof actualizarBadgesEnPagina === "function") actualizarBadgesEnPagina();
}

// ─── Event listeners (registered here so functions exist at load time) ────
document.getElementById("createModalConfirm")?.addEventListener("click", confirmCreateModal);
document.getElementById("createModalCancel")?.addEventListener("click", hideCreateModal);
document.getElementById("createModalOverlay")?.addEventListener("click", function(e) { if (e.target === e.currentTarget) hideCreateModal(); });
document.getElementById("createModalInput")?.addEventListener("keydown", function(e) { if (e.key === "Enter") { e.preventDefault(); confirmCreateModal(); } });

// ─── Catalog "Agregar cartas" banner events (deck flow) ──────────────────
// ponytail: closures con guard — script.js carga después que este archivo
document.getElementById("catalogAddCancel")?.addEventListener("click", function() { if (typeof limpiarAddingState === "function") limpiarAddingState(); });
document.getElementById("catalogAddConfirm")?.addEventListener("click", async function() {
  if (!addingToBinderId || !Object.keys(pendingCards).length) return;
  var type = addingToBinderType;
  var target = (type === "venta") ? ventaCols : collections;
  var col = target[addingToBinderId];
  if (!col) return;
  const added = await addPendingCardsToCol(col, type === "venta");
  if (!added) return;
  limpiarPendientes();
  var id = addingToBinderId;
  limpiarAddingState();
  if (type === "venta") { currentVentaId = id; ventaPage = 1; navigateToView("venta", {id: id}, {}); }
  else { currentCollectionId = id; binderPage = 1; navigateToView("binder", {id: id}, {}); }
});
document.getElementById("catalogAddBack")?.addEventListener("click", function() {
  var id = addingToBinderId; var type = addingToBinderType;
  limpiarAddingState();
  if (type === "venta") { currentVentaId = id; ventaPage = 1; navigateToView("venta", {id: id}, {}); }
  else { currentCollectionId = id; binderPage = 1; navigateToView("binder", {id: id}, {}); }
});
// ─── Pegar lista al deck ────────────────────────────────────────────────
document.getElementById("pasteListConfirm")?.addEventListener("click", submitPasteListModal);
document.getElementById("pasteListCancel")?.addEventListener("click", hidePasteListModal);
document.getElementById("pasteListModal")?.addEventListener("click", function(e) { if (e.target === e.currentTarget) hidePasteListModal(); });
