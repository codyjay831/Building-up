# 06 — Delivery Plan and Cursor Protocol

## Delivery principle

Cursor should build the game in vertical slices. Each slice must leave the repository running and testable.

Do not ask Cursor to generate the full game in one request.

## Phase 0 — Repository foundation

Deliver:

- Vite React TypeScript app
- strict TypeScript
- ESLint and Prettier
- Vitest
- Playwright
- basic app shell
- architecture README
- CI commands

Acceptance:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

All pass.

## Phase 1 — Pure domain foundation

Deliver:

- domain types
- money helpers
- seeded PRNG
- building configuration loader
- starter scenario
- grid footprint logic
- placement validation
- initial unit tests

No polished UI.

Acceptance:

- Place a structure in a headless test.
- Reject overlap and off-lot placement.
- Same seed returns same deterministic result.

## Phase 2 — Property board and selection

Deliver:

- 12×12 board
- south road
- starter house
- building selection
- inspector shell
- build catalog shell
- valid/invalid placement preview

No monthly economy yet.

Acceptance:

- Player can inspect starter house.
- Player can preview and cancel placement.
- Invalid placement shows a reason.

## Phase 3 — Commands and construction

Deliver:

- project forecast
- commit project
- scheduled construction draws
- construction lifecycle
- cancellation before first monthly advancement
- construction progress UI

Acceptance:

- Forecast and actual draw schedule match.
- Construction completes after configured months.
- Cash cannot be overspent outside allowed financing.

## Phase 4 — Monthly economy

Deliver:

- simulateMonth pipeline
- rent income
- operating expenses
- parking calculation
- appeal
- condition
- monthly ledger
- report drawer

Acceptance:

- Same state and seed produce same monthly result.
- Every cash change appears in the ledger.
- UI explains net cash flow.

## Phase 5 — Demand and leasing

Deliver:

- residential demand
- retail demand
- rent posture
- occupancy movement
- leasing factor breakdown
- vacancy indicators

Acceptance:

- Discount improves leasing probability.
- Parking shortage visibly reduces retail score.
- Strong residential occupancy increases effective retail demand.

## Phase 6 — Progression and redevelopment

Deliver:

- Approval Levels 1–3
- unlock progress UI
- renovation
- demolition
- sale
- shop + apartment
- mixed-use win objective

Acceptance:

- Player cannot build locked structures.
- Unlock conditions are visible and deterministic.
- Demolition displays lost income and cost.
- Starter scenario can be won.

## Phase 7 — Finance and recovery

Deliver:

- construction loan
- refinance once
- insolvency warning ladder
- loss condition
- emergency recovery offer

Acceptance:

- Debt payment appears in ledger.
- Refinance respects property value cap.
- Player receives three-month insolvency countdown.
- Loss does not occur while a valid recovery action remains.

## Phase 8 — Save, onboarding, polish

Deliver:

- autosave
- three manual slots
- JSON export/import
- Zod validation
- migration shell
- guided onboarding
- keyboard support
- responsive desktop/tablet shell
- sound hooks optional but no required audio assets

Acceptance:

- Save/load round trip preserves all domain state.
- Invalid imports fail safely.
- New player completes first five guided objectives.
- 1280×720 remains usable.

## Phase 9 — Balance validation

Deliver:

- debug mode
- fixed seeds
- telemetry export
- automated scenario smoke simulation
- balance adjustment report

Acceptance:

- At least two viable openings.
- Typical Approval Level 2 by Month 7–12.
- Typical mixed-use completion by Month 12–20.
- No dominant “always build X first” strategy.
- Fewer than four consecutive no-decision turns in normal play.

# Cursor operating protocol

## Before every phase

Cursor must:

1. Read `README.md`.
2. Read the phase-relevant spec files.
3. Inspect the current repository.
4. State what already exists.
5. Identify conflicts.
6. Propose exact files to create or change.
7. Avoid schema or architecture drift.
8. Stop if requirements contradict implemented invariants.

## During implementation

Cursor must:

- use complete typed implementations,
- preserve deterministic domain behavior,
- add or update tests with each rule,
- avoid unrelated refactors,
- keep balance values in config,
- explain new dependencies,
- avoid adding dependencies when standard code is sufficient.

## After every phase

Cursor must run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

For UI phases also run:

```bash
npm run test:e2e
```

Cursor must report:

- files changed,
- tests added,
- commands run,
- failures and fixes,
- remaining known limitations,
- explicit confirmation that no out-of-scope features were added.

## Phase prompt template

Use this template, replacing bracketed values:

```text
Act as a senior TypeScript game-simulation engineer and frontend architect.

Repository goal:
Build Vertical Plot Manager according to the specification files in the repository.

Current task:
Implement Phase [NUMBER]: [NAME].

Mandatory reading:
- README.md
- [RELEVANT SPEC FILES]

Process:
1. Inspect the repository before proposing changes.
2. Summarize the current implementation and identify any mismatch with the specs.
3. List the exact files you will create or modify.
4. Implement only this phase.
5. Keep simulation logic pure and outside React.
6. Keep balancing values in configuration.
7. Add tests for every game rule introduced.
8. Do not add future-phase systems.
9. Run typecheck, lint, tests, build, and relevant end-to-end tests.
10. Fix all failures before finishing.

Architecture rules:
- No Math.random() in simulation code.
- No direct game-state mutation inside components.
- No money calculations inside UI components.
- No backend.
- No Three.js.
- No individual-agent simulation.
- No any types.
- No hidden cash changes outside the monthly ledger or explicit commands.
- Forecast calculations must reuse domain formulas.

Deliver a completion report containing:
- implemented behavior,
- changed files,
- tests,
- commands and outcomes,
- architecture decisions,
- deferred items,
- risks.
```

## Senior review gate

Before Cursor begins Phase 4, review:

- command boundary,
- simulation purity,
- deterministic randomness,
- ledger completeness,
- configuration separation.

Before Cursor begins Phase 6, review:

- whether the basic monthly loop is actually fun,
- whether parking is meaningful but not dominant,
- whether forecasts are understandable,
- whether idle waiting is excessive.

Before Cursor begins Phase 8, freeze domain schema unless a critical defect requires change.
