import { MockApiService } from '../services/MockApiService';
import type { IApiService } from '../../../../../vs-code-react/src/run-service/types';

// Create a mock service instance
const mockService = new MockApiService();

// Define the ApiServiceOptions interface to match the original
export interface ApiServiceOptions {
  baseUrl?: string;
  accessToken?: string;
  cloudHost?: string;
  vscodeContext: any;
}

// Override the ApiService class for standalone environment
export class ApiService implements IApiService {
  constructor(options: ApiServiceOptions) {
    // In standalone mode, we ignore the options and use our mock
    console.log('🚀 Using Mock API Service for standalone development', options);
  }

  async getWorkflows(subscriptionId: string, iseId?: string, location?: string) {
    return mockService.getWorkflows(subscriptionId, iseId, location);
  }

  async getSubscriptions() {
    return mockService.getSubscriptions();
  }

  async getIse(selectedSubscription: string) {
    return mockService.getIse(selectedSubscription);
  }

  async getRegions(subscriptionId: string) {
    return mockService.getRegions(subscriptionId);
  }

  async validateWorkflows(selectedWorkflows: any[], selectedSubscription: string, selectedLocation: string, selectedAdvanceOptions: any[]) {
    return mockService.validateWorkflows(selectedWorkflows, selectedSubscription, selectedLocation, selectedAdvanceOptions);
  }

  async exportWorkflows(selectedWorkflows: any[], selectedSubscription: string, selectedLocation: string, selectedAdvanceOptions: any[]) {
    return mockService.exportWorkflows(selectedWorkflows, selectedSubscription, selectedLocation, selectedAdvanceOptions);
  }
}

// Export exactly as the original module does - named export only
// No default export in the original
