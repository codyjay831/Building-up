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


---

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


---

# 02 — Locked MVP Game Design

## Game working title

**Vertical Plot Manager**

The title is temporary and must not influence architecture.

## Camera and spatial model

- 2D top-down view.
- Fixed 12×12 tile property.
- A road borders the south edge.
- Structures use rectangular footprints.
- No camera rotation in MVP.
- Zoom may be browser-level or a simple UI zoom control.
- Buildings show a floor-count badge rather than rendered floors.
- Shadows and roof details communicate height.

## Starting scenario

The player begins with:

- $180,000 cash,
- no debt,
- one 12×12 lot,
- one aging 2×3 single-family house,
- one driveway with two parking spaces,
- moderate residential demand,
- low retail demand,
- a basic development approval level,
- Month 1.

The existing house can be:

- kept and leased,
- renovated,
- sold as an improvement,
- or demolished.

## Core loop

1. Inspect demand and property status.
2. Select a development action.
3. Review forecast.
4. Commit funds.
5. Advance months.
6. Construction completes.
7. Space enters leasing.
8. Occupancy and rent change.
9. Diagnose shortages or weak returns.
10. improve, convert, sell, or redevelop.

## Time model

- The game is turn-based.
- One player action advances one month only when the player presses `Next Month`.
- Construction, leasing, loans, rent, maintenance, and events resolve during month advancement.
- The player can plan and inspect without time advancing.

## MVP resources

Track only:

- Cash
- Debt principal
- Monthly debt payment
- Property value
- Monthly gross income
- Monthly operating expense
- Monthly net cash flow
- Residential demand
- Retail demand
- Residential occupied units
- Retail occupied spaces
- Parking capacity
- Parking demand
- Appeal
- Property condition
- Approval level
- Current month

Do not add utilities, crime, traffic, pollution, schools, individual happiness, staff, or city tax systems in MVP.

## Placeable assets

### Existing House

- Starter asset.
- Can be renovated once.
- Low income.
- Low operating risk.
- Poor land efficiency.

### Small House

- 2×3 footprint.
- One residential unit.
- Reliable under moderate demand.
- Requires one parking space.

### Duplex

- 3×3 footprint.
- Two residential units.
- Better density.
- Requires two parking spaces.
- Requires Approval Level 2.

### Corner Shop

- 3×3 footprint.
- One retail space.
- Strong road-frontage bonus.
- Requires three parking spaces.
- Weak under low retail demand.

### Shop + Apartment

- 3×3 footprint.
- One retail space on the ground floor.
- Two residential units above.
- Requires four parking spaces.
- Requires Approval Level 2.
- Central MVP redevelopment target.

### Small Apartment Building

- 4×4 footprint.
- Six residential units.
- Requires six parking spaces.
- Requires Approval Level 3.
- Stretch content; present in data but may be locked during the starter scenario.

### Surface Parking

- 1×2 module.
- Adds two parking spaces.
- Produces no rent.
- Low maintenance.
- Consumes valuable land.

### Small Park

- 2×2 footprint.
- Adds appeal.
- Reduces available buildable area.
- Costs monthly maintenance.

## Building lifecycle

Each building has one lifecycle state:

- `existing`
- `planned`
- `under_construction`
- `leasing`
- `operating`
- `renovating`
- `for_sale`
- `demolishing`

State changes must be explicit and logged.

## Placement rules

A structure may be placed only when:

- all footprint tiles are inside the lot,
- all footprint tiles are empty,
- required road access is satisfied,
- approval level is sufficient,
- cash or financing covers the committed cost,
- no incompatible active construction overlaps,
- and the player confirms the forecast.

## Road access

For MVP, a structure has road access when at least one tile in its footprint can trace an unobstructed path through owned open tiles to the south road boundary.

Do not implement vehicle pathfinding. Use a simple flood-fill accessibility check.

## Parking rule

Parking is property-wide rather than assigned per tenant.

If capacity is below demand:

- residential occupancy receives a moderate penalty,
- retail occupancy receives a larger penalty,
- appeal receives a small penalty,
- the UI shows the exact shortfall.

Parking must not be a hard build blocker, because allowing risky development creates decisions.

## Appeal

Appeal is a 0–100 property-wide score.

Sources:

- park,
- renovated structures,
- mixed-use synergy,
- good condition,
- low vacancy,
- positive event modifiers.

Penalties:

- poor condition,
- visible vacancy,
- parking shortage,
- extended construction,
- excessive debt stress only as an indirect event risk.

Appeal affects:

- achievable rent,
- tenant application rate,
- property value.

## Condition

Condition is tracked per revenue building from 0–100.

- Begins at 100 when newly completed.
- Falls slowly each month.
- Low condition increases operating costs and vacancy risk.
- Renovation restores condition.
- MVP does not require repair crews or individual work orders.

## Rent

The player selects one rent posture for each revenue building:

- Discount
- Market
- Premium

Effects:

- Discount: lower income, faster leasing.
- Market: baseline.
- Premium: higher potential income, slower leasing and higher move-out risk.

Do not allow arbitrary numeric rent entry in MVP.

## Leasing

Units lease at the building level.

The game does not create individual named tenants.

At month advancement, each building may gain or lose occupied units according to:

- market demand,
- appeal,
- rent posture,
- condition,
- parking adequacy,
- building type,
- temporary events.

The UI must show the factors used.

## Construction

Every project defines:

- upfront cost,
- build duration,
- monthly construction carrying cost,
- cancellation recovery percentage,
- demolition cost,
- completion state.

The player pays:

- a commitment deposit at start,
- then scheduled draws across construction months.

This prevents one-click full payment while preserving simple accounting.

## Forecasting

Before construction, show:

- footprint,
- approval requirement,
- total project cost,
- cash required now,
- estimated monthly draws,
- build duration,
- estimated completed value,
- expected stabilized income range,
- expected operating expense,
- parking added or required,
- expected occupancy range,
- approximate payback period,
- identified risks.

The forecast must use the same calculation functions as the simulation wherever possible.

## Approval progression

### Approval Level 1

Allows:

- renovation,
- small house,
- corner shop,
- parking,
- park.

### Approval Level 2

Unlock condition:

- positive net cash flow for 3 consecutive months,
- property condition average ≥ 65,
- cash reserve ≥ $40,000.

Allows:

- duplex,
- shop + apartment.

### Approval Level 3

Unlock condition:

- Approval Level 2,
- 75% combined occupancy for 4 consecutive months,
- property appeal ≥ 60,
- cash reserve or approved financing ≥ required threshold.

Allows:

- small apartment building.

Approval represents combined zoning, lender trust, and developer experience. Do not add separate bureaucratic systems in MVP.

## Financing

MVP financing options:

### Construction Loan

- Offered only for projects above a cost threshold.
- Requires a minimum cash contribution.
- Adds fixed monthly payment after completion.
- Maximum one active construction loan.

### Refinance

- Available once per run.
- Converts a portion of property equity into cash.
- Increases debt payment.
- Used as a recovery or expansion tool.

Do not implement dynamic interest markets in MVP.

## Events

MVP includes a small, controlled event deck:

Positive:

- Local employer hiring increases residential demand.
- Weekend market temporarily increases retail demand.
- Neighborhood improvement increases appeal.

Negative:

- Material price increase affects uncommitted projects.
- Retail slowdown decreases retail demand.
- Maintenance issue reduces one building's condition.
- Construction delay adds one month.

Events should modify existing systems, not introduce new systems.

## Win condition

Win when all are true for three consecutive months:

- approval level ≥ 2,
- monthly net cash flow ≥ $12,000,
- combined occupancy ≥ 85%,
- appeal ≥ 65,
- at least one mixed-use building is operating,
- cash reserve ≥ $60,000.

## Loss condition

Loss occurs when:

- cash is below $0 for three consecutive months,
- and no refinance, sale, or financing action can restore solvency.

The game must display a warning before formal loss.

## MVP exclusions

Explicitly excluded:

- Individual residents, workers, or shoppers
- Walking animation
- Car movement
- Elevators
- Interior floor editing
- Exact square footage
- Dynamic zoning map
- City expansion
- Multiple plots
- Multiplayer
- Backend accounts
- Mod support
- Procedural neighborhoods
- Weather
- Crime
- Utility networks
- Staff hiring
- Detailed lease negotiations
- Tax filing
- Insurance claims
- Building customization editor


---

# 03 — Economy, Demand, and Progression

## Design objective

The economy must create pressure without requiring spreadsheet expertise. The player should understand why a property performs well or poorly after reading one breakdown panel.

## Currency model

Use whole-dollar integer values internally.

Never use floating-point arithmetic for money.

Recommended representation:

```ts
type Money = number; // integer dollars for MVP
```

If cents are added later, migrate to integer cents.

## Monthly calculation order

The simulation must always execute in this order:

1. Increment month.
2. Apply scheduled event start/end effects.
3. Process active construction draws.
4. Advance construction timers.
5. Complete eligible projects.
6. Calculate property accessibility.
7. Calculate parking capacity and demand.
8. Recalculate appeal.
9. Recalculate each building's leasing score.
10. Process move-ins and move-outs.
11. Calculate gross rent.
12. Calculate operating expenses.
13. Calculate debt payments.
14. Apply condition decay.
15. Apply property value update.
16. Calculate net cash flow.
17. Update consecutive-month counters.
18. Check approval unlocks.
19. Check warnings.
20. Check win/loss.
21. Write a monthly ledger entry.
22. Save an autosave snapshot.

Changing this order requires an architecture review because order affects balance.

## Residential demand

Residential demand is a 0–100 market value.

Baseline starter range:

- 45–65.

Monthly movement:

- small deterministic drift toward scenario baseline,
- event modifier,
- limited seeded variation.

Residential application strength:

```text
residentialLeasingScore =
  demandWeight
+ appealWeight
+ conditionWeight
+ rentPostureWeight
+ parkingWeight
+ buildingPreferenceWeight
```

The implementation should use normalized factors rather than hidden arbitrary bonuses.

## Retail demand

Retail demand is a 0–100 market value.

Retail performs based on both external market demand and on-site population.

```text
effectiveRetailDemand =
  baseRetailDemand
+ occupiedResidentialUnits × localCustomerFactor
+ mixedUseSynergy
+ frontageBonus
- parkingShortagePenalty
```

This is the first meaningful cross-system interaction.

## Occupancy

Each revenue building stores:

- total units,
- occupied units,
- target occupancy probability,
- leasing score breakdown.

For MVP, process at most:

- one net move-in or move-out per building per month for small structures,
- up to two for the apartment building.

This avoids extreme swings.

## Rent posture multipliers

Suggested initial values:

| Posture | Rent multiplier | Leasing modifier |
|---|---:|---:|
| Discount | 0.85 | +15 |
| Market | 1.00 | 0 |
| Premium | 1.18 | -18 |

These are balance assumptions, not final values.

## Appeal formula

Base appeal starts at 45.

Potential adjustments:

- Small park: +10 each, diminishing after first.
- Renovated active building: +4.
- Operating mixed-use building: +5.
- Average condition above 85: +5.
- Average condition below 50: -10.
- Vacancy above 40%: -8.
- Parking shortage 1–2: -3.
- Parking shortage 3+: -8.
- Active construction: -2 per site, capped.
- Positive event: scenario value.

Clamp to 0–100.

## Parking demand

Suggested demand:

- Small house: 1
- Duplex: 2
- Corner shop: 3
- Shop + apartment: 4
- Small apartment building: 6

Parking shortage effect should be graduated, not binary.

Example:

```text
parkingCoverage = min(1, parkingCapacity / parkingDemand)
```

Use coverage in leasing calculations.

## Operating expense

Each building has:

- base monthly expense,
- condition expense modifier,
- vacancy-sensitive expense component,
- event modifier.

Do not simulate individual utility bills.

## Property value

Property value is not simply construction cost.

```text
propertyValue =
  landBaseValue
+ depreciatedImprovementValue
+ stabilizedIncomeValue
+ appealPremium
- activeConstructionRisk
```

MVP property value matters for:

- score,
- refinance capacity,
- end-of-run summary.

It does not need a buyer marketplace.

## Construction cost model

Each project has a locked base cost when committed.

Future uncommitted costs may change through events.

Project payment schedule:

- 25% commitment payment
- remaining 75% divided across construction months
- final rounding difference paid on completion

Cancellation:

- before first advancement: recover 80% of commitment
- during construction: recover 35% of unspent committed amount
- completed structures cannot be canceled

## Debt

Construction loan:

- 30% minimum player equity contribution
- fixed project-specific financed principal
- fixed monthly payment
- no compounding interest simulation needed
- outstanding principal decreases according to a simple amortization table or fixed principal model

Keep debt understandable. Display:

- original principal,
- current principal,
- monthly payment,
- payoff amount.

## Progression pacing

### Phase 1 — Stabilize

Expected months 1–4.

Player learns:

- leasing,
- monthly cash flow,
- condition,
- rent posture.

### Phase 2 — Improve

Expected months 4–8.

Player chooses:

- renovate starter house,
- add a park,
- add parking,
- or build a basic secondary structure.

### Phase 3 — Qualify

Expected months 7–12.

Player maintains:

- positive cash flow,
- cash reserve,
- healthy condition.

Approval Level 2 unlocks.

### Phase 4 — Redevelop

Expected months 10–18.

Player:

- demolishes inefficient property,
- or uses remaining space,
- builds the shop + apartment,
- carries construction risk.

### Phase 5 — Stabilize mixed-use

Expected months 15–24.

Player balances:

- retail demand,
- residential occupancy,
- parking,
- appeal,
- debt.

### Phase 6 — Win or extend

The starter scenario ends after stable mixed-use success. Level 3 acts as a preview of future depth.

## Anti-waiting rules

The player must not spend many turns pressing `Next Month` with nothing to decide.

Use:

- forecasts,
- upcoming milestones,
- demand movement,
- rent posture choices,
- construction progress,
- events,
- approval goals,
- warnings,
- optional early payoff,
- sale or refinance choices.

If the optimal strategy becomes waiting for cash for more than three consecutive turns, balancing must be adjusted.

## Failure recovery

### Warning ladder

1. Yellow: projected negative next month.
2. Orange: less than two months of reserve.
3. Red: cash below zero.
4. Insolvency countdown: three months.
5. Loss only after recovery actions are exhausted.

### Recovery actions

- Set rent to Discount.
- Sell one completed building.
- Cancel unstarted project.
- Refinance once.
- Accept a low-value emergency investor offer.
- Pause optional maintenance spending only if such a system is later added.

## Balance telemetry for development

Even offline, log these values to a downloadable JSON debug report:

- months to Approval Level 2,
- months to first mixed-use project,
- number of idle turns,
- number of warnings,
- lowest cash,
- peak debt,
- average occupancy,
- average appeal,
- building choices,
- win/loss month.

This is essential for tuning.

## Initial balance success criteria

Across manual test runs:

- first-time player can reach positive cash flow by Month 4,
- Approval Level 2 usually unlocks between Months 7–12,
- first mixed-use building can complete between Months 12–20,
- careless overbuilding can fail,
- one bad choice does not guarantee failure,
- at least two viable opening strategies exist,
- parking is meaningful but not dominant,
- the park can be useful without being mandatory.


---

# 04 — UX, UI, and Player Flow

## UX goal

The game should feel like a polished property analysis tool transformed into a game—not like a spreadsheet and not like a cartoon mobile timer.

## Primary screen

### Top bar

Show:

- Game title
- Current month
- Cash
- Monthly net cash flow
- Pause state is unnecessary because time is turn-based
- Save status
- Settings
- `Next Month` primary action

### Left rail — Build and Actions

Tabs:

1. Build
2. Improve
3. Finance
4. Reports

Build cards show:

- icon,
- name,
- footprint,
- cost,
- duration,
- approval requirement,
- one-sentence role.

### Center — Property

Contains:

- 12×12 tile board,
- south road,
- building footprints,
- construction overlays,
- accessible-path overlay when relevant,
- parking markers,
- height badges,
- vacancy/status indicators.

Interaction states:

- default,
- selected,
- placement preview valid,
- placement preview invalid,
- construction,
- warning,
- demolition preview.

### Right inspector

Contextual content.

When nothing is selected:

- property summary,
- demand,
- occupancy,
- parking,
- appeal,
- next approval requirements.

When a building is selected:

- name and lifecycle state,
- units and occupancy,
- rent posture,
- income,
- expenses,
- condition,
- parking demand,
- leasing factor breakdown,
- renovate/sell/demolish actions.

When placing:

- project forecast,
- risk list,
- confirm/cancel.

### Bottom event and ledger strip

Show the most recent:

- construction completion,
- occupancy change,
- financial result,
- demand change,
- warning.

Expandable into full monthly report.

## First-time onboarding

Do not use a long modal tutorial.

Use five guided objectives:

1. Select the existing house.
2. Review its condition and expected rent.
3. Choose Keep or Renovate.
4. Advance one month.
5. Read the monthly report.

Then expose a scenario objective card:

> Build and stabilize a mixed-use property.

## Information hierarchy

Primary:

- Cash
- Net cash flow
- Occupancy
- Current construction
- Blocking warning
- Next Month

Secondary:

- Demand
- Appeal
- Parking
- Condition
- Approval progress

Tertiary:

- Property value
- debt details
- historical charts
- debug information

## Forecast modal

A project confirmation must answer:

### What are you building?

- Building type
- footprint
- placement
- floor count

### What will it cost?

- cash now
- remaining draws
- total cost
- loan amount
- expected monthly payment

### What might it earn?

- rent range
- likely occupancy
- operating expenses
- estimated stabilized net income

### What could go wrong?

- demand weakness
- parking shortage
- insufficient reserve
- long payback
- construction overlap
- approval risk

### Confirm

Buttons:

- Build with cash
- Build with financing, when eligible
- Cancel

No project may begin from a one-click toolbar action without forecast review.

## Monthly report

After `Next Month`, open a compact report drawer.

Sections:

- Income
- Expenses
- Debt
- Net cash flow
- Construction progress
- Leasing changes
- Demand changes
- Condition changes
- Events
- New warnings
- Unlock progress

Each changed number should explain its source.

## Demand panel

Show:

- Residential demand score
- Retail demand score
- trend arrow
- three-month mini history
- plain-language interpretation
- what currently influences it

Example:

> Residential demand is strong. Market demand and property appeal support faster leasing, but the parking shortage is reducing applications.

## Empty-state behavior

Every panel needs purposeful empty states.

Examples:

- No construction: “No active project. Review the Build tab when you are ready to expand.”
- No debt: “This property has no active debt.”
- No retail: “Retail performance will appear after a shop is completed.”
- No history: “Advance one month to begin the property ledger.”

## Accessibility

- Keyboard-selectable tiles.
- Visible focus indicators.
- Do not communicate state through color alone.
- All icons have text labels or accessible names.
- Minimum touch target 40px.
- UI remains usable at 1280×720.
- Primary desktop target is 1440×900.
- Tablet support is secondary.
- Mobile is excluded from MVP.

## Visual direction

- Dark navy shell.
- Warm off-white property board.
- Muted green for healthy profit.
- Amber for risk.
- Red only for urgent failure.
- Buildings use subdued use-class colors:
  - residential,
  - retail,
  - mixed-use,
  - parking,
  - amenity.
- Subtle shadows and roof textures.
- Avoid excessive glow, gradients, and gamey badges.

## Animation

Allowed:

- building placement fade/scale,
- construction progress pulse,
- number count transitions,
- small occupancy indicator movement,
- report drawer transition.

Excluded:

- animated people,
- cars,
- large particle effects,
- screen shake,
- elaborate construction sequences.

## Error prevention

- Invalid placement explains the exact rule.
- Destructive actions require confirmation.
- Demolition preview shows lost income and demolition cost.
- Sale preview shows expected proceeds and debt consequences.
- `Next Month` warns if an unresolved action will create likely insolvency, but does not block progression.
- Save failures are visible.

## Undo

MVP supports one limited undo:

- A newly placed project may be canceled before the next month advances.

There is no general history undo after simulation resolution.

## Save slots

MVP:

- one autosave,
- three manual save slots,
- export save JSON,
- import save JSON,
- reset scenario.

Each save displays:

- month,
- cash,
- property value,
- occupancy,
- screenshot thumbnail optional and deferred.

## Debug mode

A query parameter or local setting may expose:

- seed,
- formulas,
- raw state,
- force event,
- add cash,
- advance 12 months,
- export telemetry.

Debug mode must be isolated from normal UI and never mutate production saves without a visible warning.


---

# 05 — Technical Architecture

## Architectural verdict

Use a deterministic domain simulation wrapped by a React UI.

React components must not own or calculate game truth.

## Stack

- Vite
- React
- TypeScript with strict mode
- Zustand
- Zod
- Vitest
- React Testing Library
- Playwright
- ESLint
- Prettier
- CSS Modules or a single documented styling approach
- LocalStorage

## Suggested repository structure

```text
src/
  app/
    App.tsx
    routes.ts
    providers.tsx
  game/
    config/
      buildings.ts
      events.ts
      scenario.ts
      balance.ts
    domain/
      types.ts
      money.ts
      grid.ts
      accessibility.ts
      placement.ts
      parking.ts
      appeal.ts
      demand.ts
      leasing.ts
      construction.ts
      finance.ts
      valuation.ts
      progression.ts
      warnings.ts
      winLoss.ts
      simulateMonth.ts
    commands/
      placeProject.ts
      cancelProject.ts
      setRentPosture.ts
      renovateBuilding.ts
      sellBuilding.ts
      demolishBuilding.ts
      takeLoan.ts
      refinance.ts
    selectors/
      propertySelectors.ts
      buildingSelectors.ts
      financeSelectors.ts
      forecastSelectors.ts
    store/
      gameStore.ts
      storeTypes.ts
      createNewGame.ts
    persistence/
      schema.ts
      saveRepository.ts
      migrations.ts
      exportImport.ts
    telemetry/
      runTelemetry.ts
      debugExport.ts
  features/
    property-board/
    building-inspector/
    build-catalog/
    project-forecast/
    monthly-report/
    demand-panel/
    finance-panel/
    approval-progress/
    save-manager/
    tutorial/
  components/
    ui/
  styles/
  tests/
    fixtures/
    integration/
    e2e/
```

## State boundaries

### Domain state

Serializable game truth only.

```ts
interface GameState {
  schemaVersion: number;
  runId: string;
  seed: string;
  scenarioId: string;
  month: number;
  cash: number;
  debt: DebtState[];
  lot: LotState;
  buildings: BuildingInstance[];
  projects: ConstructionProject[];
  market: MarketState;
  approval: ApprovalState;
  events: ActiveEvent[];
  ledger: MonthlyLedgerEntry[];
  counters: ProgressCounters;
  status: GameStatus;
}
```

### UI state

Do not persist unless necessary.

```ts
interface UiState {
  selectedBuildingId: string | null;
  selectedCatalogItemId: string | null;
  inspectorTab: string;
  placementPreview: PlacementPreview | null;
  openDialog: string | null;
  tutorialStep: number;
}
```

UI state and domain state should not be mixed in one unstructured object.

## Configuration-driven buildings

Building definitions are immutable configuration.

Building instances store only runtime values.

```ts
interface BuildingDefinition {
  id: string;
  name: string;
  category: "residential" | "retail" | "mixed" | "parking" | "amenity";
  footprint: { width: number; height: number };
  floors: number;
  approvalRequired: number;
  constructionCost: number;
  constructionMonths: number;
  operatingExpense: number;
  residentialUnits: number;
  retailUnits: number;
  parkingCapacity: number;
  parkingDemand: number;
  appealModifier: number;
  roadAccessRequired: boolean;
}
```

## Command architecture

All player mutations occur through named commands.

Examples:

```ts
placeProject(state, command): CommandResult
cancelProject(state, command): CommandResult
setRentPosture(state, command): CommandResult
advanceMonth(state): SimulationResult
```

A command returns either:

```ts
type CommandResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  | { ok: false; error: GameRuleError };
```

React must not directly mutate arrays or monetary values.

## Domain events

Use lightweight domain events for reports and debugging:

- `ProjectCommitted`
- `ConstructionAdvanced`
- `ConstructionCompleted`
- `TenantMovedIn`
- `TenantMovedOut`
- `RentCollected`
- `ExpensePaid`
- `LoanPaymentMade`
- `ApprovalUnlocked`
- `WarningRaised`
- `GameWon`
- `GameLost`

These events are not an event-sourcing system. The current state remains authoritative.

## Deterministic randomness

Use a seeded PRNG.

Rules:

- Same state + same seed + same command must produce same result.
- Random calls must occur only in domain modules.
- Never use `Math.random()` in simulation code.
- Store updated RNG state or derive deterministic monthly seeds.

This makes testing and balancing possible.

## Simulation purity

Preferred signature:

```ts
function simulateMonth(
  state: Readonly<GameState>,
  config: Readonly<GameConfig>
): SimulationResult
```

It must:

- avoid browser APIs,
- avoid Date.now(),
- avoid network calls,
- avoid React,
- avoid LocalStorage,
- not mutate input state.

## Forecast architecture

Forecast calculations must reuse domain formulas.

Do not create separate UI-only profitability math.

Forecast may provide ranges when random factors exist:

```ts
interface ProjectForecast {
  totalCost: number;
  cashDueNow: number;
  monthlyDraws: number[];
  completionMonth: number;
  expectedOccupancy: { low: number; likely: number; high: number };
  expectedMonthlyNet: { low: number; likely: number; high: number };
  parkingAfterBuild: { capacity: number; demand: number };
  risks: ForecastRisk[];
}
```

## Grid model

Represent the property as coordinates, not a nested mutable component grid.

```ts
type TileCoord = { x: number; y: number };

interface PlacedFootprint {
  origin: TileCoord;
  width: number;
  height: number;
  rotation: 0 | 90;
}
```

MVP may exclude rotation initially if it complicates footprints. Architecture may preserve the field.

## Accessibility algorithm

Use a flood fill over:

- open tiles,
- driveway/access tiles,
- compatible building entrances.

Return a simple boolean per building.

No road traffic simulation.

## Persistence

### Save schema

- Zod validates every loaded save.
- `schemaVersion` is required.
- Corrupt saves fail safely.
- Autosave writes after successful month simulation and major commands.
- Manual save writes by explicit user action.
- Save writes should be atomic at the application level: serialize complete state, then replace stored value.

### Migration

```ts
type SaveMigration = (input: unknown) => unknown;
```

Maintain sequential migrations:

- v1 → v2
- v2 → v3

Never scatter migration logic across components.

## Store API

Zustand store exposes high-level actions only:

```ts
interface GameActions {
  newGame(scenarioId: string, seed?: string): void;
  execute(command: GameCommand): CommandResult;
  nextMonth(): SimulationResult;
  save(slot: SaveSlot): SaveResult;
  load(slot: SaveSlot): LoadResult;
}
```

## Testing pyramid

### Unit

- money math
- footprint collisions
- accessibility
- parking
- appeal
- demand
- leasing
- project draw schedule
- loan payments
- progression
- win/loss

### Integration

- command + store
- construction to operation
- monthly ledger
- approval unlock
- save/load round trip
- migration

### End-to-end

- start new run
- renovate house
- advance month
- build parking
- qualify for Approval Level 2
- construct mixed-use building
- reach win condition using a controlled test scenario

## Performance target

The MVP has a tiny simulation.

Targets:

- monthly simulation under 20ms on a normal desktop,
- UI remains responsive,
- no need for Web Workers,
- no premature optimization.

## Security and integrity

This is an offline game, but still:

- validate imported JSON,
- limit import size,
- never evaluate imported code,
- do not insert imported strings as raw HTML,
- use stable IDs,
- keep debug tools visibly separate.

## Architecture prohibitions

Do not:

- place formulas inside components,
- use one giant Zustand store file,
- use `any`,
- use `Math.random()` in domain logic,
- use floating-point cents,
- index buildings by array position as identity,
- persist transient modal state,
- calculate forecast separately from simulation rules,
- introduce a backend for MVP,
- introduce ECS,
- introduce a general plugin system,
- build a custom game engine.


---

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


---

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


---

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


---

# 09 — Acceptance Tests and Definition of Done

## Product-level definition of done

The MVP is done when a new player can start with the old house, understand the property's economics, make a development decision, progress through construction and leasing, redevelop into mixed-use, and reach a stable win without developer intervention.

## Functional acceptance scenarios

### Scenario A — New game

Given a new starter scenario:

- month is 1,
- cash is $180,000,
- approval is Level 1,
- starter house exists,
- road appears on the south edge,
- starter house has road access,
- all summary totals reconcile.

### Scenario B — Placement validation

The player cannot:

- place outside the lot,
- overlap another footprint,
- build a locked structure,
- place a road-required building without access,
- commit a cash-only project without sufficient cash.

The UI displays the exact failed rule.

### Scenario C — Construction forecast

Given a project:

- forecast total equals configured cost,
- deposit equals schedule,
- draws sum to remaining cost,
- completion month is correct,
- parking forecast includes new demand/capacity,
- risks include insufficient reserve when applicable.

### Scenario D — Construction execution

After commitment:

- project enters `under_construction`,
- deposit is deducted,
- ledger records deposit,
- monthly draws occur,
- progress advances,
- completed building appears exactly once,
- project is removed or marked completed,
- building enters leasing/operating correctly.

### Scenario E — Monthly reconciliation

For every month:

```text
opening cash
+ income
+ financing proceeds
+ sale proceeds
- construction draws
- operating expenses
- debt payments
- demolition/renovation costs
= closing cash
```

The integration test must assert this.

### Scenario F — Parking shortage

Given parking demand greater than capacity:

- shortage is displayed,
- affected buildings receive leasing penalty,
- retail penalty is stronger than residential penalty,
- appeal penalty is applied,
- no building is automatically removed,
- the player may proceed despite the risk.

### Scenario G — Rent posture

For identical controlled states:

- Discount produces lower rent and better leasing score.
- Market produces baseline.
- Premium produces higher rent and lower leasing score.

### Scenario H — Approval unlock

Approval Level 2 unlocks only after all configured conditions are met.

The player can see:

- current progress,
- unmet conditions,
- unlock result.

### Scenario I — Redevelopment

When demolishing:

- income loss is forecast,
- demolition cost is shown,
- confirmation is required,
- footprint eventually clears,
- historical ledger retains demolition entry.

### Scenario J — Save/load determinism

Given a saved state before Month N:

- load the save,
- advance the same command with the same seed,
- receive identical state and domain events.

### Scenario K — Insolvency

When cash falls below zero:

- countdown appears,
- recovery actions remain available,
- loss does not trigger early,
- after three unresolved months and no valid recovery, loss triggers.

### Scenario L — Win

When all win conditions remain true for three months:

- game status becomes won,
- results summary appears,
- continued sandbox mode may be offered only after win,
- win cannot trigger from derived-data error.

## UI acceptance

- No horizontal page overflow at 1280×720.
- Property remains central and readable.
- Every structure is selectable by mouse and keyboard.
- Invalid placement reason is visible.
- Current cash and net cash flow are always visible.
- Monthly report is readable without opening developer tools.
- Color is never the only state indicator.
- Destructive confirmations include consequences.
- Tooltips are supplemental, not required to understand core controls.

## Test seed suite

Maintain at least these fixed seeds:

- `starter-balanced`
- `strong-residential`
- `weak-retail`
- `construction-delay`
- `recovery-path`
- `approval-unlock`
- `win-path`

## Balance test checklist

A human tester should answer:

- Did I understand what to do in the first minute?
- Did my first build choice matter?
- Could I explain why units were vacant?
- Did I have at least two plausible strategies?
- Did parking matter without taking over the whole game?
- Did I feel a meaningful difference after redevelopment?
- Did the game warn me before financial collapse?
- Was waiting ever the obvious action for four turns?
- Did the final mixed-use property feel earned?
- Would I restart to try a different layout?

## Release blocker defects

- Cash changes without ledger entries.
- Nondeterministic controlled test.
- Save corruption.
- Building duplication.
- Overlap accepted.
- Locked content bypass.
- Win/loss false trigger.
- Forecast materially disagrees with execution.
- Player cannot identify vacancy cause.
- Normal run requires debug tools.
- Typecheck, tests, or build fail.

## Non-blocking MVP limitations

Acceptable:

- limited building art,
- few events,
- one scenario,
- no sound,
- no mobile support,
- no sandbox before win,
- no cloud save,
- no achievements,
- simple charts,
- no localization.


---

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


---

# Research Bibliography

These sources informed the product and design conclusions. They are references, not requirements.

- Game Developer — “How to Tune a Simulation Game”
  https://www.gamedeveloper.com/design/how-to-tune-a-simulation-game
- Game Developer — “Mid-Core Success Part 1: Core Loops”
  https://www.gamedeveloper.com/design/mid-core-success-part-1-core-loops
- Game Developer — “The Importance of a Well Defined Core Gameplay Loop”
  https://www.gamedeveloper.com/design/the-importance-of-a-well-defined-core-gameplay-loop
- GDC Vault — “Building Sustainable Game Economies: The Three Design Pillars”
  https://www.gdcvault.com/play/1028982/Building-Sustainable-Game-Economies-The
- Game Developer — “The Perils of Bottom-up Game Design”
  https://www.gamedeveloper.com/design/the-designer-s-notebook-the-perils-of-bottom-up-game-design
- Steam Community reviews and discussions for Project Highrise
  https://steamcommunity.com/app/423580/reviews/
- Project Highrise release discussion on r/tycoon
  https://www.reddit.com/r/tycoon/comments/51qz5a/project_highrise_release_thread/
- Project Highrise discussion about costly early layout mistakes
  https://steamcommunity.com/app/423580/discussions/0/2638497042768045484/
- GameAnalytics — “How To Perfect Your Game's Core Loop”
  https://www.gameanalytics.com/blog/how-to-perfect-your-games-core-loop


---

