import type { ReactNode } from 'react';
import { getReactQueryClient } from '@microsoft/logic-apps-designer';
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
  const theme = useSelector((state: RootState) => state.templateDataLoader.theme);
  // const currentTemplate = useSelector((state: RootState) => state.templateDataLoader.currentTemplate); // moving this out

  return (
    <QueryClientProvider client={standaloneQueryClient}>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <TemplatesDesignerProvider locale="en-US" theme={theme}>
          <TemplatesDesigner />
        </TemplatesDesignerProvider>
      </LoadWhenArmTokenIsLoaded>
    </QueryClientProvider>
  );
};
