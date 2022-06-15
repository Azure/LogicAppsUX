import { dataMapDataLoaderSlice, loadDataMap } from '../state/DataMapDataLoader';
import { loadInputSchema, loadOutputSchema, schemaDataLoaderSlice } from '../state/SchemaDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField } from '@fluentui/react';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const mapFileOptions = ['SimpleCustomerOrder.json'];
export const schemaFileOptions = ['SimpleCustomerOrderSchema.json'];

export const DevToolbox: React.FC = () => {
  const { resourcePath, armToken, loadingMethod } = useSelector((state: RootState) => {
    const { resourcePath, armToken, loadingMethod } = state.dataMapDataLoader;

    return { resourcePath, armToken, loadingMethod };
  });

  const { inputResourcePath, outputResourcePath } = useSelector((state: RootState) => {
    const { inputResourcePath, outputResourcePath } = state.schemaDataLoader;

    return { inputResourcePath, outputResourcePath };
  });

  const dispatch = useDispatch<AppDispatch>();

  const changeDataMapResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(newValue ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeInputSchemaResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(schemaDataLoaderSlice.actions.changeInputResourcePath(newValue ?? ''));
      dispatch(loadInputSchema());
    },
    [dispatch]
  );

  const changeOutputSchemaResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(schemaDataLoaderSlice.actions.changeOutputResourcePath(newValue ?? ''));
      dispatch(loadOutputSchema());
    },
    [dispatch]
  );

  const changeDataMapResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath((item?.key as string) ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeInputSchemaResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(schemaDataLoaderSlice.actions.changeInputResourcePath((item?.key as string) ?? ''));
      dispatch(loadInputSchema());
    },
    [dispatch]
  );

  const changeOutputSchemaResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(schemaDataLoaderSlice.actions.changeOutputResourcePath((item?.key as string) ?? ''));
      dispatch(loadOutputSchema());
    },
    [dispatch]
  );

  const changeArmTokenCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(schemaDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(loadDataMap());
      dispatch(loadInputSchema());
      dispatch(loadOutputSchema());
    },
    [dispatch]
  );

  const changeLoadingMethodCB = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(dataMapDataLoaderSlice.actions.changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(schemaDataLoaderSlice.actions.changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(loadDataMap());
      dispatch(loadInputSchema());
      dispatch(loadOutputSchema());
    },
    [dispatch]
  );

  const dataMapDropdownOptions = mapFileOptions.map((fileName) => ({ key: fileName, text: fileName }));
  const schemaDropdownOptions = schemaFileOptions.map((fileName) => ({ key: fileName, text: fileName }));

  return (
    <div style={{ width: '400px', marginBottom: '20px' }}>
      <div style={{ paddingBottom: '10px' }}>
        <Checkbox label="Load From Arm" checked={loadingMethod === 'arm'} onChange={changeLoadingMethodCB} />
      </div>
      {loadingMethod === 'arm' ? (
        <>
          <div>
            <TextField label="Data Map Resource ID" onChange={changeDataMapResourcePathCB} value={resourcePath ?? ''} />
          </div>
          <div>
            <TextField label="Input Schema Resource ID" onChange={changeInputSchemaResourcePathCB} value={resourcePath ?? ''} />
          </div>
          <div>
            <TextField label="Output Schema Resource ID" onChange={changeOutputSchemaResourcePathCB} value={resourcePath ?? ''} />
          </div>
          <div>
            <TextField label="ARM Token" onChange={changeArmTokenCB} value={armToken ?? ''} />
          </div>
        </>
      ) : null}
      {loadingMethod === 'file' ? (
        <div>
          <Dropdown
            label="Data Map"
            selectedKey={resourcePath}
            onChange={changeDataMapResourcePathDropdownCB}
            placeholder="Select an option"
            options={dataMapDropdownOptions}
          />
          <Dropdown
            label="Input Schema"
            selectedKey={inputResourcePath}
            onChange={changeInputSchemaResourcePathDropdownCB}
            placeholder="Select an option"
            options={schemaDropdownOptions}
          />
          <Dropdown
            label="Output Schema"
            selectedKey={outputResourcePath}
            onChange={changeOutputSchemaResourcePathDropdownCB}
            placeholder="Select an option"
            options={schemaDropdownOptions}
          />
        </div>
      ) : null}
    </div>
  );
};
