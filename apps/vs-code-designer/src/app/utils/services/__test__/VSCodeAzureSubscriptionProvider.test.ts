import { describe, it, expect, vi } from 'vitest';
import { createVSCodeAzureSubscriptionProvider } from '../VSCodeAzureSubscriptionProvider';
import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';

describe('createVSCodeAzureSubscriptionProvider', () => {
  // Test that the factory returns an instance of VSCodeAzureSubscriptionProvider
  it('should return an instance of VSCodeAzureSubscriptionProvider', () => {
    const instance = createVSCodeAzureSubscriptionProvider();
    expect(instance).toBeInstanceOf(VSCodeAzureSubscriptionProvider);
  });

  // Test that multiple calls return the same instance (singleton behavior)
  it('should return the same instance on subsequent calls', () => {
    const instance1 = createVSCodeAzureSubscriptionProvider();
    const instance2 = createVSCodeAzureSubscriptionProvider();
    expect(instance1).toBe(instance2);
  });
});
