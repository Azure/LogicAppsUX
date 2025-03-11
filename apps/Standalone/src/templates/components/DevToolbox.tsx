import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, Stack, StackItem, Checkbox } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, tokens } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AzureStandardLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { AzureConsumptionLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';
import { useHostingPlan } from '../../designer/state/workflowLoadingSelectors';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { workflowLoaderSlice } from '../state/WorkflowLoader';
import { environment } from '../../environments/environment';
import SourceSettings from '../../designer/app/SettingsSections/sourceSettings';

const themeDropdownOptions = [
  { key: ThemeType.Light, text: 'Light' },
  { key: ThemeType.Dark, text: 'Dark' },
];
const templatesViewOptions = [{ key: 'gallery', text: 'Gallery' }];

export const DevToolbox = ({ templatesList = [] }: { templatesList?: { key: string; text: string }[] }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { theme, templatesView } = useSelector((state: RootState) => state.workflowLoader);
  const isLightMode = theme === ThemeType.Light;

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(workflowLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

  const changeTemplatesView = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      const selectedKey = (item?.key as string) ?? '';
      dispatch(workflowLoaderSlice.actions.setTemplatesView(selectedKey));
    },
    [dispatch]
  );

  const changeEndpointUsage = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(workflowLoaderSlice.actions.setUseEndpoint(!!checked));
    },
    [dispatch]
  );

  const changeCreateView = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(workflowLoaderSlice.actions.setCreateView(!!checked));
    },
    [dispatch]
  );

  const changeResourceSelection = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(workflowLoaderSlice.actions.setEnableResourceSelection(!!checked));
    },
    [dispatch]
  );

  const isConsumption = useHostingPlan() === 'consumption';
  const armToken = environment.armToken;

  return (
    <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
      <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
        <div style={{ marginBottom: '8px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
          <Accordion defaultOpenItems={'1'} collapsible style={{ position: 'relative' }}>
            {armToken ? null : <span style={{ color: 'red', padding: 10 }}> Reload page after loading arm token.</span>}
            <AccordionItem value="1">
              <AccordionHeader>Dev Toolbox</AccordionHeader>
              <AccordionPanel>
                <Stack horizontal tokens={{ childrenGap: '12px' }} wrap>
                  <StackItem key={'themeDropDown'} style={{ display: 'flex', flexDirection: 'row' }}>
                    <Dropdown
                      label="Theme"
                      selectedKey={theme}
                      onChange={changeThemeCB}
                      placeholder="Select a theme"
                      options={themeDropdownOptions}
                      style={{ margin: '0 12px 12px 0', width: '100px' }}
                    />
                    <Dropdown
                      label="Templates View"
                      selectedKey={templatesView}
                      onChange={changeTemplatesView}
                      placeholder="Select templates view"
                      options={[...templatesViewOptions, ...templatesList]}
                      style={{ margin: '0 12px 12px 0', width: '250px' }}
                    />
                    <Checkbox label="Use Endpoint" onChange={changeEndpointUsage} styles={{ root: { margin: '30px 0 0 12px' } }} />
                    <Checkbox label="Create View" onChange={changeCreateView} styles={{ root: { margin: '30px 0 0 12px' } }} />
                    <Checkbox
                      label="Resource Selection"
                      onChange={changeResourceSelection}
                      styles={{ root: { margin: '30px 0 0 12px' } }}
                    />
                  </StackItem>
                  <StackItem style={{ width: '100%' }}>
                    <SourceSettings showHistoryButton={false} showHybridPlan={false} />
                  </StackItem>
                  <StackItem style={{ width: '100%' }}>
                    {isConsumption ? <AzureConsumptionLogicAppSelector /> : <AzureStandardLogicAppSelector />}
                  </StackItem>
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </div>
      </FluentProvider>
    </ThemeProvider>
  );
};
