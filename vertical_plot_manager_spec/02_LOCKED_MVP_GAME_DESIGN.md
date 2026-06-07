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
