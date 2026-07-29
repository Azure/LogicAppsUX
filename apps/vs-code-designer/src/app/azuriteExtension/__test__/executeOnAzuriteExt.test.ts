import { beforeEach, describe, expect, it, vi } from 'vitest';
import { azuriteExtensionId, extensionCommand } from '../../../constants';
import { AzuriteExtensionTerminalError } from '../azuriteErrors';
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
    // Set explicitly: clearAllMocks resets calls, not implementations, so a rejection configured by
    // one test would otherwise leak into every test that runs after it.
    vscodeMocks.executeCommand.mockResolvedValue(undefined);
    context.telemetry.properties = {};
  });

  it('throws a startup error when the Azurite extension is unavailable', async () => {
    vscodeMocks.getExtension.mockReturnValue(undefined);

    const error = await executeOnAzurite(context, extensionCommand.azureAzuriteStart).catch((thrown) => thrown);

    // Producer-side tag assertion. Without it the class could be dropped here and activateAzurite's
    // terminal-cause tests would still pass, because they construct the error themselves.
    expect(error).toBeInstanceOf(AzuriteExtensionTerminalError);
    expect(error.message).toContain('Azurite extension is not installed or is unavailable in the current VS Code extension host.');
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

  it('forwards caller arguments verbatim instead of collapsing them into an object', async () => {
    vscodeMocks.getExtension.mockReturnValue({
      isActive: true,
      activate: vi.fn(),
    });

    await executeOnAzurite(context, extensionCommand.azureAzuriteStart, 'first', { second: true });

    // Spreading the rest array into an object literal would emit
    // ({ 0: 'first', 1: { second: true } }) as a single argument.
    expect(vscodeMocks.executeCommand).toHaveBeenCalledWith(extensionCommand.azureAzuriteStart, 'first', { second: true });
  });

  it('throws a startup error when the Azurite extension fails activation', async () => {
    vscodeMocks.getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => {
        throw new Error('activation failed');
      }),
    });

    const error = await executeOnAzurite(context, extensionCommand.azureAzuriteStart).catch((thrown) => thrown);

    // Producer-side tag assertion, as above.
    expect(error).toBeInstanceOf(AzuriteExtensionTerminalError);
    expect(error.message).toContain('Azurite extension could not be activated.');
    expect(vscodeMocks.executeCommand).not.toHaveBeenCalled();
    expect(context.telemetry.properties.azuriteExtensionAvailable).toBe('true');
    expect(context.telemetry.properties.azuriteExtensionActive).toBe('false');
  });

  it('does not tag a rejected azurite.start command as terminal', async () => {
    // The third-party extension rejects `azurite.start` when the port is already bound -- which is
    // what a healthy emulator serving another debug session looks like. That is recoverable, so it
    // must NOT carry the terminal tag, or activateAzurite would report it as the cause and mask a
    // perfectly working setup.
    vscodeMocks.getExtension.mockReturnValue({ isActive: true, activate: vi.fn() });
    vscodeMocks.executeCommand.mockRejectedValue(new Error('port 10000 is already in use'));

    const error = await executeOnAzurite(context, extensionCommand.azureAzuriteStart).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AzuriteExtensionTerminalError);
    expect(error.message).toContain('port 10000 is already in use');
    expect(context.telemetry.properties.azuriteStartCommandIssued).toBe('true');
  });
});
