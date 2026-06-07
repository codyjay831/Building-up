import { formatMoney } from '@/game/domain/money';
import { isBuildingLockedInScenario } from '@/game/config/scenario';
import type { BuildingDefinition } from '@/game/domain/types';
import { formatFootprintSize } from '@/game/selectors/buildingSelectors';
import { useGameStore } from '@/game/store/gameStore';

import styles from '@/features/build-catalog/BuildCatalog.module.css';

const BUILDING_ROLES: Readonly<Record<string, string>> = {
  small_house: 'Affordable starter rental on a compact footprint.',
  suburb_house: 'Low-maintenance suburban home with no parking demand.',
  corner_shop: 'Ground-floor retail that benefits from road visibility.',
  shop_apartments: 'Mixed-use income with retail below and homes above.',
  surface_parking: 'Adds off-street spaces to support retail demand.',
  small_park: 'Boosts appeal without requiring road frontage.',
  duplex: 'Two-unit residential upgrade for later progression.',
  apartment_4u: 'Compact four-unit apartment building for denser suburb growth.',
  small_apartment: 'Higher-density residential for late-game redevelopments.',
};

function getBuildingRole(definition: BuildingDefinition): string {
  return BUILDING_ROLES[definition.id] ?? `${definition.category} structure for this lot.`;
}

export function BuildCatalog() {
  const config = useGameStore((store) => store.config);
  const gameState = useGameStore((store) => store.gameState);
  const ui = useGameStore((store) => store.ui);
  const selectCatalogItem = useGameStore((store) => store.selectCatalogItem);
  const scenario = config.scenarios.get(gameState.scenarioId);

  const catalogItems = config.buildingList.filter(
    (definition) => definition.enabledInMvp && definition.id !== 'existing_house',
  );

  return (
    <section className={styles.catalog} aria-label="Build catalog">
      <header className={styles.header}>
        <h2 className={styles.title}>Build catalog</h2>
        <p className={styles.subtitle}>Select a structure to preview placement on the lot.</p>
      </header>

      <ul className={styles.cardList}>
        {catalogItems.map((definition) => {
          const locked = scenario ? isBuildingLockedInScenario(scenario, definition.id) : false;
          const approvalBlocked = gameState.approval.level < definition.approvalRequired;
          const disabled = locked || approvalBlocked;
          const selected = ui.selectedCatalogItemId === definition.id;

          return (
            <li key={definition.id}>
              <button
                type="button"
                className={styles.card}
                aria-label={`Build ${definition.name}`}
                data-selected={selected ? 'true' : 'false'}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => {
                  selectCatalogItem(selected ? null : definition.id);
                }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{definition.name}</span>
                  <span className={styles.cardCategory}>{definition.category}</span>
                </div>
                <dl className={styles.cardMeta}>
                  <div>
                    <dt>Footprint</dt>
                    <dd>{formatFootprintSize(definition)}</dd>
                  </div>
                  <div>
                    <dt>Cost</dt>
                    <dd>{formatMoney(definition.constructionCost)}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{`${String(definition.constructionMonths)} mo`}</dd>
                  </div>
                  <div>
                    <dt>Approval</dt>
                    <dd>{`Level ${String(definition.approvalRequired)}`}</dd>
                  </div>
                </dl>
                <p className={styles.cardRole}>{getBuildingRole(definition)}</p>
                {locked && <p className={styles.cardLock}>Locked in this scenario</p>}
                {!locked && approvalBlocked && (
                  <p className={styles.cardLock}>
                    Requires Approval Level {definition.approvalRequired}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
