import { ThemeProvider } from '@fluentui/react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  FluentProvider,
  MessageBar,
  Switch,
  Text,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import type { ComponentProps, ReactNode } from 'react';

interface SharedDevToolboxStyles {
  accordion: string;
  accordionHeader: string;
  accordionPanel: string;
  container: string;
  headerContent: string;
  messageBar: string;
  themeToggleContainer: string;
}

interface SharedDevToolboxProps {
  accordionExtra?: ReactNode;
  darkModeTextSize?: ComponentProps<typeof Text>['size'];
  hasArmToken: boolean;
  headerTextSize?: ComponentProps<typeof Text>['size'];
  isLightMode: boolean;
  isToolboxOpen: boolean;
  onThemeToggle: (checked: boolean) => void;
  onToolboxToggle: (open: boolean) => void;
  panelBodyClassName?: string;
  panelExtra?: ReactNode;
  styles: SharedDevToolboxStyles;
}

export const SharedDevToolbox = ({
  accordionExtra,
  darkModeTextSize = 400,
  hasArmToken,
  headerTextSize = 500,
  isLightMode,
  isToolboxOpen,
  onThemeToggle,
  onToolboxToggle,
  panelBodyClassName,
  panelExtra,
  styles,
}: SharedDevToolboxProps) => {
  const panelBody = (
    <>
      <div className={styles.themeToggleContainer}>
        <Text size={darkModeTextSize} weight="semibold">
          🎨 Dark Mode
        </Text>
        <Switch checked={!isLightMode} onChange={(_, data) => onThemeToggle(data.checked)} label={isLightMode ? 'Light' : 'Dark'} />
      </div>
      {panelExtra}
    </>
  );

  return (
    <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
      <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
        <div className={styles.container}>
          <Accordion
            openItems={isToolboxOpen ? ['1'] : []}
            onToggle={(_, data) => onToolboxToggle(data.openItems.includes('1'))}
            collapsible
            className={styles.accordion}
          >
            {!hasArmToken && (
              <MessageBar intent="error" className={styles.messageBar}>
                <Text weight="semibold">⚠️ Authentication Required</Text>
                <Text>Please reload the page after loading your ARM token to enable full functionality.</Text>
              </MessageBar>
            )}

            <AccordionItem value="1">
              <AccordionHeader className={styles.accordionHeader}>
                <div className={styles.headerContent}>
                  <Text size={headerTextSize} weight="semibold">
                    🛠️ Developer Toolbox
                  </Text>
                  <Badge appearance="tint" color={hasArmToken ? 'success' : 'danger'} size="small">
                    {hasArmToken ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </AccordionHeader>

              <AccordionPanel className={styles.accordionPanel}>
                {panelBodyClassName ? <div className={panelBodyClassName}>{panelBody}</div> : panelBody}
              </AccordionPanel>
            </AccordionItem>

            {accordionExtra}
          </Accordion>
        </div>
      </FluentProvider>
    </ThemeProvider>
  );
};
