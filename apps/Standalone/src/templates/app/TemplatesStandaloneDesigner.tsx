import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { AzureThemeDark } from '@fluentui/azure-themes/lib/azure/AzureThemeDark';
import { AzureThemeLight } from '@fluentui/azure-themes/lib/azure/AzureThemeLight';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { PortalCompatProvider } from '@fluentui/react-portal-compat';
import { TemplatesDataProvider, TemplatesDesignerProvider } from '@microsoft/logic-apps-templates';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';

export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.dataMapDataLoader.theme);

  const isLightMode = theme === ThemeType.Light;

  return (
    <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '0 1 1px' }}>
        <ThemeProvider theme={isLightMode ? AzureThemeLight : AzureThemeDark}>
          <FluentProvider theme={isLightMode ? webLightTheme : webDarkTheme}>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <PortalCompatProvider>
              <DevToolbox />
            </PortalCompatProvider>
          </FluentProvider>
        </ThemeProvider>
      </div>

      <div style={{ flex: '1 1 1px', display: 'flex', flexDirection: 'column' }}>
        <TemplatesDesignerProvider locale="en-US" theme={theme} options={{}}>
          <TemplatesDataProvider>
            {/* TODO: here should have TemplatesDesigner */}
            {/* <></> */}
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </div>
    </div>
  );
};
