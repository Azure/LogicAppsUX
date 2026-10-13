import type { AppDispatch, RootState } from '../../../state/store';
import { useResourcePath, useIsMonitoringView, useRunFiles } from '../../../state/workflowLoadingSelectors';
import { setResourcePath, loadWorkflow, loadRun } from '../../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isLocalExtractionEnabled, localWorkflowHref, localWorkflowRegistry, localWorkflowRegistryEvent } from '../localWorkflowRegistry';

const fileOptions = [
  // General
  { key: 'GeneralHeader', text: 'General Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'Empty.json', text: 'Empty/New' },
  { key: 'ExtractSelection.json', text: 'Extract Selection' },
  { key: 'Panel.json', text: 'Panel' },
  { key: 'DynamicOutputsOverflow.json', text: 'Dynamic Outputs Overflow' },
  { key: 'Recurrence.json', text: 'Recurrence' },
  { key: 'MultiVariable.json', text: 'Multi Variable' },
  // { key: 'straightLine.json', text: 'Straight Line' },
  { key: 'simpleBigworkflow.json', text: 'Simple Big Workflow' },
  { key: 'UnicodeKeys.json', text: 'Unicode Keys' },
  { key: 'NotesInMetadata.json', text: 'Notes In Metadata' },

  // Agent
  { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'AgentHeader', text: 'Agentic Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'BlankAgent.json', text: 'Starter Agent' },
  { key: 'Agent.json', text: 'Simple Agent' },
  { key: 'AgentWithChannels.json', text: 'Agent with Channels' },
  { key: 'AgentWithMcp.json', text: 'Agent with MCP Tools' },
  { key: 'AgentWithMcpUami.json', text: 'Agent with MCP UAMI' },
  { key: 'AgentWithMcpConsumption.json', text: 'Agent with MCP Tools (Consumption)' },

  // A2A
  { key: 'divider_A2A', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'A2AHeader', text: 'A2A Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'NewA2A.json', text: 'New A2A Agent' },
  { key: 'BasicA2A.json', text: 'Basic A2A' },
  { key: 'HandoffA2A.json', text: 'Handoff A2A' },
  { key: 'HandoffConversationalConsumption.json', text: 'Handoff A2A Consumption' },

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

  // Workflow Parameters
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
  const enableWorkflowExtraction = useSelector(
    (state: RootState) =>
      window.location.pathname === '/v2' &&
      state.workflowLoader.hostingPlan === 'standard' &&
      (state.workflowLoader.hostOptions.enableWorkflowExtraction || isLocalExtractionEnabled())
  );
  const [registryOptions, setRegistryOptions] = useState<IDropdownOption[]>([]);
  const [registryError, setRegistryError] = useState<string>();
  useEffect(() => {
    const refresh = () => {
      if (!enableWorkflowExtraction) {
        setRegistryOptions([]);
        setRegistryError(undefined);
        return;
      }
      try {
        setRegistryOptions(localWorkflowRegistry.list().map((entry) => ({ key: entry.id, text: `${entry.name} (saved locally)` })));
        setRegistryError(undefined);
      } catch (error) {
        setRegistryError(error instanceof Error ? error.message : 'Unable to read local workflows.');
      }
    };
    refresh();
    window.addEventListener(localWorkflowRegistryEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(localWorkflowRegistryEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [enableWorkflowExtraction]);
  const options = useMemo(
    () => [
      ...fileOptions.filter((option) => !registryOptions.some((entry) => entry.key === option.key)),
      ...(registryOptions.length
        ? [{ key: 'LocalRegistryHeader', text: 'Offline local workflows', itemType: DropdownMenuItemType.Header }, ...registryOptions]
        : []),
    ],
    [registryOptions]
  );

  const changeResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      const id = (item?.key as string) ?? '';
      if (enableWorkflowExtraction) {
        window.history.replaceState(window.history.state, '', localWorkflowHref(id));
      }
      dispatch(setResourcePath(id));
      dispatch(loadWorkflow(_));
    },
    [dispatch, enableWorkflowExtraction]
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
          options={options}
          styles={{ callout: { maxHeight: 800 } }}
        />
        {registryError ? <div role="alert">{registryError}</div> : null}
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
