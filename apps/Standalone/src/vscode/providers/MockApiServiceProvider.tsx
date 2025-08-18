import type React from 'react';
import { createContext, useContext, type ReactNode } from 'react';
import { MockApiService } from '../services/MockApiService';
import type { IApiService } from '../../../../../vs-code-react/src/run-service/types';

// Create a context for the API service
const ApiServiceContext = createContext<IApiService | null>(null);

// Create a mock API service instance
const mockApiService = new MockApiService();

export const MockApiServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <ApiServiceContext.Provider value={mockApiService}>{children}</ApiServiceContext.Provider>;
};

export const useApiService = (): IApiService => {
  const apiService = useContext(ApiServiceContext);
  if (!apiService) {
    throw new Error('useApiService must be used within a MockApiServiceProvider');
  }
  return apiService;
};

// Global override for the ApiService import
// This allows the VS Code components to use our mock service
if (typeof window !== 'undefined') {
  (window as any).__mockApiService = mockApiService;
}
