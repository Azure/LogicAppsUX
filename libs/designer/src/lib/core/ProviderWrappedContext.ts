import type { ServiceOptions } from './actions/bjsworkflow/initialize';
import { createContext } from 'react';

export interface DesignerOptionsContext {
  readOnly?: boolean;
  servicesInitialized?: boolean;
  services: ServiceOptions;
}

export const ProviderWrappedContext = createContext<DesignerOptionsContext | null>(null);
