import { mergeClasses, Spinner } from '@fluentui/react-components';
import {
  useEvaluationResult,
  useEvaluationLoading,
  useEvaluationError,
  useRunningEvaluatorName,
} from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluateViewStyles } from './EvaluateView.styles';

export const EvaluationResultPanel = () => {
  const styles = useEvaluateViewStyles();
  const result = useEvaluationResult();
  const loading = useEvaluationLoading();
  const error = useEvaluationError();
  const evaluatorName = useRunningEvaluatorName();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.loadingContainer} style={{ flex: 1, alignItems: 'center' }}>
          <Spinner size="medium" label="Running evaluation..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Evaluation Result</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--colorNeutralForeground2)' }}>Evaluator: {evaluatorName}</p>
          </div>
        </div>
        <div className={styles.formContent}>
          <div className={styles.formError}>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No evaluation result</p>
        </div>
      </div>
    );
  }

  const isPassed = result.result?.toLowerCase() === 'passed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Evaluation Result</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--colorNeutralForeground2)' }}>Evaluator: {evaluatorName}</p>
        </div>
      </div>

      <div className={styles.formContent}>
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span className={mergeClasses(styles.resultBadge, isPassed ? styles.resultPassed : styles.resultFailed)}>{result.result}</span>
            <span>
              <span className={styles.fieldLabel}>Value: </span>
              <span className={styles.fieldValue}>{result.value}</span>
            </span>
          </div>

          {result.agentActionName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Agent Action</span>
              <span className={styles.detailValue}>{result.agentActionName}</span>
            </div>
          )}

          {result.reason && (
            <div style={{ marginTop: '8px' }}>
              <span className={styles.fieldLabel}>Reason</span>
              <div className={styles.resultReason}>{result.reason}</div>
            </div>
          )}

          <div className={styles.tokenStats}>
            <div className={styles.tokenStat}>
              <span className={styles.statLabel}>Total Tokens</span>
              <span className={styles.statValue}>{result.totalTokens}</span>
            </div>
            <div className={styles.tokenStat}>
              <span className={styles.statLabel}>Input Tokens</span>
              <span className={styles.statValue}>{result.inputTokens}</span>
            </div>
            <div className={styles.tokenStat}>
              <span className={styles.statLabel}>Output Tokens</span>
              <span className={styles.statValue}>{result.outputTokens}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
