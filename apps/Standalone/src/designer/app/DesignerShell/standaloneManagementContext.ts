import { createContext, useContext } from 'react';
import type { StandardManagementHttpClient } from '@microsoft/logic-apps-shared';

interface StandaloneManagement {
  client?: StandardManagementHttpClient;
}

export const StandaloneManagementContext = createContext<StandaloneManagement>({});

export function useStandaloneManagementClient(): StandaloneManagement {
  return useContext(StandaloneManagementContext);
}
