import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, Stack, StackItem } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, tokens, MessageBar } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AzureStandardLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { workflowLoaderSlice } from '../state/WorkflowLoader';
import { environment } from '../../environments/environment';

const themeDropdownOptions = [
  { key: ThemeType.Light, text: 'Light' },
  { key: ThemeType.Dark, text: 'Dark' },
];

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { theme } = useSelector((state: RootState) => state.workflowLoader);
  const isLightMode = theme === ThemeType.Light;

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(workflowLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

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
            {armToken ? null : (
              <MessageBar intent="error" style={{ margin: '8px' }}>
                Reload page after loading arm token.
              </MessageBar>
            )}
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
                  </StackItem>
                  <StackItem style={{ width: '100%' }}>
                    <AzureStandardLogicAppSelector />
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
