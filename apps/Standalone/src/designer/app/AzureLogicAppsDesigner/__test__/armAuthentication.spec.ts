import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getArmAuthenticationSnapshot,
  setArmAuthenticationToken,
  subscribeArmAuthentication,
  subscribeArmAuthenticationInvalidation,
} from '../../../../environments/armAuthentication';

function token(claims: Record<string, unknown>): string {
  return `e30.${btoa(JSON.stringify(claims))}.synthetic`;
}

function identity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { tid: 'tenant', oid: 'principal', iss: 'https://sts.windows.net/tenant/', exp: Date.now() / 1000 + 300, ...overrides };
}

describe('Standalone ARM authentication lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setArmAuthenticationToken(undefined);
  });
  afterEach(() => {
    setArmAuthenticationToken(undefined);
    vi.useRealTimers();
  });

  it('publishes nonsecret identity and invalidates sessions before notifying React', () => {
    const events: string[] = [];
    const unsubscribe = subscribeArmAuthentication(() => events.push('render'));
    const unregister = subscribeArmAuthenticationInvalidation(() => events.push('invalidate'));
    const credential = token(identity());
    setArmAuthenticationToken(credential);
    const snapshot = getArmAuthenticationSnapshot();
    expect(events).toEqual(['invalidate', 'render']);
    expect(snapshot).toMatchObject({ tenantId: 'tenant', principalId: 'principal', authority: 'https://sts.windows.net/tenant/' });
    expect(JSON.stringify(snapshot)).not.toContain(credential);
    setArmAuthenticationToken(credential);
    expect(getArmAuthenticationSnapshot()).toBe(snapshot);
    expect(events).toHaveLength(2);
    unsubscribe();
    unregister();
  });

  it('retires sessions on token renewal, identity changes, and token removal', () => {
    const invalidate = vi.fn();
    const unregister = subscribeArmAuthenticationInvalidation(invalidate);
    setArmAuthenticationToken(token(identity()));
    const first = getArmAuthenticationSnapshot();
    setArmAuthenticationToken(token(identity({ exp: Date.now() / 1000 + 600 })));
    expect(getArmAuthenticationSnapshot().revision).toBe(first.revision + 1);
    setArmAuthenticationToken(token(identity({ oid: 'other-principal', tid: 'other-tenant' })));
    expect(getArmAuthenticationSnapshot()).toMatchObject({ principalId: 'other-principal', tenantId: 'other-tenant' });
    setArmAuthenticationToken(undefined);
    expect(getArmAuthenticationSnapshot().error).toContain('Sign in');
    expect(invalidate).toHaveBeenCalledTimes(4);
    unregister();
  });

  it.each([
    ['malformed', 'not-a-jwt'],
    ['expired', token(identity({ exp: 0 }))],
    ['missing account', token(identity({ oid: undefined }))],
    ['missing issuer', token(identity({ iss: undefined }))],
    ['unsupported issuer', token(identity({ iss: 'http://issuer.invalid/' }))],
  ])('reports %s authentication explicitly', (_, credential) => {
    setArmAuthenticationToken(credential);
    expect(getArmAuthenticationSnapshot().error).toBeTruthy();
    expect(getArmAuthenticationSnapshot().principalId).toBeUndefined();
  });

  it('invalidates an expired credential without waiting for another request', () => {
    setArmAuthenticationToken(token(identity({ exp: Date.now() / 1000 + 2 })));
    const invalidate = vi.fn();
    const unregister = subscribeArmAuthenticationInvalidation(invalidate);
    vi.advanceTimersByTime(2000);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(getArmAuthenticationSnapshot().error).toContain('Sign in');
    unregister();
  });
});
