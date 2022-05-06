import React from 'react';

export interface DesignerOptionsContext {
  readOnly?: boolean;
  servicesInitialized?: boolean;
  getToken: () => string;
}

export const ProviderWrappedContext = React.createContext<DesignerOptionsContext | null>(null);
