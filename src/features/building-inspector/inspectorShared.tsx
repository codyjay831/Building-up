import {
  formatLeasingFactorLabel,
  getBuildingLeasingView,
} from '@/game/selectors/leasingSelectors';
import {
  LEASING_FACTOR_KEYS,
  formatSignedScore,
} from '@/features/building-inspector/inspectorFormat';

import styles from '@/features/building-inspector/BuildingInspector.module.css';

interface DetailRowProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
  valueTestId?: string;
}

export function DetailRow({ label, value, tone = 'neutral', valueTestId }: DetailRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd data-tone={tone} data-testid={valueTestId}>
        {value}
      </dd>
    </>
  );
}

interface LeasingScoreTableProps {
  readonly title: string;
  readonly score: NonNullable<ReturnType<typeof getBuildingLeasingView>>['residentialScore'];
  readonly moveInThreshold: number;
  readonly moveOutThreshold: number;
}

export function LeasingScoreTable({
  title,
  score,
  moveInThreshold,
  moveOutThreshold,
}: LeasingScoreTableProps) {
  if (!score) {
    return null;
  }

  return (
    <div className={styles.scoreBlock}>
      <h3 className={styles.subtitle}>{title}</h3>
      <dl className={styles.breakdownList}>
        {LEASING_FACTOR_KEYS.map((key) => (
          <DetailRow
            key={key}
            label={formatLeasingFactorLabel(key)}
            value={formatSignedScore(score[key])}
            tone={
              key === 'rentPosture'
                ? score[key] > 0
                  ? 'positive'
                  : score[key] < 0
                    ? 'negative'
                    : 'neutral'
                : key === 'total'
                  ? score.total >= moveInThreshold
                    ? 'positive'
                    : score.total <= moveOutThreshold
                      ? 'negative'
                      : 'neutral'
                  : 'neutral'
            }
          />
        ))}
      </dl>
    </div>
  );
}
