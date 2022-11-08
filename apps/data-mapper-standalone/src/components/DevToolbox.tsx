import { customerOrderMapDefinition } from '../../../../__mocks__/mapDefinitions/SimpleCustomerOrder';
import { demoScriptMapDefinition } from '../../../../__mocks__/mapDefinitions/TranscriptMapDefinitions';
import { dataMapDataLoaderSlice, loadDataMap, type ThemeType } from '../state/DataMapDataLoader';
import { loadSourceSchema, loadTargetSchema, schemaDataLoaderSlice } from '../state/SchemaDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, Stack, StackItem, TextField } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, tokens } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const themeOptions = ['Light', 'Dark'];
const themeDropdownOptions = themeOptions.map((theme) => ({ key: theme, text: theme }));

export const mapDefinitionDropdownOptions: IDropdownOption<string>[] = [
  { key: 'demoScriptMapDefinition', text: 'Demo Script Map Definition', data: demoScriptMapDefinition },
  { key: 'customerOrderMapDefinition', text: 'Simple Schema Map Definition', data: customerOrderMapDefinition },
];
export const sourceSchemaFileOptions = [
  'SourceSchema.json',
  'SimpleInputOrderSchema.json',
  'LayeredLoopSourceSchema.json',
  'SimpleLoopSource.json',
];
export const targetSchemaFileOptions = [
  'TargetSchema.json',
  'SimpleOutputOrderSchema.json',
  'LayeredLoopTargetSchema.json',
  'SimpleLoopTarget.json',
];

export const DevToolbox: React.FC = () => {
  const { theme, rawDefinition, armToken, loadingMethod, xsltFilename } = useSelector((state: RootState) => {
    const { theme, rawDefinition, armToken, loadingMethod, xsltFilename } = state.dataMapDataLoader;

    return { theme, rawDefinition, armToken, loadingMethod, xsltFilename };
  });

  const { inputResourcePath, outputResourcePath } = useSelector((state: RootState) => {
    const { inputResourcePath, outputResourcePath } = state.schemaDataLoader;

    return { inputResourcePath, outputResourcePath };
  });

  const dispatch = useDispatch<AppDispatch>();

  const changeResourcePathCB = useCallback(
    (_: unknown, _newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as IDropdownOption<string>));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const resetToUseARM = useCallback(
    (_: unknown, _newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as IDropdownOption<string>));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const changeMapXsltFilenameCB = useCallback(
    (newFilename?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeXsltFilename(newFilename ?? ''));
    },
    [dispatch]
  );

  const changeMapDefinitionResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption<string> | undefined) => {
      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition(item ?? ({} as IDropdownOption<string>)));
      // let inputRscPath = '';
      // let outputRscPath = '';

      // if (item?.key === 'demoScriptMapDefinition') {
      //   inputRscPath = sourceSchemaFileOptions[0];
      //   outputRscPath = targetSchemaFileOptions[0];
      // } else if (item?.key === 'customerOrderMapDefinition') {
      //   inputRscPath = sourceSchemaFileOptions[1];
      //   outputRscPath = targetSchemaFileOptions[1];
      // }

      // dispatch(schemaDataLoaderSlice.actions.changeInputResourcePath(inputRscPath));
      // dispatch(schemaDataLoaderSlice.actions.changeOutputResourcePath(outputRscPath));
      // dispatch(loadSourceSchema());
      // dispatch(loadTargetSchema());

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

  const toolboxItems = useMemo(() => {
    const newToolboxItems = [];

    const sourceSchemaDropdownOptions = sourceSchemaFileOptions.map((fileName) => ({ key: fileName, text: fileName }));
    const targetSchemaDropdownOptions = targetSchemaFileOptions.map((fileName) => ({ key: fileName, text: fileName }));

    if (loadingMethod === 'file') {
      newToolboxItems.push(
        <StackItem key={'mapDefinitionDropDown'} style={{ width: '250px' }}>
          <Dropdown
            label="Map Definition"
            selectedKey={rawDefinition.key}
            onChange={changeMapDefinitionResourcePathDropdownCB}
            placeholder="Select a map definition"
            options={mapDefinitionDropdownOptions}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'sourceSchemaDropDown'} style={{ width: '250px' }}>
          <Dropdown
            label="Source Schema"
            selectedKey={inputResourcePath}
            onChange={changeSourceSchemaResourcePathDropdownCB}
            placeholder="Select a source schema"
            options={sourceSchemaDropdownOptions}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'targetSchemaDropDown'} style={{ width: '250px' }}>
          <Dropdown
            label="Target Schema"
            selectedKey={outputResourcePath}
            onChange={changeTargetSchemaResourcePathDropdownCB}
            placeholder="Select a target schema"
            options={targetSchemaDropdownOptions}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'mapXsltFilenameTextField'} style={{ width: '250px' }}>
          <TextField label="Map XSLT Filename" value={xsltFilename} onChange={(_e, newValue) => changeMapXsltFilenameCB(newValue)} />
        </StackItem>
      );
    } else {
      newToolboxItems.push(
        <StackItem key={'resourceUriTextField'} style={{ width: '250px' }}>
          <TextField
            label="Resource Uri"
            description="/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Web/sites/{LogicAppResource}"
            onChange={changeResourcePathCB}
            value={rawDefinition.data ?? ''}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'armTokenTextField'} style={{ width: '250px' }}>
          <TextField
            label="ARM Token"
            description="auth token: include 'bearer' when pasting"
            onChange={changeArmTokenCB}
            value={armToken ?? ''}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'resetArmButton'} style={{ width: '250px' }}>
          <button onClick={resetToUseARM}>Set</button>
        </StackItem>
      );
    }

    return newToolboxItems;
  }, [
    loadingMethod,
    armToken,
    changeArmTokenCB,
    changeMapDefinitionResourcePathDropdownCB,
    changeResourcePathCB,
    changeSourceSchemaResourcePathDropdownCB,
    changeTargetSchemaResourcePathDropdownCB,
    inputResourcePath,
    outputResourcePath,
    rawDefinition,
    resetToUseARM,
    changeMapXsltFilenameCB,
    xsltFilename,
  ]);

  return (
    <div style={{ width: '70vw', marginBottom: '20px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
      <Accordion defaultOpenItems={'1'} collapsible>
        <AccordionItem value="1">
          <AccordionHeader>Dev Toolbox</AccordionHeader>
          <AccordionPanel>
            <Stack horizontal horizontalAlign="space-around" tokens={{ childrenGap: '8px' }} style={{ width: '100%' }}>
              <StackItem key={'themeDropDown'} style={{ width: '250px' }}>
                <Dropdown
                  label="Theme"
                  selectedKey={theme}
                  onChange={changeThemeCB}
                  placeholder="Select a theme"
                  options={themeDropdownOptions}
                  style={{ marginBottom: '12px' }}
                />
                <Checkbox label="Load From Arm" checked={loadingMethod === 'arm'} onChange={changeLoadingMethodCB} disabled />
              </StackItem>
              {toolboxItems}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
