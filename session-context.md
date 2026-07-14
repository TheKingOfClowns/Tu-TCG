# TuTCG — Session Context

## Fecha
2026-07-14

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Riftbound + otros). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura modular
Cada módulo tiene archivo OP (`_OP`), archivo RB (`_RB`) y dispatcher (`dispatcher_*.js`) que rutea por `currentTcg`. Si falla un módulo, no afecta a los demás. Funciones compartidas entre TCGs (ej. `openVenta`, `renderVentaView`) no llevan sufijo.

- `index.html` — Layout principal + orden de carga de scripts
- `style.css` / `design-system.css` — Estilos y tokens
- `script.js` — Lógica principal (1394 líneas), estado global, sync Supabase
- `js/state.js` — Estado (solo `catalog.catalogLanguage`)
- `js/modals/modals.js` — Modal de carta, modal "Agregar a", badges
- `js/catalog/catalog.js` — Renderizado de catálogo, filtros, badges, stats
- `js/binder/binder.js` + `js/binder/binder_riftbound.js` + `js/binder/dispatcher_binder.js` — Colecciones OP y RB
- `js/venta/venta.js` + `js/venta/venta_riftbound.js` + `js/venta/dispatcher_venta.js` — Venta OP y RB (precios ✎/↺)
- `js/deck/deck.js` + `js/deck/deck_riftbound.js` + `js/deck/dispatcher.js` — Deck builder OP y RB
- `js/tracking/tracking.js` — Tracking OP (extraído de script.js)
- `js/tracking/tracking_riftbound.js` — Tracking RB (sin DON, Champions, rarezas RB)
- `js/explore/explore.js` — Vista explore (Double encoding CP1252 corregido)
- `auth.js` / `profile.js` — Autenticación y perfil Supabase

## Supabase
- URL: `https://scykfvomdwpiypmblnvv.supabase.co`
- Anon key: `sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT`
- Tablas: `binders`, `binder_cards`, `ventas`, `cartas_usuario`, `profiles`

## Datos maestros
- `data/games/onepiece/cards_master.json` — 9,813 cartas (EN + JA)
- `data/games/riftbound/cards_master.json` — 1,224 cartas
  - 8 sets: OGN, OGS, SFD, UNL, VEN, OPP, PR, JDG
  - Variantes por sufijo `card_set_id`: `a` = AA, `s` = Signature, `v` = Overnumbered
- Imágenes: `assets/images/onepiece/`, `assets/images/riftbound/{set}/`

## Diseño (Nexus Design System)
- Fondo: #050511, acento: #00f0ff (cyan), glass-panel (backdrop-blur)
- Tipografía: Outfit (UI), JetBrains Mono (datos)
- Cards: aspect-ratio 63/88, hover scale(1.06)

## Reglas por TCG
| | One Piece | Riftbound |
|---|---|---|
| **playsetMax** | 4 | 3 |
| **Deck** | Leader + 50 cartas + 10 DON | Legend + 40 main + 12 runes + 3 BF + sideboard |
| **Ciclo cantidad** | 0→1→4→10→0 | 0→1→3→10→0 |
| **Champions** | — | Match por `feature` (split por `/`) |

## Funcionalidades clave (ambos TCGs)
- **Aislamiento cross-TCG**: `guardarCollections`/`guardarVenta` usan `currentTcg`, sync filtra por TCG, no hay cross-deletion.
- **Badges en modal "Agregar a"**: binders de venta muestran modo (`x1`, `x3`/`x4`, `SL`) + badge "Venta".
- **Playset multi-stack**: `confirmarAdd()` rellena stacks existentes + crea nuevos respetando `playsetMax`.
- **Slots vacíos `+`**: navegan al catálogo en binder/venta de ambos TCGs.
- **Banner `#catalogAddBanner`**: "Agregando a: [nombre]" + botones "Volver" / "✕".
- **Badge ✓ en catálogo**: cartas ya agregadas al binder destino.
- **Stats**: `#statCards` y `#statExpansions` se actualizan en `catalog.js:cargarFiltros`.
- **`_DEBUG` flag**: `var _DEBUG = false` al inicio de script.js; todos los `console.error` van guardados.

## Funcionalidades RB (implementadas)
- **Precios ✎/↺** en portadas de venta RB.
- **Tracking base set**: excluye OV (`v`) y Sig (`s`), match por `feature` para champions.
- **Autocomplete champions RB**: extrae raíz de `feature` (ej: `"Jinx/Zaun"` → `"Jinx"`).
- **Champion modal + navList** en deck RB.
- **Deck prices** en todas las zonas (Champions, Runes, BF, Sideboard).

## Refactor completado (2026-07-14)
- **script.js**: 4059→1394 líneas (-66%) eliminando ~1800 líneas de código muerto (catalog, modals, deck, binder, venta, explore overrides)
- **Tracking OP** extraído a `js/tracking/tracking.js`
- **Deck OP**: `renderDeckView_OP` 253→88 líneas con 4 helpers (`_opBuildLeaderHTML`, `_opBuildMainCardsHTML`, `_opBuildDonsHTML`, `_opAttachDeckEvents`)
- **Deck RB**: `renderDeckView_RB` 506→70 líneas con 7 helpers (`_rbBuildLegendHTML`, `_rbBuildChampionHTML`, `_rbBuildMainDeckHTML`, `_rbBuildRuneHTML`, `_rbBuildBattlefieldHTML`, `_rbBuildSideboardHTML`, `_rbAttachDeckEvents`)
- **Binder**: split `_OP`/`_RB` + `dispatcher_binder.js` (sin saves `_OP` en `_RB`, sin dispatchers inline)
- **Venta**: split `_OP`/`_RB` + `dispatcher_venta.js` (`openVenta` y `renderVentaView` compartidos sin sufijo)
- **Renames**: `_legend` → `_RB` en `deck_riftbound.js` (4 funciones)
- **Cleanup**: `data-tcgid` y variable `tcgId` eliminados, `isEventStage` muerto eliminado

## Pendiente
- API key de Riot (production) para bajar Runes SFD/UNL faltantes → esperando aprobación.
- Cuando salgan nuevos sets de OP, correr `_tools/scrape_set.js`.

## Deploy
- URL: `https://main.tutcg.pages.dev`
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Convenciones
- Leer este archivo al iniciar cada sesión.
- Cada TCG tiene sus propios archivos JS: `_OP`, `_RB` y `dispatcher`, sin saves del suffix opuesto ni dispatchers inline.
- Nunca hacer deploy sin que el usuario lo pida.
- `feature` es el campo para agrupar cartas de un mismo champion en RB.
