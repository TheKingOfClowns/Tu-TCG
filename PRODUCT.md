# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: TCG players who collect and sell. Same person catalogs cards, builds binders and decks, publishes sale stock with cart checkout, and browses other users' public collections. Spanish-speaking (Argentina-based: ARS/USD dual currency), ES/EN in-app i18n.

## Product Purpose

One place to organize, explore, and trade TCG collections: complete catalog, virtual binder, deck builder, and peer-to-peer sale with stock reservation and checkout. Success: a collector runs collection + sales entirely inside TuTCG.

## Positioning

Everything in one frictionless vanilla SPA: catalog, binder, deck builder, and sale-with-cart in a single static app, no framework weight, no account needed to browse.

## Operating Context

Mobile and desktop browsers; hosted on Cloudflare Pages with auto-deploy on push to master. Backend: Supabase (auth, Postgres, RLS, RPCs, Edge Functions). Logged-out browsing; login required to sell, buy, or sync. Seller contact via WhatsApp/phone from public profile.

## Capabilities and Constraints

- TCGs: One Piece, Riftbound, Pokémon (config-driven per-TCG modules).
- Sale binder: single type, stock up to 20 per stack, swipe-to-duplicate stacks; buyer cart with 20-minute reservation window, checkout decrements real stock, seller notified.
- Constraints: vanilla HTML/CSS/JS, no frameworks; builds run on Linux (case-sensitive assets); no deploys without user request; `.env` never committed.

## Brand Commitments

Name TuTCG. Nexus Design System incumbent: background #050511, cyan accent #00f0ff, glass panels, Outfit (UI) + JetBrains Mono (data). Identity and vanilla stack preserved by user decision.

## Evidence on Hand

Live app in this repo (`index.html`, `js/`, `style.css`, `design-system.css`); `session-context.md` records build history; card masters under `data/games/`; promo images under `assets/images/`. No testimonials, benchmarks, or pricing to cite: future work must not fabricate them.

## Product Principles

1. One app, whole hobby: collection, deck, and sale stay in a single flow.
2. Boring tech, fast pages: vanilla stack, shortest diff, no speculative abstraction.
3. Seller truth first: real stock, real reservations, no oversell.
4. Browse free, transact logged: friction only where money moves.
