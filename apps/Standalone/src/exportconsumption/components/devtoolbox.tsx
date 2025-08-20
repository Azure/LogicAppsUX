import type { AppDispatch, RootState } from '../state/store';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, MessageBar, Text, Badge, Switch } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { setToolboxOpen, workflowLoaderSlice } from '../state/workflowloader';
import { environment } from '../../environments/environment';
import { useDevToolboxStyles } from './styles';
import { AzureConsumptionLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isToolboxOpen = useSelector((state: RootState) => state.workflowLoader.toolboxOpen);
  const styles = useDevToolboxStyles();

  const { theme } = useSelector((state: RootState) => state.workflowLoader);
  const isLightMode = theme === ThemeType.Light;

  const handleThemeToggle = useCallback(
    (_: unknown, data: { checked: boolean }) => {
      dispatch(workflowLoaderSlice.actions.changeTheme(data.checked ? ThemeType.Dark : ThemeType.Light));
    },
    [dispatch]
  );

  const armToken = environment.armToken;

  return (
    <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
      <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
        <div className={styles.container}>
          <Accordion
            openItems={isToolboxOpen ? ['1'] : []}
            onToggle={(_, data) => {
              dispatch(setToolboxOpen(data.openItems.includes('1')));
            }}
            collapsible
            className={styles.accordion}
          >
            {!armToken && (
              <MessageBar intent="error" className={styles.messageBar}>
                <Text weight="semibold">⚠️ Authentication Required</Text>
                <Text>Please reload the page after loading your ARM token to enable full functionality.</Text>
              </MessageBar>
            )}

            <AccordionItem value="1">
              <AccordionHeader className={styles.accordionHeader}>
                <div className={styles.headerContent}>
                  <Text size={500} weight="semibold">
                    🛠️ Developer Toolbox
                  </Text>
                  <Badge appearance="tint" color={armToken ? 'success' : 'danger'} size="small">
                    {armToken ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </AccordionHeader>

              <AccordionPanel className={styles.accordionPanel}>
                <div className={styles.themeToggleContainer}>
                  <Text size={400} weight="semibold">
                    🎨 Dark Mode
                  </Text>
                  <Switch checked={!isLightMode} onChange={handleThemeToggle} label={isLightMode ? 'Light' : 'Dark'} />
                </div>
              </AccordionPanel>
            </AccordionItem>

            <AzureConsumptionLogicAppSelector />
          </Accordion>
        </div>
      </FluentProvider>
    </ThemeProvider>
  );
};
