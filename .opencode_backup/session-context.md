# Session Context - TuTCG

## Project Overview
TuTCG es una app web de gestión de colecciones de cartas TCG (One Piece, Pokémon, Magic, Digimon, Dragon Ball, Yu-Gi-Oh!). Vanilla HTML/CSS/JS SPA con Supabase para auth y datos. Hosteada en Cloudflare Pages. Deploy manual con `wrangler`.

## Arquitectura
- `index.html` — Layout: sidebar (desktop) + main content + bottom nav (mobile)
- `style.css` — Estilos nuevos (Nexus Design System)
- `design-system.css` — Tokens CSS (colores, tipografía, espaciado, animaciones)
- `script.js` — Lógica principal (vistas, catálogo, binder, venta, modal)
- `auth.js` — Autenticación Supabase (login, registro, recuperación, perfiles)
- `profile.js` — Página de perfil de usuario (carga, guardado, upload avatar)
- `supabase.js` — Configuración del cliente Supabase
- `data/games/onepiece/cards_master.json` — Base de datos de cartas (4782 cartas)
- `config/games.json` — Registro de TCGs disponibles

## Diseño (Nexus Design System)
- **Fondo**: #050511 (primary), #0a0a1a (secondary), #09090b (surface)
- **Acento**: #00f0ff (cyan), glow rgba(0,240,255,0.15)
- **Tipografía**: Outfit (UI), JetBrains Mono (datos/métricas)
- **Efectos**: glass-panel (backdrop-blur + gradiente), animaciones fadeIn/scaleIn
- **Cards**: aspect-ratio 63/88, hover scale(1.06), gradiente overlay, badges cyan/violeta
- **Sidebar**: 260px, backdrop-blur(20px), nav items con hover translateX
- **Bottom nav**: mobile, glass-panel estilo, iconos SVG inline
- **AIDesigner**: skill instalado en `.claude/skills/aidesigner-frontend/`, MCP configurado en `.mcp.json`

## Cambios de esta sesión

### Migración localStorage → Supabase para binders
- **Nuevas tablas en Supabase**:
  - `binders` (id UUID PK, user_id FK→auth.users, name, type: collection|sale, is_public, created_at, updated_at)
  - `binder_cards` (id UUID PK, binder_id FK→binders, card_id TEXT, quantity INT, price NUMERIC nullable, sort_order INT)
- **Índices**: binders por user_id, binders públicos, binder_cards por binder_id + sort_order
- **RLS**: binders → owner CRUD total + lectura pública cuando is_public=true; cards → hereda permisos del binder padre
- **Capa de datos dual**: `guardarCollections()`/`guardarVenta()` ahora también sincronizan a Supabase en background cuando el usuario está autenticado
- **Carga desde Supabase**: `initCollections()` carga binders desde Supabase si auth, fallback a localStorage
- **Migración automática**: al iniciar sesión, `migrateLocalToSupabase()` sube datos de localStorage a Supabase y los limpia
- **Colapso por cantidad**: al sync, cartas idénticas se agrupan con quantity en binder_cards; al load, se expanden a copias individuales
- **Orden preservado**: `sort_order` mantiene el orden de drag-and-drop

### Toggle público/privado
- Nuevo toggle switch en las vistas de Binder y Venta (solo visible para usuarios autenticados)
- `toggleBinderPublic()` → cambia `is_public` en Supabase + actualiza UI
- Binders públicos son legibles por cualquier usuario autenticado via RLS

### Vista Explorar (binders públicos)
- Nueva vista `exploreView` con grid de binders públicos de todos los usuarios
- Cada tarjeta muestra: nombre, tipo (Colección/Venta), usuario creador, cantidad de cartas
- Al hacer click → `exploreDetailView` con las cartas del binder + precios
- Navegación: sidebar (sección "Explorar") + bottom nav (reemplaza "Sección")
- Las cartas de tipo "Venta" muestran el precio del vendedor

### Nuevos componentes CSS
- `.public-toggle`: switch estilo toggle (mismo diseño que el de notificaciones)
- `.explore-card`: tarjeta de binder público con hover glow
- `.explore-badge`: badge de tipo (collection cyan, sale violeta)
- `.explore-detail-grid`: grid de cartas en vista detalle
- `.toast-notification`: notificación flotante para migración

## IDs importantes (no cambiar sin actualizar JS)
- Vistas: `tcgSelector`, `welcomeView`, `catalogView`, `collectionManager`, `binderView`, `ventaManager`, `ventaView`, `profileView`, `exploreView`, `exploreDetailView`
- Sidebar nav: `sidebarHome`, `sidebarCatalog`, `sidebarBinder`, `sidebarVenta`, `sidebarExplore`, `sidebarProfile`
- Bottom nav: `bottomHome`, `bottomCatalog`, `bottomCollections`, `bottomVenta`, `bottomExplore`
- Auth: `authBtn`, `userBtn`, `authModalOverlay`, `userDropdown`
- Modal carta: `modal`, `modalBody`, `closeModal`
- Toggle público: `binderPublicToggleContainer`, `ventaPublicToggleContainer`, `binderPublicCheck`, `ventaPublicCheck`
- Explorar: `exploreContainer`, `exploreDetailContainer`, `exploreDetailTitle`, `exploreDetailBackBtn`

## Supabase
- URL: `https://scykfvomdwpiypmblnvv.supabase.co`
- Anon key: `sb_publishable_LqQFFDrM2N4_KJ-q6GDsQQ_Q1OEsUsT`
- Tablas: `profiles` (id, username UNIQUE, display_name, avatar_url, first_name, last_name, address, city, country, bio, preferences JSONB), `binders` (id, user_id, name, type, is_public), `binder_cards` (id, binder_id, card_id, quantity, price, sort_order)
- Storage: bucket `avatars` (público, RLS)
- RLS: binders + binder_cards protegidas por owner + flag is_public para lectura pública
