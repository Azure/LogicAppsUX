import { dataMapDataLoaderSlice, loadDataMap, type ThemeType } from '../state/DataMapDataLoader';
import { loadSourceSchema, loadTargetSchema, schemaDataLoaderSlice } from '../state/SchemaDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Stack, Checkbox, Dropdown, TextField, MessageBar } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@fluentui/react-components';
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

  const changeSourceSchemaResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(schemaDataLoaderSlice.actions.changeInputResourcePath((item?.key as string) ?? ''));
      dispatch(loadSourceSchema());
    },
    [dispatch]
  );

  const changeTargetSchemaResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(schemaDataLoaderSlice.actions.changeOutputResourcePath((item?.key as string) ?? ''));
      dispatch(loadTargetSchema());
    },
    [dispatch]
  );

  const changeArmTokenCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(schemaDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(loadDataMap());
      dispatch(loadSourceSchema());
      dispatch(loadTargetSchema());
    },
    [dispatch]
  );

  const changeLoadingMethodCB = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(dataMapDataLoaderSlice.actions.changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(schemaDataLoaderSlice.actions.changeLoadingMethod(checked ? 'arm' : 'file'));
      dispatch(loadDataMap());
      dispatch(loadSourceSchema());
      dispatch(loadTargetSchema());
    },
    [dispatch]
  );

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(dataMapDataLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

  const themeDropdownOptions = themeOptions.map((theme) => ({ key: theme, text: theme }));
  const dataMapDropdownOptions = mapFileOptions.map((fileName) => ({ key: fileName, text: fileName }));
  const schemaDropdownOptions = schemaFileOptions.map((fileName) => ({ key: fileName, text: fileName }));

  return (
    <div style={{ width: '50vw', marginBottom: '20px', backgroundColor: '#eaeaea', padding: 4 }}>
      <Accordion defaultOpenItems={'1'} collapsible>
        <AccordionItem value="1">
          <AccordionHeader>Dev Toolbox</AccordionHeader>
          <AccordionPanel>
            <Stack horizontal horizontalAlign="space-around" style={{ width: '100%', marginBottom: 8 }}>
              <div style={{ width: '250px' }}>
                <Dropdown
                  label="Theme"
                  selectedKey={theme}
                  onChange={changeThemeCB}
                  placeholder="Select a theme"
                  options={themeDropdownOptions}
                  style={{ marginBottom: '12px' }}
                />
                <Checkbox label="Load From Arm" checked={loadingMethod === 'arm'} onChange={changeLoadingMethodCB} disabled />
              </div>

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
                    label="Source Schema"
                    selectedKey={inputResourcePath}
                    onChange={changeSourceSchemaResourcePathDropdownCB}
                    placeholder="Select a source schema"
                    options={schemaDropdownOptions}
                  />
                  <Dropdown
                    label="Target Schema"
                    selectedKey={outputResourcePath}
                    onChange={changeTargetSchemaResourcePathDropdownCB}
                    placeholder="Select a target schema"
                    options={schemaDropdownOptions}
                  />
                </div>
              ) : (
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
              )}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
