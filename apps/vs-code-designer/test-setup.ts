import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  // mock implementation or empty object
}));

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    AzureWizardExecuteStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizardPromptStep: vi.fn().mockImplementation(() => {
      return {};
    }),
  };
});
