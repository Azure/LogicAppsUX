/**
 * @vitest-environment jsdom
 */
import type { SecuritySectionProps } from '../sections/security';
import { Security } from '../sections/security';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../core', () => ({
  useOperationInfo: () => ({ type: 'HttpWebhook' }),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    getSettingLabel: (label: string) => label,
  };
});

vi.mock('../settingsection', () => ({
  SettingsSection: ({ settings }: { settings: any[] }) => (
    <>
      {settings
        .filter((setting) => setting.visible)
        .map((setting) => (
          <button
            key={setting.settingProp.ariaLabel}
            type="button"
            aria-pressed={setting.settingProp.checked ? 'true' : 'false'}
            onClick={() => setting.settingProp.onToggleInputChange(undefined, !setting.settingProp.checked)}
          >
            {setting.settingProp.ariaLabel}
          </button>
        ))}
    </>
  ),
}));

const createProps = (overrides: Partial<SecuritySectionProps> = {}): SecuritySectionProps => ({
  nodeId: 'webhook-action',
  readOnly: false,
  expanded: true,
  secureInputs: { isSupported: true, value: false },
  secureOutputs: { isSupported: true, value: false },
  secureErrorResponse: { isSupported: true, value: false },
  onSecureInputsChange: vi.fn(),
  onSecureOutputsChange: vi.fn(),
  onSecureErrorResponseChange: vi.fn(),
  onHeaderClick: vi.fn(),
  ...overrides,
});

describe('ui/settings/sections/security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and changes Secure error responses independently', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<Security {...props} />);

    const toggle = screen.getByRole('button', { name: 'Secure error responses' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(props.onSecureErrorResponseChange).toHaveBeenCalledWith(true);
    expect(props.onSecureInputsChange).not.toHaveBeenCalled();
    expect(props.onSecureOutputsChange).not.toHaveBeenCalled();
  });

  it('does not render Secure error responses when it is unsupported', () => {
    render(<Security {...createProps({ secureErrorResponse: { isSupported: false, value: true } })} />);

    expect(screen.queryByRole('button', { name: 'Secure error responses' })).not.toBeInTheDocument();
  });
});
