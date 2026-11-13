import { describe, expect, it } from 'vitest';
import {
  appendResolvedRelativePath,
  applyRelativePathToCallback,
  getRelativePathParameterNames,
  readRelativePathTemplate,
  resolveRelativePath,
} from '../relativePath';

describe('request trigger relative path parameters', () => {
  it('reads parameter names from a relative path template', () => {
    expect(getRelativePathParameterNames('/subscription/{subscriptionId}')).toEqual(['subscriptionId']);
    expect(getRelativePathParameterNames('/orders/{orderId}/items/{itemId}')).toEqual(['orderId', 'itemId']);
    expect(getRelativePathParameterNames('/orders/{orderId}/copy/{orderId}')).toEqual(['orderId']);
  });

  it('returns no names when the path has no tokens', () => {
    expect(getRelativePathParameterNames(undefined)).toEqual([]);
    expect(getRelativePathParameterNames('/subscription/static')).toEqual([]);
  });

  it('joins the trigger parameter segments into the template', () => {
    expect(
      readRelativePathTemplate({
        value: [{ value: '/subscription/' }, { value: '{subscriptionId}' }],
      })
    ).toBe('/subscription/{subscriptionId}');
    expect(readRelativePathTemplate(undefined)).toBe('');
  });

  it('substitutes every filled parameter and encodes the value', () => {
    expect(resolveRelativePath('/subscription/{subscriptionId}', { subscriptionId: 'abc/123' })).toBe('/subscription/abc%2F123');
  });

  it('does not rewrite the path until every parameter has a value', () => {
    expect(resolveRelativePath('/orders/{orderId}/items/{itemId}', { orderId: '1' })).toBeUndefined();
    expect(resolveRelativePath('/subscription/{subscriptionId}', { subscriptionId: '   ' })).toBeUndefined();
    expect(resolveRelativePath('/subscription/static', { subscriptionId: 'abc' })).toBeUndefined();
  });

  it('appends a resolved path to a management run URL', () => {
    const runUrl =
      '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/sites/app/hostruntime/runtime/webhooks/workflow/api/management/workflows/wf/triggers/manual/run';

    expect(appendResolvedRelativePath(runUrl, '/subscription/{subscriptionId}', { subscriptionId: 'abc' })).toBe(
      `${runUrl}/subscription/abc`
    );
  });

  it('substitutes a callback URL in place and keeps the query string', () => {
    const callbackUrl = 'https://example.test/workflows/wf/triggers/manual/paths/invoke/subscription/{subscriptionId}?sig=1';

    expect(appendResolvedRelativePath(callbackUrl, '/subscription/{subscriptionId}', { subscriptionId: 'abc' })).toBe(
      'https://example.test/workflows/wf/triggers/manual/paths/invoke/subscription/abc?sig=1'
    );
  });

  it('substitutes a percent-encoded callback template', () => {
    const callbackUrl = 'https://example.test/invoke/subscription/%7BsubscriptionId%7D?sig=1';

    expect(appendResolvedRelativePath(callbackUrl, '/subscription/{subscriptionId}', { subscriptionId: 'abc' })).toBe(
      'https://example.test/invoke/subscription/abc?sig=1'
    );
  });

  it('leaves the callback unchanged when a path parameter is missing', () => {
    const callbackInfo = {
      value: 'https://example.test/triggers/manual/run',
      method: 'POST',
    };

    expect(applyRelativePathToCallback(callbackInfo, '/subscription/{subscriptionId}', {})).toEqual(callbackInfo);
  });

  it('updates a callback that already carries a relative path template', () => {
    expect(
      applyRelativePathToCallback(
        {
          method: 'POST',
          basePath: 'https://example.test/invoke',
          relativePath: '/subscription/{subscriptionId}',
        },
        undefined,
        { subscriptionId: 'abc' }
      )
    ).toEqual({
      method: 'POST',
      basePath: 'https://example.test/invoke',
      relativePath: '/subscription/abc',
    });
  });
});
