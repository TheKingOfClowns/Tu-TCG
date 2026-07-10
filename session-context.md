# TuTCG — Session Context

## Fecha
2026-07-10

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Pokémon, Magic, Digimon, Dragon Ball, Yu-Gi-Oh!, Riftbound). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura
- `index.html` — Layout: sidebar (desktop) + main content + bottom nav (mobile)
- `style.css` — Estilos (glass-panel, toggles, progreso, modales, TCG cards)
- `design-system.css` — Tokens CSS (colores, tipografía, animaciones)
- `script.js` — Lógica principal (3,853 líneas, intacto — NO editar)
- `js/state.js` — Estado organizado por dominio (app, catalog, binder, venta, explore)
- `js/registry.js` — Extiende `tcgList` con TCGs nuevos (carga DESPUÉS de script.js)
- `js/tcg/onepiece/config.js` — `OnePieceConfig` (deck rules, rarezas, categorías)
- `js/catalog/catalog.js` — `renderCards()` + filtros + badges PRB (sobrescribe script.js)
- `js/binder/binder.js` — `renderCollectionList()` + `renderBinder()` + drag & drop
- `js/venta/venta.js` — `renderVentaList()` + `renderVentaView()` + precios
- `js/explore/explore.js` — `renderExploreView()` + `renderExploreDetail()`
- `js/deck/deck.js` — `showDeckPicker()` + `renderDeckView()` + `saveDeck()`
- `js/modals/modals.js` — `mostrarAddModal()`, `confirmarAdd()`, `openCardInModal()`, etc.
- `auth.js` — Autenticación Supabase (login, registro, recuperación, perfiles)
- `profile.js` — Página de perfil de usuario
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — Base de datos de cartas One Piece
- `data/games/riftbound/` — Placeholder vacío
- `config/games.json` — Registro de TCGs: `one-piece` enabled, `riftbound` disabled
- `assets/logos/` — 7 logos .webp de TCGs

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

## IDs importantes (no cambiar sin actualizar JS)
- Vistas: `tcgSelector`, `welcomeView`, `catalogView`, `collectionManager`, `binderView`, `ventaManager`, `ventaView`, `profileView`, `exploreView`, `exploreDetailView`
- Sidebar: `sidebarHome`, `sidebarCatalog`, `sidebarBinder`, `sidebarVenta`, `sidebarExplore`, `sidebarProfile`
- Bottom nav: `bottomHome`, `bottomCatalog`, `bottomCollections`, `bottomVenta`, `bottomExplore`
- Auth: `authBtn`, `userBtn`, `authModalOverlay`, `userDropdown`
- Modal carta: `modal`, `modalBody`, `closeModal`
- Toggle público: `binderPublicToggleContainer`, `ventaPublicToggleContainer`
- Explorar: `exploreContainer`, `exploreDetailContainer`, `exploreDetailTitle`, `exploreDetailBackBtn`

## Últimos cambios (2026-07-10)

### Refactorización modular
- **Estrategia**: módulos cargan DESPUÉS de `script.js`, sobreescribiendo funciones vía redeclaración. `script.js` NO se edita (salvo bug fixes).
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
- Cards con logo: `padding: 0`, sin texto overlay

### Riftbound
- Entrada en `tcgList` (script.js + registry.js)
- `config/games.json`: `enabled: false`
- `data/games/riftbound/`: placeholders vacíos

### Plan pendiente
- Paso 8: Crear `js/tcg/pokemon/config.js` placeholder para validar arquitectura
- Luego: replicar para Magic, Digimon, Dragon Ball, Yu-Gi-Oh!
- Finalmente: popular datos reales de cartas para cada TCG

## Convenciones
- Diseño: glass-panel, toggles deslizantes, modales estilizados (NO `confirm()` nativo)
- Nunca hacer deploy sin que el usuario lo pida explícitamente
- Leer este archivo al iniciar cada sesión

