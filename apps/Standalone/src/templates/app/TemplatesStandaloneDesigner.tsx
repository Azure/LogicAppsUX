import type { ReactNode } from 'react';
import { TemplatesDataProvider, getReactQueryClient } from '@microsoft/logic-apps-designer';
import { QueryClientProvider, useQuery } from 'react-query';
import { loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';

import { useSelector } from 'react-redux';

const standaloneQueryClient = getReactQueryClient();

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery('armToken', loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);

  return (
    <QueryClientProvider client={standaloneQueryClient}>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <TemplatesDesignerProvider locale="en-US" theme={theme}>
          <TemplatesDataProvider>
            <TemplatesDesigner />
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </LoadWhenArmTokenIsLoaded>
    </QueryClientProvider>
  );
};
