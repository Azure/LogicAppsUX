import type { AppDispatch } from '../../../state/store';
import { useResourcePath, useIsMonitoringView, useRunFiles } from '../../../state/workflowLoadingSelectors';
import { setResourcePath, loadWorkflow, loadRun } from '../../../state/workflowLoadingSlice';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { fileOptions } from './mockWorkflowOptions';

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
