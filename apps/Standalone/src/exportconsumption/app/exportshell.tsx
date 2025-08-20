import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/devtoolbox';
import { loadToken } from '../../environments/environment';
import { ExportConsumption } from './exportconsumption';
const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const ExportConsumptionWrapper = () => {
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <div style={{ height: '100vh' }}>
          <ExportConsumption />
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
