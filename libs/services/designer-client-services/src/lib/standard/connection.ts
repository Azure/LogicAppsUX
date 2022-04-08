import type { IConnectionService } from '../connection';
import type { Connector } from '@microsoft-logic-apps/utils';

export class StandardConnectionService implements IConnectionService {
  constructor(public readonly options: unknown) {}

  dispose(): void {
    return;
  }

  async getConnector(_connectorId: string): Promise<Connector> {
    // TODO(psamband): To be implemented
    return {} as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}
