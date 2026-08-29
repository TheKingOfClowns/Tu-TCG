# TuTCG — Session Context

## Fecha
2026-08-29

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Riftbound + otros futuros). Hosteada en Cloudflare Pages. Deploy manual con `wrangler pages deploy`.

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
- URL: configurada en `.env` (NO hardcodear)
- Anon key: configurada en `.env` (NO hardcodear)
- Tablas: `binders`, `binder_cards`, `ventas`, `cartas_usuario`, `profiles`

### Configuración de credenciales
Crear archivo `.env` en la raíz del proyecto (ver `.env.example`):
```
SUPABASE_URL=https://scykfvomdwpiypmblnvv.supabase.co
SUPABASE_ANON_KEY=sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT
```
⚠️ NO commitear `.env` al repositorio. Usar `.env.example` como template.

## Datos maestros
- `data/games/onepiece/cards_master.json` — ~10,000 cartas (EN + JA)
  - **550 PROMO/OTHER cards** matching official OPCG site (fix 2026-08-28)
- `data/games/riftbound/cards_master.json` — 1,224 cartas
- `data/games/pokemon/cards_master.json` — Estructura vacía (pendiente scrapear)
- `config/games.json` — Habilita/deshabilita TCGs y apunta a `data_dir`

### Imágenes de Promos One Piece (fix 2026-08-28)
- 550 imágenes de promo en `assets/images/onepiece/en/PROMO/`
- Formato: WebP,命名: `{set_id}_{parallel}.webp` (ej: `op01-014_p1.webp`)
- Descargadas del sitio oficial OPCG y convertidas con sharp

### Stats del landing (globales)
`cargarStatsLanding()` (`script.js:135`) carga todos los `cards_master.json` de juegos habilitados y suma totals para `#statCards` y `#statExpansions`. Los updates por TCG en `cargarCartas()` y `cargarFiltros()` solo corren si `currentTcg` está seteado para no pisar los globales.
- `catalog.js:325` — `statCards`/`statExpansions` solo se actualizan si `currentTcg`

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
- **tcgplayerMap undefined (2026-08-29):** `getTcgId()` Called before catalog load in `buildTrackingCardList` → Fix: initialize `tcgplayerMap = {}` at declaration (script.js:34)

### Sistema de vistas (`mostrarVista`)
- `"home"` → Landing page (`#tcgHomePlaceholder`), tcgGrid oculto, display:block
- `"tcgHome"` → Si `currentTcg` es null: landing. Si hay TCG: dashboard (`#welcomeView`) con 3 cards (Cartas/Binder/Venta)
- `"catalog"` → Si `currentTcg` es null: TCG selector grid. Si hay TCG: catálogo con filtros
- `selectTcg()` → ahora va a `"tcgHome"` en vez de `"catalog"` directo
- `else` default → landing (no más TCG selector por defecto)
- `cargarCartas()` en startup con `currentTcg=null` → fallback al primer juego habilitado para el catálogo

### Single-TCG Mode (2026-08-27)
Cuando solo hay un TCG habilitado en `config/games.json`:
- `currentTcg` se inicializa con el TCG habilitado (ej: "one-piece") en vez de `null`
- **Al cargar la página**: SIEMPRE muestra la landing page (home), pero precarga las cartas del TCG habilitado
- **Al presionar "Catálogo"**: va directo al catálogo del TCG habilitado (sin mostrar selector)
- **Al presionar "Home"**: vuelve a la landing page (sin resetear `currentTcg`)
- `isSingleTcgMode()` (async) verifica cuántos TCGs están habilitados en games.json
- `_singleTcgMode` cachea el resultado para no hacer fetch repetido
- Para reactivar múltiples TCGs: cambiar `enabled: true` en games.json y recargar

### Flujo "agregar al binder" (2026-07-15)
- `modals.js:524` — `abrirModal()` checkea `addingToBinderId`: si está seteado, agrega la carta a `pendingCards` en vez de abrir el modal
- `modals.js:543` — `addCardToPending(carta, key)` extraída como helper
- `index.html:358` — Botón `#catalogAddConfirm` ("Agregar") en el banner del catálogo
- `script.js:1224` — Handler de `#catalogAddConfirm`: agrega `pendingCards` directo al binder/venta actual y vuelve al binder, sin pasar por el modal "Agregar a"

## Reglas por TCG
| | One Piece | Riftbound | Pokémon |
|---|---|---|---|
| **playsetMax** | 4 | 3 | 4 |
| **Deck** | Leader + 50 + 10 DON | Legend + 3 Champions + 40 main + 12 Runes + 3 BF + SB | 60 cartas planas |
| **Copias máx** | 4 por card_set_id | 3 por card_name | 4 por card_name |
| **hasLanguageFilter** | true | false | true |
| **Restricciones** | — | — | ACE SPEC: 1, Radiant: 1, Basic Energy: ilimitado |
| **Tracking** | expansion, character, rarity, don | expansion, character, rarity | expansion, character, rarity |

## One Piece TCG

### Filtro Promo Cards (fix 2026-08-28)
El filtro "Promo Cards" en el catálogo muestra **PROMO + OTHER** combinados (category === "PROMO" || category === "OTHER").
- 550 promos oficiales matching el sitio OPCG
- 176 imágenes faltantes descargadas y convertidas a WebP

## Pokémon TCG (2026-07-14)
- `js/tcg/pokemon/config.js` — Config completa con deckZones, rarezas SV, tipos, flags, filtros
- `data/games/pokemon/cards_master.json` — Estructura lista, vacía (pendiente scrapear cartas)
- `config/games.json` — `"enabled": true`
- Módulos: `deck_pokemon.js`, `binder_pokemon.js`, `venta_pokemon.js`, `tracking_pokemon.js`
- `js/modals/modals.js` — `_confirmAddDeck_PK` valida 60 máx, 4 copias por nombre

### Estructura de carta Pokémon (`cards_master.json`)
```
{
  "card_set_id": "SVI-004",
  "card_name": "Charizard ex",
  "set_id": "SVI",
  "set_name": "Scarlet & Violet Base Set",
  "rarity": "Double Rare",
  "card_type": "Pokémon",
  "subtype": "Stage 2",
  "card_color": "Fire",
  "hp": "330",
  "weakness": { "type": "Water", "modifier": "×2" },
  "resistance": null,
  "retreat_cost": "2",
  "regulation_mark": "G",
  "illustrator": "5ban Graphics",
  "evolves_from": "Charmeleon",
  "attacks": [
    { "name": "Brave Wing", "cost": ["Fire"], "damage": "60", "effect": "" }
  ],
  "effect": "Ability: Infernal Reign — ...",
  "is_ace_spec": false,
  "is_radiant": false,
  "is_ancient": false,
  "is_future": false,
  "is_terastal": true,
  "has_rule_box": true,
  "is_shiny": false,
  "producto": "BOOSTER",
  "category": "BOOSTER",
  "card_image": "assets/images/pokemon/en/SVI/SVI-004.webp",
  "language": "en",
  "is_parallel": false
}
```

### Filtros planificados
Tipo carta (Pokémon/Trainer/Energy), Subtipo (Item/Supporter/Stadium/Tool o Basic Energy/Special Energy),
Tipo Pokémon (10 colores), Rareza (9 de SV), Expansión, Regulation Mark, HP (rango), Weakness, Resistance, Retreat Cost.

### Flags (checkboxes en UI): ACE SPEC, Radiant, Ancient, Future, Terastal, Rule Box, Shiny.

### Validaciones de deck pendientes en `_confirmAddDeck_PK`:
- ACE SPEC: máx 1 por deck (no implementado aún)
- Radiant: máx 1 por deck (no implementado aún)
- Basic Energy: sin límite de 4 copias (no implementado aún)

### Pendiente
- **Scrapear cartas Pokémon** y poblar `cards_master.json`
- Implementar validaciones ACE SPEC / Radiant / Basic Energy unlimited en `_confirmAddDeck_PK`
- Agregar filtros de flags (checkboxes) en el catálogo para Pokémon
- Agregar filtros de subtipo (`trainerSubtypes`/`energySubtypes`), HP, weakness, resistance, retreat cost al catálogo
- API key de Riot (production) para bajar Runes SFD/UNL faltantes → esperando aprobación
- Cuando salgan nuevos sets de OP, correr `_tools/scrape_set.js`

## Deploy
- URL: `https://da1994fa.tutcg.pages.dev` (deploy 2026-08-29)
- Cloudflare login autenticado via `wrangler login`
- Comando: `npx wrangler pages deploy .` (sin --project-name, lo detecta solo)
- NO hacer deploy sin que el usuario lo pida explícitamente.
- Warning: El directorio tiene cambios sin commitear que generan warning. Pasar `--commit-dirty=true` o commitear antes.

## Venta — Moneda ARS/USD (2026-08-28)

### Implementado
- Cada carta en venta tiene selector ARS/USD visible públicamente
- Precio total en portada editable + selector de moneda
- Totales separados ARS/USD visibles dentro de decks/binders en venta
- Datos persistidos en Supabase (`price_currency` en `binder_cards`, `totalCurrency` en `config`)

### Campos agregados a la base de datos
```sql
ALTER TABLE binder_cards ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'ARS';
```

### Estructura de datos
- `cards[].priceCurrency` — "ARS" (default) o "USD" por carta individual
- `cards[].priceCurrency` se propaga en expandDbCards/expandDbDeck
- `col.totalCurrency` — moneda del precio total en portada

### Funciones modificadas
- `getTotalsByCurrency(col)` — nueva, calcula ARS y USD separados
- `expandDbCards`, `expandDbCardsGrouped`, `expandDbDeck` — preservan priceCurrency
- `buildVentaCardHTML_OP/RB` — muestran label de moneda (cyan ARS, dorado USD)
- `attachVentaEvents_OP/RB` — handler para cambiar moneda por carta
- `renderVentaList_OP` — selector de moneda en portada
- `renderDeckView_OP` — totales ARS/USD arriba a la izquierda
- `renderExploreDetail` — precios con moneda en explore público
- `renderExploreView` — totales ARS/USD separados en lista pública

### CSS agregado
- `.currency-btn` / `.currency-btn.active` — estilo del toggle
- `.venta-currency-label` — label después del precio (cyan ARS, dorado USD con clase `.usd`)
- `.deck-sale-totals` — contenedor de totales en deck venta

## Edge Function — sync-binder-cards-v3 (FUNCIONAL)

### Estado: ✅ FUNCIONANDO
- Función Postgres `sync_binder_cards_atomic` corregida y funcionando
- Edge Function `sync-binder-cards-v3` desplegada con CORS para producción
- Frontend apunta a `sync-binder-cards-v3`

### Fixes aplicados (2026-08-29)
1. **Postgres function:** `card_id` era casteado a `::UUID` pero la tabla usa `TEXT` y el frontend envía strings como `tcg_one-piece|OP01-001|...`
   - Solución: cambiar a `::TEXT` y usar LATERAL para iterar el JSONB
2. **CORS:** la función solo permitía localhost, no producción
   - Solución: agregar `https://tutcg.pages.dev` a corsOrigins y permitir cualquier origen `.pages.dev`

### Función Postgres `sync_binder_cards_atomic`
```sql
-- Usa LATERAL para iterar el JSONB array
INSERT INTO binder_cards (binder_id, card_id, quantity, price, price_currency, card_tag, sort_order)
SELECT p_binder_id, card->>'card_id', COALESCE((card->>'quantity')::int, 1),
  NULLIF(card->>'price', '')::numeric, COALESCE(NULLIF(card->>'price_currency', ''), 'ARS'),
  NULLIF(card->>'card_tag', '')::text, COALESCE((card->>'sort_order')::int, 0)
FROM jsonb_array_elements(p_cards) AS card;
```

### Archivos
- `supabase/functions/sync-binder-cards-v2/index.ts` — CORS fix (no usar, v3 es la activa)
- `supabase/functions/sync-binder-cards-v3/index.ts` — Edge Function activa
- `supabase/functions/sync-binder-cards-v3/deno.json`

### Frontend (script.js)
Usa fetch directo a la Edge Function:
```javascript
const response = await fetch('https://scykfvomdwpiypmblnvv.supabase.co/functions/v1/sync-binder-cards-v3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify({ binder_id: id, cards: allCardRows, user_id: authUser.id })
});
```

## Pendiente de sesión anterior
- **Scrapear cartas Pokémon** y poblar `cards_master.json`
- Implementar validaciones ACE SPEC / Radiant / Basic Energy unlimited en `_confirmAddDeck_PK`
- Agregar filtros de flags (checkboxes) en el catálogo para Pokémon
- Agregar filtros de subtipo, HP, weakness, resistance, retreat cost al catálogo Pokémon
- API key de Riot (production) para bajar Runes SFD/UNL faltantes → esperando aprobación
- Cuando salgan nuevos sets de OP, correr `_tools/scrape_set.js`
- **Fixear duplicación de datos en Supabase** — los datos existentes pueden tener duplicates, necesita limpieza o re-sync

## Cloudflare MCP Setup (2026-08-28)
Configurados en `~/.config/opencode/opencode.jsonc`:
- `cloudflare` — connected (MCP principal)
- `cloudflare-docs` — connected (documentación)
- `cloudflare-bindings` — needs auth (opcional)
- `cloudflare-builds` — needs auth (opcional)
- `cloudflare-observability` — needs auth (opcional)

## Convenciones
- Leer este archivo al iniciar cada sesión.
- Cada TCG tiene sus propios archivos JS: `_OP`, `_RB`, `_PK` y `dispatcher`, sin dispatchers inline.
- Los dispatchers usan lookup genérico por `tcgConfigs[currentTcg].short`, no if/else.
- Las configs TCG definen metadatos (deckZones, rarities, colors, etc.). Los módulos leen de la config.
- Los event listeners que referencian funciones de otros scripts van en el archivo que define la función, no en script.js.
- Nunca hacer deploy sin que el usuario lo pida.
- `feature` es el campo para agrupar cartas de un mismo champion en RB.
- NO commitear `.env`, credenciales, o archivos de backup.
