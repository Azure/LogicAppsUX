import { beforeEach, describe, expect, it, vi } from 'vitest';
import { azuriteExtensionId, extensionCommand } from '../../../constants';
import { executeOnAzurite } from '../executeOnAzuriteExt';

const vscodeMocks = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  getExtension: vi.fn(),
}));

vi.mock('vscode', () => ({
  commands: {
    executeCommand: vscodeMocks.executeCommand,
  },
  extensions: {
    getExtension: vscodeMocks.getExtension,
  },
}));

describe('executeOnAzurite', () => {
  const context = {
    telemetry: {
      properties: {},
      measurements: {},
    },
    ui: {
      showWarningMessage: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    context.telemetry.properties = {};
  });

  it('throws a startup error when the Azurite extension is unavailable', async () => {
    vscodeMocks.getExtension.mockReturnValue(undefined);

    await expect(executeOnAzurite(context, extensionCommand.azureAzuriteStart)).rejects.toThrow(
      'Azurite extension is not installed or is unavailable in the current VS Code extension host.'
    );

    expect(vscodeMocks.getExtension).toHaveBeenCalledWith(azuriteExtensionId);
    expect(vscodeMocks.executeCommand).not.toHaveBeenCalled();
    expect(context.ui.showWarningMessage).not.toHaveBeenCalled();
    expect(context.telemetry.properties.azuriteExtensionAvailable).toBe('false');
  });

  it('activates the Azurite extension before issuing the start command', async () => {
    const activate = vi.fn(async () => undefined);
    vscodeMocks.getExtension.mockReturnValue({
      isActive: false,
      activate,
    });

    await executeOnAzurite(context, extensionCommand.azureAzuriteStart);

    expect(activate).toHaveBeenCalledTimes(1);
    expect(vscodeMocks.executeCommand).toHaveBeenCalledWith(extensionCommand.azureAzuriteStart, {});
    expect(context.telemetry.properties.azuriteExtensionAvailable).toBe('true');
    expect(context.telemetry.properties.azuriteExtensionActive).toBe('true');
    expect(context.telemetry.properties.azuriteStartCommandIssued).toBe('true');
  });

  it('throws a startup error when the Azurite extension fails activation', async () => {
    vscodeMocks.getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => {
        throw new Error('activation failed');
      }),
    });

    await expect(executeOnAzurite(context, extensionCommand.azureAzuriteStart)).rejects.toThrow(
      'Azurite extension could not be activated.'
    );

    expect(vscodeMocks.executeCommand).not.toHaveBeenCalled();
    expect(context.telemetry.properties.azuriteExtensionAvailable).toBe('true');
    expect(context.telemetry.properties.azuriteExtensionActive).toBe('false');
  });
});
