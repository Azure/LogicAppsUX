import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, Stack, StackItem } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  tokens,
  MessageBar,
  Checkbox,
  type CheckboxOnChangeData,
} from '@fluentui/react-components';
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
    (_: unknown, data: CheckboxOnChangeData) => {
      dispatch(workflowLoaderSlice.actions.setUseEndpoint(!!data.checked));
    },
    [dispatch]
  );

  const changeCreateView = useCallback(
    (_: unknown, data: CheckboxOnChangeData) => {
      dispatch(workflowLoaderSlice.actions.setCreateView(!!data.checked));
    },
    [dispatch]
  );

  const changeResourceSelection = useCallback(
    (_: unknown, data: CheckboxOnChangeData) => {
      dispatch(workflowLoaderSlice.actions.setEnableResourceSelection(!!data.checked));
    },
    [dispatch]
  );

  const isConsumption = useHostingPlan() === 'consumption';
  const armToken = environment.armToken;

  return (
    <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
      <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
        <div
          style={{
            backgroundColor: tokens.colorNeutralBackground3,
            borderBottom: `1px solid ${tokens.colorNeutralBackground3Pressed}`,
          }}
        >
          <Accordion defaultOpenItems={'1'} collapsible style={{ position: 'relative' }}>
            {armToken ? null : <MessageBar intent="error">Reload page after loading arm token.</MessageBar>}
            <AccordionItem value="1">
              <AccordionHeader>Dev Toolbox</AccordionHeader>
              <AccordionPanel style={{ padding: '0px 12px 16px' }}>
                <Stack horizontal tokens={{ childrenGap: '12px' }} wrap>
                  <StackItem
                    key={'themeDropDown'}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '12px',
                      alignItems: 'end',
                    }}
                  >
                    <Dropdown
                      label="Theme"
                      selectedKey={theme}
                      onChange={changeThemeCB}
                      placeholder="Select a theme"
                      options={themeDropdownOptions}
                      style={{ width: '100px' }}
                    />
                    <Dropdown
                      label="Templates View"
                      selectedKey={templatesView}
                      onChange={changeTemplatesView}
                      placeholder="Select templates view"
                      options={[...templatesViewOptions, ...templatesList]}
                      style={{ width: '250px' }}
                    />
                    <Checkbox label="Use Endpoint" onChange={changeEndpointUsage} />
                    <Checkbox label="Create View" onChange={changeCreateView} />
                    <Checkbox label="Resource Selection" onChange={changeResourceSelection} />
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
