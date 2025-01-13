import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/DevToolbox';
import { TemplatesStandaloneDesigner } from './TemplatesStandaloneDesigner';
import { useIsLocal } from '../../designer/state/workflowLoadingSelectors';
import { loadToken } from '../../environments/environment';

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
        <div style={{ height: '100vh' }}>{isLocal ? <div>this is local</div> : <TemplatesStandaloneDesigner />}</div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
