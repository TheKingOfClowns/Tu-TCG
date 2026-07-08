# TuTCG — Session Context

## Fecha
2026-07-08

---

## Resumen de cambios realizados

### CSS — Grids unificados
- Todas las vistas (Explore, Binder, Venta, Colecciones) ahora usan `repeat(4, 1fr)` con `gap: var(--space-4)`
- Cards unificadas con `border-radius: var(--radius-lg)`, `background: var(--surface)`, `border: 1px solid var(--border-subtle)`
- `.collection-inner` tiene `width: 100%` para que el grid ocupe todo el ancho
- `.collection-binder-grid` cambiado de `display: flex; overflow-x: auto` a `display: grid`
- Responsive unificado: mobile `<768px` todas `repeat(2, 1fr)`

### Explore grid
- Cambiado de `minmax(240px, 1fr)` a `repeat(4, 1fr)`

### Selección de cartas (modo seleccionar)
- Ciclo de cantidades: 1 click → 1 copia, 2 clicks → 4, 3 clicks → 10, 4 clicks → quita selección

### Auth — Restricción de creación
- `pedirCrearColeccion()` y `pedirCrearVenta()` ahora redirigen al modal de login si el usuario no está autenticado

---

## Pendiente / Próximo paso

### Vincular precios de TCGplayer
- Implementar un Edge Function (Supabase o Cloudflare) que actúe como proxy para la API de TCGplayer
- El frontend llamaría al Edge Function con `card_set_id` para obtener `market_price` y `median_price` en tiempo real
- Cachear resultados en Supabase para evitar rate limits
- **Requisito previo**: registrar app en https://developer.tcgplayer.com para obtener API key + secret
- **Limitación**: TCGplayer solo cubre ciertos TCGs (One Piece, Pokémon, Magic, etc.). Confirmar si el juego actual está soportado antes de implementar.
