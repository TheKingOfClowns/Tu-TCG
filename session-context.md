# TuTCG — Session Context

## Fecha
2026-07-09

## Proyecto
App web vanilla HTML/CSS/JS SPA de gestión de colecciones TCG (One Piece, Pokémon, Magic, Digimon, Dragon Ball, Yu-Gi-Oh!). Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura
- `index.html` — Layout: sidebar (desktop) + main content + bottom nav (mobile)
- `style.css` — Estilos (glass-panel, toggles, progreso, modales)
- `design-system.css` — Tokens CSS (colores, tipografía, animaciones)
- `script.js` — Lógica principal (vistas, catálogo, binder, venta, tracking, TCG selector, auth, CRUD, UI)
- `auth.js` — Autenticación Supabase (login, registro, recuperación, perfiles)
- `profile.js` — Página de perfil de usuario
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — Base de datos de cartas
- `config/games.json` — Registro de TCGs disponibles

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

## Últimos cambios (2026-07-09)

### Homepage
- Texto de bienvenida cambiado: "One Piece TCG" → "TCG´s"

### TCG selector en sidebar
- `pendingView` integrado en vistas Binder, Venta, Explorar. Selector TCG con título contextual.
- Campo `tcg: "one-piece"` en binders. Filtro por `currentTcg` en listas y explore.

### Venta cards
- Quitado `overflow: hidden` de `.venta-slot`, X de remover al hover.
- Editable mode: botones `+/-` + input sin spinners.
- Precios totales: `getTotalPrice` suma `customPrice`.

### Tracking binder
- `subtype: "tracking"` con `tracking_type` y `tracking_config`
- Modal multi-tipo: Expansión, Rarezas (L-SEC-SP-AA), Personaje, Don Cards
- Toggles AA/Promos/Gold
- Claves de tracking con `getCardKey(c)` → `cartasMap`
- Progreso: barra + `X / Y — %`, instantáneo con `toggleTrackingCard`
- Modo lista: `flex-wrap`, sin paginación, sin imagen
- Botones ✓ Todo / ✗ Todo con confirmación estilizada
- "+ Agregar" reutiliza modal en modo append
- X en cada carta para remover con confirmación
- Sync Supabase: tracking sube cartas owned, master list desde config

### Code review fixes
- `setupVentaDragDrop` removido, IDs footer duplicados renombrados
- `tcgplayerMap` declarado, `bottomTcg` eliminado, dead code removido
- Debounce 250ms en búsqueda, delete con `showConfirmModal` estilizado
- Empty binder slots: click → catálogo

## Convenciones
- Diseño: glass-panel, toggles deslizantes, modales estilizados (NO `confirm()` nativo)
- Nunca hacer deploy sin que el usuario lo pida explícitamente
- Leer este archivo al iniciar cada sesión

