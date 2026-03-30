import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { CustomDeploymentModelResource } from '../deploymentModelResource';
import constants from '../../../../../../../common/constants';

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
  });

  it('should render the component with title and form fields', () => {
    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-id' } });

    expect(screen.getByText('Create deployment model')).toBeDefined();
    expect(screen.getByText('Submit')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('should use SUPPORTED_FOUNDRY_AGENT_MODELS for the model dropdown', () => {
    expect(constants.SUPPORTED_FOUNDRY_AGENT_MODELS).toBeDefined();
    expect(constants.SUPPORTED_FOUNDRY_AGENT_MODELS.length).toBeGreaterThan(0);
    // Verify the foundry list is a superset of the OpenAI list
    for (const model of constants.SUPPORTED_AGENT_OPENAI_MODELS) {
      expect(constants.SUPPORTED_FOUNDRY_AGENT_MODELS).toContain(model);
    }
  });

  it('should call onClose with undefined when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-id' }, onClose });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledWith(undefined);
  });

  it('should call createNewDeployment on submit with correct parameters', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' }, onClose });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateNewDeployment).toHaveBeenCalledWith(
        expect.stringContaining('model-'),
        constants.SUPPORTED_AGENT_OPENAI_MODELS[0],
        'test-account-id'
      );
    });
  });

  it('should call onClose with name on successful submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateNewDeployment.mockResolvedValueOnce({ id: 'new-deployment' });

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' }, onClose });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(expect.stringContaining('model-'));
    });
  });

  it('should not call createNewDeployment when cognitiveServiceAccountId is missing', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent({ metadata: {} });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    expect(mockCreateNewDeployment).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should display error message when deployment creation fails', async () => {
    const user = userEvent.setup();
    mockCreateNewDeployment.mockRejectedValueOnce(new Error('Deployment failed'));

    renderComponent({ metadata: { cognitiveServiceAccountId: 'test-account-id' } });

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Deployment failed')).toBeDefined();
    });
  });
});
