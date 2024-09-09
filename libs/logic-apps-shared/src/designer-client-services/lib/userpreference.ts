/**
 * The user preference service.
 */
export interface IUserPreferenceService {
  /**
   * Sets most recently used connection id for the specified connector.
   * @arg {string} connectorId - The connector id.
   * @arg {string} connectionId - The connection id.
   */
  setMostRecentlyUsedConnectionId(connectorId: string, connectionId: string): void;

  /**
   * Gets most recently used connection id for the specified connector.
   * @arg {string} connectorId - The connector id.
   * @return {string | null | undefined}
   */
  getMostRecentlyUsedConnectionId(connectorId: string): string | undefined;
}

let service: IUserPreferenceService;

export const InitUserPreferenceService = (preferenceService: IUserPreferenceService): void => {
  service = preferenceService;
};

export const UserPreferenceService = (): IUserPreferenceService => {
  return service;
};
