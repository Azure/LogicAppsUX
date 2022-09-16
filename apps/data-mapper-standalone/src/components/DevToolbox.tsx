import { dataMapDataLoaderSlice, loadDataMap } from '../state/DataMapDataLoader';
import { loadInputSchema, loadOutputSchema, schemaDataLoaderSlice } from '../state/SchemaDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField, MessageBar } from '@fluentui/react';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const themeOptions = ['Light', 'Dark'];

export const mapFileOptions = ['SimpleCustomerOrder.json'];
export const schemaFileOptions = ['SimpleInputOrderSchema.json', 'SimpleOutputOrderSchema.json'];

export const DevToolbox: React.FC = () => {
  const { theme, resourcePath, armToken, loadingMethod } = useSelector((state: RootState) => {
    const { theme, resourcePath, armToken, loadingMethod } = state.dataMapDataLoader;

    return { theme, resourcePath, armToken, loadingMethod };
  });

  const { inputResourcePath, outputResourcePath } = useSelector((state: RootState) => {
    const { inputResourcePath, outputResourcePath } = state.schemaDataLoader;

    return { inputResourcePath, outputResourcePath };
  });

  const dispatch = useDispatch<AppDispatch>();

  const changeResourcePathCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(newValue ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const resetToUseARM = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(newValue ?? ''));
      dispatch(loadDataMap());
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

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(dataMapDataLoaderSlice.actions.changeTheme((item?.key as string) ?? ''));
    },
    [dispatch]
  );

  const themeDropdownOptions = themeOptions.map((theme) => ({ key: theme, text: theme }));
  const dataMapDropdownOptions = mapFileOptions.map((fileName) => ({ key: fileName, text: fileName }));
  const schemaDropdownOptions = schemaFileOptions.map((fileName) => ({ key: fileName, text: fileName }));

  return (
    <div style={{ width: '400px', marginBottom: '20px' }}>
      <div style={{ marginBottom: 10 }}>
        <Dropdown label="Theme" selectedKey={theme} onChange={changeThemeCB} placeholder="Select a theme" options={themeDropdownOptions} />
      </div>

      <div style={{ paddingBottom: '10px' }}>
        <Checkbox label="Load From Arm" checked={loadingMethod === 'arm'} onChange={changeLoadingMethodCB} disabled />
      </div>
      {loadingMethod === 'arm' ? (
        <>
          <div>
            <TextField
              label="Resource Uri"
              description="/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Web/sites/{LogicAppResource}"
              onChange={changeResourcePathCB}
              value={resourcePath ?? ''}
            />
          </div>
          <div>
            <TextField
              label="ARM Token"
              description="auth token: include 'bearer' when pasting"
              onChange={changeArmTokenCB}
              value={armToken ?? ''}
            />
          </div>
          <button onClick={resetToUseARM}>Set</button>
        </>
      ) : null}
      {loadingMethod === 'file' ? (
        <div>
          <MessageBar>
            The below dropdowns load mock objects (equivalent to what we expect from a data map definition or GET schemaTree)
          </MessageBar>
          <Dropdown
            label="Data Map"
            selectedKey={resourcePath}
            onChange={changeDataMapResourcePathDropdownCB}
            placeholder="Select a data map"
            options={dataMapDropdownOptions}
          />
          <Dropdown
            label="Input Schema"
            selectedKey={inputResourcePath}
            onChange={changeInputSchemaResourcePathDropdownCB}
            placeholder="Select an input schema"
            options={schemaDropdownOptions}
          />
          <Dropdown
            label="Output Schema"
            selectedKey={outputResourcePath}
            onChange={changeOutputSchemaResourcePathDropdownCB}
            placeholder="Select an output schema"
            options={schemaDropdownOptions}
          />
        </div>
      ) : null}
    </div>
  );
};
