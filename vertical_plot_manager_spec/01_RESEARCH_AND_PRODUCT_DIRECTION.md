# 01 — Research and Product Direction

## Research question

What makes management and city-building games successful, and which lessons apply to a small top-down property-development game?

## Research conclusions

### 1. The player needs a short, legible core loop

Management games work when the player repeatedly makes a decision, sees an understandable consequence, and gains new options. The proposed loop should remain visible throughout development:

**Read market → commit capital → wait through construction → lease → collect results → react → redevelop.**

The game must not become a passive income timer. Each monthly turn should create at least one of:

- a decision,
- a warning,
- a new opportunity,
- a changed forecast,
- construction progress,
- occupancy movement,
- or a milestone.

### 2. Constraints create strategy; chores create boredom

Useful constraints:

- limited land,
- limited capital,
- parking demand,
- development approval,
- construction time,
- uncertain demand,
- operating reserves,
- incompatible uses,
- opportunity cost.

Weak chores:

- manually connecting pipes,
- repeatedly clicking rent collection,
- cleaning every room,
- assigning every parking space,
- negotiating every lease,
- moving individual tenants,
- maintaining dozens of nearly identical utility meters.

The game should make the player choose between competing good options, not perform repetitive administration.

### 3. Density progression is the game's strongest emotional payoff

The visible transformation of one property is more important than having a huge map. The player should remember:

- the original run-down house,
- the first profitable shop,
- the first apartment above retail,
- the first demolition,
- the first larger redevelopment,
- and the final compact mixed-use property.

This creates ownership and a before/after story.

### 4. Recovery must be possible

A management game can be difficult, but it should not silently doom the player because of one early placement. MVP recovery tools:

- pause construction before completion,
- cancel with a partial loss,
- sell a building,
- refinance once,
- temporarily lower rent,
- convert compatible space,
- demolish and rebuild,
- receive an emergency sale offer when nearly insolvent.

The game should communicate bad decisions early through forecasts.

### 5. Complexity should arrive through interactions, not quantity

The MVP only needs a few systems if they interact well:

- demand affects leasing,
- parking affects occupancy,
- appeal affects achievable rent,
- debt affects monthly risk,
- land scarcity affects layout,
- construction time creates opportunity cost,
- mixed-use can improve land efficiency but increases cost and requirements.

This is better than shipping 40 building types with shallow differences.

### 6. Readability is a feature

The player should always be able to answer:

- Why is this unit vacant?
- Why did profit fall?
- What is blocking construction?
- What would improve this property?
- What happens if I build this?
- When can I afford the next development?

All important calculations must expose a breakdown.

## Competitive positioning

This should not be sold internally as a full city builder.

It is closer to:

- a property redevelopment simulator,
- a compact tycoon game,
- a mixed-use optimization game,
- and a land-value progression game.

## Product pillars

### Pillar A — One plot, visible transformation

The plot itself is the protagonist. The player repeatedly improves the same constrained land.

### Pillar B — Decisions before decoration

Every buildable object must affect income, demand, risk, land use, approval, or appeal. Decorative objects are deferred.

### Pillar C — Forecast before commitment

The player receives an honest projection before building:

- total cost,
- expected completion,
- expected rent,
- occupancy range,
- parking impact,
- monthly operating cost,
- estimated break-even,
- and major risks.

### Pillar D — Understandable simulation

The simulation may be probabilistic, but it cannot be mysterious. Randomness adjusts outcomes; it does not replace rules.

### Pillar E — Redevelopment is the climax

The main reward is replacing a lower-value use with a smarter, denser development.

## Target player

A player who enjoys:

- gradual growth,
- compact optimization,
- financial tradeoffs,
- designing a useful property,
- and watching a small site evolve.

The game should be approachable to a casual management-game player but still give an optimizer meaningful choices.

## Session target

MVP session:

- 20–40 minutes for a first win.
- 3–5 minutes to understand the interface.
- First income event within 2 minutes.
- First meaningful redevelopment decision within 10–15 minutes.

## Final direction

Build a **turn-based top-down single-property redevelopment game**.

Do not build:

- a city,
- a tower interior simulator,
- a landlord life simulator,
- or a pedestrian sandbox.

Those can become later expansions only after the core redevelopment loop is proven.
