import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/DevToolbox';
import { TemplatesStandalone } from './TemplatesStandalone';
import { useIsLocal } from '../../designer/state/workflowLoadingSelectors';
import { loadToken } from '../../environments/environment';
import { LocalTemplatesStandalone } from './LocalTemplatesStandalone';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesDesignerWrapper = () => {
  const isLocal = useIsLocal();

  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <div style={{ height: '100vh' }}>{isLocal ? <LocalTemplatesStandalone /> : <TemplatesStandalone />}</div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
