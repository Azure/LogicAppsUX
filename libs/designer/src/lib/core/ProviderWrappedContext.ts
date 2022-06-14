import type { ServiceOptions } from './state/designerOptionsSlice';
import { createContext } from 'react';

export const ProviderWrappedContext = createContext<ServiceOptions | null>(null);
