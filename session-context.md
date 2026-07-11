# TuTCG — Session Context

## Fecha
2026-07-11

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Pokémon, Magic, Digimon, Dragon Ball, Yu-Gi-Oh!, Riftbound). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura
- `index.html` — Layout: sidebar (desktop) + main content + bottom nav (mobile)
- `style.css` — Estilos (glass-panel, toggles, progreso, modales, TCG cards) (~2,920 líneas)
- `design-system.css` — Tokens CSS (colores, tipografía, animaciones)
- `script.js` — Lógica principal (~3,870 líneas). **Se edita** para bug fixes y removals; los módulos sobreescriben funciones vía redeclaración.
- `js/state.js` — Reducido a solo `catalog.catalogLanguage`
- `js/registry.js` — Extiende `tcgList` con TCGs nuevos (carga DESPUÉS de script.js)
- `js/tcg/onepiece/config.js` — Vaciado (código muerto eliminado)
- `js/catalog/catalog.js` — `renderCards()` + filtros + badges PRB (sobrescribe script.js)
- `js/binder/binder.js` — `renderCollectionList()` + `renderBinder()` + drag & drop
- `js/venta/venta.js` — `renderVentaList()` + `renderVentaView()` + precios
- `js/explore/explore.js` — `renderExploreView()` + `renderExploreDetail()`
- `js/deck/deck.js` — `showDeckPicker()` + `renderDeckView()` + `saveDeck()`
- `js/modals/modals.js` — `mostrarAddModal()`, `confirmarAdd()`, `openCardInModal()`, etc.
- `auth.js` — Autenticación Supabase (login, registro, recuperación, perfiles)
- `profile.js` — Página de perfil de usuario
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — 9,813 cartas One Piece (4,846 EN + 4,967 JA)
- `data/games/riftbound/` — Placeholder vacío
- `config/games.json` — Registro de TCGs: `one-piece` enabled, `riftbound` disabled
- `assets/logos/` — 7 logos .webp de TCGs
- `assets/images/onepiece/` — 9,708 archivos webp en disco (algunas imágenes compartidas entre variantes)
- `scripts/scrape-ja-promos.js` — Scrapeo de promos JA desde web oficial (legacy)
- `scripts/generate-ja-cards.js` — Generación de entradas JA desde imágenes en `ja/` (legacy, reemplazado por scrape_set.js)
- `_tools/scrape_set.js` — Scraper reutilizable: curl + parse HTML + imágenes webp + insert a JSON
- `_headers` — Cache headers para Cloudflare Pages

## Diseño (Nexus Design System)
- **Fondo**: #050511 (primary), #0a0a1a (secondary), #09090b (surface)
- **Acento**: #00f0ff (cyan), glow rgba(0,240,255,0.15)
- **Tipografía**: Outfit (UI), JetBrains Mono (datos)
- **Efectos**: glass-panel (backdrop-blur + gradiente), animaciones fadeIn/scaleIn
- **Cards**: aspect-ratio 63/88, hover scale(1.06), gradiente overlay, badges cyan/violeta
- **Sidebar**: 260px, backdrop-blur(20px), nav items hover translateX

## Supabase
- URL: `https://scykfvomdwpiypmblnvv.supabase.co`
- Anon key: `sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT`
- Tablas: `binders` (id, user_id, name, type, is_public), `binder_cards` (id, binder_id, card_id, quantity, price, sort_order), `ventas`, `cartas_usuario`, `profiles` (id, username UNIQUE, display_name, avatar_url, first_name, last_name, address, city, country, bio, preferences JSONB)
- Storage: bucket `avatars` (público, RLS)
- RLS: binders + binder_cards protegidas por owner + flag is_public para lectura pública

## Logia API (DON JA images)
- Supabase: `hvgmaqdmveuwyztbjvse.supabase.co`
- Publishable key: `sb_publishable_m2ARuDmZMqTjQYbVmAw8aw_BGPiDSJL`
- Tabla `cards`, filtro `category=eq.DON!!&locale=eq.Japanese` → 237 cartas DON JA
- Imágenes DON JA descargadas de `https://assets.logiatcg.com/cards/japanese/` (jpg), convertidas a webp
- `card_image` en JSON mapeado de naming Logia (sin `_img`), paths absolutos desde raíz del proyecto

## IDs importantes (no cambiar sin actualizar JS)
- Vistas: `tcgSelector`, `welcomeView`, `catalogView`, `collectionManager`, `binderView`, `ventaManager`, `ventaView`, `profileView`, `exploreView`, `exploreDetailView`
- Sidebar: `sidebarHome`, `sidebarCatalog`, `sidebarBinder`, `sidebarVenta`, `sidebarExplore`, `sidebarProfile`
- Bottom nav: `bottomHome`, `bottomCatalog`, `bottomCollections`, `bottomVenta`, `bottomExplore`
- Auth: `authBtn`, `userBtn`, `authModalOverlay`, `userDropdown`
- Modal carta: `modal`, `modalBody`, `closeModal`
- Toggle público: `binderPublicToggleContainer`, `ventaPublicToggleContainer`
- Explorar: `exploreContainer`, `exploreDetailContainer`, `exploreDetailTitle`, `exploreDetailBackBtn`
- Toggle idioma: `catalogLangToggle` (EN | JA | Todos), `trackingLangSelect` (Solo EN | Solo JA | Ambos)
- Búsqueda catálogo: `#searchInput` (FUNCIONAL, debounce 250ms → `renderCards()`)
- **ELIMINADO**: `#topBarSearch` / `#globalSearchInput` (buscador global muerto, sin event listener de búsqueda)

## Últimos cambios (2026-07-11)

### Soporte cartas japonés (JA) — COMPLETADO
- **cards_master.json**: 9,813 cartas (4,846 EN + 4,967 JA). JA scrapeado completo desde `asia-en.onepiece-cardgame.com`.
- **61 sets JA oficiales**: 22 boosters (OP-01 a OP-16, EB-01 a EB-04, PRB-01, PRB-02), 36 starters (ST-01 a ST-36), FDS, PROMO, LP.
- **DON JA (234)**: preservadas del backup, `set_id` corregido a `"DON"`. Las DON no se listan en el cardlist oficial.
- **Scraper reutilizable**: `_tools/scrape_set.js` — curl descarga HTML → parseo → imágenes webp (sharp, quality 85) → insert a `cards_master.json`.
- **Imágenes JA**: formato webp con texto japonés, metadatos en inglés. Carpeta `assets/images/onepiece/ja/{set_id}/`.
- **PROMO/FDS/LP con `set_name`**: scrapeado desde "Card Set(s)" del HTML oficial (ej. "Let's Get Started Promotion Pack").
- **Modal "Set" para PROMO**: `renderModalInfo` (modals.js + script.js) usa `carta.set_name` en vez de `nombresExpansiones[set_id]` cuando `category === 'PROMO' || 'OTHER'`. Eliminada línea separada "Card Set(s)".
- **Idioma**: `card.language = "en"` o `"ja"`. `getCardKey(c)` incluye `card_image` → claves distintas para EN y JA automáticamente.
- **Toggle catálogo**: `state.catalog.catalogLanguage` (`"en"`, `"ja"`, `"all"`). Botones EN | JA | Todos en `#catalogLangToggle`.
- **`cargarFiltros()` language-aware**: filtra sets del dropdown según datos reales del idioma activo.
- **Sets JA vs EN**: OP-14, OP-15, EB-04 son sets separados en JA; en EN están combinados como OP14-EB04 y OP15-EB04.
- **ST-31 a ST-36**: solo existen en JA (sin datos EN). Ocultos del dropdown EN.
- **Parallels**: sufijo `_p1` en imagen (paralelas), sin sufijo o `_r1` para regulares. Scraper normaliza a `_p1` para paralelas, sin sufijo para regulares.
- **Backup**: `data/games/onepiece/cards_master_backup.json` con estado anterior.
- **Cache**: `_headers` con `no-cache` para `/data/*`.

### Buscador global muerto eliminado
- **`#topBarSearch`** (línea 83 index.html): buscador no funcional, solo focus por Ctrl+K, sin handler de búsqueda. Eliminado completamente:
  - HTML: div con `#globalSearchInput` y `<kbd>Ctrl+K</kbd>`
  - CSS: bloque `.top-bar-search` (~44 líneas) + 3 media queries (768px, 480px mobile)
  - JS: variable `topBarSearch`, 7 líneas `style.display`, Ctrl+K simplificado a solo `#searchInput.focus()`
- El buscador del catálogo (`#searchInput`, línea 1,938 script.js) sigue funcional: debounce 250ms → `renderCards()`

### Auth UI
- `auth.js` `updateAuthUI()` oculta `landingRegisterBtn2`, `.hero-login-link`, `#ctaSection` cuando el usuario está autenticado.

### Explore público
- Precio total en portada (solo tipo `sale`), label "Precio" en vez de "Precio vendedor" en detail. Click en cover card abre binder/deck (excepto clicks en `button`/`input`).

### Binder/Venta
- Click en cualquier parte de `.binder-cover-card` abre el binder/venta (excluye clicks en botones).

### Limpieza de proyecto
- **Código muerto JS**:
  - `js/tcg/onepiece/config.js`: vaciado. `OnePieceConfig` (tcg_name, deckRules, rarezas, categorías) no se usaba en producción.
  - `js/state.js`: reducido de ~80 líneas a solo `catalog.catalogLanguage`. Todos los demás sub-estados (app, binder, venta, explore, deck, tracking) estaban sin uso.
- **Código muerto CSS** (~60 líneas): secciones Ripple Effect, `.sr-only`, `.no-scrollbar`, `.explore-card-header/meta`, `.catalog-grid.loading`, `@property --angle`.
- **24 archivos/directorios basura eliminados**: scrapers legacy (`onepiece_scraper_all_sets.js`, `scrape_cards.py`, `parse_cards.py`), backups (`data_antiguo.js`, `cards_data.json`), carpetas vacías (`_revision/`, `riftbound/`, `scripts/`), `assets/onepiece_webp`, `index copy.html`.
- **Imágenes huérfanas**: 1,261 webp en `assets/images/onepiece/` no referenciados en `cards_master.json` → eliminados correctamente.

### Bug de borrado masivo de imágenes (corregido)
- Script `clean_orphan_images.js` borró **todas** las imágenes 2 veces (675 JA no-DON + 675 JA no-DON de nuevo) por comparar paths absolutos vs relativos. Restauradas con `git checkout`.
- **Script corregido**: usar `path.resolve()` en ambos lados de la comparación (JSON paths → disco paths).
- **Recuperación post-borrado**:
  - 675 imágenes JA no-DON re-descargadas del sitio oficial (`asia-en.onepiece-cardgame.com`).
  - 237 imágenes DON JA descargadas desde Logia API (Supabase), mapeadas a 234 cartas JA DON + 3 extras.
  - `card_image` paths actualizados: naming viejo (`_img.webp`) → naming Logia (sin `_img`).
- **6 imágenes DON EN**: paths corregidos de `Premium_Booster_The_Best_Vol_2_PRB-02` a `EB-03` (Boa Hancock y Uta).
- Archivos temporales (`_tools/clean_orphan_images.js`, `_tools/dl_non_don.js`, `_tools/download_don_logia.js`) borrados tras uso.

### Refactorización modular
- **Estrategia**: módulos cargan DESPUÉS de `script.js`, sobreescribiendo funciones vía redeclaración.
- **Orden de carga**: state.js → config.js → script.js → registry.js → catalog.js → binder.js → venta.js → explore.js → deck.js → modals.js → profile.js
- 9 módulos extraídos (~2,200 líneas). Las funciones `let`/`const` top-level NO deben duplicarse entre módulos y script.js.

### Auditoría y bug fixes (18 corregidos)
- **Críticos**: scoped `.binder-remove`, try/catch JSON.parse, skeleton position, null card_name localeCompare, async onsubmit
- **Altos**: `customPrice ?? null`, DON antes de print_type en obtenerRareza, error UI en cargarCartas, tracking toggles `?? false`, `_pendingView` cleanup, tablet collection grid
- **Medios**: toast en loadBindersFromDb, key `onepiece` → `one-piece` en games.json, preservar rareza en actualizarFiltros, guard en openCardInModal, keyframes muertos eliminados

### Logos TCG
- 7 logos en `assets/logos/` (one-piece, pokemon, magic, digimon, dragon-ball, yugioh, riftbound)
- `renderTcgSelector()` usa `<img>` con fallback a ícono de siglas + color
- Grid: 4 columnas × 200px, `aspect-ratio: 1/1`, `justify-content: center`

### Riftbound
- Entrada en `tcgList` (script.js + registry.js). `config/games.json`: `enabled: false`. `data/games/riftbound/`: placeholders vacíos.

### Deploy
- Último deploy hecho en `https://main.tutcg.pages.dev` (commit: fix set_id JA + filtro language-aware)
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Próximo paso
- Cuando salgan nuevos sets en `asia-en.onepiece-cardgame.com`, correr `_tools/scrape_set.js` para agregarlos.

## Convenciones
- Diseño: glass-panel, toggles deslizantes, modales estilizados (NO `confirm()` nativo)
- Nunca hacer deploy sin que el usuario lo pida explícitamente
- Leer este archivo al iniciar cada sesión
