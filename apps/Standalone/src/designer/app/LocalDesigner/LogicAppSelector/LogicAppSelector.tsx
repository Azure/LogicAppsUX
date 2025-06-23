import type { AppDispatch } from '../../../state/store';
import { useResourcePath, useIsMonitoringView, useRunFiles } from '../../../state/workflowLoadingSelectors';
import { setResourcePath, loadWorkflow, loadRun } from '../../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const fileOptions = [
  // General
  { key: 'GeneralHeader', text: 'General Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'Empty.json', text: 'Empty/New' },
  { key: 'Panel.json', text: 'Panel' },
  { key: 'Recurrence.json', text: 'Recurrence' },
  { key: 'MultiVariable.json', text: 'Multi Variable' },
  // { key: 'straightLine.json', text: 'Straight Line' },
  { key: 'simpleBigworkflow.json', text: 'Simple Big Workflow' },
  { key: 'UnicodeKeys.json', text: 'Unicode Keys' },

  // Agent
  { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'AgentHeader', text: 'Agentic Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'BlankAgent.json', text: 'Empty Agent' },
  { key: 'Agent.json', text: 'Starter Agent' },
  { key: 'AgentWithChannels.json', text: 'Agent with Channels' },
  { key: 'Agents.json', text: 'A2A Agents' },

  // Scope Nodes
  { key: 'divider_2', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'ScopeNodesHeader', text: 'Scope Node Testing Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'AllScopeNodes.json', text: 'All Scope Nodes' },
  { key: 'Conditionals.json', text: 'Conditionals' },
  { key: 'MoreComplex.json', text: 'Conditionals (Complex)' },
  // { key: 'ComplexConditionals.json', text: 'Conditionals (Complex)' },
  { key: 'Switch.json', text: 'Switch' },
  { key: 'simpleScoped.json', text: 'Scope' },
  { key: 'simpleForeach.json', text: 'ForEach' },
  // { key: 'Scoped.json', text: 'Scoped' },

  // Run-After
  { key: 'divider_3', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'RunAfterHeader', text: 'Run After Testing Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'RunAfter.json', text: 'General Run After' },
  { key: 'MultipleRunAftersBig.json', text: 'Multiple Run Afters (Big)' },

  // Stress Tests
  { key: 'divider_4', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'StressTestsHeader', text: 'Stress Test Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'StressTest50.json', text: '50 Nodes' },
  { key: 'StressTest100.json', text: '100 Nodes' },
  { key: 'StressTest200.json', text: '200 Nodes' },
  { key: 'StressTest300.json', text: '300 Nodes' },
  { key: 'StressTest400.json', text: '400 Nodes' },
  { key: 'StressTest500.json', text: '500 Nodes' },
  { key: 'StressTest500Gross.json', text: '500 Nodes (Gross)' },
  { key: 'StressTest600.json', text: '600 Nodes' },
  { key: 'StressTest1000.json', text: '1000 Nodes' },

  // Consumption Workflows
  { key: 'divider_5', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'WorkflowParametersHeader', text: 'Workflow Parameters', itemType: DropdownMenuItemType.Header },
  { key: 'StandardWorkflowParameters.json', text: 'Standard Workflow Parameters' },
  { key: 'ConsumptionWorkflowParameters.json', text: 'Consumption Workflow Parameters' },

  // Monitoring View scenarios
  { key: 'divider_6', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'MonitoringViewHeader', text: 'Monitoring view scenarios', itemType: DropdownMenuItemType.Header },
  { key: 'MonitoringViewConditional.json', text: 'Monitoring view conditional' },
  { key: 'LoopsPager.json', text: 'Loops pager' },
];

export const LocalLogicAppSelector: React.FC = () => {
  const resourcePath = useResourcePath();
  const isMonitoringView = useIsMonitoringView();
  const dispatch = useDispatch<AppDispatch>();
  const runFiles = useRunFiles();

  const changeResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(setResourcePath((item?.key as string) ?? ''));
      dispatch(loadWorkflow(_));
    },
    [dispatch]
  );

  const onChangeRunInstance = useCallback(
    (_: unknown, item: any) => {
      dispatch(loadRun({ runFile: item?.module }));
    },
    [dispatch]
  );

  const runOptions = useMemo(() => {
    return runFiles.map((runFile) => {
      return {
        key: runFile.path,
        text: runFile.path.split('/').pop().replace('.json', ''),
        module: runFile.module,
      };
    });
  }, [runFiles]);

  return (
    <div>
      <div>
        <Dropdown
          label="Workflow File To Load"
          selectedKey={resourcePath}
          onChange={changeResourcePathDropdownCB}
          placeholder="Select an option"
          options={fileOptions}
          styles={{ callout: { maxHeight: 800 } }}
        />
        {isMonitoringView ? (
          <div style={{ position: 'relative' }}>
            <Dropdown
              placeholder={
                resourcePath ? (runFiles.length > 0 ? 'Select a run file to load' : 'No run files to select') : 'Select workflow first'
              }
              label="Run file"
              options={runOptions}
              disabled={runFiles.length === 0 || !resourcePath}
              onChange={onChangeRunInstance}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
