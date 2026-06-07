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
