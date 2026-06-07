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
