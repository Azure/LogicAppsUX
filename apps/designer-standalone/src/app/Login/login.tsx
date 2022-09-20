import type { AppDispatch, RootState } from '../../state/store';
import { changeArmToken, changeResourcePath, changeLoadingMethod, loadWorkflow } from '../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField, DropdownMenuItemType } from '@fluentui/react';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

const fileOptions = [
  // General
  { key: 'GeneralHeader', text: 'General Workflows', itemType: DropdownMenuItemType.Header },
  { key: 'Empty.json', text: 'Empty/New' },
  { key: 'Panel.json', text: 'Panel' },
  // { key: 'straightLine.json', text: 'Straight Line' },
  { key: 'simpleBigworkflow.json', text: 'Simple Big Workflow' },

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
];

export const Login: React.FC = () => {
  const { resourcePath, armToken, loadingMethod } = useSelector((state: RootState) => {
    const { resourcePath, armToken, loadingMethod } = state.workflowLoader;
    return { resourcePath, armToken, loadingMethod };
  });
  const dispatch = useDispatch<AppDispatch>();
  const changeResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(changeResourcePath(newValue ?? ''));
      dispatch(loadWorkflow());
    },
    [dispatch]
  );

  const changeResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(changeResourcePath((item?.key as string) ?? ''));
      dispatch(loadWorkflow());
    },
    [dispatch]
  );

  const changeArmTokenCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(changeArmToken(newValue ?? ''));
      dispatch(loadWorkflow());
    },
    [dispatch]
  );

  const changeLoadingMethodCB = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(loadWorkflow());
    },
    [dispatch]
  );

  return (
    <div>
      <div style={{ paddingBottom: '10px' }}>
        <Checkbox label="Load From Arm" checked={loadingMethod === 'arm'} onChange={changeLoadingMethodCB} />
      </div>
      {loadingMethod === 'arm' ? (
        <>
          <div>
            <TextField label="Workflow Resource ID" onChange={changeResourcePathCB} value={resourcePath ?? ''} />
          </div>
          <div>
            <TextField label="ARM Token" onChange={changeArmTokenCB} value={armToken ?? ''} />
          </div>
        </>
      ) : null}
      {loadingMethod === 'file' ? (
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
      ) : null}
    </div>
  );
};
