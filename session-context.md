# TuTCG — Session Context

## Fecha
2026-07-11

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Pokémon, Magic, Digimon, Dragon Ball, Yu-Gi-Oh!, Riftbound). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura
- `index.html` — Layout: sidebar (desktop) + main content + bottom nav (mobile)
- `style.css` — Estilos (~2,880 líneas)
- `design-system.css` — Tokens CSS (colores, tipografía, animaciones)
- `script.js` — Lógica principal (~3,870 líneas). Se edita para bug fixes y removals; los módulos sobreescriben funciones vía redeclaración.
- `js/state.js` — Solo `catalog.catalogLanguage`
- `js/registry.js` — Extiende `tcgList` con TCGs nuevos
- `js/tcg/onepiece/config.js` — Vaciado
- `js/catalog/catalog.js` — `renderCards()` + filtros + badges PRB
- `js/binder/binder.js` — `renderCollectionList()` + `renderBinder()` + drag & drop
- `js/venta/venta.js` — `renderVentaList()` + `renderVentaView()` + precios
- `js/explore/explore.js` — `renderExploreView()` + `renderExploreDetail()`
- `js/deck/deck.js` — `showDeckPicker()` + `renderDeckView()` + `saveDeck()`
- `js/modals/modals.js` — `openCardInModal()`, `renderModalInfo()`, etc. **Variantes filtradas por idioma.**
- `auth.js` — Autenticación Supabase
- `profile.js` — Página de perfil de usuario
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — 9,813 cartas (4,846 EN + 4,967 JA)
- `config/games.json` — Registro de TCGs
- `assets/logos/` — 7 logos .webp de TCGs
- `assets/images/onepiece/` — 9,708 archivos webp en disco (algunas imágenes compartidas entre variantes)
- `_tools/scrape_set.js` — Scraper reutilizable
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
- Tablas: `binders`, `binder_cards`, `ventas`, `cartas_usuario`, `profiles`
- Storage: bucket `avatars` (público, RLS)

## Logia API (DON JA images)
- Supabase: `hvgmaqdmveuwyztbjvse.supabase.co`
- Publishable key: `sb_publishable_m2ARuDmZMqTjQYbVmAw8aw_BGPiDSJL`
- Imágenes DON JA desde `https://assets.logiatcg.com/cards/japanese/`

## Fuente oficial de imágenes JA
- URL: `https://asia-en.onepiece-cardgame.com/images/cardlist/card/{filename}.png`
- Bajada con `https.get`, seguimiento de redirects 301/302
- Convertidas a webp con `sharp` (quality 85)

## IDs importantes
- Vistas: `tcgSelector`, `welcomeView`, `catalogView`, `collectionManager`, `binderView`, `ventaManager`, `ventaView`, `profileView`, `exploreView`, `exploreDetailView`
- Toggle idioma: `catalogLangToggle` (EN | JA | Todos), `trackingLangSelect` (Solo EN | Solo JA | Ambos)
- Búsqueda catálogo: `#searchInput` (FUNCIONAL, debounce 250ms → `renderCards()`)
- **ELIMINADO**: `#topBarSearch` / `#globalSearchInput`

## Últimos cambios (2026-07-11)

### Variantes del modal filtradas por idioma
- `js/modals/modals.js:345`: `openCardInModal()` ahora agrega `c.language === carta.language` al filtro de variantes.
- Si estás viendo una carta EN, solo se muestran variantes EN. Si es JA, solo JA. No se mezclan.

### Corrección masiva de imágenes JA (4,057 corregidas)
- **Causa**: `_tools/dl_non_don.js` (usado tras el borrado accidental) descargó la imagen regular para cartas paralelas en vez de la `_p1`/`_p2` correcta.
- **Solución**: script Node.js que para cada carta JA no-DON descarga `{filename}.png` desde `https://asia-en.onepiece-cardgame.com/images/cardlist/card/`, convierte a webp y reemplaza si difiere.
- **Resultado**: 4,057 imágenes reemplazadas, 676 ya estaban correctas, 0 faltantes.
- Script temporal borrado tras uso.

### Soporte cartas japonés (JA) — COMPLETADO
- **cards_master.json**: 9,813 cartas (4,846 EN + 4,967 JA).
- **61 sets JA**: 22 boosters (OP-01 a OP-16, EB-01 a EB-04, PRB-01, PRB-02), 36 starters (ST-01 a ST-36), FDS, PROMO, LP.
- **DON JA (234)**: preservadas del backup, `set_id = "DON"`. No se listan en el cardlist oficial.
- **Scraper**: `_tools/scrape_set.js` — curl POST + parse HTML + imágenes webp + insert a JSON.
- **PROMO/FDS/LP con `set_name`**: scrapeado de "Card Set(s)" del HTML oficial.
- **Modal "Set" para PROMO**: `renderModalInfo` usa `carta.set_name` en vez de `nombresExpansiones[set_id]`.
- **Idioma**: `card.language = "en"` o `"ja"`. `getCardKey(c)` incluye `card_image`.
- **Toggle catálogo**: `state.catalog.catalogLanguage` (`"en"`, `"ja"`, `"all"`).
- **Sets JA vs EN**: OP-14/OP-15/EB-04 separados en JA, combinados en EN.
- **ST-31 a ST-36**: solo JA, sin datos EN.
- **Parallels**: sufijo `_p1`/`_p2` en imagen. Scraper normaliza `card_set_id` a `_p1` para todas las paralelas.

### Buscador global muerto eliminado
- `#topBarSearch` / `#globalSearchInput` eliminado de HTML, CSS (~44 líneas + 3 media queries) y JS (variable + 7 líneas `style.display`).
- Ctrl+K ahora solo enfoca `#searchInput` del catálogo.

### Limpieza de proyecto
- **Código muerto JS**: `config.js` vaciado, `state.js` reducido a solo `catalog.catalogLanguage`.
- **Código muerto CSS**: ~60 líneas (Ripple Effect, `.sr-only`, `.no-scrollbar`, `.explore-card-header/meta`, `.catalog-grid.loading`, `@property --angle`).
- **24 archivos/directorios basura eliminados**: scrapers legacy, backups, carpetas vacías.
- **1,261 imágenes huérfanas eliminadas**: webp en disco no referenciadas en `cards_master.json`.

### Bug de borrado masivo de imágenes (corregido)
- `clean_orphan_images.js` borró todas las imágenes 2 veces por comparar paths absolutos vs relativos. Restauradas con `git checkout`.
- **Recuperación**: 675 JA no-DON del sitio oficial + 237 DON JA de Logia API.
- **Secuela**: Las 675 JA no-DON tenían las paralelas con arte incorrecto → re-descarga masiva (4,057 corregidas).
- Archivos temporales borrados tras uso.

### Refactorización modular
- Módulos cargan DESPUÉS de `script.js`, sobreescribiendo funciones vía redeclaración.
- Orden: state.js → config.js → script.js → registry.js → catalog.js → binder.js → venta.js → explore.js → deck.js → modals.js → profile.js

### Deploy
- Último deploy: `9d4a1c5` (corregir 4,057 imágenes JA + filtrar variantes por idioma en modal)
- URL: `https://main.tutcg.pages.dev`
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Próximo paso
- Cuando salgan nuevos sets en `asia-en.onepiece-cardgame.com`, correr `_tools/scrape_set.js`.

## Convenciones
- Diseño: glass-panel, toggles deslizantes, modales estilizados
- Nunca hacer deploy sin que el usuario lo pida explícitamente
- Leer este archivo al iniciar cada sesión
