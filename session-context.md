# TuTCG — Session Context

## Fecha
2026-07-14

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Riftbound + otros). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura modular
Cada TCG tiene sus propios archivos JS. Los módulos cargan después de `script.js` y sobreescriben funciones vía redeclaración. Si falla uno, no afecta a los demás.

- `index.html` — Layout principal
- `style.css` / `design-system.css` — Estilos y tokens
- `script.js` — Lógica principal, estado global, sync Supabase
- `js/state.js` — Estado (solo `catalog.catalogLanguage`)
- `js/modals/modals.js` — Modal de carta, modal "Agregar a", badges
- `js/catalog/catalog.js` — Renderizado de catálogo, filtros, badges
- `js/binder/binder.js` + `js/binder/binder_riftbound.js` — Colecciones OP y RB
- `js/venta/venta.js` + `js/venta/venta_riftbound.js` — Venta OP y RB (precios ✎/↺)
- `js/deck/deck.js` + `js/deck/deck_riftbound.js` + `js/deck/dispatcher.js` — Deck builder OP y RB
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

## Funcionalidades RB (implementadas)
- **Precios ✎/↺** en portadas de venta RB.
- **Tracking base set**: excluye OV (`v`) y Sig (`s`), match por `feature` para champions.
- **Autocomplete champions RB**: extrae raíz de `feature` (ej: `"Jinx/Zaun"` → `"Jinx"`).
- **Champion modal + navList** en deck RB.
- **Deck prices** en todas las zonas (Champions, Runes, BF, Sideboard).

## Pendiente
- API key de Riot (production) para bajar Runes SFD/UNL faltantes → esperando aprobación.
- Cuando salgan nuevos sets de OP, correr `_tools/scrape_set.js`.

## Deploy
- URL: `https://main.tutcg.pages.dev`
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Convenciones
- Leer este archivo al iniciar cada sesión.
- Cada TCG tiene sus propios archivos JS independientes.
- Nunca hacer deploy sin que el usuario lo pida.
- `feature` es el campo para agrupar cartas de un mismo champion en RB.
