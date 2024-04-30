import type { ReactNode } from 'react';
//import { loadToken } from '../../../environments/environment';
import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import { QueryClientProvider, useQuery } from 'react-query';
import { TemplatesStandaloneDesigner } from './TemplatesStandaloneDesigner';
import { loadToken } from '../../environments/environment';

const standaloneQueryClient = getReactQueryClient();

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery('armToken', loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesDesignerWrapper = () => {
  return (
    <QueryClientProvider client={standaloneQueryClient}>
      <LoadWhenArmTokenIsLoaded>
        <TemplatesStandaloneDesigner />
      </LoadWhenArmTokenIsLoaded>
    </QueryClientProvider>
  );
};
