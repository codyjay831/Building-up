import { describe, expect, it } from 'vitest';

import {
  createGameConfig,
  createStarterGameState,
  RIVERSIDE_STARTER_SCENARIO_ID,
} from '@/game/config/scenario';
import { calculateBuildingMonthlyNetIncome } from '@/game/domain/valuation';
import { getBuildingFinanceView } from '@/game/selectors/buildingFinanceSelectors';
import type { BuildingInstance, GameState } from '@/game/domain/types';

function withBuildingPatch(
  state: GameState,
  buildingId: string,
  patch: Partial<BuildingInstance>,
): GameState {
  return {
    ...state,
    buildings: state.buildings.map((building) =>
      building.id === buildingId ? { ...building, ...patch } : building,
    ),
  };
}

function withExtraBuilding(state: GameState, building: BuildingInstance): GameState {
  return {
    ...state,
    buildings: [...state.buildings, building],
  };
}

describe('getBuildingFinanceView', () => {
  const config = createGameConfig();
  const starter = createStarterGameState(RIVERSIDE_STARTER_SCENARIO_ID);
  const house = starter.buildings[0];

  it('shows gross rent, operating expenses, and net for a fully occupied starter house', () => {
    expect(house).toBeDefined();

    const view = getBuildingFinanceView(starter, config, house as BuildingInstance);

    expect(view?.showFinance).toBe(true);
    expect(view?.grossRentLabel).toBe('$2,200/mo');
    expect(view?.operatingExpensesLabel).toBe('$650/mo');
    expect(view?.netOperatingIncomeLabel).toBe('$1,550/mo');
    expect(view?.netOperatingIncomeTone).toBe('positive');
    expect(view?.residentialRentLabel).toBeUndefined();
    expect(view?.retailRentLabel).toBeUndefined();
  });

  it('matches calculateBuildingMonthlyNetIncome for the same building', () => {
    expect(house).toBeDefined();

    const view = getBuildingFinanceView(starter, config, house as BuildingInstance);
    const lostIncome = calculateBuildingMonthlyNetIncome(starter, config, house?.id ?? '');

    expect(view?.netOperatingIncomeLabel).toBe('$1,550/mo');
    expect(lostIncome).toBe(1_550);
  });

  it('scales gross rent with partial vacancy and reduces operating expenses', () => {
    expect(house).toBeDefined();

    const vacantHouse = withBuildingPatch(starter, house?.id ?? '', {
      residentialOccupied: 0,
    });
    const view = getBuildingFinanceView(vacantHouse, config, vacantHouse.buildings[0] as BuildingInstance);

    expect(view?.grossRentLabel).toBe('$0/mo');
    expect(view?.operatingExpensesLabel).toBe('$520/mo');
    expect(view?.netOperatingIncomeLabel).toBe('-$520/mo');
    expect(view?.netOperatingIncomeTone).toBe('negative');
  });

  it('applies premium rent posture to gross rent', () => {
    expect(house).toBeDefined();

    const premiumHouse = withBuildingPatch(starter, house?.id ?? '', {
      rentPosture: 'premium',
    });
    const view = getBuildingFinanceView(
      premiumHouse,
      config,
      premiumHouse.buildings[0] as BuildingInstance,
    );

    expect(view?.grossRentLabel).toBe('$2,596/mo');
    expect(view?.operatingExpensesLabel).toBe('$650/mo');
    expect(view?.netOperatingIncomeLabel).toBe('$1,946/mo');
  });

  it('shows residential and retail rent rows for mixed-use buildings', () => {
    const shopApartments: BuildingInstance = {
      id: 'building-mixed',
      definitionId: 'shop_apartments',
      footprint: { origin: { x: 4, y: 0 }, width: 3, height: 3, rotation: 0 },
      lifecycleState: 'operating',
      condition: 90,
      residentialOccupied: 2,
      retailOccupied: 1,
      rentPosture: 'market',
      renovated: false,
    };

    const state = withExtraBuilding(starter, shopApartments);
    const view = getBuildingFinanceView(state, config, shopApartments);

    expect(view?.residentialRentLabel).toBe('$4,900/mo');
    expect(view?.retailRentLabel).toBe('$5,200/mo');
    expect(view?.grossRentLabel).toBe('$10,100/mo');
    expect(view?.operatingExpensesLabel).toBe('$2,400/mo');
    expect(view?.netOperatingIncomeLabel).toBe('$7,700/mo');
  });

  it('returns null for buildings that are not yet earning income', () => {
    expect(house).toBeDefined();

    const underConstruction = withBuildingPatch(starter, house?.id ?? '', {
      lifecycleState: 'under_construction',
    });
    const view = getBuildingFinanceView(
      underConstruction,
      config,
      underConstruction.buildings[0] as BuildingInstance,
    );

    expect(view).toBeNull();
  });
});
