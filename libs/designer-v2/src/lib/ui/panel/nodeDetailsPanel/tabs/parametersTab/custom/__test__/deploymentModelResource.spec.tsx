import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { CustomDeploymentModelResource } from '../deploymentModelResource';

const mockCreateNewDeployment = vi.fn();
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    CognitiveServiceService: () => ({
      createNewDeployment: mockCreateNewDeployment,
    }),
    customLengthGuid: () => 'abcde',
    guid: () => 'test-guid',
    LoggerService: () => ({ log: vi.fn() }),
  };
});

// The picker reads the account's deployable-model catalog via this hook; drive it per test.
let mockAvailableModels: any[] = [];
let mockIsLoading = false;
vi.mock('../../../../../connectionsPanel/createConnection/custom/useCognitiveService', () => ({
  useAvailableModelsForAccount: (serviceAccountId) => ({ data: serviceAccountId ? mockAvailableModels : [], isLoading: mockIsLoading }),
}));

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    makeStyles: () => () => ({
      rowContainer: 'row-container',
      containerTitle: 'container-title',
      buttonContainer: 'button-container',
      errorMessageText: 'error-message-text',
    }),
  };
});

const catalogEntry = (
  name: string,
  version: string,
  format: string,
  chatCompletion: string | boolean | undefined,
  lifecycleStatus?: string
) => ({
  model: { name, version, format, capabilities: chatCompletion === undefined ? {} : { chatCompletion }, lifecycleStatus },
});

const OPENAI_CATALOG = [
  catalogEntry('gpt-4o', '2024-11-20', 'OpenAI', 'true'),
  catalogEntry('gpt-5.6-luna', '2026-07-09', 'OpenAI', 'true'),
  catalogEntry('text-embedding-3-large', '1', 'OpenAI', 'false'),
  catalogEntry('deprecated-gpt', '2020-01-01', 'OpenAI', 'true', 'Deprecated'),
  catalogEntry('Llama-3.3', '1', 'Meta', 'true'),
];

function renderComponent(props: { metadata?: Record<string, any>; onClose?: (val?: string) => void }) {
  return render(
    <IntlProvider locale="en" defaultLocale="en">
      <CustomDeploymentModelResource initialValue={[]} onChange={vi.fn()} metadata={props.metadata} onClose={props.onClose} />
    </IntlProvider>
  );
}

describe('CustomDeploymentModelResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAvailableModels = OPENAI_CATALOG;
    mockIsLoading = false;
  });

  it('should render the component with title and form fields', () => {
    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-id' } });

    expect(screen.getByText('Create deployment model')).toBeDefined();
    expect(screen.getByText('Submit')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('should call onClose with undefined when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-id' }, onClose });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledWith(undefined);
  });

  it('should create a deployment from the account catalog, passing the selected model name/version/format', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    // Strips the /models suffix from the account id.
    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id/models' }, onClose });

    const submitButton = screen.getByText('Submit');
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
    await user.click(submitButton);

    await waitFor(() => {
      // Default selection is the first Azure OpenAI chat model alphabetically (gpt-4o);
      // embeddings, deprecated, and non-OpenAI-format models are filtered out.
      expect(mockCreateNewDeployment).toHaveBeenCalledWith('model-abcde', 'gpt-4o', 'test-account-id', {
        name: 'gpt-4o',
        version: '2024-11-20',
        format: 'OpenAI',
      });
    });
  });

  it('should allow non-OpenAI (Foundry) chat models', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockAvailableModels = [catalogEntry('Llama-3.3', '2025-01-01', 'Meta', 'true')];
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id', agentModelType: 'MicrosoftFoundry' }, onClose });

    const submitButton = screen.getByText('Submit');
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateNewDeployment).toHaveBeenCalledWith('model-abcde', 'Llama-3.3', 'test-account-id', {
        name: 'Llama-3.3',
        version: '2025-01-01',
        format: 'Meta',
      });
    });
  });

  it('should exclude non-OpenAI-format models for Azure OpenAI accounts', async () => {
    const user = userEvent.setup();
    mockAvailableModels = [catalogEntry('Llama-3.3', '2025-01-01', 'Meta', 'true')];

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' } });

    // No OpenAI-format chat model in the catalog -> nothing to deploy -> Submit disabled.
    const submitButton = screen.getByText('Submit') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    await user.click(submitButton);
    expect(mockCreateNewDeployment).not.toHaveBeenCalled();
  });

  it('should prefer the catalog default version when a model has multiple versions', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    // A higher version string that is NOT the default, plus the flagged default version.
    mockAvailableModels = [
      {
        model: {
          name: 'gpt-4o',
          version: '2099-01-01',
          format: 'OpenAI',
          capabilities: { chatCompletion: 'true' },
          isDefaultVersion: false,
        },
      },
      {
        model: {
          name: 'gpt-4o',
          version: '2024-11-20',
          format: 'OpenAI',
          capabilities: { chatCompletion: 'true' },
          isDefaultVersion: true,
        },
      },
    ];
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' }, onClose });

    const submitButton = screen.getByText('Submit');
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateNewDeployment).toHaveBeenCalledWith('model-abcde', 'gpt-4o', 'test-account-id', {
        name: 'gpt-4o',
        version: '2024-11-20',
        format: 'OpenAI',
      });
    });
  });

  it('should exclude models not deployable with the GlobalStandard SKU', async () => {
    const user = userEvent.setup();
    mockAvailableModels = [
      {
        model: {
          name: 'gpt-4o',
          version: '2024-11-20',
          format: 'OpenAI',
          capabilities: { chatCompletion: 'true' },
          skus: [{ name: 'ProvisionedManaged' }],
        },
      },
    ];

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' } });

    const submitButton = screen.getByText('Submit') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    await user.click(submitButton);
    expect(mockCreateNewDeployment).not.toHaveBeenCalled();
  });

  it('should call onClose with name on successful submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' }, onClose });

    const submitButton = screen.getByText('Submit');
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
    await user.click(submitButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(expect.stringContaining('model-'));
    });
  });

  it('should not create a deployment when cognitiveServiceAccountId is missing', async () => {
    const user = userEvent.setup();

    renderComponent({ metadata: {} });

    const submitButton = screen.getByText('Submit') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    await user.click(submitButton);

    expect(mockCreateNewDeployment).not.toHaveBeenCalled();
  });

  it('should display error message when deployment creation fails', async () => {
    const user = userEvent.setup();
    mockCreateNewDeployment.mockRejectedValueOnce(new Error('Deployment failed'));

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' } });

    const submitButton = screen.getByText('Submit');
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Deployment failed')).toBeDefined();
    });
  });
});
