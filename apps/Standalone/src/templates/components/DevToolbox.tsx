import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, Stack, StackItem } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Tooltip, tokens } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AzureStandardLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { AzureConsumptionLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';
import { useIsConsumption } from '../../designer/state/workflowLoadingSelectors';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { workflowLoaderSlice } from '../state/WorkflowLoader';

const themeDropdownOptions = [
  { key: ThemeType.Light, text: 'Light' },
  { key: ThemeType.Dark, text: 'Dark' },
];

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { theme } = useSelector((state: RootState) => state.workflowLoader);

  const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);
  const isLightMode = theme === ThemeType.Light;

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(workflowLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

  const isConsumption = useIsConsumption();

  return (
    <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
      <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
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
