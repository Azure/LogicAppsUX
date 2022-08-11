import type { AppDispatch, RootState } from '../../state/store';
import { changeArmToken, changeResourcePath, changeLoadingMethod, loadWorkflow } from '../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField } from '@fluentui/react';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

export const fileOptions = [
  'AllScopeNodes.json',
  'Panel.json',
  'ComplexConditionals.json',
  'Conditionals.json',
  'Switch.json',
  'MoreComplex.json',
  'MultipleRunAftersBig.json',
  'RunAfter.json',
  'Scoped.json',
  'simpleBigworkflow.json',
  'simpleScoped.json',
  'simpleForeach.json',
  'straightLine.json',
  'StressTest50.json',
  'StressTest100.json',
  'StressTest200.json',
  'StressTest300.json',
  'StressTest400.json',
  'StressTest500.json',
  'StressTest500Gross.json',
  'StressTest600.json',
  'StressTest1000.json',
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
  const fileOptionsMap = fileOptions.map((x) => ({ key: x, text: x }));

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
            options={fileOptionsMap}
          />
        </div>
      ) : null}
    </div>
  );
};
