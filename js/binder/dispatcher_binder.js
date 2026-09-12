// ─── Binder Dispatcher ────────────────────────────────────────────────────
// Routes binder functions to the correct TCG implementation.

(function() {
  function _fn(name) {
    var s = (typeof tcgShort === "function") ? tcgShort(currentTcg) : null;
    return (s && window[name + "_" + s]) || window[name + "_OP"];
  }

  window.pedirCrearColeccion = async function pedirCrearColeccion() {
    if (typeof guardSpaceForNew === "function" && !(await guardSpaceForNew())) return;
    return _fn("pedirCrearColeccion")();
  };

  window.renderCollectionList = function renderCollectionList() {
    return _fn("renderCollectionList")();
  };

  window.renderBinder = function renderBinder() {
    return _fn("renderBinder")();
  };
})();

// Event listener: registered here because pedirCrearColeccion is defined in this file
document.getElementById("createCollectionBtn")?.addEventListener("click", pedirCrearColeccion);

// Binder view events: registered here because renderBinder is defined in this file
document.getElementById("binderClearPageBtn")?.addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  if (col.subtype === "tracking") return;
  if (col.subtype === "deck") {
    if (!col.cards.length) return;
    const total = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
    if (confirm(`¿Vaciar las ${total} cartas del deck?`)) {
      col.cards = [];
      guardarCollections(); renderBinder();
    }
    return;
  }
  const _pgSize = pageSizeFor(document.getElementById("binderGrid"), 3).size;
  const start = (binderPage - 1) * _pgSize;
  const end = Math.min(start + _pgSize, col.cards.length);
  if (start >= col.cards.length) return;
  if (confirm("Vaciar las " + (end - start) + " cartas de esta página?")) {
    col.cards.splice(start, end - start);
    const totalPages = Math.max(1, Math.ceil(col.cards.length / _pgSize));
    if (binderPage > totalPages) binderPage = totalPages;
    guardarCollections(); renderBinder();
  }
});
document.getElementById("binderClearAllBtn")?.addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  if (col.subtype === "tracking") return;
  if (col.subtype === "deck") {
    if (!col.dons?.length) return;
    if (confirm(`¿Vaciar los ${col.dons.length} DON!! del deck?`)) {
      col.dons = [];
      guardarCollections(); renderBinder();
    }
    return;
  }
  if (confirm('Vaciar la colección "' + col.name + '" por completo?')) {
    col.cards = []; binderPage = 1; guardarCollections(); renderBinder();
  }
});
document.getElementById("binderPrevBtn")?.addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (col && binderPage > 1) { binderPage--; renderBinder(); }
});
document.getElementById("binderNextBtn")?.addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  const totalPages = Math.max(1, Math.ceil(col.cards.length / pageSizeFor(document.getElementById("binderGrid"), 3).size));
  if (binderPage < totalPages) { binderPage++; renderBinder(); }
});
// ponytail: resize recalcula filas completas (debounce, solo binder visible)
var _binderRzT = null;
window.addEventListener("resize", () => {
  clearTimeout(_binderRzT);
  _binderRzT = setTimeout(() => {
    var bv = document.getElementById("binderView");
    if (bv && bv.style.display !== "none" && typeof renderBinder === "function") renderBinder();
  }, 250);
});
