import React from 'react';

export interface DesignerOptionsContext {
  readOnly?: boolean;
  servicesInitialized?: boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  getToken: Function;
}

export const ProviderWrappedContext = React.createContext<DesignerOptionsContext | null>(null);
