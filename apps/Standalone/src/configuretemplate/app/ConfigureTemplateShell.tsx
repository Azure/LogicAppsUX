import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { loadToken } from '../../environments/environment';
import { LocalConfigureTemplate } from './LocalConfigureTemplate';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const ConfigureTemplateWrapper = () => {
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <div style={{ height: '100vh' }}>
          <LocalConfigureTemplate /> {/* local only for now until template resource is created */}
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
