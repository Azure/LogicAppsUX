import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/DevToolbox';
import { loadToken } from '../../environments/environment';
import { KnowledgeHub } from './KnowledgeHub';
const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const KnowledgeHubWrapper = () => {
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <div style={{ height: '100vh' }}>
          <KnowledgeHub />
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
