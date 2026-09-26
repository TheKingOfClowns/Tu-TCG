# TuTCG — Session Context

## Estado actual

- Última actualización de contexto: 2026-09-26.
- App web SPA vanilla HTML/CSS/JS para administrar colecciones, decks, tracking y ventas de TCG.
- Juegos actuales: One Piece, Riftbound y estructura incompleta para Pokémon.
- Producción: Cloudflare Pages con deploy automático al hacer push a `master`.
- Último estado estable registrado: commit `2275049` en `origin/master`.
- Desarrollo local con fallback SPA: `npm run dev`.
- Idiomas de interfaz: español e inglés. El idioma de las cartas es independiente.

## Cambios locales pendientes (2026-09-26)

- Primera pasada Impeccable sin commit ni deploy.
- Móvil: grillas limitadas a dos columnas, filtros adaptativos, shell sin overflow y superficies flotantes separadas de la navegación inferior.
- Accesibilidad: diálogos con semántica ARIA, foco inicial/restaurado, focus trap y toasts anunciados.
- Legibilidad: mínimo funcional `--text-xs` elevado a 11px y badges repetidos “Disponible” eliminados.
- Verificado a 390px: documento sin overflow, cinco destinos inferiores visibles y catálogo en dos columnas.

## Reglas operativas

- No hacer commit, push ni deploy sin pedido explícito del usuario.
- No usar `wrangler pages deploy` salvo emergencia: el flujo principal es el auto-deploy desde `master`.
- Los builds de Cloudflare corren en Linux y distinguen mayúsculas/minúsculas. Verificar siempre el case de assets y referencias JSON.
- No commitear `.env`, credenciales, backups ni archivos temporales.
- Después de modificar JS cargado desde `index.html`, actualizar su `?v=` para evitar caché vieja.
- Si se tocan listeners top-level u orden de scripts, verificar el orden de carga además de ejecutar `node --check`.

## Arquitectura

- `index.html`: layout principal y orden de carga de scripts.
- `style.css` / `design-system.css`: estilos y tokens Nexus.
- `script.js`: estado global, navegación de vistas, sincronización, borradores y planes.
- `js/state.js`: estado compartido.
- `js/router.js`: History API y deep links.
- `js/i18n.js`: traducciones ES/EN y preferencias de idioma.
- `js/tutorial.js`: guía contextual por sección.
- `js/cart.js`: carrito, reservas y checkout.
- `js/notifs.js`: notificaciones y campana.
- `js/seller.js`: perfiles públicos, publicaciones, pedidos y reputación.
- `auth.js` / `profile.js`: autenticación y perfil.
- `supabase.js`: cliente y configuración pública de Supabase.
- `js/viewOpts.js`: tamaño de cartas/decks y paginación visual.
- `js/skeleton.js`: estados de carga.

### Módulos por TCG

Cada dominio tiene módulos por juego y un dispatcher:

- Config: `js/tcg/{tcg}/config.js`.
- Catálogo: `js/catalog/catalog.js`.
- Colecciones: `js/binder/binder.js`, variantes `_riftbound`/`_pokemon` y `dispatcher_binder.js`.
- Ventas: `js/venta/venta.js`, variantes y `dispatcher_venta.js`.
- Decks: `js/deck/deck.js`, variantes y `dispatcher.js`.
- Tracking: `js/tracking/tracking.js`, variantes y `dispatcher_tracking.js`.
- Modales y agregado: `js/modals/modals.js`.
- Explore: `js/explore/explore.js`.

Convenciones obligatorias:

- Cada TCG usa sufijos `_OP`, `_RB` o `_PK`; no crear dispatchers inline.
- Los dispatchers resuelven el módulo con `tcgShort()` y `tcgConfigs[currentTcg].short`, no con cadenas de `if/else`.
- Las reglas de juego viven en su config: zonas, rarezas, colores, tipos, límites y detectores.
- Los listeners que dependen de una función deben vivir en el archivo que define esa función.
- En Riftbound, `feature` agrupa cartas de un mismo champion.

## Datos maestros

- One Piece: `data/games/onepiece/cards_master.json`.
- Riftbound: `data/games/riftbound/cards_master.json`.
- Pokémon: `data/games/pokemon/cards_master.json` todavía vacío.
- Juegos habilitados: `config/games.json`.
- Scripts vigentes de actualización OP: `_tools/scrape_set.js` y `_tools/scrape_set_en.js`.

One Piece tiene imágenes tanto en `assets/images/onepiece/en/P/` como en `en/PROMO/`; ambas rutas son válidas. Los nombres de archivo se mantienen en minúsculas para compatibilidad con Linux. El filtro “Promo Cards” combina categorías `PROMO` y `OTHER`.

## Reglas de juego

| Regla | One Piece | Riftbound | Pokémon |
|---|---|---|---|
| Playset | 4 | 3 | 4 |
| Identidad de copia | `card_set_id` | `card_name` | `card_name` |
| Deck | Leader + 50 + 10 DON | Legend + 3 Champions + 40 main + 12 Runes + 3 BF + SB | 60 cartas |
| Idioma en catálogo | Sí | No | Sí |
| Tracking | expansión, personaje, rareza, DON | expansión, personaje, rareza | expansión, personaje, rareza |

Pendiente en Pokémon: ACE SPEC máximo 1, Radiant máximo 1 y Basic Energy sin límite de cuatro.

## Navegación y vistas

Rutas principales:

- `/`: landing.
- `/catalog`: catálogo y filtros por query string.
- `/collections` y `/collections/:id`.
- `/venta` y `/venta/:id`.
- `/explore` y `/explore/:id`.
- `/seller/:id`: perfil público.

`navigateToView()` actualiza la ruta y `onNavigate` realiza el render. No duplicar renders llamando también a `mostrarVista()`.

La app restaura vista, IDs y páginas desde `sessionStorage` cuando no existe un deep link. Al volver a una pestaña, un evento `SIGNED_IN` repetido de Supabase no debe reconstruir el estado ya cargado ni pisar borradores.

`ensureCartasLoaded()` debe ejecutarse antes de vistas que necesitan `cartasMap`. Explore usa cancelación de requests, consultas agrupadas y caché de 30 segundos para datos ajenos.

## Catálogo, colecciones y decks

- El catálogo es data-driven según `tcgConfigs[currentTcg]`.
- Quick-add: al elegir un binder o una venta como destino aparecen controles `− / cantidad / +` y los cambios se aplican al borrador actual.
- El botón `+` desde un binder o venta abre el catálogo con ese destino preseleccionado.
- Tracking no aparece como destino rápido.
- Deck conserva su flujo de buffer y confirmación.
- Import/export de deck usa líneas `CANTIDAD SET-NUM Nombre`, valida líder, colores y topes.
- Las opciones de vista permiten cambiar tamaño, filas por página o cantidad fija y se guardan localmente.

### Borrador de edición

- Cambios en colecciones y ventas se mantienen como borrador hasta Guardar o Descartar.
- El borrador cubre cantidades, precios, moneda, orden, tracking, decks, nombre, visibilidad y borrado.
- Persiste en `localStorage` por TCG y se restaura al arrancar.
- Al salir de un contexto con cambios se ofrece Guardar, Descartar o Seguir editando.
- Binder y catálogo comparten contexto y no preguntan al navegar entre sí.
- No rehidratar desde Supabase encima de un borrador sucio.

## Ventas y carrito

- Las ventas usan un único modelo de stock con máximo 20 por stack.
- Varias pilas de la misma carta están permitidas; un swipe horizontal separa una unidad.
- Cada carta puede tener precio y moneda ARS o USD.
- Los totales se muestran separados por moneda.
- `config.stock_baseline` y `low_notified` sostienen las alertas de stock bajo.

Carrito:

- Una reserva dura 20 minutos y cada modificación reinicia el plazo.
- Un carrito corresponde a un comprador y una venta.
- El dueño no puede comprar su propia venta.
- El checkout atómico valida stock, descuenta `binder_cards`, crea `sale_orders`, elimina el carrito y notifica al vendedor.
- La acción pública final es “Enviar pedido por WhatsApp”. El mensaje lista una carta por línea con nombre, código y cantidad.
- El precio de checkout se toma del primer stack correspondiente con precio.

## Perfiles, Explore y reputación

- `/seller/:id` reemplaza el antiguo modal de perfil público.
- El perfil público muestra información permitida, contacto, redes, colecciones, ventas y reputación.
- Colecciones y ventas usan portadas con la imagen principal y abren su detalle.
- Explore permite filtrar Colecciones, Ventas o Todas, y buscar por nombre o cartas.
- Las portadas de vendedores muestran reputación mediante consulta agrupada.
- Las reseñas se crean desde órdenes reales, una por orden, y no se editan.
- Los usuarios pueden reportar reseñas; administradores pueden desestimar o borrar desde la cola de moderación.
- La pestaña Valorar muestra las cartas del pedido numeradas, una por línea.
- Todo dato de usuario debe escaparse; enlaces externos y WhatsApp deben validarse.

## Tutorial, preferencias y UX

- Tutorial contextual en `js/tutorial.js`, sin librerías externas.
- Modos: una vez, siempre o desactivado; se guardan en `profiles.preferences` y localmente.
- El spotlight usa anillo fucsia y se adapta a móvil.
- No iniciar el tutorial antes de cargar las preferencias del perfil.
- Tracking crea filtros desmarcados por defecto.
- La interfaz usa skeletons durante carga y respeta `prefers-reduced-motion`.
- Diseño Nexus: fondo oscuro, cyan como acento principal, dorado para estados activos específicos, Outfit y JetBrains Mono.

## Planes y crews

- Nivel 0: 5 espacios y 150 cartas por binder.
- Nivel 1: 10 espacios y 500 cartas por binder.
- Nivel 2: 25 espacios y cartas ilimitadas.
- Administradores no tienen límites.
- El usuario puede elegir una crew predefinida o personalizada; el nombre personalizado se valida en cliente.
- Los límites se controlan tanto en frontend como con triggers/RPC de base de datos.
- Tracking targets no consumen el límite de cartas del binder.

## Supabase

Tablas principales:

- `profiles`
- `binders`
- `binder_cards`
- `ventas`
- `cartas_usuario`
- `sale_carts`
- `sale_orders`
- `notifications`
- `reviews`
- `reports`

Servicios y RPC importantes:

- Edge Function versionada: `supabase/functions/sync-binder-cards-v3/`.
- `sync_binder_cards_atomic`: reemplazo atómico del contenido de un binder.
- `sale_reserved`, `cart_add`, `cart_set_qty`, `checkout_cart`.
- `seller_reputation`, `seller_reviews`, `rate_order`, `report_review`, `mod_resolve_report`.
- `_notify_if_allowed` y `_sale_check_low` para notificaciones.

La sincronización de un binder vacío también debe llamar a la Edge Function para borrar sus filas. Mantener ownership checks y RLS; no confiar solo en validaciones del frontend.

## Autenticación y perfil

- Los errores de login, registro, contraseña corta y usuario duplicado se traducen a mensajes amigables.
- El perfil guarda idioma, moneda, tutorial, crew y preferencias de notificación.
- Contacto admite teléfono y WhatsApp; WhatsApp debe ser una URL válida de dominios permitidos.
- La anti-enumeración de Supabase puede devolver éxito aparente para un email ya registrado; resolver con RPC o trigger si se retoma ese caso.

## Verificación mínima

Según el cambio, ejecutar:

- `node --check` en cada JS modificado.
- Harness de i18n para cobertura ES/EN si se agregan textos.
- Harness de load order si se cambian scripts o listeners top-level.
- `git diff --check`.
- Prueba local con `npm run dev`, incluyendo deep links relevantes.
- Para cambios visuales o flujos completos, validar en navegador y revisar consola.
- Antes de push, auditar case-sensitive las rutas de imágenes contra el índice Git.

## Pendientes reales

- Checkout de planes con MercadoPago y webhook que actualice `plan_level` y crew.
- Mostrar badge de crew donde corresponda en Explore/perfiles.
- Scrapear Pokémon y poblar su `cards_master.json`.
- Completar validaciones y filtros específicos de Pokémon.
- Conseguir API key de Riot production para las Runes faltantes de Riftbound.
- Ejecutar los scrapers cuando salgan nuevos sets de One Piece.
- Auditar y limpiar duplicados históricos en Supabase o forzar una resincronización segura.
- Deep links separados para `/explore/colecciones` y `/explore/ventas`.
- Probar con cuentas reales los últimos flujos de perfil público, pedidos, reseñas y checkout.
- Reiniciar VS Code/Codex y confirmar si `[features] code_mode_host = false` elimina la ventana persistente de `codex-code-mode-host.exe`.
