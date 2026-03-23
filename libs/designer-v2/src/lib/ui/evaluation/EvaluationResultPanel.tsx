import { Badge, Caption1, Caption1Strong, Card, MessageBar, MessageBarBody, Spinner, Text } from '@fluentui/react-components';
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
      <div className={styles.panelRoot}>
        <div className={styles.loadingContainerFull}>
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
            <Caption1 block className={styles.panelSubtitle}>
              Evaluator: {evaluatorName}
            </Caption1>
          </div>
        </div>
        <div className={styles.formContent}>
          <MessageBar intent="error">
            <MessageBarBody>{evaluationError instanceof Error ? evaluationError.message : String(evaluationError)}</MessageBarBody>
          </MessageBar>
        </div>
      </div>
    );
  }

  if (!evaluationResult) {
    return (
      <div className={styles.panelRoot}>
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
    <div className={styles.panelRoot}>
      <div className={styles.panelHeader}>
        <div>
          <Text size={400} weight="semibold" as="h2">
            Evaluation Result
          </Text>
          <Caption1 block className={styles.panelSubtitle}>
            Evaluator: {evaluatorName}
          </Caption1>
        </div>
      </div>

      <div className={styles.formContent}>
        <Card>
          <div className={styles.resultBadgeRow}>
            <Badge appearance="tint" color={isPassed ? 'success' : 'danger'} shape="rounded" size="medium">
              {evaluationResult.result}
            </Badge>
            <Text size={300}>
              <Caption1Strong>Value: </Caption1Strong>
              {evaluationResult.value}
            </Text>
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
            <div className={styles.reasonSection}>
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
