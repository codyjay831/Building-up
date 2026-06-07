# Vertical Plot Manager — Cursor-Ready Product & Build Specification

## Status

**Verdict:** Solid concept with a clear differentiator, but only if the first release stays focused on land redevelopment rather than becoming a miniature city simulator.

## Product sentence

A turn-based 2D property-development game where the player buys or inherits a small urban plot, leases simple buildings, responds to market demand, and repeatedly redevelops the same land into denser mixed-use property.

## Core player fantasy

> Turn one underused lot into a valuable vertical neighborhood.

## Why this package exists

This package defines the game before implementation so Cursor can later build from stable rules instead of inventing architecture, mechanics, and scope while coding.

It includes:

1. Product vision and research conclusions
2. Locked MVP scope
3. Complete game rules
4. Economy and progression model
5. UX and screen behavior
6. Technical architecture
7. Delivery phases and Cursor prompts
8. Two formal plan reviews
9. Acceptance criteria and test cases
10. Initial balancing data

## Recommended implementation stack

- React
- TypeScript
- Vite
- Zustand
- CSS Grid plus positioned DOM overlays
- Vitest
- Playwright
- LocalStorage with versioned save migrations

Do not use Three.js, a backend, multiplayer, pathfinding, or individual-agent simulation for the MVP.

## First playable target

A player should be able to:

1. Open one 12×12 property.
2. Review residential and retail demand.
3. renovate, demolish, or construct.
4. Advance the game one month at a time.
5. Lease completed spaces.
6. earn rent and pay expenses.
7. solve parking and appeal constraints.
8. qualify for a larger redevelopment.
9. replace the starter property with a two-story mixed-use building.
10. win by maintaining a healthy mixed-use property.

## Document order

Read these files in order:

1. `01_RESEARCH_AND_PRODUCT_DIRECTION.md`
2. `02_LOCKED_MVP_GAME_DESIGN.md`
3. `03_ECONOMY_DEMAND_AND_PROGRESSION.md`
4. `04_UX_UI_AND_PLAYER_FLOW.md`
5. `05_TECHNICAL_ARCHITECTURE.md`
6. `06_DELIVERY_PLAN_AND_CURSOR_PROTOCOL.md`
7. `07_REVIEW_ONE_SCOPE_AND_GAMEPLAY_AUDIT.md`
8. `08_REVIEW_TWO_PRODUCTION_AND_ARCHITECTURE_AUDIT.md`
9. `09_ACCEPTANCE_TESTS_AND_DEFINITION_OF_DONE.md`
10. `data/building-definitions.json`
11. `data/balance-assumptions.csv`

## Non-negotiable scope rule

No feature may enter the MVP unless it strengthens this loop:

**Read demand → choose a development → build → lease → operate → diagnose → improve or redevelop.**
