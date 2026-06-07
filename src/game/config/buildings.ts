import { z } from 'zod';

import type { BuildingDefinition } from '@/game/domain/types';

import buildingDefinitionsDocument from '@/game/config/data/building-definitions.json';

const footprintSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const buildingDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['residential', 'retail', 'mixed', 'parking', 'amenity']),
  footprint: footprintSchema,
  floors: z.number().int().nonnegative(),
  approvalRequired: z.number().int().positive(),
  constructionCost: z.number().int().nonnegative(),
  constructionMonths: z.number().int().nonnegative(),
  operatingExpense: z.number().int().nonnegative(),
  residentialUnits: z.number().int().nonnegative(),
  retailUnits: z.number().int().nonnegative(),
  parkingCapacity: z.number().int().nonnegative(),
  parkingDemand: z.number().int().nonnegative(),
  appealModifier: z.number().int(),
  roadAccessRequired: z.boolean(),
  enabledInMvp: z.boolean(),
  baseRentPerUnit: z.number().int().nonnegative().optional(),
  baseResidentialRentPerUnit: z.number().int().nonnegative().optional(),
  baseRetailRentPerUnit: z.number().int().nonnegative().optional(),
});

const buildingDefinitionsDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  buildings: z.array(buildingDefinitionSchema).min(1),
});

export function loadBuildingDefinitions(
  raw: unknown = buildingDefinitionsDocument,
): readonly BuildingDefinition[] {
  const parsed = buildingDefinitionsDocumentSchema.parse(raw);
  const ids = parsed.buildings.map((building) => building.id);
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    throw new Error('Building definitions contain duplicate ids');
  }

  return parsed.buildings;
}

export function createBuildingDefinitionMap(
  definitions: readonly BuildingDefinition[] = loadBuildingDefinitions(),
): ReadonlyMap<string, BuildingDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function getBuildingDefinition(
  definitions: ReadonlyMap<string, BuildingDefinition>,
  definitionId: string,
): BuildingDefinition {
  const definition = definitions.get(definitionId);

  if (!definition) {
    throw new RangeError(`Unknown building definition: ${definitionId}`);
  }

  return definition;
}
