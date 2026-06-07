# 10 — Master Cursor Handoff Prompt

Use this only to initialize the repository and establish the phased plan. Do not tell Cursor to implement every phase immediately.

```text
Act as the principal engineer and technical game designer for a browser-based management game called Vertical Plot Manager.

You have been given a complete specification package. Your first responsibility is to protect the architecture and scope, not to produce the maximum amount of code.

Read these files in order:

1. README.md
2. 01_RESEARCH_AND_PRODUCT_DIRECTION.md
3. 02_LOCKED_MVP_GAME_DESIGN.md
4. 03_ECONOMY_DEMAND_AND_PROGRESSION.md
5. 04_UX_UI_AND_PLAYER_FLOW.md
6. 05_TECHNICAL_ARCHITECTURE.md
7. 06_DELIVERY_PLAN_AND_CURSOR_PROTOCOL.md
8. 07_REVIEW_ONE_SCOPE_AND_GAMEPLAY_AUDIT.md
9. 08_REVIEW_TWO_PRODUCTION_AND_ARCHITECTURE_AUDIT.md
10. 09_ACCEPTANCE_TESTS_AND_DEFINITION_OF_DONE.md
11. data/building-definitions.json
12. data/balance-assumptions.csv

Then inspect the repository.

Your current task is planning and Phase 0 only.

Required response before implementation:

- Summarize the product in one paragraph.
- State the locked MVP loop.
- Identify any conflict between the repository and specifications.
- Propose the exact Phase 0 file structure.
- List dependencies and justify each one.
- Identify architecture risks.
- State which systems are explicitly deferred.
- Provide an implementation sequence for Phase 0.
- Do not begin later phases.

Mandatory rules:

- React + TypeScript + Vite.
- Strict TypeScript.
- Pure deterministic domain simulation.
- Zustand only as an application/store boundary.
- Zod for save validation.
- Vitest and Playwright.
- No backend.
- No Three.js.
- No individual people or vehicles.
- No city simulation.
- No floor interior editor.
- No money logic in React components.
- No Math.random() in simulation.
- No any types.
- No giant all-in-one store.
- No duplicate forecast formulas.
- No hidden cash mutation.
- Building and balance content must remain configuration-driven.

After approval, implement Phase 0 only.

Run:

npm run typecheck
npm run lint
npm run test
npm run build

Finish with:

- files changed,
- architecture established,
- commands and outcomes,
- known limitations,
- exact recommended prompt for Phase 1.
```
