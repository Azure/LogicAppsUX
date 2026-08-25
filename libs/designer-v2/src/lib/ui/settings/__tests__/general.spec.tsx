/**
 * @vitest-environment jsdom
 */
import type { GeneralSectionProps } from '../sections/general';
import { General } from '../sections/general';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isTrigger: true,
  useNodeMetadata: vi.fn(),
  useOperationInfo: vi.fn(),
  useOutputParameters: vi.fn(),
  getSplitOnOptions: vi.fn(),
  operationManifestIsSupported: vi.fn(),
}));

vi.mock('../../../core', () => ({
  useNodeMetadata: (...args: unknown[]) => mocks.useNodeMetadata(...args),
  useOperationInfo: (...args: unknown[]) => mocks.useOperationInfo(...args),
}));

vi.mock('../../../core/state/selectors/actionMetadataSelector', () => ({
  useOutputParameters: (...args: unknown[]) => mocks.useOutputParameters(...args),
}));

vi.mock('../../../core/utils/outputs', () => ({
  getSplitOnOptions: (...args: unknown[]) => mocks.getSplitOnOptions(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    OperationManifestService: () => ({
      isSupported: (...args: unknown[]) => mocks.operationManifestIsSupported(...args),
    }),
  };
});

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    getSettingLabel: (label: string) => label,
  };
});

vi.mock('../settingsection', () => ({
  SettingsSection: ({ settings }: { settings: any[] }) => {
    const concurrencyToggle = settings.find(
      (setting) => setting.settingType === 'SettingToggle' && setting.settingProp?.ariaLabel === 'Limit'
    );

    if (!concurrencyToggle) {
      return null;
    }

    return (
      <button
        type="button"
        aria-pressed={concurrencyToggle.settingProp.checked ? 'true' : 'false'}
        onClick={() => concurrencyToggle.settingProp.onToggleInputChange(undefined, !concurrencyToggle.settingProp.checked)}
      >
        {concurrencyToggle.settingProp.ariaLabel}
      </button>
    );
  },
}));

const concurrencyDialogTitle = 'Enable concurrency control?';
const concurrencyDialogMessage = "After you turn on concurrency control and publish the workflow, this setting can't be changed.";
const concurrencyToggleName = 'Limit';
const enableButtonName = 'Enable';

const createProps = (overrides: Partial<GeneralSectionProps> = {}): GeneralSectionProps =>
  ({
    nodeId: 'node-1',
    readOnly: false,
    expanded: true,
    splitOn: { isSupported: false, value: { enabled: false, value: '' } },
    splitOnConfiguration: { correlation: { clientTrackingId: '' } },
    timeout: { isSupported: false, value: '' },
    count: { isSupported: false, value: '' },
    concurrency: { isSupported: true, value: { enabled: false, runs: 25, maximumWaitingRuns: 10 } },
    conditionExpressions: { isSupported: false, value: [] },
    invokerConnection: { isSupported: false, value: { enabled: false } },
    maximumWaitingRunsMetadata: { min: 1, max: 100 },
    shouldFailOperation: { isSupported: false, value: false },
    onConcurrencyToggle: vi.fn(),
    onConcurrencyRunValueChange: vi.fn(),
    onConcurrencyMaxWaitRunChange: vi.fn(),
    onInvokerConnectionToggle: vi.fn(),
    onSplitOnToggle: vi.fn(),
    onSplitOnSelectionChanged: vi.fn(),
    onTimeoutValueChange: vi.fn(),
    onTriggerConditionsChange: vi.fn(),
    onClientTrackingIdChange: vi.fn(),
    onCountValueChange: vi.fn(),
    onShouldFailOperationToggle: vi.fn(),
    onHeaderClick: vi.fn(),
    validationErrors: [],
    ...overrides,
  }) as GeneralSectionProps;

const renderGeneral = (overrides: Partial<GeneralSectionProps> = {}) => {
  const props = createProps(overrides);
  return { ...render(<General {...props} />), props };
};

const getConcurrencyToggle = () => screen.getByRole('button', { name: concurrencyToggleName });

describe('ui/settings/sections/general', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrigger = true;
    mocks.useNodeMetadata.mockImplementation(() => ({ isTrigger: mocks.isTrigger }));
    mocks.useOperationInfo.mockReturnValue({ type: 'test-type', kind: 'test-kind' });
    mocks.useOutputParameters.mockReturnValue([]);
    mocks.getSplitOnOptions.mockReturnValue([]);
    mocks.operationManifestIsSupported.mockReturnValue(false);
  });

  it('should show a confirmation dialog before enabling trigger concurrency', async () => {
    const user = userEvent.setup();
    const { props } = renderGeneral();

    await user.click(getConcurrencyToggle());

    expect(props.onConcurrencyToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: concurrencyDialogTitle })).toBeInTheDocument();
    expect(screen.getByText(concurrencyDialogMessage)).toBeInTheDocument();
  });

  it('should keep trigger concurrency off when the confirmation dialog is canceled', async () => {
    const user = userEvent.setup();
    const { props } = renderGeneral();

    await user.click(getConcurrencyToggle());
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog', { name: concurrencyDialogTitle })).not.toBeInTheDocument();
    });

    expect(props.onConcurrencyToggle).not.toHaveBeenCalled();
    expect(getConcurrencyToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('should enable trigger concurrency after confirmation', async () => {
    const user = userEvent.setup();
    const { props } = renderGeneral();

    await user.click(getConcurrencyToggle());
    await user.click(screen.getByRole('button', { name: enableButtonName }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog', { name: concurrencyDialogTitle })).not.toBeInTheDocument();
    });

    expect(props.onConcurrencyToggle).toHaveBeenCalledTimes(1);
    expect(props.onConcurrencyToggle).toHaveBeenCalledWith(true);
  });

  it('should enable action concurrency immediately without a confirmation dialog', async () => {
    const user = userEvent.setup();
    mocks.isTrigger = false;
    const { props } = renderGeneral();

    await user.click(getConcurrencyToggle());

    expect(screen.queryByRole('alertdialog', { name: concurrencyDialogTitle })).not.toBeInTheDocument();
    expect(props.onConcurrencyToggle).toHaveBeenCalledTimes(1);
    expect(props.onConcurrencyToggle).toHaveBeenCalledWith(true);
  });

  it('should disable trigger concurrency immediately without a confirmation dialog', async () => {
    const user = userEvent.setup();
    const { props } = renderGeneral({
      concurrency: { isSupported: true, value: { enabled: true, runs: 25, maximumWaitingRuns: 10 } } as any,
    });

    await user.click(getConcurrencyToggle());

    expect(screen.queryByRole('alertdialog', { name: concurrencyDialogTitle })).not.toBeInTheDocument();
    expect(props.onConcurrencyToggle).toHaveBeenCalledTimes(1);
    expect(props.onConcurrencyToggle).toHaveBeenCalledWith(false);
  });
});
