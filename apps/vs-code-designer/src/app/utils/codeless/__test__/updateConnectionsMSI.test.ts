import { describe, it, expect } from 'vitest';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { updateAuthenticationParameters, updateAuthenticationInConnections } from '../../codeless/connection';

describe('connections/auth updates', () => {
  describe('updateAuthenticationParameters', () => {
    it('Should update parameters.json values for all managed API connections and set telemetry', async () => {
      const connectionsData: ConnectionsData = {
        managedApiConnections: {
          msnweather: {} as any,
          office365: {} as any,
        },
      };

      const parametersJson: any = {
        'msnweather-Authentication': { value: { type: 'Raw', scheme: 'Key' } },
        'office365-Authentication': { value: { type: 'Raw', scheme: 'Key' } },
      };

      const authValue = { type: 'ManagedServiceIdentity' };

      const actionContext: any = {
        telemetry: { properties: {} },
      };

      await updateAuthenticationParameters(connectionsData, authValue, parametersJson, actionContext);

      expect(parametersJson['msnweather-Authentication'].value).toEqual(authValue);
      expect(parametersJson['office365-Authentication'].value).toEqual(authValue);

      expect(actionContext.telemetry.properties.updateAuth).toBe('updated "office365-Authentication" parameter to ManagedServiceIdentity');
    });

    it('Should do nothing when managedApiConnections is empty', async () => {
      const connectionsData: ConnectionsData = {
        managedApiConnections: {},
      };

      const parametersJson: any = {};
      const authValue = { type: 'ManagedServiceIdentity' };

      const actionContext: any = {
        telemetry: { properties: {} },
      };

      await updateAuthenticationParameters(connectionsData, authValue, parametersJson, actionContext);

      // No keys updated, no telemetry set
      expect(Object.keys(parametersJson).length).toBe(0);
      expect(actionContext.telemetry.properties.updateAuth).toBeUndefined();
    });

    it('Should not throw when actionContext is undefined', async () => {
      const connectionsData: ConnectionsData = {
        managedApiConnections: {
          api1: {} as any,
        },
      };

      const parametersJson: any = {
        'api1-Authentication': { value: { type: 'Raw', scheme: 'Key' } },
      };

      const authValue = { type: 'ManagedServiceIdentity' };

      await updateAuthenticationParameters(connectionsData, authValue, parametersJson /* no ctx */);

      expect(parametersJson['api1-Authentication'].value).toEqual(authValue);
    });
  });

  describe('updateAuthenticationInConnections', () => {
    it('Should write authentication directly into each managed API connection and set telemetry', async () => {
      const connectionsData: ConnectionsData = {
        managedApiConnections: {
          storage: { authentication: { type: 'Raw', scheme: 'Key' } } as any,
          keyvault: { authentication: { type: 'Raw', scheme: 'Key' } } as any,
        },
      };

      const authValue = { type: 'ManagedServiceIdentity' };

      const actionContext: any = {
        telemetry: { properties: {} },
      };

      await updateAuthenticationInConnections(connectionsData, authValue, actionContext);

      expect(connectionsData.managedApiConnections!.storage.authentication).toEqual(authValue);
      expect(connectionsData.managedApiConnections!.keyvault.authentication).toEqual(authValue);

      expect(actionContext.telemetry.properties.updateAuth).toBe('updated "keyvault" connection authentication to ManagedServiceIdentity');
    });

    it('Should do nothing when managedApiConnections is missing', async () => {
      const connectionsData = {} as ConnectionsData;
      const authValue = { type: 'ManagedServiceIdentity' };

      const actionContext: any = {
        telemetry: { properties: {} },
      };

      await updateAuthenticationInConnections(connectionsData, authValue, actionContext);

      expect(actionContext.telemetry.properties.updateAuth).toBeUndefined();
    });

    it('Should not throw when actionContext is undefined', async () => {
      const connectionsData: ConnectionsData = {
        managedApiConnections: {
          contoso: { authentication: { type: 'Raw', scheme: 'Key' } } as any,
        },
      };

      const authValue = { type: 'ManagedServiceIdentity' };

      await updateAuthenticationInConnections(connectionsData, authValue /* no ctx */);

      expect(connectionsData.managedApiConnections!.contoso.authentication).toEqual(authValue);
    });
  });
});
