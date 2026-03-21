import { useCallback, useMemo } from 'react';
import {
  Badge,
  Button,
  mergeClasses,
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import { AddRegular, EditRegular, PlayRegular, DeleteRegular } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import {
  setSelectedEvaluator,
  startCreateEvaluator,
  startEditEvaluator,
  setEvaluatorSearchQuery,
  setEvaluationViewMode,
  setRunningEvaluatorName,
} from '../../core/state/evaluation/evaluationSlice';
import {
  useFilteredEvaluators,
  useSelectedEvaluator,
  useEvaluatorSearchQuery,
  useEvaluationDataSelected,
  useSelectedEvaluationAgentName,
} from '../../core/state/evaluation/evaluationSelectors';
import { useEvaluators, useRunEvaluation, useDeleteEvaluator, useEvaluations } from '../../core/queries/evaluations';
import type { Evaluator, EvaluationResult } from '@microsoft/logic-apps-shared';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import { EvaluationViewMode } from '../../core/state/evaluation/evaluationInterfaces';

interface EvaluatorManagementPanelProps {
  workflowName: string;
}

export const EvaluatorManagementPanel = ({ workflowName }: EvaluatorManagementPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedEvaluator = useSelectedEvaluator();
  const evaluatorSearchQuery = useEvaluatorSearchQuery();
  const isEvaluationDataSelected = useEvaluationDataSelected();
  const selectedRun = useRunInstance();
  const selectedAgentName = useSelectedEvaluationAgentName();

  const { data: evaluators, isFetching: isEvaluatorsFetching } = useEvaluators(workflowName, selectedAgentName ?? '');
  const { mutateAsync: deleteEvaluator } = useDeleteEvaluator(workflowName, selectedAgentName ?? '');
  const { mutateAsync: runEvaluation } = useRunEvaluation(workflowName, selectedAgentName ?? '');
  const { data: evaluations } = useEvaluations(workflowName, selectedRun?.name ?? '', selectedAgentName ?? '');

  const evaluatorsList = useMemo(() => (Array.isArray(evaluators) ? evaluators : []), [evaluators]);
  const filteredEvaluators = useFilteredEvaluators(evaluatorsList);

  const evaluationsByName = useMemo(() => {
    const map = new Map<string, EvaluationResult>();
    if (evaluations) {
      for (const result of evaluations) {
        if (result.evaluatorName) {
          map.set(result.evaluatorName, result);
        }
      }
    }
    return map;
  }, [evaluations]);

  const handleSelectEvaluator = useCallback(
    (evaluator: Evaluator) => {
      dispatch(setSelectedEvaluator(selectedEvaluator?.name === evaluator.name ? null : evaluator));
    },
    [dispatch, selectedEvaluator]
  );

  const handleRunClick = useCallback(
    async (evaluator: Evaluator) => {
      if (!selectedRun) {
        return;
      }
      dispatch(setEvaluationViewMode(EvaluationViewMode.EvaluationResult));
      dispatch(setRunningEvaluatorName(evaluator.name));
      await runEvaluation({
        runId: selectedRun.name,
        evaluatorName: evaluator.name,
      });
    },
    [dispatch, selectedRun, runEvaluation]
  );

  const handleDeleteClick = useCallback(
    async (evaluator: Evaluator) => {
      try {
        await deleteEvaluator(evaluator.name);
        if (selectedEvaluator?.name === evaluator.name) {
          dispatch(setSelectedEvaluator(null));
        }
      } catch (err) {
        console.error('Failed to delete evaluator:', err);
      }
    },
    [deleteEvaluator, dispatch, selectedEvaluator]
  );

  return (
    <div className={mergeClasses(styles.panel, styles.panelEvaluators)}>
      <div className={styles.panelHeader}>
        <Text size={400} weight="semibold" as="h2">
          Evaluators
        </Text>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          size="small"
          onClick={() => dispatch(startCreateEvaluator())}
          disabled={!workflowName.trim()}
        >
          Create
        </Button>
      </div>

      <div className={styles.searchContainer}>
        <SearchBox
          placeholder="Search or filter items by..."
          value={evaluatorSearchQuery}
          onChange={(_e, data) => dispatch(setEvaluatorSearchQuery(data.value))}
          size="small"
          style={{ width: '100%' }}
        />
      </div>

      <Table aria-label="Evaluators list" size="small">
        <TableHeader>
          <TableRow>
            <TableHeaderCell style={{ width: '140px' }}>Type</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell style={{ width: '70px' }}>Result</TableHeaderCell>
            <TableHeaderCell style={{ width: '100px' }} />
          </TableRow>
        </TableHeader>
      </Table>

      {isEvaluatorsFetching ? (
        <div className={styles.loadingContainer}>
          <Spinner size="small" label="Loading..." />
        </div>
      ) : workflowName.trim() ? (
        filteredEvaluators.length === 0 ? (
          <div className={styles.emptyState}>
            <Text size={300} weight="semibold">
              No evaluators yet
            </Text>
            <Text size={200}>Click Create to add your first evaluator</Text>
          </div>
        ) : (
          <div className={styles.listContainer}>
            <Table aria-label="Evaluators" size="small">
              <TableBody>
                {filteredEvaluators.map((evaluator) => (
                  <TableRow
                    key={evaluator.name}
                    className={mergeClasses(selectedEvaluator?.name === evaluator.name && styles.tableRowSelected)}
                    onClick={() => handleSelectEvaluator(evaluator)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell style={{ width: '140px' }}>
                      <Text size={200}>{evaluator.template}</Text>
                    </TableCell>
                    <TableCell>
                      <Text size={300} weight="semibold" truncate wrap={false}>
                        {evaluator.name}
                      </Text>
                    </TableCell>
                    <TableCell style={{ width: '70px' }}>
                      {(() => {
                        const result = evaluationsByName.get(evaluator.name);
                        if (!result) {
                          return <Text size={200}>—</Text>;
                        }
                        const passed = result.result?.toLowerCase() === 'passed';
                        return (
                          <Badge appearance="tint" color={passed ? 'success' : 'danger'} shape="rounded" size="small">
                            {passed ? 'Passed' : 'Failed'}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell style={{ width: '100px' }}>
                      <div className={styles.colActions}>
                        <Tooltip content="Edit" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<EditRegular />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(startEditEvaluator(evaluator));
                            }}
                          />
                        </Tooltip>
                        <Tooltip content={isEvaluationDataSelected ? 'Run evaluation' : 'Select a run first'} relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<PlayRegular />}
                            size="small"
                            disabled={!isEvaluationDataSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunClick(evaluator);
                            }}
                          />
                        </Tooltip>
                        <Tooltip content="Delete evaluator" relationship="label">
                          <Button
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(evaluator);
                            }}
                          />
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className={styles.emptyState}>
          <Text size={300} weight="semibold">
            Enter a workflow name
          </Text>
          <Text size={200}>to view evaluators</Text>
        </div>
      )}
    </div>
  );
};
