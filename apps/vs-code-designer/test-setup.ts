import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  // mock implementation or empty object
}));

vi.mock('@microsoft/vscode-azext-azureauth', () => ({
  getSessionFromVSCode: vi.fn(() => Promise.resolve({})), // example of a mocked function
}));

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    AzureWizardExecuteStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizardPromptStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    nonNullProp: vi.fn(),
    nonNullValue: vi.fn(),
  };
});

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  chmodSync: vi.fn(),
  createWriteStream: vi.fn(),
}));

vi.mock('axios');

vi.mock('vscode', () => ({
  window: {},
  workspace: {
    workspaceFolders: [],
  },
}));
