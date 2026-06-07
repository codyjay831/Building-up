# 08 — Review Two: Production and Architecture Audit

## Review verdict

**The revised plan is buildable, but only through phased vertical slices. A one-shot Cursor build would be a bad implementation strategy.**

## Architecture audit

### Pass — Pure simulation boundary

The plan correctly isolates:

- simulation,
- player commands,
- configuration,
- persistence,
- and React presentation.

This is the most important technical decision.

### Pass — Deterministic randomness

Seeded randomness enables:

- reproducible bugs,
- stable tests,
- balance comparisons,
- and controlled events.

This must be implemented before leasing randomness.

### Pass — Configuration-driven content

Buildings and events belong in config, allowing balance changes without rewriting logic.

### Concern — Zustand can become a god object

Mitigation:

- store exposes commands,
- domain modules perform calculations,
- selectors shape UI data,
- transient UI state remains separate,
- store file stays thin.

### Concern — Forecast drift

The construction forecast could disagree with actual outcomes if duplicate formulas are created.

Mitigation:

- forecast reuses domain selectors and formulas,
- tests compare forecast draw schedule to executed draw schedule,
- deterministic expected ranges documented.

### Concern — Save compatibility

Games accumulate save data quickly. Delaying versioning would create brittle development.

Mitigation:

- schemaVersion exists from the first save,
- Zod validates load,
- migration pipeline exists before content expansion.

### Concern — Ledger gaps

Hidden money mutations would make debugging and player explanation impossible.

Mitigation:

- every cash mutation emits a ledger line,
- integration test reconciles opening cash + transactions = closing cash,
- commands such as sale and refinance also produce entries.

## Production audit

### Art scope

Safe:

- simple roof sprites,
- shadows,
- icons,
- use colors,
- status overlays.

Unsafe for MVP:

- unique building animation sets,
- residents,
- vehicles,
- floor interiors,
- dynamic lighting,
- complex isometric assets.

### Content scope

The number of buildings is appropriate only if data-driven.

MVP should initially activate:

- Existing House
- Small House
- Corner Shop
- Surface Parking
- Small Park
- Shop + Apartment

Duplex and Small Apartment Building can remain locked or disabled until the loop is stable.

### Testing scope

Unit tests alone are insufficient.

Critical integration paths:

1. commit → draw → complete → lease → earn,
2. shortage → penalty → warning,
3. profit/condition/reserve → approval unlock,
4. save → load → same next-month result,
5. insolvency → recovery → no premature loss.

### Balance scope

Balance cannot be finalized from a design document.

The plan correctly calls for:

- debug seed,
- telemetry export,
- scenario simulation,
- manual runs,
- configurable values.

Do not hard-code “final” numbers into tests except invariant rules.

## Data model review

### Stable identities

Every building, project, debt instrument, event, and ledger entry needs an ID.

Do not use array order as identity.

### Derived state

Avoid persisting values that can be safely recalculated, such as:

- total parking capacity,
- total parking demand,
- current monthly gross,
- overall occupancy percentage.

Persist only when needed for historical records.

### Historical state

Persist monthly ledger snapshots because the player needs trends and debugging needs reconciliation.

Limit ledger length only after the MVP is stable.

## Delivery sequence correction

The first draft placed polished UI too early.

Corrected sequence:

1. repository,
2. pure rules,
3. board interaction,
4. construction,
5. monthly economy,
6. leasing,
7. progression,
8. finance/recovery,
9. persistence/onboarding,
10. polish/balance.

This sequence proves game truth before visual polish.

## Cursor failure modes

### Failure mode 1 — Inventing extra systems

Cursor may add:

- workers,
- city traffic,
- utilities,
- Redux,
- backend APIs,
- procedural generation.

Prevention:

Every phase prompt explicitly prohibits out-of-scope systems.

### Failure mode 2 — Putting logic in components

Prevention:

Require pure functions and tests before UI wiring.

### Failure mode 3 — Rewriting architecture every phase

Prevention:

- phase-specific file list,
- architecture gates,
- no unrelated refactors,
- review before schema changes.

### Failure mode 4 — Fake completion

Cursor may produce UI without complete rules.

Prevention:

Each phase has behavioral acceptance tests and required commands.

### Failure mode 5 — Unbalanced “magic numbers”

Prevention:

All balance values live in config and are documented in CSV/JSON.

## Production readiness gates

### Gate 1 — Domain readiness

Before economy UI:

- deterministic simulation,
- command results,
- placement tests,
- config validation.

### Gate 2 — Gameplay readiness

Before adding progression:

- monthly report understandable,
- player can diagnose vacancy,
- no hidden cash changes,
- first four months playable.

### Gate 3 — Content readiness

Before adding more buildings:

- at least two viable openings,
- no dominant parking strategy,
- mixed-use target feels valuable,
- redevelopment is understandable.

### Gate 4 — Release-candidate readiness

- clean new-game path,
- save/load,
- no blocker bugs,
- deterministic test seed,
- win/loss,
- onboarding,
- accessible controls,
- telemetry report.

## Final reviewed scope

This is now a credible MVP.

Estimated complexity classification:

- Design: medium
- Domain simulation: medium
- UI: medium
- Graphics: low
- Backend: none
- Content production: low to medium
- Balance risk: high
- Cursor one-shot risk: very high
- Cursor phased-build viability: high

## Final recommendation

Build the skeleton and meat separately:

### Skeleton

- domain contracts,
- commands,
- simulation order,
- config,
- persistence,
- board interaction,
- tests.

### Meat

- tuned building values,
- event variety,
- visual assets,
- sound,
- more scenarios,
- more developments,
- late-game systems.

Cursor should build the skeleton from this package. The game should not receive more content until the starter scenario is playable and measurably fun.
