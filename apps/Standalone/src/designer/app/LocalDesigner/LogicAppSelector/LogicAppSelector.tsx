import type { AppDispatch } from '../../../state/store';
import { useResourcePath, useIsMonitoringView } from '../../../state/workflowLoadingSelectors';
import { setResourcePath, loadWorkflow, loadRun } from '../../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

const fileOptions = [
  // General
  { key: 'GeneralHeader', text: 'General Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'Empty.json', text: 'Empty/New' },
  { key: 'Panel.json', text: 'Panel' },
  { key: 'Recurrence.json', text: 'Recurrence' },
  // { key: 'straightLine.json', text: 'Straight Line' },
  { key: 'simpleBigworkflow.json', text: 'Simple Big Workflow' },
  { key: 'UnicodeKeys.json', text: 'Unicode Keys' },
  // Scope Nodes
  { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
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
  { key: 'divider_2', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'RunAfterHeader', text: 'Run After Testing Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'RunAfter.json', text: 'General Run After' },
  { key: 'MultipleRunAftersBig.json', text: 'Multiple Run Afters (Big)' },

  // Stress Tests
  { key: 'divider_3', text: '-', itemType: DropdownMenuItemType.Divider },
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
  { key: 'divider_4', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'WorkflowParametersHeader', text: 'Workflow Parameters', itemType: DropdownMenuItemType.Header },
  { key: 'StandardWorkflowParameters.json', text: 'Standard Workflow Parameters' },
  { key: 'ConsumptionWorkflowParameters.json', text: 'Consumption Workflow Parameters' },
];

export const LocalLogicAppSelector: React.FC = () => {
  const resourcePath = useResourcePath();
  const isMonitoringView = useIsMonitoringView();
  const dispatch = useDispatch<AppDispatch>();

  const changeResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(setResourcePath((item?.key as string) ?? ''));
      if (isMonitoringView) {
        dispatch(loadRun(_));
      }
      dispatch(loadWorkflow(_));
    },
    [dispatch, isMonitoringView]
  );

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
      </div>
    </div>
  );
};
