import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMessage: string) => defaultMessage,
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardPromptStep: class AzureWizardPromptStep {},
  parseError: (error: any) => ({
    isUserCancelledError: error?.isUserCancelledError === true,
    message: error?.message ?? String(error),
  }),
}));

import { AuthenticationMethodSelectionStep } from '../authenticationMethodStep';

describe('AuthenticationMethodSelectionStep', () => {
  let context: any;

  beforeEach(() => {
    context = {
      enabled: true,
      telemetry: { properties: {}, measurements: {} },
      ui: {
        showQuickPick: vi.fn(),
      },
    };
  });

  it('defaults to connection keys when the authentication prompt is cancelled', async () => {
    context.ui.showQuickPick.mockRejectedValue({ isUserCancelledError: true });

    await new AuthenticationMethodSelectionStep().prompt(context);

    expect(context.authenticationMethod).toBe('rawKeys');
    expect(context.telemetry.properties.authenticationMethodDefaulted).toBe('rawKeys');
  });

  it('keeps explicit Managed Service Identity selections', async () => {
    context.ui.showQuickPick.mockResolvedValue({ data: 'managedServiceIdentity' });

    await new AuthenticationMethodSelectionStep().prompt(context);

    expect(context.authenticationMethod).toBe('managedServiceIdentity');
  });

  it('keeps explicit connection-key selections', async () => {
    context.ui.showQuickPick.mockResolvedValue({ data: 'rawKeys' });

    await new AuthenticationMethodSelectionStep().prompt(context);

    expect(context.authenticationMethod).toBe('rawKeys');
  });

  it('does not prompt when Azure connectors are disabled', () => {
    context.enabled = false;

    expect(new AuthenticationMethodSelectionStep().shouldPrompt(context)).toBe(false);
  });

  it('rethrows non-cancellation errors', async () => {
    context.ui.showQuickPick.mockRejectedValue(new Error('quick pick failed'));

    await expect(new AuthenticationMethodSelectionStep().prompt(context)).rejects.toThrow('quick pick failed');
  });
});
