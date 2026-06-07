# 07 — Review One: Scope and Gameplay Audit

## Review verdict

**The plan is solid, but the first draft still risked becoming too broad.**

The central concept is strong:

> Redevelop one constrained plot into a stable mixed-use property.

The plan passes only after the following reductions and clarifications.

## Finding 1 — Too many simultaneous fantasies

Potential competing fantasies:

- landlord,
- architect,
- city planner,
- financier,
- construction manager,
- tenant manager,
- parking designer.

Correction:

The MVP fantasy is **developer/operator**.

The player decides:

- what to build,
- when to build,
- how to finance,
- how to position rent,
- and when to redevelop.

The player does not manage:

- individual tenants,
- construction crews,
- interior layouts,
- or city infrastructure.

## Finding 2 — Floor switching was unnecessary

Original concept considered changing floors to inspect each level.

Problem:

- introduces multiple spatial contexts,
- weakens top-down plot identity,
- requires interior representation,
- complicates mixed-use buildings,
- increases art and interaction cost.

Correction:

Buildings are predefined multi-floor assets shown from the top down with:

- footprint,
- roof,
- floor badge,
- use breakdown,
- inspector details.

Floor-by-floor editing is deferred.

## Finding 3 — Demand-before-build could become a sales simulator

Problem:

Pre-sales, negotiations, named tenants, lease clauses, and prospect pipelines could become an entire separate game.

Correction:

MVP uses:

- market demand score,
- expected occupancy forecast,
- optional rent posture,
- automated anonymous leasing.

No individual pre-leasing workflow.

## Finding 4 — Profit-gated height alone is weak

Problem:

If vertical development unlocks only at a profit threshold, the optimal behavior may be to wait.

Correction:

Approval requires a combination of:

- positive cash flow,
- occupancy,
- condition,
- appeal,
- and reserves.

This requires operating competence, not idle accumulation.

## Finding 5 — Parking could dominate every decision

Problem:

Parking consumes land and supports every major use. If tuned too strongly, every solution becomes “build more parking.”

Correction:

- parking shortage causes graduated penalties,
- not a hard blocker,
- surface parking is intentionally land-inefficient,
- mixed-use synergy and appeal provide alternative optimization pressure,
- structured parking is deferred.

## Finding 6 — Too many metrics

Initial possibilities included happiness, reputation, cleanliness, utilities, demand, value, condition, parking, traffic, and more.

Correction:

MVP retains:

- demand,
- occupancy,
- parking,
- appeal,
- condition,
- cash flow,
- debt,
- value,
- approval.

This is still near the upper safe limit. No additional global metric should enter MVP.

## Finding 7 — Passive waiting risk

Problem:

Monthly turns can become a button that prints money.

Correction:

- construction milestones,
- demand changes,
- rent posture,
- warnings,
- events,
- approval goals,
- forecasts,
- sales/refinancing,
- and condition changes create decisions.

Balance test explicitly fails if normal play creates more than three consecutive no-decision turns.

## Finding 8 — Lack of a concrete endpoint

Open-ended sandboxes are hard to balance and hard to test.

Correction:

The starter scenario has a defined win:

- operating mixed-use building,
- stable occupancy,
- healthy cash flow,
- sufficient appeal,
- cash reserve.

Sandbox can be added after the first scenario is complete.

## Review-one locked decisions

- One plot only
- Top-down only
- Turn-based monthly simulation
- Anonymous tenants
- Predefined building types
- No interior floor switching
- No city simulation
- No agent movement
- One starter scenario
- Mixed-use redevelopment as the primary objective
- Configuration-driven economy
- Deterministic simulation
- Explicit recovery mechanics

## Remaining gameplay risks

### Risk A — The board may feel visually static

Mitigation:

- strong construction states,
- roof variation,
- floor badges,
- vacancy indicators,
- changing property density,
- subtle transitions.

Do not solve this by adding people prematurely.

### Risk B — The simulation may feel predictable

Mitigation:

- seeded events,
- demand drift,
- project risk,
- multiple opening strategies.

Do not solve this with opaque randomness.

### Risk C — The player may find demolition emotionally negative

Mitigation:

- preserve a property timeline,
- show before/after value,
- celebrate redevelopment milestone,
- allow sale of improvements in some cases.

### Risk D — Retail may be obviously inferior early

Mitigation:

- road frontage bonus,
- local residential synergy,
- event opportunities,
- stronger upside but more vacancy risk.

## Review-one approval

Proceed to technical planning only under the locked decisions above.
