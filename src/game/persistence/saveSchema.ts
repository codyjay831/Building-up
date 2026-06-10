import { z } from 'zod';

import { SCHEMA_VERSION } from '@/game/domain/types';
import type { GameState } from '@/game/domain/types';

/** Must stay in sync with GameState in types.ts — enforced by schemaParity.test.ts. */

export const CURRENT_SAVE_FORMAT_VERSION = 3;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const tileCoordSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

const placedFootprintSchema = z.object({
  origin: tileCoordSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rotation: z.union([z.literal(0), z.literal(90)]),
});

const buildingInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  footprint: placedFootprintSchema,
  lifecycleState: z.enum([
    'existing',
    'planned',
    'under_construction',
    'leasing',
    'operating',
    'renovating',
    'for_sale',
    'demolishing',
  ]),
  condition: z.number().int().min(0).max(100),
  residentialOccupied: z.number().int().nonnegative(),
  retailOccupied: z.number().int().nonnegative(),
  rentPosture: z.enum(['discount', 'market', 'premium']),
  renovated: z.boolean(),
});

const lotStateSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  drivewayTiles: z.array(tileCoordSchema),
  accessParkingCapacity: z.number().int().nonnegative(),
});

const marketStateSchema = z.object({
  residentialDemand: z.number(),
  retailDemand: z.number(),
  residentialBaseline: z.number(),
  retailBaseline: z.number(),
});

const approvalStateSchema = z.object({
  level: z.number().int().positive(),
  unlockedLevels: z.array(z.number().int().positive()),
});

const debtStateSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['construction_loan', 'refinance']),
  principal: z.number().int().nonnegative(),
  originalPrincipal: z.number().int().nonnegative(),
  monthlyPayment: z.number().int().nonnegative(),
  projectId: z.string().min(1).optional(),
  paymentsActive: z.boolean(),
  disbursedPrincipal: z.number().int().nonnegative(),
  annualInterestRate: z.number().nonnegative(),
});

const constructionProjectSchema = z.object({
  id: z.string().min(1),
  buildingId: z.string().min(1),
  definitionId: z.string().min(1),
  footprint: placedFootprintSchema,
  status: z.enum(['committed', 'under_construction', 'cancelled', 'completed']),
  committedMonth: z.number().int().positive(),
  monthsRemaining: z.number().int().nonnegative(),
  totalCost: z.number().int().nonnegative(),
  depositPaid: z.number().int().nonnegative(),
  buildDurationMonths: z.number().int().nonnegative(),
  amountSpent: z.number().int().nonnegative(),
  financedWithLoan: z.boolean(),
  loanDebtId: z.string().min(1).optional(),
});

const activeEventSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  remainingMonths: z.number().int().nonnegative(),
});

const ledgerLineSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    'rent_residential',
    'rent_retail',
    'operating_expense',
    'construction_draw',
    'construction_loan_interest',
    'project_deposit',
    'project_refund',
    'renovation_cost',
    'demolition_cost',
    'sale_proceeds',
    'debt_payment',
    'refinance_proceeds',
    'emergency_investor',
  ]),
  label: z.string().min(1),
  amount: z.number().int(),
  buildingId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});

const occupancyLedgerChangeSchema = z.object({
  buildingId: z.string().min(1),
  buildingName: z.string().min(1),
  residentialDelta: z.number().int(),
  retailDelta: z.number().int(),
});

const monthlyLedgerEntrySchema = z.object({
  id: z.string().min(1),
  month: z.number().int().positive(),
  kind: z.enum(['transaction', 'monthly']),
  openingCash: z.number().int(),
  closingCash: z.number().int(),
  netCashFlow: z.number().int(),
  lines: z.array(ledgerLineSchema),
  grossRent: z.number().int().nonnegative(),
  operatingExpenses: z.number().int().nonnegative(),
  occupancyChanges: z.array(occupancyLedgerChangeSchema).optional(),
});

const progressCountersSchema = z.object({
  consecutivePositiveCashFlowMonths: z.number().int().nonnegative(),
  consecutiveHighOccupancyMonths: z.number().int().nonnegative(),
  consecutiveApproval3OccupancyMonths: z.number().int().nonnegative(),
  consecutiveInsolventMonths: z.number().int().nonnegative(),
  consecutiveWinConditionMonths: z.number().int().nonnegative(),
  refinanceUsed: z.boolean(),
  emergencyOfferUsed: z.boolean(),
  nextBuildingSequence: z.number().int().positive(),
  nextProjectSequence: z.number().int().positive(),
  nextDebtSequence: z.number().int().positive(),
  rngCounter: z.number().int().nonnegative(),
});

export const gameStateSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    runId: z.string().min(1),
    seed: z.string().min(1),
    scenarioId: z.string().min(1),
    month: z.number().int().positive(),
    cash: z.number().int(),
    debt: z.array(debtStateSchema),
    lot: lotStateSchema,
    buildings: z.array(buildingInstanceSchema),
    projects: z.array(constructionProjectSchema),
    market: marketStateSchema,
    approval: approvalStateSchema,
    appeal: z.number(),
    events: z.array(activeEventSchema),
    ledger: z.array(monthlyLedgerEntrySchema),
    counters: progressCountersSchema,
    status: z.enum(['active', 'won', 'lost']),
  })
  .superRefine((state, context) => {
    const { width, height } = state.lot;

    const validateTile = (coord: { x: number; y: number }, path: (string | number)[]) => {
      if (coord.x >= width || coord.y >= height) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tile (${String(coord.x)}, ${String(coord.y)}) is outside lot bounds ${String(width)}×${String(height)}`,
          path,
        });
      }
    };

    for (const [index, tile] of state.lot.drivewayTiles.entries()) {
      validateTile(tile, ['lot', 'drivewayTiles', index]);
    }

    for (const [buildingIndex, building] of state.buildings.entries()) {
      validateTile(building.footprint.origin, ['buildings', buildingIndex, 'footprint', 'origin']);
    }

    for (const [projectIndex, project] of state.projects.entries()) {
      validateTile(project.footprint.origin, ['projects', projectIndex, 'footprint', 'origin']);
    }
  });

export const saveEnvelopeSchema = z.object({
  formatVersion: z.literal(CURRENT_SAVE_FORMAT_VERSION),
  savedAt: z.string().min(1),
  gameState: gameStateSchema,
});

export type SaveEnvelope = z.infer<typeof saveEnvelopeSchema>;

export interface SaveSlotSummary {
  readonly slot: ManualSaveSlot;
  readonly occupied: boolean;
  readonly month: number | null;
  readonly cash: number | null;
  readonly occupancyLabel: string | null;
  readonly savedAt: string | null;
}

export type ManualSaveSlot = 1 | 2 | 3;
export type SaveSlot = 'autosave' | ManualSaveSlot;

export interface PersistResult {
  readonly ok: true;
  readonly savedAt: string;
}

export interface PersistFailure {
  readonly ok: false;
  readonly error: string;
}

export type SaveResult = PersistResult | PersistFailure;

export interface LoadSuccess {
  readonly ok: true;
  readonly envelope: SaveEnvelope;
}

export interface LoadFailure {
  readonly ok: false;
  readonly error: string;
}

export type LoadResult = LoadSuccess | LoadFailure;

export function parseGameState(raw: unknown): GameState {
  const parsed = gameStateSchema.parse(raw);

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported game schema version: ${String(parsed.schemaVersion)}`);
  }

  return parsed;
}

export function createSaveEnvelope(gameState: GameState): SaveEnvelope {
  return saveEnvelopeSchema.parse({
    formatVersion: CURRENT_SAVE_FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    gameState: JSON.parse(JSON.stringify(gameState)) as GameState,
  });
}

export function serializeSaveEnvelope(envelope: SaveEnvelope): string {
  return JSON.stringify(envelope);
}
