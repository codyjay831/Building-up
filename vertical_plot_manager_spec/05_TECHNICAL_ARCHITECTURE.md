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
