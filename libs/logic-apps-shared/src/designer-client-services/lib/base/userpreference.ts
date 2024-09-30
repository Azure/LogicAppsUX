import type { IUserPreferenceService } from '../userpreference';

/**
 * The default user preference service.
 */
export class BaseUserPreferenceService implements IUserPreferenceService {
  private _store: Storage | undefined;

  constructor() {
    this._store = typeof Storage !== 'undefined' ? localStorage : undefined;
  }

  /**
   * Gets the most recently used connection id for the specified connector.
   * @arg {string} connectorId - The connector id.
   * @return {Promise<string | undefined>}
   */
  getMostRecentlyUsedConnectionId(connectorId: string): string | undefined {
    return this._store?.getItem(connectorId.toLowerCase()) ?? undefined;
  }

  /**
   * Sets the most recently used connection id for the specified connector.
   * @arg {string} connectorId - The connector id.
   * @arg {string} connectionId - The connection id.
   * @return {Promise<string>}
   */
  setMostRecentlyUsedConnectionId(connectorId: string, connectionId: string) {
    this._store?.setItem(connectorId.toLowerCase(), connectionId);
  }
}
