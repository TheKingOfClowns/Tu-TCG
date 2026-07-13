# TuTCG — Session Context

## Fecha
2026-07-13

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
- `js/deck/deck.js` — `showDeckPicker_OP()` + `renderDeckView_OP()` + `saveDeck_OP()` para One Piece
- `js/deck/deck_riftbound.js` — `showDeckPicker_RB()` + `renderDeckView_RB()` + `saveDeck_RB()` para Riftbound
- `js/deck/dispatcher.js` — Rutea `showDeckPicker`, `renderDeckView`, `saveDeck` según `currentTcg`
- `js/modals/modals.js` — `openCardInModal()`, `renderModalInfo()`, etc. **Variantes filtradas por idioma.**
- `auth.js` — Autenticación Supabase
- `profile.js` — Página de perfil de usuario
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — 9,813 cartas (4,846 EN + 4,967 JA)
- `config/games.json` — Registro de TCGs (one_piece, riftbound, etc.)
- `assets/logos/` — 8 logos .webp de TCGs
- `assets/images/onepiece/` — 9,708 archivos webp en disco (algunas imágenes compartidas entre variantes)
- `assets/images/riftbound/{OGN,OGS,SFD,UNL,VEN,OPP,PR,JDG}/` — 1,045 imágenes webp de Riftbound
- `data/games/riftbound/cards_master.json` — 1,224 cartas Riftbound
- `_tools/scrape_set.js` — Scraper reutilizable One Piece
- `_tools/scrape_riftbound.js` — Scraper Riftbound desde Riftcodex API
- `riot.txt` — Código de verificación Riot API (`b7f27c09-91c8-4cac-ad7d-156fce73e46d`)
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
- Filtro tipo: `#typeFilter` (Unit, Spell, Legend, Gear, Battlefield, Rune)

## Últimos cambios (2026-07-13)

### Integración Riftbound — COMPLETADO
- **Fuente de datos**: API de Riftcodex (`https://api.riftcodex.com`), gratis, sin auth.
- **1,224 cartas** en `data/games/riftbound/cards_master.json`.
- **8 sets**: OGN (Origins, 352), OGS (Proving Grounds, 24), SFD (Spiritforged, 288), UNL (Unleashed, 280), VEN (Vendetta, 131), OPP (Organized Play Promos, 133), PR (Promos, 13), JDG (Judge Promos, 3).
- **1,045 imágenes webp** en `assets/images/riftbound/{set}/`.
- **Doble encoding Windows-1252 corregido**: la API de Riftcodex sirve texto con double-encoding (UTF-8 → CP1252 → Latin-1). Script de mapeo CP1252 completo aplicado en `js/explore/explore.js`, `js/deck/deck.js`, `js/modals/modals.js`, `cards_master.json` (168 entradas afectadas).
- **Filtro "Tipo"** agregado en `index.html` (`select#typeFilter`), `script.js` y `catalog.js`. Tipos: Unit, Spell, Legend, Gear, Battlefield, Rune.
- **Colores**: Mind, Order, Calm, Body, Chaos, Fury, Colorless.
- **Rarezas**: 6 rarezas.
- **Runes corregidas**: VEN renombradas a `VEN-R01`-`VEN-R06`, OPP a `OPP-XXXb`, OGN alternate art a `OGN-XXXa` — 24 Runes total con IDs únicos e imágenes propias.
- **catalog.js** actualizado con `cargarFiltros()` para Riftbound (sets, colores, rarezas, tipos).
- **Config**: `config/games.json` con riftbound `"enabled": true`, `getTcgPrefix()` retorna `"rb"`, `cargarCartas()` matchea `currentTcg`, `selectTcg()` llama `await cargarCartas()`.
- **Commit**: `ca3c232`

### Deck Builder Riftbound — COMPLETADO
- **Arquitectura**: cada TCG tiene su propio archivo de deck builder (NO monolito con ifs). `dispatcher.js` rutea según `currentTcg`.
- **Reglas oficiales**: Legend (1, define colores), Main Deck (40, max 3 copias/nombre), Rune Deck (12, solo colores Legend), Battlefields (3, nombres únicos), Sideboard (0-8 opcional, solo Unit/Spell/Gear), Chosen Champion (Unit Champion con mismo `feature`, obligatorio).
- **6 modos de picker**: legend, champion (overlay modal, no prompt), main, runes, battlefield, sideboard — cada uno con sus propios filtros y límites.
- **5 zonas en el render**: Legend, Chosen Champion, Main Deck, Rune Deck, Battlefields + Sideboard.
- **Validaciones**: color matching automático, max 3 copias por nombre en main, nombres únicos de battlefields, filtrado de cartas inválidas al cambiar Legend.
- **Champion feature match**: `cardFeature === legendFeature || cardFeature.startsWith(legendFeature + "/")` (Riftcodex usa `"Jinx/Zaun"` para Units y `"Jinx"` para Legends).
- **Champion multi-select**: el picker muestra champions compatibles (filtrados por feature + color), permite elegir 1-3 (con +/-), los auto-agrega al Main Deck y setea el primero como Chosen Champion. Flujo: Legend → Champion (elige 1-3) → Main Deck (completar 37-39).
- **One Piece**: intacto, solo se renombraron funciones a `_OP`. Sin regresión.

### Pendiente Riftbound
- **Runes faltantes**: Riftcodex no tiene Runes para SFD, UNL, OGS, PR, JDG. `riftbound.gg` retorna 403.
- **API de Riot**: development key obtenida pero Riftbound requiere aplicación aprobada (production key). `riot.txt` deployado, app registrada, esperando revisión.

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
- Orden: state.js → config.js → script.js → registry.js → catalog.js → binder.js → venta.js → explore.js → deck.js → deck_riftbound.js → dispatcher.js → modals.js → profile.js

### Deploy
- Último commit: `ca3c232` (integración Riftbound completa)
- Pendiente de commit: deck builder Riftbound + dispatcher + refactor OP
- URL: `https://main.tutcg.pages.dev`
- NO hacer deploy sin que el usuario lo pida explícitamente.

## Próximo paso
- Obtener API key de Riot para bajar Runes de SFD/UNL faltantes.
- Cuando salgan nuevos sets de One Piece en `asia-en.onepiece-cardgame.com`, correr `_tools/scrape_set.js`.

## Convenciones
- Diseño: glass-panel, toggles deslizantes, modales estilizados
- Nunca hacer deploy sin que el usuario lo pida explícitamente
- Leer este archivo al iniciar cada sesión
- **Cada TCG tiene sus propios archivos**: nuevo TCG = nuevos archivos JS independientes (deck, config, etc.). Se reutilizan helpers globales de `script.js` (getCardKey, formatearNombre, etc.) pero la lógica de cada TCG está aislada. Si falla uno, no afecta a los demás.
