import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { loadToken } from '../../environments/environment';
import { LocalCustomTemplates } from './LocalCustomTemplates';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const CustomTemplatesWrapper = () => {
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <div style={{ height: '100vh' }}>
          <LocalCustomTemplates /> {/* local only for now until template resource is created */}
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
