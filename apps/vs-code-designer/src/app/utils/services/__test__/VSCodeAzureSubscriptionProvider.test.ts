import { describe, it, expect, vi } from 'vitest';
import { createVSCodeAzureSubscriptionProviderFactory } from '../VSCodeAzureSubscriptionProvider';
import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';

describe('createVSCodeAzureSubscriptionProviderFactory', () => {
  // Test that the factory returns an instance of VSCodeAzureSubscriptionProvider
  it('should return an instance of VSCodeAzureSubscriptionProvider', () => {
    const instance = createVSCodeAzureSubscriptionProviderFactory();
    expect(instance).toBeInstanceOf(VSCodeAzureSubscriptionProvider);
  });

  // Test that multiple calls return the same instance (singleton behavior)
  it('should return the same instance on subsequent calls', () => {
    const instance1 = createVSCodeAzureSubscriptionProviderFactory();
    const instance2 = createVSCodeAzureSubscriptionProviderFactory();
    expect(instance1).toBe(instance2);
  });
});
