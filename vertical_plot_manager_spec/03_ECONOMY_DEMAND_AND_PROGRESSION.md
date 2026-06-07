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
