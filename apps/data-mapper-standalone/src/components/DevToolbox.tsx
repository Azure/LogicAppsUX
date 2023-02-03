import { fullTranscriptMapDefinitionString, comprehensiveMapDefinition } from '../../../../__mocks__/mapDefinitions';
import { dataMapDataLoaderSlice, loadDataMap, LoadingMethod, type ThemeType } from '../state/DataMapDataLoader';
import { loadSourceSchema, loadTargetSchema, schemaDataLoaderSlice } from '../state/SchemaDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, Stack, StackItem, TextField } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Tooltip, tokens } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const themeOptions = ['Light', 'Dark'];
const themeDropdownOptions = themeOptions.map((theme) => ({ key: theme, text: theme }));

interface MapDefDropdownData {
  mapDefinitionString: string;
  associatedSchemaIdx: number;
}
export type MapDefDropdownOption = IDropdownOption<MapDefDropdownData>;

const sourceSchemaFileOptions = ['PlaygroundSourceSchema.json', 'SourceSchema.json', 'ComprehensiveSourceSchema.json'];
const targetSchemaFileOptions = ['PlaygroundTargetSchema.json', 'TargetSchema.json', 'ComprehensiveTargetSchema.json'];
const mapDefinitionDropdownOptions: MapDefDropdownOption[] = [
  {
    key: 'fullDemoScriptMapDefinition',
    text: 'Transcript',
    data: { mapDefinitionString: fullTranscriptMapDefinitionString, associatedSchemaIdx: 1 },
  },
  {
    key: 'comprehensiveMapDefinition',
    text: 'Comprehensive',
    data: { mapDefinitionString: comprehensiveMapDefinition, associatedSchemaIdx: 2 },
  },
];

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { theme, rawDefinition, armToken, loadingMethod, xsltFilename } = useSelector((state: RootState) => state.dataMapDataLoader);
  const { inputResourcePath, outputResourcePath } = useSelector((state: RootState) => state.schemaDataLoader);

  const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);

  const changeResourcePathCB = useCallback(
    (_: unknown, _newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as MapDefDropdownOption));
      dispatch(loadDataMap());
    },
    [dispatch]
  );

  const resetToUseARM = useCallback(
    (_: unknown, _newValue?: string) => {
      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as MapDefDropdownOption));
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
    (_: unknown, item: MapDefDropdownOption | undefined) => {
      if (!item?.data) {
        return;
      }

      dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition(item));
      const srcSchemaRscPath = sourceSchemaFileOptions[item.data.associatedSchemaIdx];
      const tgtSchemaRscPath = targetSchemaFileOptions[item.data.associatedSchemaIdx];

      dispatch(schemaDataLoaderSlice.actions.changeInputResourcePath(srcSchemaRscPath));
      dispatch(schemaDataLoaderSlice.actions.changeOutputResourcePath(tgtSchemaRscPath));
      dispatch(loadSourceSchema());
      dispatch(loadTargetSchema());

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
      dispatch(dataMapDataLoaderSlice.actions.changeLoadingMethod(checked ? LoadingMethod.Arm : LoadingMethod.File));
      dispatch(schemaDataLoaderSlice.actions.changeLoadingMethod(checked ? LoadingMethod.Arm : LoadingMethod.File));
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

    if (loadingMethod === LoadingMethod.File) {
      newToolboxItems.push(
        <StackItem key={'mapDefinitionDropDown'} style={{ width: '250px' }}>
          <Dropdown
            label="Map Definition"
            selectedKey={rawDefinition?.key}
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
          <TextField label="XSLT Filename" value={xsltFilename} onChange={(_e, newValue) => changeMapXsltFilenameCB(newValue)} />
        </StackItem>
      );
    } else {
      newToolboxItems.push(
        <StackItem key={'resourceUriTextField'} style={{ width: '250px' }}>
          <TextField
            label="Resource Uri"
            description="/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Web/sites/{LogicAppResource}"
            onChange={changeResourcePathCB}
            value={rawDefinition?.data?.mapDefinitionString ?? ''}
          />
        </StackItem>
      );
      newToolboxItems.push(
        <StackItem key={'armTokenTextField'} style={{ width: '250px' }}>
          <TextField
            label="ARM Token"
            description="Auth token: include 'bearer' when pasting"
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
    <div style={{ marginBottom: '8px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
      <Accordion defaultOpenItems={'1'} collapsible style={{ position: 'relative' }}>
        <Tooltip
          content="Example tooltip"
          relationship="label"
          positioning="below-start"
          withArrow
          showDelay={100}
          hideDelay={500}
          onVisibleChange={(_e, data) => setIsTooltipVisible(data.visible)}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 12,
              padding: 4,
              backgroundColor: tokens.colorNeutralBackground4,
              borderRadius: tokens.borderRadiusMedium,
              zIndex: 10,
              cursor: 'pointer',
            }}
          >
            <span role="img" aria-label="Clippy!" style={{ fontSize: 20 }}>
              📎
            </span>{' '}
            Tooltip tester! It&apos;s {isTooltipVisible ? 'visible' : 'hidden'}
          </div>
        </Tooltip>

        <AccordionItem value="1">
          <AccordionHeader>Dev Toolbox</AccordionHeader>
          <AccordionPanel>
            <Stack horizontal tokens={{ childrenGap: '12px' }} wrap>
              <StackItem key={'themeDropDown'} style={{ width: '250px' }}>
                <Dropdown
                  label="Theme"
                  selectedKey={theme}
                  onChange={changeThemeCB}
                  placeholder="Select a theme"
                  options={themeDropdownOptions}
                  style={{ marginBottom: '12px' }}
                />
                <Checkbox label="Load From Arm" checked={loadingMethod === LoadingMethod.Arm} onChange={changeLoadingMethodCB} disabled />
              </StackItem>

              {toolboxItems}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
