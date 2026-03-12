import { Button, mergeClasses, Spinner, Tooltip } from '@fluentui/react-components';
import { EditRegular, PlayRegular, DeleteRegular } from '@fluentui/react-icons';
import { useSelector } from 'react-redux';
import type { Evaluator } from '@microsoft/logic-apps-shared';
import { useSelectedRun, useSelectedAction, useCanRunEvaluation } from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluationQuery, useEvaluationForActionQuery } from '../../core/queries/evaluations';
import type { RootState } from '../../core/store';
import { useEvaluateViewStyles } from './EvaluateView.styles';

interface EvaluatorViewPanelProps {
  workflowName: string;
  evaluator: Evaluator;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}

export const EvaluatorViewPanel = ({ workflowName, evaluator, onEdit, onRun, onDelete }: EvaluatorViewPanelProps) => {
  const styles = useEvaluateViewStyles();
  const selectedRun = useSelectedRun();
  const selectedAction = useSelectedAction();
  const canRun = useCanRunEvaluation();
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);

  const isStateful = workflowKind === 'stateful' || workflowKind === 'agentic';

  const { data: evaluationData, isLoading: evaluationLoading } = useEvaluationQuery(
    workflowName,
    selectedRun?.id ?? '',
    evaluator.name,
    !!selectedRun && !isStateful
  );

  const { data: evaluationForActionData, isLoading: evaluationForActionLoading } = useEvaluationForActionQuery(
    workflowName,
    selectedRun?.id ?? '',
    selectedAction?.name ?? '',
    evaluator.name,
    !!selectedRun && isStateful && !!selectedAction
  );

  const lastEvaluation = isStateful ? evaluationForActionData : evaluationData;
  const loadingEvaluation = isStateful ? evaluationForActionLoading : evaluationLoading;
  const isPassed = lastEvaluation?.result?.toLowerCase() === 'passed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>View Evaluator</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--colorNeutralForeground2)' }}>{evaluator.name}</p>
        </div>
      </div>

      <div className={styles.formContent}>
        {/* Evaluator Definition */}
        <div className={styles.card}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Evaluator name</span>
            <span className={styles.fieldValue}>{evaluator.name}</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Template</span>
            <span className={styles.fieldValue}>{evaluator.template === 'CustomPrompt' ? 'Custom Prompt' : evaluator.template}</span>
          </div>

          {evaluator.template !== 'ToolCallTrajectory' && (
            <>
              {evaluator.deploymentId && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Deployment ID</span>
                  <span className={styles.fieldValue}>{evaluator.deploymentId}</span>
                </div>
              )}

              {evaluator.agentModelType && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Agent model type</span>
                  <span className={styles.fieldValue}>{evaluator.agentModelType}</span>
                </div>
              )}

              {evaluator.modelConfiguration?.referenceName && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Model connection reference</span>
                  <span className={styles.fieldValue}>{evaluator.modelConfiguration.referenceName}</span>
                </div>
              )}

              {evaluator.agentModelSettings?.deploymentModelProperties?.name && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Deployment model name</span>
                  <span className={styles.fieldValue}>{evaluator.agentModelSettings.deploymentModelProperties.name}</span>
                </div>
              )}
            </>
          )}

          {evaluator.groundTruthRunId && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Ground truth run ID</span>
              <span className={styles.fieldValue}>{evaluator.groundTruthRunId}</span>
            </div>
          )}

          {evaluator.groundTruthAgentActionName && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Ground truth agent action</span>
              <span className={styles.fieldValue}>{evaluator.groundTruthAgentActionName}</span>
            </div>
          )}

          {/* Template-specific parameters */}
          {evaluator.template === 'CustomPrompt' && evaluator.parameters.prompt && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Instructions</span>
              <div className={styles.promptValue}>{evaluator.parameters.prompt}</div>
            </div>
          )}

          {evaluator.template === 'ToolCallTrajectory' && (
            <>
              {evaluator.parameters.expectedToolCalls && evaluator.parameters.expectedToolCalls.length > 0 && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Expected Tool Calls</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {evaluator.parameters.expectedToolCalls.map((tc, idx) => (
                      <div key={idx} className={styles.toolCallItem}>
                        <div className={styles.toolCallHeader}>
                          <span>{tc.name}</span>
                        </div>
                        {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                          <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(tc.arguments, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluator.parameters.comparisonMethod && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Comparison method</span>
                  <span className={styles.fieldValue}>{evaluator.parameters.comparisonMethod}</span>
                </div>
              )}

              {evaluator.parameters.threshold !== undefined && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Threshold</span>
                  <span className={styles.fieldValue}>{evaluator.parameters.threshold}</span>
                </div>
              )}

              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Compare arguments</span>
                <span className={styles.fieldValue}>{evaluator.parameters.shouldCompareArgs ? 'Yes' : 'No'}</span>
              </div>
            </>
          )}

          {evaluator.template === 'SemanticSimilarity' && evaluator.parameters.expectedChatResponse && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Expected Chat Response</span>
              <div className={styles.promptValue}>{evaluator.parameters.expectedChatResponse}</div>
            </div>
          )}

          <div className={styles.definitionActions}>
            <Tooltip content="Edit evaluator" relationship="label">
              <Button appearance="secondary" icon={<EditRegular />} onClick={onEdit}>
                Edit
              </Button>
            </Tooltip>
            <Tooltip content={canRun ? 'Run evaluation' : 'Select a run first'} relationship="label">
              <Button appearance="primary" icon={<PlayRegular />} onClick={onRun} disabled={!canRun}>
                Run
              </Button>
            </Tooltip>
            <Tooltip content="Delete evaluator" relationship="label">
              <Button appearance="subtle" icon={<DeleteRegular />} onClick={onDelete}>
                Delete
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Last Evaluation Result */}
        {selectedRun && (
          <div className={styles.card}>
            {loadingEvaluation ? (
              <div className={styles.loadingContainer}>
                <Spinner size="small" label="Loading evaluation..." />
              </div>
            ) : lastEvaluation ? (
              <>
                <div className={styles.evaluationHeader}>
                  <span className={styles.panelTitle}>Last Evaluation</span>
                  <span className={mergeClasses(styles.resultBadge, isPassed ? styles.resultPassed : styles.resultFailed)}>
                    {lastEvaluation.result}
                  </span>
                </div>

                <div className={styles.resultSection}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={mergeClasses(styles.detailValue, isPassed ? styles.statusSucceeded : styles.statusFailed)}>
                      {lastEvaluation.result}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Value</span>
                    <span className={styles.detailValue}>{lastEvaluation.value}</span>
                  </div>
                  {lastEvaluation.agentActionName && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Agent Action</span>
                      <span className={styles.detailValue}>{lastEvaluation.agentActionName}</span>
                    </div>
                  )}
                </div>

                {lastEvaluation.reason && (
                  <div style={{ marginTop: '8px' }}>
                    <span className={styles.fieldLabel}>Reason</span>
                    <div className={styles.resultReason}>{lastEvaluation.reason}</div>
                  </div>
                )}

                <div className={styles.tokenStats}>
                  <div className={styles.tokenStat}>
                    <span className={styles.statLabel}>Total Tokens</span>
                    <span className={styles.statValue}>{lastEvaluation.totalTokens}</span>
                  </div>
                  <div className={styles.tokenStat}>
                    <span className={styles.statLabel}>Input Tokens</span>
                    <span className={styles.statValue}>{lastEvaluation.inputTokens}</span>
                  </div>
                  <div className={styles.tokenStat}>
                    <span className={styles.statLabel}>Output Tokens</span>
                    <span className={styles.statValue}>{lastEvaluation.outputTokens}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No evaluation results for this run</p>
                <p className={styles.emptySubtext}>Click Run to evaluate</p>
              </div>
            )}
          </div>
        )}

        {!selectedRun && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Select a run to view evaluation results</p>
          </div>
        )}
      </div>
    </div>
  );
};
