import type { Connector } from './common/models/connector';

export interface ConnectionService {
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
}
