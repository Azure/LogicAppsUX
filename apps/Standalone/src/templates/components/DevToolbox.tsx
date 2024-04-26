import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, Stack, StackItem, TextField } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Tooltip, tokens } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingMethod, loadCurrentTemplate, templateDataLoaderSlice } from '../state/TemplateDataLoader';

const themeDropdownOptions = [
  { key: ThemeType.Light, text: 'Light' },
  { key: ThemeType.Dark, text: 'Dark' },
];

interface TemplateFileData {
  foldername: string;
}
const templateFileOptions: TemplateFileData[] = [{ foldername: 'DeleteOldBlob' }, { foldername: 'SendMonthlyCost' }];

// ];
const mapSchemaFileOptionsToDropdownOptions = (schemaFileData: TemplateFileData[]) =>
  schemaFileData.map<IDropdownOption>((schemaOpt) => ({
    key: schemaOpt.foldername,
    text: schemaOpt.foldername,
  }));
const sourceSchemaDropdownOptions = mapSchemaFileOptionsToDropdownOptions(templateFileOptions);

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { theme, armToken, loadingMethod, currentTemplateResourcePath } = useSelector((state: RootState) => state.templateDataLoader);

  const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);

  // const changeResourcePathCB = useCallback(
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   () => {
  //     dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as MapDefDropdownOption));
  //     dispatch(loadDataMap());
  //   },
  //   [dispatch]
  // );

  const resetToUseARM = useCallback(() => {
    // dispatch(dataMapDataLoaderSlice.actions.changeRawDefinition({} as MapDefDropdownOption));
    dispatch(loadCurrentTemplate({}));
  }, [dispatch]);

  const changeSourceSchemaResourcePathDropdownCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(templateDataLoaderSlice.actions.changecurrentTemplateResourcePath((item?.key as string) ?? ''));
      dispatch(loadCurrentTemplate({}));
    },
    [dispatch]
  );

  const changeArmTokenCB = useCallback(
    (_: unknown, newValue?: string) => {
      dispatch(templateDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(templateDataLoaderSlice.actions.changeArmToken(newValue ?? ''));
      dispatch(loadCurrentTemplate({}));
    },
    [dispatch]
  );

  const changeLoadingMethodCB = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(templateDataLoaderSlice.actions.changeLoadingMethod(checked ? LoadingMethod.Arm : LoadingMethod.File));
      dispatch(templateDataLoaderSlice.actions.changeLoadingMethod(checked ? LoadingMethod.Arm : LoadingMethod.File));
      dispatch(loadCurrentTemplate({}));
    },
    [dispatch]
  );

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(templateDataLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

  const toolboxItems = useMemo(() => {
    const newToolboxItems = [];

    if (loadingMethod === LoadingMethod.File) {
      newToolboxItems.push(
        <StackItem key={'templatesDropDown'} style={{ width: '250px' }}>
          <Dropdown
            label="Template"
            selectedKey={currentTemplateResourcePath}
            onChange={changeSourceSchemaResourcePathDropdownCB}
            placeholder="Select a template folder to load template.json"
            options={sourceSchemaDropdownOptions}
          />
        </StackItem>
      );
    } else {
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
  }, [loadingMethod, armToken, changeArmTokenCB, changeSourceSchemaResourcePathDropdownCB, currentTemplateResourcePath, resetToUseARM]);

  return (
    <div style={{ marginBottom: '8px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
      <Accordion defaultOpenItems={'1'} collapsible style={{ position: 'relative' }}>
        <Tooltip
          content="Clippy says hello!"
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
