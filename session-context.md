# TuTCG — Session Context

## Fecha
2026-07-14

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Riftbound + otros futuros). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura modular
Cada TCG tiene archivo propio con sufijo corto (`_OP`, `_RB`, `_PK`) y dispatcher que rutea por `currentTcg`. Si falla un módulo, no afecta a los demás.

- `index.html` — Layout principal + orden de carga de scripts
- `style.css` / `design-system.css` — Estilos y tokens
- `script.js` — Lógica principal (~1310 líneas), estado global, sync Supabase
- `js/state.js` — Estado (solo `catalog.catalogLanguage`)
- `js/tcg/{tcg}/config.js` — Config por TCG (deckRules, rarities, cardTypes, colors, etc.)
- `js/modals/modals.js` — Modal de carta, modal "Agregar a", badges, event listeners
- `js/catalog/catalog.js` — Renderizado de catálogo, filtros data-driven, badges, stats
- `js/binder/binder.js` + `_RB` + `_PK` + `dispatcher_binder.js` — Colecciones
- `js/venta/venta.js` + `_RB` + `_PK` + `dispatcher_venta.js` — Venta
- `js/deck/deck.js` + `_RB` + `_PK` + `dispatcher.js` — Deck builder
- `js/tracking/tracking.js` + `_RB` + `_PK` + `dispatcher_tracking.js` — Tracking
- `js/explore/explore.js` — Vista explore
- `auth.js` / `profile.js` — Autenticación y perfil Supabase

## Supabase
- URL: `https://scykfvomdwpiypmblnvv.supabase.co`
- Anon key: `sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT`
- Tablas: `binders`, `binder_cards`, `ventas`, `cartas_usuario`, `profiles`

## Datos maestros
- `data/games/onepiece/cards_master.json` — 9,813 cartas (EN + JA)
- `data/games/riftbound/cards_master.json` — 1,224 cartas
- `config/games.json` — Habilita/deshabilita TCGs y apunta a `data_dir`

## Diseño (Nexus Design System)
- Fondo: #050511, acento: #00f0ff (cyan), glass-panel (backdrop-blur)
- Tipografía: Outfit (UI), JetBrains Mono (datos)
- Cards: aspect-ratio 63/88, hover scale(1.06)

## Sistema de configs TCG (refactor 2026-07-14)

Cada TCG define su metadata en `js/tcg/{id}/config.js` como propiedad de `window.tcgConfigs`:

```
window.tcgConfigs["one-piece"] = {
  short: "OP", playsetMax: 4, hasLanguageFilter: true,
  deckZones: [{ key:"leader", max:1 }, { key:"cards", max:50, maxCopies:4, maxCopiesBy:"card_set_id" }, { key:"dons", max:10, optional:true }],
  rarities: ["L","C","UC","R","SR","SEC","SP","AA"],
  cardTypes: ["LEADER","CHARACTER","EVENT","STAGE","DON!!"],
  colors: ["Red","Blue","Green","Purple","Black","Yellow"],
  colorNames: { "Red":"Rojo", ... },
  expansionNames: { ... }, expansionOrder: { ... },
  donVariants: ["Gold","DP"],
  unlimitedCards: Set(["OP16-042"]),
  mangaSet: Set(["EB01-006", ...])
};
```

Los módulos leen de `tcgConfigs[currentTcg]` y se adaptan. Para agregar un TCG nuevo solo se necesita: `config.js` + `cards_master.json` + stubs `_XX`.js por módulo + entry en `config/games.json`.

### Dispatchers genéricos
Todos los dispatchers usan lookup por `tcgConfigs[currentTcg].short`:
```js
var _suffixMap = { "one-piece":"OP", "riftbound":"RB", "pokemon":"PK" };
function _fn(name) {
  var s = (tcgConfigs[currentTcg]) ? _suffixMap[currentTcg] : null;
  return (s && window[name + "_" + s]) || window[name + "_OP"];
}
```

### Catálogo data-driven
`cargarFiltros()` y `actualizarFiltrosPorExpansion()` leen `rarities`, `cardTypes`, `colors`, `colorNames` de `tcgConfigs[currentTcg]`. El filtro de expansiones se adapta automáticamente (usa `expansionNames` si existe, sino `set_name` de las cartas). AA detection usa `detectAA` de la config.

### Modals data-driven
- `playsetMax` lee de `_getPlaysetMax(tcgId)` que consulta `tcgConfigs[tcgId].playsetMax`
- `confirmarAdd` despacha a `_confirmAddDeck_OP/RB/PK` según `col.tcg`
- `renderModalInfo` usa `cfg.colorNames` y `cfg.expansionNames`

### Bug fixes
- `removeFromCurrentCollection` y `setupBinderDragDrop` → usan `renderBinder()` (dispatcher) en vez de `renderBinder_OP()` directo
- `renderVentaView` → usa `renderVentaIndividual(col, grid)` (dispatcher)
- Event listeners problemáticos movidos de `script.js` a los archivos que definen las funciones:
  - `confirmarAdd`/`confirmCreateModal`/`hideCreateModal` → `modals.js`
  - `pedirCrearVenta` → `dispatcher_venta.js`
  - `pedirCrearColeccion` → `dispatcher_binder.js`

## Reglas por TCG
| | One Piece | Riftbound | Pokémon |
|---|---|---|---|
| **playsetMax** | 4 | 3 | 4 |
| **Deck** | Leader + 50 + 10 DON | Legend + 3 Champions + 40 main + 12 Runes + 3 BF + SB | 60 cartas planas |
| **Copias máx** | 4 por card_set_id | 3 por card_name | 4 por card_name |
| **hasLanguageFilter** | true | false | true |
| **Tracking** | expansion, character, rarity, don | expansion, character, rarity | expansion, character, rarity |

## Pokémon (stubs creados, sin datos)
- `js/tcg/pokemon/config.js` — Config con deckZones, rarities, cardTypes, colors
- `js/deck/deck_pokemon.js` — Deck 60 cartas, 4 copias por nombre
- `js/binder/binder_pokemon.js` — Binder y deck
- `js/venta/venta_pokemon.js` — Venta (delega a OP para individual/grouped)
- `js/tracking/tracking_pokemon.js` — Tracking (delega a RB)
- `js/modals/modals.js` — `_confirmAddDeck_PK` para agregar cartas a deck PK
- `config/games.json` — `"pokemon": { "enabled": false }`

## Pendiente
- **Pokémon**: Crear `data/games/pokemon/cards_master.json` y poner `"enabled": true` en `config/games.json`
- Probar funcionalidad PK con datos reales (deck builder, binder, venta, tracking, filtros)
- API key de Riot (production) para bajar Runes SFD/UNL faltantes → esperando aprobación
- Cuando salgan nuevos sets de OP, correr `_tools/scrape_set.js`

## Deploy
- URL: `https://main.tutcg.pages.dev`
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Convenciones
- Leer este archivo al iniciar cada sesión.
- Cada TCG tiene sus propios archivos JS: `_OP`, `_RB`, `_PK` y `dispatcher`, sin dispatchers inline.
- Los dispatchers usan lookup genérico por `tcgConfigs[currentTcg].short`, no if/else.
- Las configs TCG definen metadatos (deckZones, rarities, colors, etc.). Los módulos leen de la config.
- Los event listeners que referencian funciones de otros scripts van en el archivo que define la función, no en script.js.
- Nunca hacer deploy sin que el usuario lo pida.
- `feature` es el campo para agrupar cartas de un mismo champion en RB.
