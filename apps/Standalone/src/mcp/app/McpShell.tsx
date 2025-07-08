import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/DevToolbox';
import { McpStandard } from './McpStandard';
import { loadToken } from '../../environments/environment';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/Store';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const McpWrapper = () => {
  const webTheme = useSelector((state: RootState) => (state.workflowLoader.theme === 'light' ? webLightTheme : webDarkTheme));
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <div style={{ height: '100vh' }}>
          <FluentProvider theme={webTheme} style={{ height: 'inherit' }}>
            <McpStandard />
          </FluentProvider>
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
