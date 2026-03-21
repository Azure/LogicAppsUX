import { Badge, Caption1, Caption1Strong, Card, Spinner, Text } from '@fluentui/react-components';
import { useRunningEvaluatorName, useSelectedEvaluationAgentName } from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluation, useIsRunningEvaluation } from '../../core/queries/evaluations';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';

interface EvaluationResultPanelProps {
  workflowName: string;
}

export const EvaluationResultPanel = ({ workflowName }: EvaluationResultPanelProps) => {
  const styles = useEvaluateViewStyles();
  const evaluatorName = useRunningEvaluatorName();
  const selectedRun = useRunInstance();
  const selectedAgentName = useSelectedEvaluationAgentName();

  const {
    data: evaluationResult,
    isFetching: isFetchingEvaluationResult,
    error: evaluationError,
  } = useEvaluation(workflowName, selectedRun?.name ?? '', selectedAgentName ?? '', evaluatorName);
  const isRunningEvaluation = useIsRunningEvaluation();

  if (isFetchingEvaluationResult || isRunningEvaluation) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.loadingContainer} style={{ flex: 1, alignItems: 'center' }}>
          <Spinner size="medium" label="Running evaluation..." />
        </div>
      </div>
    );
  }

  if (evaluationError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.panelHeader}>
          <div>
            <Text size={400} weight="semibold" as="h2">
              Evaluation Result
            </Text>
            <Caption1 block style={{ marginTop: '4px' }}>
              Evaluator: {evaluatorName}
            </Caption1>
          </div>
        </div>
        <div className={styles.formContent}>
          <div className={styles.formError}>
            <span>{evaluationError instanceof Error ? evaluationError.message : String(evaluationError)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluationResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.emptyState}>
          <Text size={300} weight="semibold">
            No evaluation result
          </Text>
        </div>
      </div>
    );
  }

  const isPassed = evaluationResult.result?.toLowerCase() === 'passed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.panelHeader}>
        <div>
          <Text size={400} weight="semibold" as="h2">
            Evaluation Result
          </Text>
          <Caption1 block style={{ marginTop: '4px' }}>
            Evaluator: {evaluatorName}
          </Caption1>
        </div>
      </div>

      <div className={styles.formContent}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Badge appearance="tint" color={isPassed ? 'success' : 'danger'} shape="rounded" size="medium">
              {evaluationResult.result}
            </Badge>
            <span>
              <Caption1Strong>Value: </Caption1Strong>
              <Text size={300}>{evaluationResult.value}</Text>
            </span>
          </div>

          {evaluationResult.agentActionName && (
            <div className={styles.detailRow}>
              <Caption1>Agent Action</Caption1>
              <Text size={300} weight="semibold">
                {evaluationResult.agentActionName}
              </Text>
            </div>
          )}

          {evaluationResult.reason && (
            <div style={{ marginTop: '8px' }}>
              <Caption1Strong>Reason</Caption1Strong>
              <div className={styles.resultReason}>{evaluationResult.reason}</div>
            </div>
          )}

          <div className={styles.tokenStats}>
            <div className={styles.tokenStat}>
              <Caption1>Total Tokens</Caption1>
              <Text size={400} weight="semibold">
                {evaluationResult.totalTokens}
              </Text>
            </div>
            <div className={styles.tokenStat}>
              <Caption1>Input Tokens</Caption1>
              <Text size={400} weight="semibold">
                {evaluationResult.inputTokens}
              </Text>
            </div>
            <div className={styles.tokenStat}>
              <Caption1>Output Tokens</Caption1>
              <Text size={400} weight="semibold">
                {evaluationResult.outputTokens}
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
