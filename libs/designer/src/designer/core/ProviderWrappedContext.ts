import type { ServiceOptions } from './state/designerOptions/designerOptionsInterfaces';
import { createContext } from 'react';

export const ProviderWrappedContext = createContext<ServiceOptions | null>(null);
