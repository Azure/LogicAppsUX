import React from 'react';

export interface DesignerOptions {
  readOnly?: boolean;
  servicesInitialized?: boolean;
}

export const ProviderWrappedContext = React.createContext<DesignerOptions | null>(null);
