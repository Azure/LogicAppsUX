import React from 'react';

export interface DesignerOptionsContext {
  readOnly?: boolean;
  servicesInitialized?: boolean;
}

export const ProviderWrappedContext = React.createContext<DesignerOptionsContext | null>(null);
