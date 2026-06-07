# Vertical Plot Manager

Browser-based turn-based property development game. The player redevelops a single urban lot through leasing, construction, demand management, and approval progression.

## Architecture

This repository follows a **deterministic domain simulation wrapped by a React UI**.

| Layer                   | Responsibility                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| `src/game/domain/`      | Pure simulation rules. No React, browser APIs, or hidden side effects. |
| `src/game/commands/`    | Named player mutations returning typed results.                        |
| `src/game/selectors/`   | Read-only projections for UI and forecasts.                            |
| `src/game/store/`       | Zustand boundary between UI and domain state.                          |
| `src/game/persistence/` | Zod-validated save/load and migrations.                                |
| `src/features/`         | Screen-level UI composed from domain selectors and commands.           |
| `src/app/`              | Application shell, providers, and routing.                             |

### Non-negotiable rules

- Strict TypeScript everywhere.
- No `any` types.
- No `Math.random()` in simulation code.
- No money logic inside React components.
- No direct mutation of domain state from UI components.
- Forecast math must reuse domain formulas.
- Building and balance content stay configuration-driven.
- Zustand is the store boundary only; domain modules remain pure.

### Deferred until later phases

Domain types, PRNG, placement validation, monthly simulation, demand, finance, save/load, onboarding, and playable mechanics are intentionally **not** implemented in Phase 0.

Phase 0 delivers the repository foundation and a static app shell only.

## Stack

- Vite + React + TypeScript
- Zustand
- Zod
- Vitest + React Testing Library
- Playwright
- ESLint + Prettier
- CSS Modules

## Project layout

```text
src/
  app/                 Application shell
  components/ui/       Shared UI primitives
  features/            Screen modules (property board, inspector, etc.)
  game/
    config/            Building and balance configuration loaders
    domain/            Pure simulation modules
    commands/          Player command handlers
    selectors/         Read models for UI
    store/             Zustand store boundary
    persistence/       Save schema, migrations, import/export
    telemetry/         Debug and balance tooling
  styles/              Global tokens and base styles
  tests/
    e2e/               Playwright specs
```

Specification documents live in `vertical_plot_manager_spec/`.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run ci
```

## Delivery phases

Build proceeds in vertical slices defined in `vertical_plot_manager_spec/06_DELIVERY_PLAN_AND_CURSOR_PROTOCOL.md`.

Current status: **Phase 9 complete** — debug mode (`?debug=1`), fixed seed presets, telemetry export, automated smoke simulations, and balance adjustment reports.

## Phase 1 entry prompt

```text
Act as a senior TypeScript game-simulation engineer and frontend architect.

Repository goal:
Build Vertical Plot Manager according to the specification files in the repository.

Current task:
Implement Phase 1: Pure domain foundation.

Mandatory reading:
- README.md
- vertical_plot_manager_spec/02_LOCKED_MVP_GAME_DESIGN.md
- vertical_plot_manager_spec/05_TECHNICAL_ARCHITECTURE.md
- vertical_plot_manager_spec/06_DELIVERY_PLAN_AND_CURSOR_PROTOCOL.md
- vertical_plot_manager_spec/data/building-definitions.json
- vertical_plot_manager_spec/data/balance-assumptions.csv

Deliver:
- domain types
- money helpers
- seeded PRNG
- building configuration loader
- starter scenario
- grid footprint logic
- placement validation
- initial unit tests

Do not add polished UI or later-phase systems.
Run typecheck, lint, test, and build before finishing.
```
