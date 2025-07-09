import type { AppDispatch, RootState } from '../state/Store';
import type { IDropdownOption } from '@fluentui/react';
import { Dropdown, Stack, StackItem } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  MessageBar,
  Card,
  CardHeader,
  Text,
  Badge,
  Divider,
} from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AzureStandardLogicAppSelector } from '../../designer/app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { setToolboxOpen, workflowLoaderSlice } from '../state/WorkflowLoader';
import { environment } from '../../environments/environment';
import { useDevToolboxStyles } from './styles';

const themeDropdownOptions = [
  { key: ThemeType.Light, text: 'Light' },
  { key: ThemeType.Dark, text: 'Dark' },
];

export const DevToolbox = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isToolboxOpen = useSelector((state: RootState) => state.workflowLoader.toolboxOpen);
  const styles = useDevToolboxStyles();

  const { theme } = useSelector((state: RootState) => state.workflowLoader);
  const isLightMode = theme === ThemeType.Light;

  const changeThemeCB = useCallback(
    (_: unknown, item: IDropdownOption | undefined) => {
      dispatch(workflowLoaderSlice.actions.changeTheme((item?.key as ThemeType) ?? ''));
    },
    [dispatch]
  );

  const onLogicAppSelected = () => {
    dispatch(setToolboxOpen(false));
  };

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
                <Stack horizontal tokens={{ childrenGap: '20px' }} wrap className={styles.stackContainer}>
                  <StackItem className={styles.themeCard}>
                    <Card className={styles.transparentCard}>
                      <CardHeader
                        header={
                          <Text size={400} weight="semibold">
                            🎨 Theme Settings
                          </Text>
                        }
                        description={
                          <Text size={200} className={styles.sectionDescription}>
                            Customize your visual experience
                          </Text>
                        }
                      />
                      <Divider className={styles.cardDivider} />
                      <Dropdown
                        label="Theme Mode"
                        selectedKey={theme}
                        onChange={changeThemeCB}
                        placeholder="Select a theme"
                        options={themeDropdownOptions}
                        styles={{
                          root: styles.dropdownRoot,
                          dropdown: styles.dropdownField,
                        }}
                      />
                    </Card>
                  </StackItem>

                  <StackItem className={styles.logicAppCard}>
                    <Card className={styles.transparentCard}>
                      <CardHeader
                        header={
                          <Text size={400} weight="semibold">
                            ⚡ Logic App Configuration
                          </Text>
                        }
                        description={
                          <Text size={200} className={styles.sectionDescription}>
                            Select and configure your Azure Logic App
                          </Text>
                        }
                      />
                      <Divider className={styles.cardDivider} />
                      <div className={styles.logicAppContainer}>
                        {armToken ? (
                          <AzureStandardLogicAppSelector hideWorkflowSelection={true} onLogicAppSelected={onLogicAppSelected} />
                        ) : (
                          <Text size={200}>Please connect your ARM token to select a Logic App.</Text>
                        )}
                      </div>
                    </Card>
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
