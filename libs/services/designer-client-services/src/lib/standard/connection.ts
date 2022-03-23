import type { Connector } from '../common/models/connector';
import type { IConnectionService } from '../connection';

export class StandardConnectionService implements IConnectionService {
  constructor(public readonly options: unknown) {}

  dispose(): void {
    // tslint:disable-line: no-empty
  }

  async getConnector(connectorId: string): Promise<Connector> {
    // TODO(psamband): To be implemented
    return {} as any;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}
