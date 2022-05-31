import { dataMapDataLoaderSlice, loadDataMap } from '../state/DataMapDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField } from '@fluentui/react';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

export const fileOptions = ['SimpleCustomerOrder.json'];

export const DevToolbox: React.FC = () => {
  const { resourcePath, armToken, loadingMethod } = useSelector((state: RootState) => {
    const { resourcePath, armToken, loadingMethod } = state.dataMapDataLoader;

    return { resourcePath, armToken, loadingMethod };
  });

  const dispatch = useDispatch<AppDispatch>();

  const changeResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(newValue ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath((item?.key as string) ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeArmTokenCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeLoadingMethodCB = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(dataMapDataLoaderSlice.actions.changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(loadDataMap());
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
            <TextField label="Data Map Resource ID" onChange={changeResourcePathCB} value={resourcePath ?? ''} />
          </div>
          <div>
            <TextField label="ARM Token" onChange={changeArmTokenCB} value={armToken ?? ''} />
          </div>
        </>
      ) : null}
      {loadingMethod === 'file' ? (
        <div>
          <Dropdown
            label="Data Map File To Load"
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
